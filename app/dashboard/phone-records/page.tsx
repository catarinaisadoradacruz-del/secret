"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Phone, Upload, Trash2, X } from 'lucide-react'

interface PhoneRecord {
  id: string
  investigation_id: string
  alvo_id: string | null
  numero_origem: string
  numero_destino: string
  data_hora: string
  duracao: number | null
  tipo: string
  created_at: string
  alvos?: { nome: string }
  investigations?: { titulo: string }
}

interface Investigation {
  id: string
  titulo: string
}

interface Alvo {
  id: string
  nome: string
}

export default function PhoneRecordsPage() {
  const [records, setRecords] = useState<PhoneRecord[]>([])
  const [investigations, setInvestigations] = useState<Investigation[]>([])
  const [alvos, setAlvos] = useState<Alvo[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    investigation_id: '',
    alvo_id: '',
    numero_origem: '',
    numero_destino: '',
    data_hora: '',
    duracao: '',
    tipo: 'Chamada',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data: recordsData, error: recordsError } = await supabase
        .from('phone_records')
        .select(`
          *,
          alvos (nome),
          investigations (titulo)
        `)
        .order('data_hora', { ascending: false })

      if (recordsError) throw recordsError
      setRecords(recordsData || [])

      const { data: investigationsData } = await supabase
        .from('investigations')
        .select('id, titulo')
        .order('titulo')
      setInvestigations(investigationsData || [])

      const { data: alvosData } = await supabase
        .from('alvos')
        .select('id, nome')
        .order('nome')
      setAlvos(alvosData || [])
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

      const { error } = await supabase.from('phone_records').insert({
        ...formData,
        alvo_id: formData.alvo_id || null,
        duracao: formData.duracao ? parseInt(formData.duracao) : null,
        owner_id: session.user.id,
      })

      if (error) throw error

      setShowModal(false)
      setFormData({
        investigation_id: '',
        alvo_id: '',
        numero_origem: '',
        numero_destino: '',
        data_hora: '',
        duracao: '',
        tipo: 'Chamada',
      })
      fetchData()
    } catch (error: any) {
      setError(error.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return

    try {
      const { error } = await supabase.from('phone_records').delete().eq('id', id)
      if (error) throw error
      fetchData()
    } catch (error: any) {
      setError(error.message)
    }
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Registros Telefônicos</h1>
          <p className="text-muted-foreground mt-1">
            Gestão de registros de chamadas, SMS e mensagens
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Phone className="h-5 w-5" />
          Novo Registro
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium">Origem</th>
              <th className="px-6 py-3 text-left text-sm font-medium">Destino</th>
              <th className="px-6 py-3 text-left text-sm font-medium">Data/Hora</th>
              <th className="px-6 py-3 text-left text-sm font-medium">Duração</th>
              <th className="px-6 py-3 text-left text-sm font-medium">Tipo</th>
              <th className="px-6 py-3 text-left text-sm font-medium">Alvo</th>
              <th className="px-6 py-3 text-right text-sm font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {records.map((record) => (
              <tr key={record.id} className="hover:bg-accent/50 transition-colors">
                <td className="px-6 py-4 text-sm">{record.numero_origem}</td>
                <td className="px-6 py-4 text-sm">{record.numero_destino}</td>
                <td className="px-6 py-4 text-sm">
                  {new Date(record.data_hora).toLocaleString('pt-BR')}
                </td>
                <td className="px-6 py-4 text-sm">{formatDuration(record.duracao)}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    record.tipo === 'Chamada' ? 'bg-blue-500/10 text-blue-500' :
                    record.tipo === 'SMS' ? 'bg-green-500/10 text-green-500' :
                    'bg-purple-500/10 text-purple-500'
                  }`}>
                    {record.tipo}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  {record.alvos?.nome || '-'}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleDelete(record.id)}
                    className="inline-flex items-center gap-1 text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {records.length === 0 && (
        <div className="text-center py-12">
          <Phone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            Nenhum registro telefônico encontrado. Adicione seu primeiro registro!
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-lg max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Novo Registro Telefônico</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Investigação *</label>
                  <select
                    value={formData.investigation_id}
                    onChange={(e) => setFormData({ ...formData, investigation_id: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Selecione</option>
                    {investigations.map((inv) => (
                      <option key={inv.id} value={inv.id}>{inv.titulo}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Alvo</label>
                  <select
                    value={formData.alvo_id}
                    onChange={(e) => setFormData({ ...formData, alvo_id: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Nenhum</option>
                    {alvos.map((alvo) => (
                      <option key={alvo.id} value={alvo.id}>{alvo.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Número Origem *</label>
                  <input
                    type="text"
                    value={formData.numero_origem}
                    onChange={(e) => setFormData({ ...formData, numero_origem: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="(62) 99999-9999"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Número Destino *</label>
                  <input
                    type="text"
                    value={formData.numero_destino}
                    onChange={(e) => setFormData({ ...formData, numero_destino: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="(62) 98888-8888"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Data/Hora *</label>
                  <input
                    type="datetime-local"
                    value={formData.data_hora}
                    onChange={(e) => setFormData({ ...formData, data_hora: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Duração (segundos)</label>
                  <input
                    type="number"
                    value={formData.duracao}
                    onChange={(e) => setFormData({ ...formData, duracao: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="120"
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
                    <option value="Chamada">Chamada</option>
                    <option value="SMS">SMS</option>
                    <option value="WhatsApp">WhatsApp</option>
                  </select>
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
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
