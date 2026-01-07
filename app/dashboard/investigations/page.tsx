"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { FolderPlus, Trash2, Edit2, X, Users, Share2 } from 'lucide-react'

interface Investigation {
  id: string
  titulo: string
  descricao: string
  numero_procedimento: string
  tipo: string
  status: string
  data_inicio: string
  data_conclusao: string | null
  owner_id: string
  team_id: string | null
  created_at: string
}

interface Team {
  id: string
  nome: string
}

export default function InvestigationsPage() {
  const [investigations, setInvestigations] = useState<Investigation[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingInvestigation, setEditingInvestigation] = useState<Investigation | null>(null)
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    numero_procedimento: '',
    tipo: 'Inquérito Policial',
    status: 'Em Andamento',
    data_inicio: '',
    data_conclusao: '',
    team_id: '',
  })
  const [error, setError] = useState('')
  const [userId, setUserId] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      setUserId(session.user.id)

      // Fetch investigations
      const { data: investigationsData, error: investigationsError } = await supabase
        .from('investigations')
        .select('*')
        .order('created_at', { ascending: false })

      if (investigationsError) throw investigationsError
      setInvestigations(investigationsData || [])

      // Fetch teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .order('nome')

      if (teamsError) throw teamsError
      setTeams(teamsData || [])
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Não autenticado')

      const payload = {
        ...formData,
        team_id: formData.team_id || null,
        data_conclusao: formData.data_conclusao || null,
        owner_id: session.user.id,
      }

      if (editingInvestigation) {
        const { error } = await supabase
          .from('investigations')
          .update(payload)
          .eq('id', editingInvestigation.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from('investigations').insert([payload])
        if (error) throw error
      }

      setShowModal(false)
      setEditingInvestigation(null)
      setFormData({
        titulo: '',
        descricao: '',
        numero_procedimento: '',
        tipo: 'Inquérito Policial',
        status: 'Em Andamento',
        data_inicio: '',
        data_conclusao: '',
        team_id: '',
      })
      fetchData()
    } catch (error: any) {
      setError(error.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta investigação?')) return

    try {
      const { error } = await supabase.from('investigations').delete().eq('id', id)
      if (error) throw error
      fetchData()
    } catch (error: any) {
      setError(error.message)
    }
  }

  const openEditModal = (investigation: Investigation) => {
    setEditingInvestigation(investigation)
    setFormData({
      titulo: investigation.titulo,
      descricao: investigation.descricao || '',
      numero_procedimento: investigation.numero_procedimento || '',
      tipo: investigation.tipo || 'Inquérito Policial',
      status: investigation.status,
      data_inicio: investigation.data_inicio || '',
      data_conclusao: investigation.data_conclusao || '',
      team_id: investigation.team_id || '',
    })
    setShowModal(true)
  }

  const openCreateModal = () => {
    setEditingInvestigation(null)
    setFormData({
      titulo: '',
      descricao: '',
      numero_procedimento: '',
      tipo: 'Inquérito Policial',
      status: 'Em Andamento',
      data_inicio: new Date().toISOString().split('T')[0],
      data_conclusao: '',
      team_id: '',
    })
    setShowModal(true)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Investigações</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie suas investigações e procedimentos
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          <FolderPlus className="h-5 w-5" />
          Nova Investigação
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {investigations.map((investigation) => (
          <div
            key={investigation.id}
            className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">{investigation.titulo}</h3>
                <p className="text-sm text-muted-foreground">
                  {investigation.numero_procedimento || 'Sem número'}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 ml-2 ${
                  investigation.status === 'Em Andamento'
                    ? 'bg-blue-500/10 text-blue-500'
                    : investigation.status === 'Concluído'
                    ? 'bg-green-500/10 text-green-500'
                    : 'bg-gray-500/10 text-gray-500'
                }`}
              >
                {investigation.status}
              </span>
            </div>

            {investigation.descricao && (
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {investigation.descricao}
              </p>
            )}

            <div className="space-y-2 text-sm mb-4">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Tipo:</span>
                <span className="font-medium">{investigation.tipo}</span>
              </div>
              {investigation.data_inicio && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Início:</span>
                  <span className="font-medium">
                    {new Date(investigation.data_inicio).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}
              {investigation.team_id && (
                <div className="flex items-center gap-2 text-purple-500">
                  <Users className="h-4 w-4" />
                  <span className="text-xs">Compartilhado com equipe</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t border-border">
              <button
                onClick={() => openEditModal(investigation)}
                className="flex-1 flex items-center justify-center gap-2 text-blue-500 hover:bg-blue-500/10 px-3 py-2 rounded-md transition-colors"
              >
                <Edit2 className="h-4 w-4" />
                Editar
              </button>
              <button
                onClick={() => handleDelete(investigation.id)}
                className="flex-1 flex items-center justify-center gap-2 text-destructive hover:bg-destructive/10 px-3 py-2 rounded-md transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      {investigations.length === 0 && (
        <div className="text-center py-12">
          <FolderPlus className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            Nenhuma investigação encontrada. Crie sua primeira investigação!
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-card border border-border rounded-lg max-w-2xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                {editingInvestigation ? 'Editar Investigação' : 'Nova Investigação'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Título *</label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ex: Operação Guardião"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Número do Procedimento</label>
                  <input
                    type="text"
                    value={formData.numero_procedimento}
                    onChange={(e) =>
                      setFormData({ ...formData, numero_procedimento: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Ex: IP 123/2026"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Tipo</label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Inquérito Policial">Inquérito Policial</option>
                    <option value="Procedimento Investigatório">Procedimento Investigatório</option>
                    <option value="Termo Circunstanciado">Termo Circunstanciado</option>
                    <option value="Flagrante">Flagrante</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Descrição</label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Breve descrição da investigação..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Em Andamento">Em Andamento</option>
                    <option value="Concluído">Concluído</option>
                    <option value="Arquivado">Arquivado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Equipe (Compartilhar)</label>
                  <select
                    value={formData.team_id}
                    onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Nenhuma (Privado)</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Data de Início</label>
                  <input
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Data de Conclusão</label>
                  <input
                    type="date"
                    value={formData.data_conclusao}
                    onChange={(e) => setFormData({ ...formData, data_conclusao: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
                >
                  {editingInvestigation ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
