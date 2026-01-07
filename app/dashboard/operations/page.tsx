"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Clipboard, Plus, Trash2, Edit2, X } from 'lucide-react'

interface Operation {
  id: string
  investigation_id: string
  nome_operacao: string
  data_planejada: string | null
  hora_planejada: string | null
  local: string | null
  objetivo: string | null
  status: string
  created_at: string
  investigations?: { titulo: string }
}

interface Investigation {
  id: string
  titulo: string
}

export default function OperationsPage() {
  const [operations, setOperations] = useState<Operation[]>([])
  const [investigations, setInvestigations] = useState<Investigation[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingOperation, setEditingOperation] = useState<Operation | null>(null)
  const [formData, setFormData] = useState({
    investigation_id: '',
    nome_operacao: '',
    data_planejada: '',
    hora_planejada: '',
    local: '',
    objetivo: '',
    status: 'Planejada',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data: operationsData, error: operationsError } = await supabase
        .from('operations')
        .select(`
          *,
          investigations (titulo)
        `)
        .order('data_planejada', { ascending: false, nullsFirst: false })

      if (operationsError) throw operationsError
      setOperations(operationsData || [])

      const { data: investigationsData } = await supabase
        .from('investigations')
        .select('id, titulo')
        .order('titulo')
      setInvestigations(investigationsData || [])
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
        data_planejada: formData.data_planejada || null,
        hora_planejada: formData.hora_planejada || null,
        local: formData.local || null,
        objetivo: formData.objetivo || null,
        owner_id: session.user.id,
      }

      if (editingOperation) {
        const { error } = await supabase
          .from('operations')
          .update(payload)
          .eq('id', editingOperation.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from('operations').insert([payload])
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
    if (!confirm('Tem certeza que deseja excluir esta operação?')) return

    try {
      const { error } = await supabase.from('operations').delete().eq('id', id)
      if (error) throw error
      fetchData()
    } catch (error: any) {
      setError(error.message)
    }
  }

  const resetForm = () => {
    setFormData({
      investigation_id: '',
      nome_operacao: '',
      data_planejada: '',
      hora_planejada: '',
      local: '',
      objetivo: '',
      status: 'Planejada',
    })
  }

  const openEditModal = (operation: Operation) => {
    setEditingOperation(operation)
    setFormData({
      investigation_id: operation.investigation_id,
      nome_operacao: operation.nome_operacao,
      data_planejada: operation.data_planejada || '',
      hora_planejada: operation.hora_planejada || '',
      local: operation.local || '',
      objetivo: operation.objetivo || '',
      status: operation.status,
    })
    setShowModal(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Planejada':
        return 'bg-blue-500/10 text-blue-500'
      case 'Em Execução':
        return 'bg-orange-500/10 text-orange-500'
      case 'Concluída':
        return 'bg-green-500/10 text-green-500'
      case 'Cancelada':
        return 'bg-gray-500/10 text-gray-500'
      default:
        return 'bg-gray-500/10 text-gray-500'
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Operações</h1>
          <p className="text-muted-foreground mt-1">
            Planejamento e gestão de operações policiais
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true) }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Nova Operação
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {operations.map((operation) => (
          <div
            key={operation.id}
            className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">{operation.nome_operacao}</h3>
                {operation.investigations && (
                  <p className="text-sm text-muted-foreground">
                    {operation.investigations.titulo}
                  </p>
                )}
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 ml-2 ${getStatusColor(operation.status)}`}>
                {operation.status}
              </span>
            </div>

            <div className="space-y-2 text-sm mb-4">
              {operation.data_planejada && (
                <div>
                  <span className="text-muted-foreground">Data:</span>{' '}
                  <span className="font-medium">
                    {new Date(operation.data_planejada).toLocaleDateString('pt-BR')}
                    {operation.hora_planejada && ` às ${operation.hora_planejada}`}
                  </span>
                </div>
              )}
              {operation.local && (
                <div>
                  <span className="text-muted-foreground">Local:</span>{' '}
                  <span className="font-medium">{operation.local}</span>
                </div>
              )}
              {operation.objetivo && (
                <p className="text-muted-foreground line-clamp-2 mt-2">
                  {operation.objetivo}
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t border-border">
              <button
                onClick={() => openEditModal(operation)}
                className="flex-1 flex items-center justify-center gap-2 text-blue-500 hover:bg-blue-500/10 px-3 py-2 rounded-md transition-colors"
              >
                <Edit2 className="h-4 w-4" />
                Editar
              </button>
              <button
                onClick={() => handleDelete(operation.id)}
                className="flex-1 flex items-center justify-center gap-2 text-destructive hover:bg-destructive/10 px-3 py-2 rounded-md transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      {operations.length === 0 && (
        <div className="text-center py-12">
          <Clipboard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            Nenhuma operação encontrada. Planeje sua primeira operação!
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-card border border-border rounded-lg max-w-2xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                {editingOperation ? 'Editar Operação' : 'Nova Operação'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Investigação *</label>
                <select
                  value={formData.investigation_id}
                  onChange={(e) => setFormData({ ...formData, investigation_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Selecione uma investigação</option>
                  {investigations.map((inv) => (
                    <option key={inv.id} value={inv.id}>{inv.titulo}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Nome da Operação *</label>
                <input
                  type="text"
                  value={formData.nome_operacao}
                  onChange={(e) => setFormData({ ...formData, nome_operacao: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ex: Operação Guardião"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Data Planejada</label>
                  <input
                    type="date"
                    value={formData.data_planejada}
                    onChange={(e) => setFormData({ ...formData, data_planejada: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Hora</label>
                  <input
                    type="time"
                    value={formData.hora_planejada}
                    onChange={(e) => setFormData({ ...formData, hora_planejada: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Planejada">Planejada</option>
                    <option value="Em Execução">Em Execução</option>
                    <option value="Concluída">Concluída</option>
                    <option value="Cancelada">Cancelada</option>
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
                  placeholder="Endereço ou local da operação"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Objetivo</label>
                <textarea
                  value={formData.objetivo}
                  onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Objetivo e descrição da operação..."
                />
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
                  {editingOperation ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
