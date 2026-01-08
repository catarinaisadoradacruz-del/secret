"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  Target,
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  X,
  User,
  Phone,
  MapPin,
  Calendar,
  ChevronDown,
  Filter
} from 'lucide-react'

interface Alvo {
  id: string
  nome: string
  cpf: string | null
  data_nascimento: string | null
  alcunha: string | null
  foto_url: string | null
  investigation_id: string | null
  created_at: string
  investigations?: { titulo: string } | null
  alvo_telefones?: { numero: string }[]
  alvo_enderecos?: { cidade: string; status: string }[]
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
  const [searchTerm, setSearchTerm] = useState('')
  const [filterInvestigation, setFilterInvestigation] = useState('')
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    rg: '',
    data_nascimento: '',
    sexo: '',
    mae: '',
    pai: '',
    alcunha: '',
    profissao: '',
    investigation_id: '',
    observacoes: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Buscar alvos com relacionamentos
      const { data: alvosData, error: alvosError } = await supabase
        .from('alvos')
        .select(`
          *,
          investigations(titulo),
          alvo_telefones(numero),
          alvo_enderecos(cidade, status)
        `)
        .order('created_at', { ascending: false })

      if (alvosError) throw alvosError
      setAlvos(alvosData || [])

      // Buscar investigações para o filtro e modal
      const { data: invData, error: invError } = await supabase
        .from('investigations')
        .select('id, titulo')
        .order('titulo')

