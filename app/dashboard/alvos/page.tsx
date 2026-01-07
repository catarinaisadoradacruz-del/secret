"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { UserPlus, Trash2, Edit2, X, Upload } from 'lucide-react'

interface Alvo {
  id: string
  investigation_id: string
  nome: string
  cpf: string | null
  rg: string | null
  data_nascimento: string | null
  mae: string | null
  pai: string | null
  endereco: string | null
  telefones: string[] | null
  veiculos: string[] | null
  foto_url: string | null
  status: string
  observacoes: string | null
  owner_id: string
  created_at: string
  investigations?: { titulo: string }
}

interface Investigation {
  id: string
  titulo: string
}

export default function AlvosPage() {
  const [alvos, setAlvos] = useState<Alvo[]>([])
  const [investigations, setInvestigations] = useState<Investigation[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAlvo, setEditingAlvo] = useState<Alvo | null>(null)
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    rg: '',
    data_nascimento: '',
    mae: '',
    pai: '',
    endereco: '',
    telefones: '',
    veiculos: '',
    status: 'Investigação',
    observacoes: '',
    investigation_id: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch alvos
      const { data: alvosData, error: alvosError } = await supabase
        .from('alvos')
        .select(`
          *,
          investigations (titulo)
        `)
        .order('created_at', { ascending: false })

      if (alvosError) throw alvosError
      setAlvos(alvosData || [])

      // Fetch investigations
      const { data: investigationsData, error: investigationsError } = await supabase
        .from('investigations')
        .select('id, titulo')
        .order('titulo')

      if (investigationsError) throw investigationsError
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
        telefones: formData.telefones ? formData.telefones.split(',').map(t => t.trim()) : [],
        veiculos: formData.veiculos ? formData.veiculos.split(',').map(v => v.trim()) : [],
        cpf: formData.cpf || null,
        rg: formData.rg || null,
        data_nascimento: formData.data_nascimento || null,
        mae: formData.mae || null,
        pai: formData.pai || null,
        endereco: formData.endereco || null,
        observacoes: formData.observacoes || null,
        owner_id: session.user.id,
      }

      if (editingAlvo) {
        const { error } = await supabase
          .from('alvos')
          .update(payload)
          .eq('id', editingAlvo.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from('alvos').insert([payload])
        if (error) throw error
      }

      setShowModal(false)
      setEditingAlvo(null)
      resetForm()
      fetchData()
    } catch (error: any) {
      setError(error.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este alvo?')) return

    try {
      const { error } = await supabase.from('alvos').delete().eq('id', id)
      if (error) throw error
      fetchData()
    } catch (error: any) {
      setError(error.message)
    }
  }

  const resetForm = () => {
    setFormData({
      nome: '',
      cpf: '',
      rg: '',
      data_nascimento: '',
      mae: '',
      pai: '',
      endereco: '',
      telefones: '',
      veiculos: '',
      status: 'Investigação',
      observacoes: '',
      investigation_id: '',
    })
  }

  const openEditModal = (alvo: Alvo) => {
    setEditingAlvo(alvo)
    setFormData({
      nome: alvo.nome,
      cpf: alvo.cpf || '',
      rg: alvo.rg || '',
      data_nascimento: alvo.data_nascimento || '',
      mae: alvo.mae || '',
      pai: alvo.pai || '',
      endereco: alvo.endereco || '',
      telefones: alvo.telefones ? alvo.telefones.join(', ') : '',
      veiculos: alvo.veiculos ? alvo.veiculos.join(', ') : '',
      status: alvo.status,
      observacoes: alvo.observacoes || '',
      investigation_id: alvo.investigation_id,
    })
    setShowModal(true)
  }

  const openCreateModal = () => {
    setEditingAlvo(null)
    resetForm()
    setShowModal(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Investigação':
        return 'bg-blue-500/10 text-blue-500'
      case 'Indiciado':
        return 'bg-orange-500/10 text-orange-500'
      case 'Preso':
        return 'bg-red-500/10 text-red-500'
      case 'Foragido':
        return 'bg-purple-500/10 text-purple-500'
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
          <h1 className="text-3xl font-bold">Alvos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os alvos das investigações
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="h-5 w-5" />
          Novo Alvo
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {alvos.map((alvo) => (
          <div
            key={alvo.id}
            className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start gap-4 mb-4">
              {alvo.foto_url ? (
                <img
                  src={alvo.foto_url}
                  alt={alvo.nome}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-2xl font-bold text-muted-foreground">
                    {alvo.nome.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">{alvo.nome}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(alvo.status)}`}>
                  {alvo.status}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-sm mb-4">
              {alvo.cpf && (
                <div>
                  <span className="text-muted-foreground">CPF:</span>{' '}
                  <span className="font-medium">{alvo.cpf}</span>
                </div>
              )}
              {alvo.data_nascimento && (
                <div>
                  <span className="text-muted-foreground">Nasc:</span>{' '}
                  <span className="font-medium">
                    {new Date(alvo.data_nascimento).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}
              {alvo.telefones && alvo.telefones.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Tel:</span>{' '}
                  <span className="font-medium">{alvo.telefones[0]}</span>
                  {alvo.telefones.length > 1 && (
                    <span className="text-muted-foreground text-xs ml-1">
                      +{alvo.telefones.length - 1}
                    </span>
                  )}
                </div>
              )}
              {alvo.investigations && (
                <div>
                  <span className="text-muted-foreground">Investigação:</span>{' '}
                  <span className="font-medium text-xs">{alvo.investigations.titulo}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t border-border">
              <button
                onClick={() => openEditModal(alvo)}
                className="flex-1 flex items-center justify-center gap-2 text-blue-500 hover:bg-blue-500/10 px-3 py-2 rounded-md transition-colors"
              >
                <Edit2 className="h-4 w-4" />
                Editar
              </button>
              <button
                onClick={() => handleDelete(alvo.id)}
                className="flex-1 flex items-center justify-center gap-2 text-destructive hover:bg-destructive/10 px-3 py-2 rounded-md transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      {alvos.length === 0 && (
        <div className="text-center py-12">
          <UserPlus className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            Nenhum alvo encontrado. Cadastre seu primeiro alvo!
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-card border border-border rounded-lg max-w-3xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                {editingAlvo ? 'Editar Alvo' : 'Novo Alvo'}
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
                <label className="block text-sm font-medium mb-2">Investigação *</label>
                <select
                  value={formData.investigation_id}
                  onChange={(e) => setFormData({ ...formData, investigation_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Selecione uma investigação</option>
                  {investigations.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.titulo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nome Completo *</label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
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
                    <option value="Investigação">Investigação</option>
                    <option value="Indiciado">Indiciado</option>
                    <option value="Preso">Preso</option>
                    <option value="Foragido">Foragido</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">CPF</label>
                  <input
                    type="text"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="000.000.000-00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">RG</label>
                  <input
                    type="text"
                    value={formData.rg}
                    onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Data de Nascimento</label>
                  <input
                    type="date"
                    value={formData.data_nascimento}
                    onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nome da Mãe</label>
                  <input
                    type="text"
                    value={formData.mae}
                    onChange={(e) => setFormData({ ...formData, mae: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Nome do Pai</label>
                  <input
                    type="text"
                    value={formData.pai}
                    onChange={(e) => setFormData({ ...formData, pai: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Endereço</label>
                <input
                  type="text"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Rua, número, bairro, cidade - UF"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Telefones (separar por vírgula)
                  </label>
                  <input
                    type="text"
                    value={formData.telefones}
                    onChange={(e) => setFormData({ ...formData, telefones: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="(62) 99999-9999, (62) 98888-8888"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Veículos (separar por vírgula)
                  </label>
                  <input
                    type="text"
                    value={formData.veiculos}
                    onChange={(e) => setFormData({ ...formData, veiculos: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="ABC1234, XYZ5678"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Observações</label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Informações adicionais sobre o alvo..."
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
                  {editingAlvo ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
