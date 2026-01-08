"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Users, Plus, Trash2, Edit2, X, UserPlus, UserMinus } from 'lucide-react'

interface Team {
  id: string
  nome: string
  descricao: string | null
  owner_id: string
  created_at: string
}

interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: string
  users?: { nome: string; email: string }
}

interface User {
  id: string
  nome: string
  email: string
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [formData, setFormData] = useState({ nome: '', descricao: '' })
  const [selectedUserId, setSelectedUserId] = useState('')
  const [error, setError] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')

  useEffect(() => {
    fetchData()
    getCurrentUser()
  }, [])

  const getCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      setCurrentUserId(session.user.id)
    }
  }

  const fetchData = async () => {
    try {
      const [teamsResult, usersResult] = await Promise.all([
        supabase.from('teams').select('*').order('created_at', { ascending: false }),
        supabase.from('users').select('id, nome, email').order('nome'),
      ])

      if (teamsResult.error) throw teamsResult.error
      if (usersResult.error) throw usersResult.error

      setTeams(teamsResult.data || [])
      setUsers(usersResult.data || [])
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchTeamMembers = async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*, users(nome, email)')
        .eq('team_id', teamId)

      if (error) throw error
      setTeamMembers(data || [])
    } catch (error: any) {
      setError(error.message)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Nao autenticado')

      if (editingTeam) {
        const { error } = await supabase
          .from('teams')
          .update({ nome: formData.nome, descricao: formData.descricao || null })
          .eq('id', editingTeam.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from('teams').insert([{
          nome: formData.nome,
          descricao: formData.descricao || null,
          owner_id: session.user.id,
        }])

        if (error) throw error
      }

      setShowModal(false)
      setEditingTeam(null)
      setFormData({ nome: '', descricao: '' })
      fetchData()
    } catch (error: any) {
      setError(error.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta equipe?')) return

    try {
      const { error } = await supabase.from('teams').delete().eq('id', id)
      if (error) throw error
      fetchData()
    } catch (error: any) {
      setError(error.message)
    }
  }

  const handleAddMember = async () => {
    if (!selectedTeam || !selectedUserId) return

    try {
      const { error } = await supabase.from('team_members').insert([{
        team_id: selectedTeam.id,
        user_id: selectedUserId,
        role: 'member',
      }])

      if (error) throw error
      setSelectedUserId('')
      fetchTeamMembers(selectedTeam.id)
    } catch (error: any) {
      setError(error.message)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Remover este membro da equipe?')) return

    try {
      const { error } = await supabase.from('team_members').delete().eq('id', memberId)
      if (error) throw error
      if (selectedTeam) fetchTeamMembers(selectedTeam.id)
    } catch (error: any) {
      setError(error.message)
    }
  }

  const openEditModal = (team: Team) => {
    setEditingTeam(team)
    setFormData({ nome: team.nome, descricao: team.descricao || '' })
    setShowModal(true)
  }

  const openCreateModal = () => {
    setEditingTeam(null)
    setFormData({ nome: '', descricao: '' })
    setShowModal(true)
  }

  const openMembersModal = async (team: Team) => {
    setSelectedTeam(team)
    await fetchTeamMembers(team.id)
    setShowMembersModal(true)
  }

  const availableUsers = users.filter(
    user => !teamMembers.some(member => member.user_id === user.id)
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Equipes</h1>
          <p className="text-muted-foreground mt-1">Gerenciar equipes e membros</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Nova Equipe
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
          {error}
          <button onClick={() => setError('')} className="float-right">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((team) => (
          <div key={team.id} className="card p-5 card-hover">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">{team.nome}</h3>
                <p className="text-xs text-muted-foreground">
                  Criada em {new Date(team.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>

            {team.descricao && (
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{team.descricao}</p>
            )}

            <div className="flex gap-2 pt-4 border-t border-border">
              <button
                onClick={() => openMembersModal(team)}
                className="flex-1 flex items-center justify-center gap-1.5 text-primary hover:bg-primary/10 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                Membros
              </button>
              <button
                onClick={() => openEditModal(team)}
                className="flex items-center justify-center gap-1.5 text-blue-400 hover:bg-blue-500/10 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(team.id)}
                className="flex items-center justify-center gap-1.5 text-red-400 hover:bg-red-500/10 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {teams.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Nenhuma equipe cadastrada</p>
          <button onClick={openCreateModal} className="btn-primary mt-4">
            Criar primeira equipe
          </button>
        </div>
      )}

      {/* Create/Edit Team Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">
                {editingTeam ? 'Editar Equipe' : 'Nova Equipe'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Nome *</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                  className="input-field"
                  placeholder="Nome da equipe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Descricao</label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  rows={3}
                  className="input-field"
                  placeholder="Descricao da equipe..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  {editingTeam ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team Members Modal */}
      {showMembersModal && selectedTeam && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">Membros da Equipe</h2>
                <p className="text-sm text-muted-foreground">{selectedTeam.nome}</p>
              </div>
              <button onClick={() => setShowMembersModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Add Member */}
            <div className="flex gap-2 mb-6">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="input-field flex-1"
              >
                <option value="">Selecionar usuario...</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.nome} ({user.email})
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddMember}
                disabled={!selectedUserId}
                className="btn-primary px-4 disabled:opacity-50"
              >
                <UserPlus className="h-5 w-5" />
              </button>
            </div>

            {/* Members List */}
            <div className="space-y-2">
              {teamMembers.length > 0 ? (
                teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {member.users?.nome?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{member.users?.nome || 'Usuario'}</p>
                        <p className="text-xs text-muted-foreground">{member.users?.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhum membro nesta equipe</p>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button onClick={() => setShowMembersModal(false)} className="btn-secondary">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
