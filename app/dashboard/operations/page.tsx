"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  Shield,
  Plus,
  Trash2,
  Edit2,
  X,
  Users,
  MapPin,
  Calendar,
  Clock,
  Target,
  Filter,
  Search,
  UserPlus,
  UserMinus,
  CheckCircle,
  AlertCircle,
  PlayCircle,
  PauseCircle,
  XCircle
} from 'lucide-react'

interface Operation {
  id: string
  investigation_id: string
  nome: string
  codinome: string | null
  data_prevista: string | null
  hora_prevista: string | null
  tipo: string
  objetivos: string | null
  local: string | null
  status: string
  created_at: string
  owner_id: string
  investigations?: { titulo: string }
}

interface Investigation {
  id: string
  titulo: string
}

interface TeamMember {
  id: string
  operation_id: string
  user_id: string
  funcao: string | null
  profiles?: { nome_completo: string; email: string }
}

interface User {
  id: string
  nome_completo: string
  email: string
}

const OPERATION_TYPES = [
  { value: 'busca_apreensao', label: 'Busca e Apreensao' },
  { value: 'prisao', label: 'Prisao' },
  { value: 'conducao', label: 'Conducao Coercitiva' },
]

const OPERATION_STATUS = [
  { value: 'planejamento', label: 'Planejamento', color: 'bg-yellow-500/10 text-yellow-500', icon: PauseCircle },
  { value: 'aprovada', label: 'Aprovada', color: 'bg-blue-500/10 text-blue-500', icon: CheckCircle },
  { value: 'em_andamento', label: 'Em Andamento', color: 'bg-orange-500/10 text-orange-500', icon: PlayCircle },
  { value: 'concluida', label: 'Concluida', color: 'bg-green-500/10 text-green-500', icon: CheckCircle },
  { value: 'cancelada', label: 'Cancelada', color: 'bg-red-500/10 text-red-500', icon: XCircle },
]