      if (invError) throw invError
      setInvestigations(invData || [])
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err)
      // Se a tabela não existir, mostrar mensagem
      if (err.code === '42P01') {
        setError('Tabelas não encontradas. Execute o script SQL no Supabase.')
      } else {
        setError(err.message)
      }
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

      const { error } = await supabase.from('alvos').insert([{
        nome: formData.nome,
        cpf: formData.cpf || null,
        rg: formData.rg || null,
        data_nascimento: formData.data_nascimento || null,
        sexo: formData.sexo || null,
        mae: formData.mae || null,
        pai: formData.pai || null,
        alcunha: formData.alcunha || null,
        profissao: formData.profissao || null,
        investigation_id: formData.investigation_id || null,
        observacoes: formData.observacoes || null,
        created_by: session.user.id
      }])

      if (error) throw error

      setShowModal(false)
      setFormData({
        nome: '', cpf: '', rg: '', data_nascimento: '', sexo: '',
        mae: '', pai: '', alcunha: '', profissao: '', investigation_id: '', observacoes: ''
      })
      fetchData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este alvo?')) return

    try {
      const { error } = await supabase.from('alvos').delete().eq('id', id)
      if (error) throw error
      fetchData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const formatCPF = (cpf: string) => {
    const numbers = cpf.replace(/\D/g, '')
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  const handleCPFChange = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11)
    setFormData({ ...formData, cpf: formatCPF(numbers) })
  }

  const filteredAlvos = alvos.filter(alvo => {
    const matchesSearch = alvo.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alvo.cpf?.includes(searchTerm) ||
      alvo.alcunha?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter = !filterInvestigation || alvo.investigation_id === filterInvestigation

    return matchesSearch && matchesFilter
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Alvos</h1>
          <p className="text-muted-foreground mt-1">Perfis investigativos cadastrados</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Novo Alvo
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome, CPF ou alcunha..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <select
            value={filterInvestigation}
            onChange={(e) => setFilterInvestigation(e.target.value)}
            className="input-field pl-10 pr-10 appearance-none min-w-[200px]"
          >
            <option value="">Todas investigações</option>
            {investigations.map(inv => (
              <option key={inv.id} value={inv.id}>{inv.titulo}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Lista de Alvos */}
      {filteredAlvos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAlvos.map((alvo) => (
            <div key={alvo.id} className="card p-5 card-hover">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center flex-shrink-0">
                  {alvo.foto_url ? (
                    <img src={alvo.foto_url} alt={alvo.nome} className="w-full h-full rounded-xl object-cover" />
                  ) : (
                    <User className="h-7 w-7 text-red-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{alvo.nome}</h3>
                  {alvo.alcunha && (
                    <p className="text-sm text-muted-foreground">"{alvo.alcunha}"</p>
                  )}
                  {alvo.cpf && (
                    <p className="text-xs text-muted-foreground mt-1">CPF: {alvo.cpf}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {alvo.data_nascimento && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(alvo.data_nascimento).toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
                {alvo.alvo_telefones && alvo.alvo_telefones.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{alvo.alvo_telefones[0].numero}</span>
                    {alvo.alvo_telefones.length > 1 && (
                      <span className="text-xs bg-secondary px-1.5 py-0.5 rounded">
                        +{alvo.alvo_telefones.length - 1}
                      </span>
                    )}
                  </div>
                )}
                {alvo.alvo_enderecos && alvo.alvo_enderecos.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{alvo.alvo_enderecos[0].cidade || 'N/I'}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      alvo.alvo_enderecos[0].status === 'CONFIRMADO' ? 'bg-green-500/20 text-green-400' :
                      alvo.alvo_enderecos[0].status === 'FALTA_CONFIRMAR' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {alvo.alvo_enderecos[0].status?.replace('_', ' ') || 'N/C'}
                    </span>
                  </div>
                )}
              </div>

              {alvo.investigations && (
                <div className="mb-4">
                  <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                    {alvo.investigations.titulo}
                  </span>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t border-border">
                <Link
                  href={`/dashboard/alvos/${alvo.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 text-primary hover:bg-primary/10 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  Ver
                </Link>
                <Link
                  href={`/dashboard/alvos/${alvo.id}?edit=true`}
                  className="flex items-center justify-center gap-1.5 text-blue-400 hover:bg-blue-500/10 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => handleDelete(alvo.id)}
                  className="flex items-center justify-center gap-1.5 text-red-400 hover:bg-red-500/10 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
            <Target className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">
            {searchTerm || filterInvestigation
              ? 'Nenhum alvo encontrado com os filtros aplicados'
              : 'Nenhum alvo cadastrado'}
          </p>
          <button onClick={() => setShowModal(true)} className="btn-primary mt-4">
            Cadastrar primeiro alvo
          </button>
        </div>
      )}

      {/* Modal Novo Alvo */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">Novo Alvo</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">Nome Completo *</label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value.toUpperCase() })}
                    required
                    className="input-field"
                    placeholder="NOME COMPLETO DO ALVO"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">CPF</label>
                  <input
                    type="text"
                    value={formData.cpf}
                    onChange={(e) => handleCPFChange(e.target.value)}
                    className="input-field"
                    placeholder="000.000.000-00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">RG</label>
                  <input
                    type="text"
                    value={formData.rg}
                    onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                    className="input-field"
                    placeholder="0000000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Data de Nascimento</label>
                  <input
                    type="date"
                    value={formData.data_nascimento}
                    onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Sexo</label>
                  <select
                    value={formData.sexo}
                    onChange={(e) => setFormData({ ...formData, sexo: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Selecione...</option>
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Nome da Mãe</label>
                  <input
                    type="text"
                    value={formData.mae}
                    onChange={(e) => setFormData({ ...formData, mae: e.target.value.toUpperCase() })}
                    className="input-field"
                    placeholder="NOME DA MÃE"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Nome do Pai</label>
                  <input
                    type="text"
                    value={formData.pai}
                    onChange={(e) => setFormData({ ...formData, pai: e.target.value.toUpperCase() })}
                    className="input-field"
                    placeholder="NOME DO PAI"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Alcunha / Apelido</label>
                  <input
                    type="text"
                    value={formData.alcunha}
                    onChange={(e) => setFormData({ ...formData, alcunha: e.target.value })}
                    className="input-field"
                    placeholder="Vulgo, apelido conhecido"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Profissão</label>
                  <input
                    type="text"
                    value={formData.profissao}
                    onChange={(e) => setFormData({ ...formData, profissao: e.target.value })}
                    className="input-field"
                    placeholder="Ocupação"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">Investigação Vinculada</label>
                  <select
                    value={formData.investigation_id}
                    onChange={(e) => setFormData({ ...formData, investigation_id: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Nenhuma (avulso)</option>
                    {investigations.map(inv => (
                      <option key={inv.id} value={inv.id}>{inv.titulo}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">Observações</label>
                  <textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    rows={3}
                    className="input-field"
                    placeholder="Informações adicionais relevantes..."
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  Cadastrar Alvo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
