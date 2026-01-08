"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  X,
  Calendar,
  Car,
  FileText,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  XCircle,
  Lock,
  ChevronDown
} from 'lucide-react'

interface Alvo {
  id: string
  nome: string
  cpf: string | null
  rg: string | null
  rg_orgao: string | null
  rg_uf: string | null
  data_nascimento: string | null
  sexo: string | null
  naturalidade: string | null
  nacionalidade: string | null
  mae: string | null
  pai: string | null
  estado_civil: string | null
  conjuge: string | null
  alcunha: string | null
  profissao: string | null
  foto_url: string | null
  observacoes: string | null
  investigation_id: string | null
  created_at: string
  investigations?: { titulo: string } | null
}

interface Telefone {
  id: string
  numero: string
  status: string
  whatsapp: boolean
  operadora: string | null
  classificacao: string
  confirmado: boolean
  fonte: string | null
}

interface Endereco {
  id: string
  logradouro: string
  numero: string | null
  complemento: string | null
  quadra: string | null
  lote: string | null
  bairro: string | null
  cidade: string
  uf: string
  cep: string | null
  tipo: string
  status: string
  fonte: string | null
  observacoes: string | null
}

interface Veiculo {
  id: string
  placa: string
  marca: string | null
  modelo: string | null
  ano: number | null
  cor: string | null
  situacao: string | null
}

interface Passagem {
  id: string
  data_fato: string | null
  tipo_penal: string
  artigo: string | null
  delegacia: string | null
  situacao: string | null
}