export default function OperationsPage() {
  const [operations, setOperations] = useState<Operation[]>([])
  const [investigations, setInvestigations] = useState<Investigation[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [teamMembers, setTeamMembers] = useState<Record<string, TeamMember[]>>({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [editingOperation, setEditingOperation] = useState<Operation | null>(null)
  const [selectedOperation, setSelectedOperation] = useState<Operation | null>(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterInvestigation, setFilterInvestigation] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const [formData, setFormData] = useState({
    investigation_id: '',
    nome: '',
    codinome: '',
    data_prevista: '',
    hora_prevista: '',
    tipo: 'busca_apreensao',
    objetivos: '',
    local: '',
    status: 'planejamento',
  })

  const [newMember, setNewMember] = useState({
    user_id: '',
    funcao: '',
  })

  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch operations with investigation info
      const { data: operationsData, error: operationsError } = await supabase
        .from('operacoes')
        .select(`
          *,
          investigations (titulo)
        `)
        .order('data_prevista', { ascending: false, nullsFirst: false })

      if (operationsError) throw operationsError
      setOperations(operationsData || [])

      // Fetch team members for all operations
      if (operationsData && operationsData.length > 0) {
        const operationIds = operationsData.map(op => op.id)
        const { data: membersData } = await supabase
          .from('operacao_equipe')
          .select(`
            *,
            profiles (nome_completo, email)
          `)
          .in('operation_id', operationIds)

        if (membersData) {
          const membersByOperation: Record<string, TeamMember[]> = {}
          membersData.forEach(member => {
            if (!membersByOperation[member.operation_id]) {
              membersByOperation[member.operation_id] = []
            }
            membersByOperation[member.operation_id].push(member)
          })
          setTeamMembers(membersByOperation)
        }
      }

      // Fetch investigations for dropdown
      const { data: investigationsData } = await supabase
        .from('investigations')
        .select('id, titulo')
        .order('titulo')
      setInvestigations(investigationsData || [])

      // Fetch users for team assignment
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, nome_completo, email')
        .order('nome_completo')
      setUsers(usersData || [])

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
      if (!session) throw new Error('Nao autenticado')

      const payload = {
        investigation_id: formData.investigation_id,
        nome: formData.nome,
        codinome: formData.codinome || null,
        data_prevista: formData.data_prevista || null,
        hora_prevista: formData.hora_prevista || null,
        tipo: formData.tipo,
        objetivos: formData.objetivos || null,
        local: formData.local || null,
        status: formData.status,
        owner_id: session.user.id,
      }

      if (editingOperation) {
        const { error } = await supabase
          .from('operacoes')
          .update(payload)
          .eq('id', editingOperation.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from('operacoes').insert([payload])
        if (error) throw error
      }

      setShowModal(false)
      setEditingOperation(null)
      resetForm()
      fetchData()
    } catch (error: any) {
      setError(error.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta operacao? Todos os membros da equipe tambem serao removidos.')) return

    try {
      // Delete team members first
      await supabase.from('operacao_equipe').delete().eq('operation_id', id)

      // Then delete operation
      const { error } = await supabase.from('operacoes').delete().eq('id', id)
      if (error) throw error
      fetchData()
    } catch (error: any) {
      setError(error.message)
    }
  }

  const handleAddMember = async () => {
    if (!selectedOperation || !newMember.user_id) return

    try {
      const { error } = await supabase.from('operacao_equipe').insert([{
        operation_id: selectedOperation.id,
        user_id: newMember.user_id,
        funcao: newMember.funcao || null,
      }])

      if (error) throw error

      setNewMember({ user_id: '', funcao: '' })
      fetchData()
    } catch (error: any) {
      setError(error.message)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Remover este membro da equipe?')) return

    try {
      const { error } = await supabase.from('operacao_equipe').delete().eq('id', memberId)
      if (error) throw error
      fetchData()
    } catch (error: any) {
      setError(error.message)
    }
  }

  const resetForm = () => {
    setFormData({
      investigation_id: '',
      nome: '',
      codinome: '',
      data_prevista: '',
      hora_prevista: '',
      tipo: 'busca_apreensao',
      objetivos: '',
      local: '',
      status: 'planejamento',
    })
  }

  const openEditModal = (operation: Operation) => {
    setEditingOperation(operation)
    setFormData({
      investigation_id: operation.investigation_id,
      nome: operation.nome,
      codinome: operation.codinome || '',
      data_prevista: operation.data_prevista || '',
      hora_prevista: operation.hora_prevista || '',
      tipo: operation.tipo,
      objetivos: operation.objetivos || '',
      local: operation.local || '',
      status: operation.status,
    })
    setShowModal(true)
  }

  const openTeamModal = (operation: Operation) => {
    setSelectedOperation(operation)
    setShowTeamModal(true)
  }

  const getStatusInfo = (status: string) => {
    return OPERATION_STATUS.find(s => s.value === status) || OPERATION_STATUS[0]
  }

  const getTypeLabel = (type: string) => {
    return OPERATION_TYPES.find(t => t.value === type)?.label || type
  }

  const filteredOperations = operations.filter(op => {
    const matchesStatus = !filterStatus || op.status === filterStatus
    const matchesInvestigation = !filterInvestigation || op.investigation_id === filterInvestigation
    const matchesSearch = !searchTerm ||
      op.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (op.codinome && op.codinome.toLowerCase().includes(searchTerm.toLowerCase()))

    return matchesStatus && matchesInvestigation && matchesSearch
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Operacoes Policiais</h1>
          <p className="text-muted-foreground mt-1">
            Planejamento e gestao de operacoes
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setEditingOperation(null); setShowModal(true) }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Nova Operacao
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
          <button onClick={() => setError('')} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por nome ou codinome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Todos os Status</option>
              {OPERATION_STATUS.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>

          <select
            value={filterInvestigation}
            onChange={(e) => setFilterInvestigation(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Todas as Investigacoes</option>
            {investigations.map(inv => (
              <option key={inv.id} value={inv.id}>{inv.titulo}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {OPERATION_STATUS.map(status => {
          const count = operations.filter(op => op.status === status.value).length
          const StatusIcon = status.icon
          return (
            <div key={status.value} className={`${status.color} rounded-lg p-4 cursor-pointer hover:opacity-80 transition-opacity`}
                 onClick={() => setFilterStatus(filterStatus === status.value ? '' : status.value)}>
              <div className="flex items-center gap-2 mb-1">
                <StatusIcon className="h-4 w-4" />
                <span className="text-sm font-medium">{status.label}</span>
              </div>
              <p className="text-2xl font-bold">{count}</p>
            </div>
          )
        })}
      </div>

      {/* Operations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOperations.map((operation) => {
          const statusInfo = getStatusInfo(operation.status)
          const members = teamMembers[operation.id] || []

          return (
            <div
              key={operation.id}
              className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">{operation.nome}</h3>
                  </div>
                  {operation.codinome && (
                    <p className="text-sm text-primary font-medium">
                      Codinome: {operation.codinome}
                    </p>
                  )}
                  {operation.investigations && (
                    <p className="text-sm text-muted-foreground">
                      {operation.investigations.titulo}
                    </p>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 ml-2 ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Tipo:</span>
                  <span className="font-medium">{getTypeLabel(operation.tipo)}</span>
                </div>

                {operation.data_prevista && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Data:</span>
                    <span className="font-medium">
                      {new Date(operation.data_prevista).toLocaleDateString('pt-BR')}
                    </span>
                    {operation.hora_prevista && (
                      <>
                        <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                        <span className="font-medium">{operation.hora_prevista}</span>
                      </>
                    )}
                  </div>
                )}

                {operation.local && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Local:</span>
                    <span className="font-medium truncate">{operation.local}</span>
                  </div>
                )}

                {operation.objetivos && (
                  <p className="text-muted-foreground line-clamp-2 mt-2 pl-6">
                    {operation.objetivos}
                  </p>
                )}
              </div>

              {/* Team Members */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Equipe ({members.length} {members.length === 1 ? 'membro' : 'membros'})
                  </span>
                </div>
                {members.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {members.slice(0, 3).map(member => (
                      <span key={member.id} className="text-xs bg-accent px-2 py-1 rounded">
                        {member.profiles?.nome_completo || 'Usuario'}
                      </span>
                    ))}
                    {members.length > 3 && (
                      <span className="text-xs bg-accent px-2 py-1 rounded">
                        +{members.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-border">
                <button
                  onClick={() => openTeamModal(operation)}
                  className="flex-1 flex items-center justify-center gap-1 text-purple-500 hover:bg-purple-500/10 px-2 py-2 rounded-md transition-colors text-sm"
                >
                  <Users className="h-4 w-4" />
                  Equipe
                </button>
                <button
                  onClick={() => openEditModal(operation)}
                  className="flex-1 flex items-center justify-center gap-1 text-blue-500 hover:bg-blue-500/10 px-2 py-2 rounded-md transition-colors text-sm"
                >
                  <Edit2 className="h-4 w-4" />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(operation.id)}
                  className="flex-1 flex items-center justify-center gap-1 text-destructive hover:bg-destructive/10 px-2 py-2 rounded-md transition-colors text-sm"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredOperations.length === 0 && (
        <div className="text-center py-12">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            {operations.length === 0
              ? 'Nenhuma operacao encontrada. Planeje sua primeira operacao!'
              : 'Nenhuma operacao corresponde aos filtros selecionados.'}
          </p>
        </div>
      )}

      {/* Operation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-card border border-border rounded-lg max-w-2xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                {editingOperation ? 'Editar Operacao' : 'Nova Operacao'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Investigacao *</label>
                <select
                  value={formData.investigation_id}
                  onChange={(e) => setFormData({ ...formData, investigation_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Selecione uma investigacao</option>
                  {investigations.map((inv) => (
                    <option key={inv.id} value={inv.id}>{inv.titulo}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nome da Operacao *</label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Ex: Operacao Sentinela"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Codinome</label>
                  <input
                    type="text"
                    value={formData.codinome}
                    onChange={(e) => setFormData({ ...formData, codinome: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Ex: Alpha"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Data Prevista</label>
                  <input
                    type="date"
                    value={formData.data_prevista}
                    onChange={(e) => setFormData({ ...formData, data_prevista: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Hora Prevista</label>
                  <input
                    type="time"
                    value={formData.hora_prevista}
                    onChange={(e) => setFormData({ ...formData, hora_prevista: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Tipo *</label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {OPERATION_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Local</label>
                <input
                  type="text"
                  value={formData.local}
                  onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Endereco ou local da operacao"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Objetivos</label>
                <textarea
                  value={formData.objetivos}
                  onChange={(e) => setFormData({ ...formData, objetivos: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Descreva os objetivos da operacao..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {OPERATION_STATUS.map((status) => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
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
                  {editingOperation ? 'Salvar' : 'Criar Operacao'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team Management Modal */}
      {showTeamModal && selectedOperation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-card border border-border rounded-lg max-w-xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Gestao de Equipe</h2>
                <p className="text-muted-foreground">{selectedOperation.nome}</p>
              </div>
              <button onClick={() => setShowTeamModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Add Member Form */}
            <div className="bg-background border border-border rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Adicionar Membro
              </h3>
              <div className="flex gap-2">
                <select
                  value={newMember.user_id}
                  onChange={(e) => setNewMember({ ...newMember, user_id: e.target.value })}
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Selecione um usuario</option>
                  {users
                    .filter(u => !teamMembers[selectedOperation.id]?.some(m => m.user_id === u.id))
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.nome_completo || user.email}
                      </option>
                    ))}
                </select>
                <input
                  type="text"
                  value={newMember.funcao}
                  onChange={(e) => setNewMember({ ...newMember, funcao: e.target.value })}
                  placeholder="Funcao"
                  className="w-32 px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={handleAddMember}
                  disabled={!newMember.user_id}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Team Members List */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Membros da Equipe ({teamMembers[selectedOperation.id]?.length || 0})
              </h3>

              {(!teamMembers[selectedOperation.id] || teamMembers[selectedOperation.id].length === 0) ? (
                <p className="text-center py-6 text-muted-foreground">
                  Nenhum membro na equipe ainda.
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {teamMembers[selectedOperation.id].map((member) => (
                    <div key={member.id} className="flex items-center justify-between bg-background border border-border rounded-lg p-3">
                      <div>
                        <p className="font-medium">
                          {member.profiles?.nome_completo || 'Usuario'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {member.funcao || 'Sem funcao definida'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-destructive hover:bg-destructive/10 p-2 rounded-md transition-colors"
                      >
                        <UserMinus className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-border">
              <button
                onClick={() => setShowTeamModal(false)}
                className="w-full px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
