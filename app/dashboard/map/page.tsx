"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  Map as MapIcon,
  MapPin,
  Radio,
  Construction,
  User,
  Navigation,
  Building2,
  RefreshCw,
  ChevronDown,
  Filter,
  Eye,
  X
} from 'lucide-react'
import Link from 'next/link'

interface AlvoEndereco {
  id: string
  alvo_id: string
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  cep: string | null
  latitude: number | null
  longitude: number | null
  tipo: string | null
  status: string | null
  alvos?: { nome: string; alcunha: string | null }
}

interface ERB {
  id: string
  erb_id: string | null
  erb_endereco: string | null
  erb_latitude: number | null
  erb_longitude: number | null
  erb_azimute: number | null
  data_hora: string
  alvos?: { nome: string } | null
}

interface Investigation {
  id: string
  titulo: string
}

export default function MapPage() {
  const [enderecos, setEnderecos] = useState<AlvoEndereco[]>([])
  const [erbs, setErbs] = useState<ERB[]>([])
  const [investigations, setInvestigations] = useState<Investigation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterInvestigation, setFilterInvestigation] = useState('')
  const [activeTab, setActiveTab] = useState<'enderecos' | 'erbs'>('enderecos')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError('')

    try {
      // Buscar enderecos dos alvos
      const { data: enderecosData, error: enderecosError } = await supabase
        .from('alvo_enderecos')
        .select(`
          *,
          alvos (nome, alcunha)
        `)
        .order('created_at', { ascending: false })

      if (enderecosError && enderecosError.code !== '42P01') {
        throw enderecosError
      }
      setEnderecos(enderecosData || [])

      // Buscar ERBs dos registros telefonicos (phone_records com erb_id)
      const { data: erbsData, error: erbsError } = await supabase
        .from('phone_records')
        .select(`
          id,
          erb_id,
          erb_endereco,
          erb_latitude,
          erb_longitude,
          erb_azimute,
          data_hora,
          alvos (nome)
        `)
        .not('erb_id', 'is', null)
        .order('data_hora', { ascending: false })
        .limit(100)

      if (erbsError && erbsError.code !== '42P01') {
        throw erbsError
      }
      setErbs(erbsData || [])

      // Buscar investigacoes para filtro
      const { data: invData, error: invError } = await supabase
        .from('investigations')
        .select('id, titulo')
        .order('titulo')

      if (invError && invError.code !== '42P01') {
        throw invError
      }
      setInvestigations(invData || [])

    } catch (err: any) {
      console.error('Erro ao carregar dados:', err)
      if (err.code === '42P01') {
        setError('Tabelas nao encontradas. Execute o script SQL no Supabase.')
      } else {
        setError(err.message || 'Erro ao carregar dados')
      }
    } finally {
      setLoading(false)
    }
  }

  const formatEndereco = (endereco: AlvoEndereco) => {
    const parts = []
    if (endereco.logradouro) {
      let logr = endereco.logradouro
      if (endereco.numero) logr += ', ' + endereco.numero
      if (endereco.complemento) logr += ' - ' + endereco.complemento
      parts.push(logr)
    }
    if (endereco.bairro) parts.push(endereco.bairro)
    if (endereco.cidade) {
      let cidade = endereco.cidade
      if (endereco.estado) cidade += '/' + endereco.estado
      parts.push(cidade)
    }
    if (endereco.cep) parts.push('CEP: ' + endereco.cep)
    return parts.join(' - ') || 'Endereco nao informado'
  }

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'CONFIRMADO':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'FALTA_CONFIRMAR':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'ANTIGO':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    }
  }

  const getTipoIcon = (tipo: string | null) => {
    switch (tipo) {
      case 'RESIDENCIAL':
        return <Building2 className="h-4 w-4" />
      case 'COMERCIAL':
        return <Building2 className="h-4 w-4" />
      case 'TRABALHO':
        return <Building2 className="h-4 w-4" />
      default:
        return <MapPin className="h-4 w-4" />
    }
  }

  // Contadores
  const enderecosComCoordenadas = enderecos.filter(e => e.latitude && e.longitude).length
  const erbsComCoordenadas = erbs.filter(e => e.erb_latitude && e.erb_longitude).length

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
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Mapa Interativo</h1>
          <p className="text-muted-foreground mt-1">
            Visualizacao geografica de alvos e ERBs
          </p>
        </div>
        <button
          onClick={fetchData}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Card de Desenvolvimento */}
      <div className="card p-6 border-2 border-dashed border-yellow-500/30 bg-yellow-500/5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
            <Construction className="h-6 w-6 text-yellow-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Modulo de Mapas em Desenvolvimento
            </h2>
            <p className="text-muted-foreground text-sm mb-4">
              O mapa interativo sera integrado em breve com Leaflet ou Google Maps API.
              Por enquanto, voce pode visualizar os enderecos e ERBs cadastrados abaixo.
            </p>
            <div className="flex flex-wrap gap-3">
              <div className="bg-blue-500/10 border border-blue-500/30 text-blue-400 px-3 py-2 rounded-lg text-sm">
                <span className="font-medium">Funcionalidades planejadas:</span>
                <ul className="list-disc list-inside mt-1 text-xs space-y-0.5">
                  <li>Marcadores de alvos e enderecos</li>
                  <li>Posicoes de ERBs com azimute</li>
                  <li>Timeline de deslocamentos</li>
                  <li>Heatmap de atividades</li>
                  <li>Filtros por investigacao</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Estatisticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{enderecos.length}</p>
              <p className="text-xs text-muted-foreground">Enderecos</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Navigation className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{enderecosComCoordenadas}</p>
              <p className="text-xs text-muted-foreground">Com Coordenadas</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Radio className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{erbs.length}</p>
              <p className="text-xs text-muted-foreground">ERBs Registradas</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <MapIcon className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{erbsComCoordenadas}</p>
              <p className="text-xs text-muted-foreground">ERBs Geolocalizadas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('enderecos')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'enderecos'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <MapPin className="h-4 w-4 inline mr-2" />
          Enderecos de Alvos ({enderecos.length})
        </button>
        <button
          onClick={() => setActiveTab('erbs')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'erbs'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Radio className="h-4 w-4 inline mr-2" />
          ERBs ({erbs.length})
        </button>
      </div>

      {/* Lista de Enderecos */}
      {activeTab === 'enderecos' && (
        <>
          {enderecos.length > 0 ? (
            <div className="space-y-3">
              {enderecos.map((endereco) => (
                <div key={endereco.id} className="card p-4 card-hover">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                      {getTipoIcon(endereco.tipo)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="font-medium text-foreground">
                            {endereco.alvos?.nome || 'Alvo nao identificado'}
                          </p>
                          {endereco.alvos?.alcunha && (
                            <p className="text-xs text-muted-foreground">"{endereco.alvos.alcunha}"</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {endereco.tipo && (
                            <span className="text-xs bg-secondary px-2 py-1 rounded">
                              {endereco.tipo}
                            </span>
                          )}
                          {endereco.status && (
                            <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(endereco.status)}`}>
                              {endereco.status.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {formatEndereco(endereco)}
                      </p>
                      {(endereco.latitude && endereco.longitude) ? (
                        <div className="flex items-center gap-2 text-xs">
                          <Navigation className="h-3 w-3 text-green-500" />
                          <span className="text-green-400 font-mono">
                            {endereco.latitude.toFixed(6)}, {endereco.longitude.toFixed(6)}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs">
                          <Navigation className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Coordenadas nao informadas</span>
                        </div>
                      )}
                    </div>
                    <Link
                      href={`/dashboard/alvos/${endereco.alvo_id}`}
                      className="text-primary hover:bg-primary/10 p-2 rounded-lg transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Nenhum endereco de alvo cadastrado</p>
              <Link href="/dashboard/alvos" className="btn-primary mt-4 inline-block">
                Ir para Alvos
              </Link>
            </div>
          )}
        </>
      )}

      {/* Lista de ERBs */}
      {activeTab === 'erbs' && (
        <>
          {erbs.length > 0 ? (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">ERB ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Endereco</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Coordenadas</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Azimute</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Alvo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Data/Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {erbs.map((erb) => (
                      <tr key={erb.id} className="hover:bg-accent/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Radio className="h-4 w-4 text-orange-500" />
                            <span className="text-sm font-mono">{erb.erb_id || '-'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted-foreground">
                            {erb.erb_endereco || 'Nao informado'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {(erb.erb_latitude && erb.erb_longitude) ? (
                            <span className="text-xs font-mono text-green-400">
                              {erb.erb_latitude.toFixed(6)}, {erb.erb_longitude.toFixed(6)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {erb.erb_azimute ? (
                            <span className="text-sm">{erb.erb_azimute}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm">{erb.alvos?.nome || '-'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground">
                            {new Date(erb.data_hora).toLocaleString('pt-BR')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
                <Radio className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Nenhuma ERB registrada</p>
              <p className="text-xs text-muted-foreground mt-2">
                ERBs sao registradas atraves dos registros telefonicos
              </p>
              <Link href="/dashboard/phone-records" className="btn-primary mt-4 inline-block">
                Ir para Registros Telefonicos
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}