export default function AlvoDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const [alvo, setAlvo] = useState<Alvo | null>(null)
  const [telefones, setTelefones] = useState<Telefone[]>([])
  const [enderecos, setEnderecos] = useState<Endereco[]>([])
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [passagens, setPassagens] = useState<Passagem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'telefones' | 'enderecos' | 'veiculos' | 'passagens'>('telefones')

  // Modais
  const [showTelefoneModal, setShowTelefoneModal] = useState(false)
  const [showEnderecoModal, setShowEnderecoModal] = useState(false)
  const [showVeiculoModal, setShowVeiculoModal] = useState(false)
  const [showPassagemModal, setShowPassagemModal] = useState(false)

  // Forms
  const [telefoneForm, setTelefoneForm] = useState({
    numero: '', status: 'ativo', whatsapp: false, operadora: '', classificacao: 'C', confirmado: false, fonte: ''
  })
  const [enderecoForm, setEnderecoForm] = useState({
    logradouro: '', numero: '', complemento: '', quadra: '', lote: '', bairro: '', cidade: 'Goiânia', uf: 'GO', cep: '', tipo: 'residencial', status: 'NAO_CONFIRMADO', fonte: '', observacoes: ''
  })
  const [veiculoForm, setVeiculoForm] = useState({
    placa: '', marca: '', modelo: '', ano: '', cor: '', situacao: ''
  })
  const [passagemForm, setPassagemForm] = useState({
    data_fato: '', tipo_penal: '', artigo: '', delegacia: '', situacao: ''
  })

  useEffect(() => {
    if (params.id) {
      fetchAlvo()
    }
  }, [params.id])

  const fetchAlvo = async () => {
    try {
      const { data: alvoData, error: alvoError } = await supabase
        .from('alvos')
        .select('*, investigations(titulo)')
        .eq('id', params.id)
        .single()

      if (alvoError) throw alvoError
      setAlvo(alvoData)

      // Buscar dados relacionados
      const [telRes, endRes, veicRes, passRes] = await Promise.all([
        supabase.from('alvo_telefones').select('*').eq('alvo_id', params.id),
        supabase.from('alvo_enderecos').select('*').eq('alvo_id', params.id),
        supabase.from('alvo_veiculos').select('*').eq('alvo_id', params.id),
        supabase.from('alvo_passagens').select('*').eq('alvo_id', params.id)
      ])

      setTelefones(telRes.data || [])
      setEnderecos(endRes.data || [])
      setVeiculos(veicRes.data || [])
      setPassagens(passRes.data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTelefone = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase.from('alvo_telefones').insert([{
        alvo_id: params.id,
        ...telefoneForm,
        operadora: telefoneForm.operadora || null,
        fonte: telefoneForm.fonte || null
      }])
      if (error) throw error
      setShowTelefoneModal(false)
      setTelefoneForm({ numero: '', status: 'ativo', whatsapp: false, operadora: '', classificacao: 'C', confirmado: false, fonte: '' })
      fetchAlvo()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleAddEndereco = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase.from('alvo_enderecos').insert([{
        alvo_id: params.id,
        ...enderecoForm
      }])
      if (error) throw error
      setShowEnderecoModal(false)
      setEnderecoForm({ logradouro: '', numero: '', complemento: '', quadra: '', lote: '', bairro: '', cidade: 'Goiânia', uf: 'GO', cep: '', tipo: 'residencial', status: 'NAO_CONFIRMADO', fonte: '', observacoes: '' })
      fetchAlvo()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleAddVeiculo = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase.from('alvo_veiculos').insert([{
        alvo_id: params.id,
        placa: veiculoForm.placa,
        marca: veiculoForm.marca || null,
        modelo: veiculoForm.modelo || null,
        ano: veiculoForm.ano ? parseInt(veiculoForm.ano) : null,
        cor: veiculoForm.cor || null,
        situacao: veiculoForm.situacao || null
      }])
      if (error) throw error
      setShowVeiculoModal(false)
      setVeiculoForm({ placa: '', marca: '', modelo: '', ano: '', cor: '', situacao: '' })
      fetchAlvo()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleAddPassagem = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase.from('alvo_passagens').insert([{
        alvo_id: params.id,
        ...passagemForm,
        data_fato: passagemForm.data_fato || null
      }])
      if (error) throw error
      setShowPassagemModal(false)
      setPassagemForm({ data_fato: '', tipo_penal: '', artigo: '', delegacia: '', situacao: '' })
      fetchAlvo()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDeleteItem = async (table: string, id: string) => {
    if (!confirm('Excluir este item?')) return
    try {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
      fetchAlvo()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONFIRMADO': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'FALTA_CONFIRMAR': return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'NAO_CONFIRMADO': return <HelpCircle className="h-4 w-4 text-gray-500" />
      case 'INCERTO': return <XCircle className="h-4 w-4 text-red-500" />
      case 'PRESO': return <Lock className="h-4 w-4 text-purple-500" />
      default: return <HelpCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getClassificacaoColor = (c: string) => {
    switch (c) {
      case 'A+': return 'bg-green-500/20 text-green-400'
      case 'A': return 'bg-blue-500/20 text-blue-400'
      case 'B': return 'bg-yellow-500/20 text-yellow-400'
      case 'C': return 'bg-orange-500/20 text-orange-400'
      case 'D': return 'bg-red-500/20 text-red-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const calcularIdade = (dataNascimento: string) => {
    const hoje = new Date()
    const nascimento = new Date(dataNascimento)
    let idade = hoje.getFullYear() - nascimento.getFullYear()
    const m = hoje.getMonth() - nascimento.getMonth()
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--
    }
    return idade
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!alvo) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Alvo não encontrado</p>
        <Link href="/dashboard/alvos" className="btn-primary mt-4 inline-block">
          Voltar para Alvos
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{alvo.nome}</h1>
          {alvo.alcunha && <p className="text-muted-foreground">"{alvo.alcunha}"</p>}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Dados Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Foto e Info Básica */}
        <div className="card p-6">
          <div className="flex flex-col items-center mb-6">
            <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center mb-4">
              {alvo.foto_url ? (
                <img src={alvo.foto_url} alt={alvo.nome} className="w-full h-full rounded-2xl object-cover" />
              ) : (
                <User className="h-16 w-16 text-red-500" />
              )}
            </div>
            {alvo.investigations && (
              <span className="text-xs bg-primary/20 text-primary px-3 py-1 rounded-full">
                {alvo.investigations.titulo}
              </span>
            )}
          </div>

          <div className="space-y-3 text-sm">
            {alvo.cpf && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">CPF:</span>
                <span className="font-medium">{alvo.cpf}</span>
              </div>
            )}
            {alvo.rg && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">RG:</span>
                <span className="font-medium">{alvo.rg} {alvo.rg_orgao}/{alvo.rg_uf}</span>
              </div>
            )}
            {alvo.data_nascimento && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nascimento:</span>
                <span className="font-medium">
                  {new Date(alvo.data_nascimento).toLocaleDateString('pt-BR')} ({calcularIdade(alvo.data_nascimento)} anos)
                </span>
              </div>
            )}
            {alvo.sexo && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sexo:</span>
                <span className="font-medium">{alvo.sexo === 'M' ? 'Masculino' : 'Feminino'}</span>
              </div>
            )}
            {alvo.naturalidade && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Naturalidade:</span>
                <span className="font-medium">{alvo.naturalidade}</span>
              </div>
            )}
            {alvo.estado_civil && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estado Civil:</span>
                <span className="font-medium">{alvo.estado_civil}</span>
              </div>
            )}
            {alvo.profissao && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Profissão:</span>
                <span className="font-medium">{alvo.profissao}</span>
              </div>
            )}
          </div>
        </div>

        {/* Filiação e Observações */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h3 className="font-semibold text-foreground mb-4">Filiação</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground block mb-1">Mãe:</span>
                <span className="font-medium">{alvo.mae || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Pai:</span>
                <span className="font-medium">{alvo.pai || 'Não informado'}</span>
              </div>
              {alvo.conjuge && (
                <div className="md:col-span-2">
                  <span className="text-muted-foreground block mb-1">Cônjuge:</span>
                  <span className="font-medium">{alvo.conjuge}</span>
                </div>
              )}
            </div>
          </div>

          {alvo.observacoes && (
            <div className="card p-6">
              <h3 className="font-semibold text-foreground mb-4">Observações</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{alvo.observacoes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-secondary/50 rounded-xl">
        {[
          { id: 'telefones', label: 'Telefones', icon: Phone, count: telefones.length },
          { id: 'enderecos', label: 'Endereços', icon: MapPin, count: enderecos.length },
          { id: 'veiculos', label: 'Veículos', icon: Car, count: veiculos.length },
          { id: 'passagens', label: 'Passagens', icon: FileText, count: passagens.length },
        ].map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              <span className="text-xs bg-black/20 px-1.5 py-0.5 rounded">{tab.count}</span>
            </button>
          )
        })}
      </div>

      {/* Conteúdo das Tabs */}
      <div className="card p-6">
        {/* Telefones */}
        {activeTab === 'telefones' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Telefones Cadastrados</h3>
              <button onClick={() => setShowTelefoneModal(true)} className="btn-primary text-sm flex items-center gap-2">
                <Plus className="h-4 w-4" /> Adicionar
              </button>
            </div>
            {telefones.length > 0 ? (
              <div className="space-y-3">
                {telefones.map((tel) => (
                  <div key={tel.id} className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Phone className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{tel.numero}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className={`px-1.5 py-0.5 rounded ${getClassificacaoColor(tel.classificacao)}`}>
                            {tel.classificacao}
                          </span>
                          {tel.whatsapp && <span className="text-green-400">WhatsApp</span>}
                          {tel.operadora && <span>{tel.operadora}</span>}
                          <span className={tel.status === 'ativo' ? 'text-green-400' : 'text-red-400'}>
                            {tel.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteItem('alvo_telefones', tel.id)} className="text-red-400 hover:text-red-300">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhum telefone cadastrado</p>
            )}
          </div>
        )}

        {/* Endereços */}
        {activeTab === 'enderecos' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Endereços Cadastrados</h3>
              <button onClick={() => setShowEnderecoModal(true)} className="btn-primary text-sm flex items-center gap-2">
                <Plus className="h-4 w-4" /> Adicionar
              </button>
            </div>
            {enderecos.length > 0 ? (
              <div className="space-y-3">
                {enderecos.map((end) => (
                  <div key={end.id} className="flex items-start justify-between p-4 bg-secondary/50 rounded-xl">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center mt-1">
                        {getStatusIcon(end.status)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {end.logradouro}{end.numero ? `, ${end.numero}` : ''}
                          {end.quadra ? `, Qd. ${end.quadra}` : ''}
                          {end.lote ? `, Lt. ${end.lote}` : ''}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {end.bairro && `${end.bairro}, `}{end.cidade}-{end.uf}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          <span className={`px-1.5 py-0.5 rounded ${
                            end.status === 'CONFIRMADO' ? 'bg-green-500/20 text-green-400' :
                            end.status === 'FALTA_CONFIRMAR' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {end.status.replace('_', ' ')}
                          </span>
                          <span className="text-muted-foreground">{end.tipo}</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteItem('alvo_enderecos', end.id)} className="text-red-400 hover:text-red-300">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhum endereço cadastrado</p>
            )}
          </div>
        )}

        {/* Veículos */}
        {activeTab === 'veiculos' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Veículos Cadastrados</h3>
              <button onClick={() => setShowVeiculoModal(true)} className="btn-primary text-sm flex items-center gap-2">
                <Plus className="h-4 w-4" /> Adicionar
              </button>
            </div>
            {veiculos.length > 0 ? (
              <div className="space-y-3">
                {veiculos.map((veic) => (
                  <div key={veic.id} className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Car className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{veic.placa}</p>
                        <p className="text-sm text-muted-foreground">
                          {veic.marca} {veic.modelo} {veic.ano && `(${veic.ano})`} {veic.cor && `- ${veic.cor}`}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteItem('alvo_veiculos', veic.id)} className="text-red-400 hover:text-red-300">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhum veículo cadastrado</p>
            )}
          </div>
        )}

        {/* Passagens */}
        {activeTab === 'passagens' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Histórico de Passagens</h3>
              <button onClick={() => setShowPassagemModal(true)} className="btn-primary text-sm flex items-center gap-2">
                <Plus className="h-4 w-4" /> Adicionar
              </button>
            </div>
            {passagens.length > 0 ? (
              <div className="space-y-3">
                {passagens.map((pass) => (
                  <div key={pass.id} className="flex items-start justify-between p-4 bg-secondary/50 rounded-xl">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center mt-1">
                        <FileText className="h-5 w-5 text-red-500" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{pass.tipo_penal}</p>
                        <p className="text-sm text-muted-foreground">
                          {pass.artigo && `Art. ${pass.artigo}`}
                          {pass.delegacia && ` - ${pass.delegacia}`}
                        </p>
                        {pass.data_fato && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Data: {new Date(pass.data_fato).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                        {pass.situacao && (
                          <span className="text-xs bg-gray-500/20 text-gray-400 px-1.5 py-0.5 rounded mt-1 inline-block">
                            {pass.situacao}
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => handleDeleteItem('alvo_passagens', pass.id)} className="text-red-400 hover:text-red-300">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhuma passagem registrada</p>
            )}
          </div>
        )}
      </div>

      {/* Modal Telefone */}
      {showTelefoneModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">Adicionar Telefone</h2>
              <button onClick={() => setShowTelefoneModal(false)}><X className="h-6 w-6" /></button>
            </div>
            <form onSubmit={handleAddTelefone} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Número *</label>
                <input
                  type="text"
                  value={telefoneForm.numero}
                  onChange={(e) => setTelefoneForm({ ...telefoneForm, numero: e.target.value })}
                  required
                  className="input-field"
                  placeholder="(62) 99999-9999"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <select value={telefoneForm.status} onChange={(e) => setTelefoneForm({ ...telefoneForm, status: e.target.value })} className="input-field">
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Classificação</label>
                  <select value={telefoneForm.classificacao} onChange={(e) => setTelefoneForm({ ...telefoneForm, classificacao: e.target.value })} className="input-field">
                    <option value="A+">A+ (Excelente)</option>
                    <option value="A">A (Ótimo)</option>
                    <option value="B">B (Bom)</option>
                    <option value="C">C (Regular)</option>
                    <option value="D">D (Ruim)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Operadora</label>
                <input type="text" value={telefoneForm.operadora} onChange={(e) => setTelefoneForm({ ...telefoneForm, operadora: e.target.value })} className="input-field" placeholder="Claro, Vivo, Tim..." />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={telefoneForm.whatsapp} onChange={(e) => setTelefoneForm({ ...telefoneForm, whatsapp: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm">WhatsApp</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={telefoneForm.confirmado} onChange={(e) => setTelefoneForm({ ...telefoneForm, confirmado: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm">Confirmado</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Fonte da Informação</label>
                <input type="text" value={telefoneForm.fonte} onChange={(e) => setTelefoneForm({ ...telefoneForm, fonte: e.target.value })} className="input-field" placeholder="RAI, sistemas, informante..." />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowTelefoneModal(false)} className="flex-1 btn-secondary">Cancelar</button>
                <button type="submit" className="flex-1 btn-primary">Adicionar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Endereço */}
      {showEnderecoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">Adicionar Endereço</h2>
              <button onClick={() => setShowEnderecoModal(false)}><X className="h-6 w-6" /></button>
            </div>
            <form onSubmit={handleAddEndereco} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Logradouro *</label>
                <input type="text" value={enderecoForm.logradouro} onChange={(e) => setEnderecoForm({ ...enderecoForm, logradouro: e.target.value })} required className="input-field" placeholder="Rua, Avenida, etc." />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><label className="block text-sm font-medium mb-2">Número</label><input type="text" value={enderecoForm.numero} onChange={(e) => setEnderecoForm({ ...enderecoForm, numero: e.target.value })} className="input-field" /></div>
                <div><label className="block text-sm font-medium mb-2">Quadra</label><input type="text" value={enderecoForm.quadra} onChange={(e) => setEnderecoForm({ ...enderecoForm, quadra: e.target.value })} className="input-field" /></div>
                <div><label className="block text-sm font-medium mb-2">Lote</label><input type="text" value={enderecoForm.lote} onChange={(e) => setEnderecoForm({ ...enderecoForm, lote: e.target.value })} className="input-field" /></div>
                <div><label className="block text-sm font-medium mb-2">Complemento</label><input type="text" value={enderecoForm.complemento} onChange={(e) => setEnderecoForm({ ...enderecoForm, complemento: e.target.value })} className="input-field" /></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium mb-2">Bairro</label><input type="text" value={enderecoForm.bairro} onChange={(e) => setEnderecoForm({ ...enderecoForm, bairro: e.target.value })} className="input-field" /></div>
                <div><label className="block text-sm font-medium mb-2">Cidade</label><input type="text" value={enderecoForm.cidade} onChange={(e) => setEnderecoForm({ ...enderecoForm, cidade: e.target.value })} className="input-field" /></div>
                <div><label className="block text-sm font-medium mb-2">UF</label><input type="text" value={enderecoForm.uf} onChange={(e) => setEnderecoForm({ ...enderecoForm, uf: e.target.value })} className="input-field" maxLength={2} /></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium mb-2">CEP</label><input type="text" value={enderecoForm.cep} onChange={(e) => setEnderecoForm({ ...enderecoForm, cep: e.target.value })} className="input-field" placeholder="00000-000" /></div>
                <div>
                  <label className="block text-sm font-medium mb-2">Tipo</label>
                  <select value={enderecoForm.tipo} onChange={(e) => setEnderecoForm({ ...enderecoForm, tipo: e.target.value })} className="input-field">
                    <option value="residencial">Residencial</option>
                    <option value="comercial">Comercial</option>
                    <option value="eventual">Eventual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Status *</label>
                  <select value={enderecoForm.status} onChange={(e) => setEnderecoForm({ ...enderecoForm, status: e.target.value })} className="input-field">
                    <option value="CONFIRMADO">Confirmado</option>
                    <option value="FALTA_CONFIRMAR">Falta Confirmar</option>
                    <option value="NAO_CONFIRMADO">Não Confirmado</option>
                    <option value="INCERTO">Lugar Incerto</option>
                    <option value="PRESO">Preso</option>
                  </select>
                </div>
              </div>
              <div><label className="block text-sm font-medium mb-2">Fonte</label><input type="text" value={enderecoForm.fonte} onChange={(e) => setEnderecoForm({ ...enderecoForm, fonte: e.target.value })} className="input-field" placeholder="RAI, sistemas, vigilância..." /></div>
              <div><label className="block text-sm font-medium mb-2">Observações</label><textarea value={enderecoForm.observacoes} onChange={(e) => setEnderecoForm({ ...enderecoForm, observacoes: e.target.value })} rows={2} className="input-field" /></div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowEnderecoModal(false)} className="flex-1 btn-secondary">Cancelar</button>
                <button type="submit" className="flex-1 btn-primary">Adicionar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Veículo */}
      {showVeiculoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">Adicionar Veículo</h2>
              <button onClick={() => setShowVeiculoModal(false)}><X className="h-6 w-6" /></button>
            </div>
            <form onSubmit={handleAddVeiculo} className="space-y-4">
              <div><label className="block text-sm font-medium mb-2">Placa *</label><input type="text" value={veiculoForm.placa} onChange={(e) => setVeiculoForm({ ...veiculoForm, placa: e.target.value.toUpperCase() })} required className="input-field" placeholder="ABC1D23" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-2">Marca</label><input type="text" value={veiculoForm.marca} onChange={(e) => setVeiculoForm({ ...veiculoForm, marca: e.target.value })} className="input-field" placeholder="Honda, VW..." /></div>
                <div><label className="block text-sm font-medium mb-2">Modelo</label><input type="text" value={veiculoForm.modelo} onChange={(e) => setVeiculoForm({ ...veiculoForm, modelo: e.target.value })} className="input-field" placeholder="Civic, Gol..." /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-2">Ano</label><input type="number" value={veiculoForm.ano} onChange={(e) => setVeiculoForm({ ...veiculoForm, ano: e.target.value })} className="input-field" placeholder="2024" /></div>
                <div><label className="block text-sm font-medium mb-2">Cor</label><input type="text" value={veiculoForm.cor} onChange={(e) => setVeiculoForm({ ...veiculoForm, cor: e.target.value })} className="input-field" placeholder="Prata" /></div>
              </div>
              <div><label className="block text-sm font-medium mb-2">Situação</label><input type="text" value={veiculoForm.situacao} onChange={(e) => setVeiculoForm({ ...veiculoForm, situacao: e.target.value })} className="input-field" placeholder="Regular, roubado..." /></div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowVeiculoModal(false)} className="flex-1 btn-secondary">Cancelar</button>
                <button type="submit" className="flex-1 btn-primary">Adicionar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Passagem */}
      {showPassagemModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">Adicionar Passagem</h2>
              <button onClick={() => setShowPassagemModal(false)}><X className="h-6 w-6" /></button>
            </div>
            <form onSubmit={handleAddPassagem} className="space-y-4">
              <div><label className="block text-sm font-medium mb-2">Tipo Penal *</label><input type="text" value={passagemForm.tipo_penal} onChange={(e) => setPassagemForm({ ...passagemForm, tipo_penal: e.target.value })} required className="input-field" placeholder="Tráfico, Roubo, Furto..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-2">Artigo</label><input type="text" value={passagemForm.artigo} onChange={(e) => setPassagemForm({ ...passagemForm, artigo: e.target.value })} className="input-field" placeholder="33 Lei 11.343" /></div>
                <div><label className="block text-sm font-medium mb-2">Data do Fato</label><input type="date" value={passagemForm.data_fato} onChange={(e) => setPassagemForm({ ...passagemForm, data_fato: e.target.value })} className="input-field" /></div>
              </div>
              <div><label className="block text-sm font-medium mb-2">Delegacia</label><input type="text" value={passagemForm.delegacia} onChange={(e) => setPassagemForm({ ...passagemForm, delegacia: e.target.value })} className="input-field" placeholder="5ª DP, DIH..." /></div>
              <div><label className="block text-sm font-medium mb-2">Situação</label><input type="text" value={passagemForm.situacao} onChange={(e) => setPassagemForm({ ...passagemForm, situacao: e.target.value })} className="input-field" placeholder="Arquivado, condenado..." /></div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowPassagemModal(false)} className="flex-1 btn-secondary">Cancelar</button>
                <button type="submit" className="flex-1 btn-primary">Adicionar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
