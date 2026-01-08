"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  FileText,
  Plus,
  Search,
  Eye,
  Download,
  Trash2,
  X,
  ChevronDown,
  Filter,
  Calendar,
  Building2,
  FileOutput
} from 'lucide-react'
import Link from 'next/link'

interface Documento {
  id: string
  tipo: string
  titulo: string
  conteudo: string
  unidade: string | null
  status: string
  investigation_id: string | null
  created_at: string
  investigations?: { titulo: string } | null
}

interface Investigation {
  id: string
  titulo: string
}

const tiposDocumento: { [key: string]: { nome: string; cor: string } } = {
  'RELINT': { nome: 'RELINT', cor: 'bg-blue-500/20 text-blue-400' },
  'LEVANTAMENTO': { nome: 'Levantamento', cor: 'bg-green-500/20 text-green-400' },
  'REP_INTERCEPTACAO': { nome: 'Rep. Interceptação', cor: 'bg-purple-500/20 text-purple-400' },
  'REP_BA': { nome: 'Rep. Busca e Apreensão', cor: 'bg-orange-500/20 text-orange-400' },
  'REP_PREVENTIVA': { nome: 'Rep. Preventiva', cor: 'bg-red-500/20 text-red-400' },
  'RELATORIO': { nome: 'Relatório', cor: 'bg-cyan-500/20 text-cyan-400' },
  'OFICIO': { nome: 'Ofício', cor: 'bg-gray-500/20 text-gray-400' },
}

export default function DocumentsPage() {
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [investigations, setInvestigations] = useState<Investigation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [error, setError] = useState('')
  const [selectedDoc, setSelectedDoc] = useState<Documento | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data: docsData, error: docsError } = await supabase
        .from('documentos')
        .select('*, investigations(titulo)')
        .order('created_at', { ascending: false })

      if (docsError) throw docsError
      setDocumentos(docsData || [])

      const { data: invData } = await supabase
        .from('investigations')
        .select('id, titulo')
        .order('titulo')

      setInvestigations(invData || [])
    } catch (err: any) {
      if (err.code === '42P01') {
        setError('Tabelas não encontradas. Execute o script SQL.')
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este documento?')) return
    try {
      const { error } = await supabase.from('documentos').delete().eq('id', id)
      if (error) throw error
      fetchData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDownload = (doc: Documento) => {
    const blob = new Blob([doc.conteudo], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${doc.titulo || doc.tipo}_${new Date(doc.created_at).toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const filteredDocs = documentos.filter(doc => {
    const matchesSearch = doc.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.tipo.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTipo = !filterTipo || doc.tipo === filterTipo
    const matchesStatus = !filterStatus || doc.status === filterStatus
    return matchesSearch && matchesTipo && matchesStatus
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
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Documentos</h1>
          <p className="text-muted-foreground mt-1">Documentos gerados pelo assistente</p>
        </div>
        <Link href="/dashboard/assistente" className="btn-primary flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Gerar Documento
        </Link>
      </div>

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
            placeholder="Buscar documentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="input-field pl-10 pr-10 appearance-none min-w-[180px]"
          >
            <option value="">Todos os tipos</option>
            {Object.entries(tiposDocumento).map(([key, { nome }]) => (
              <option key={key} value={key}>{nome}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-field pr-10 appearance-none min-w-[140px]"
          >
            <option value="">Todos status</option>
            <option value="rascunho">Rascunho</option>
            <option value="finalizado">Finalizado</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Lista de Documentos */}
      {filteredDocs.length > 0 ? (
        <div className="space-y-4">
          {filteredDocs.map((doc) => {
            const tipoInfo = tiposDocumento[doc.tipo] || { nome: doc.tipo, cor: 'bg-gray-500/20 text-gray-400' }
            return (
              <div key={doc.id} className="card p-5 card-hover">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-foreground truncate">
                          {doc.titulo || tipoInfo.nome}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded ${tipoInfo.cor}`}>
                          {tipoInfo.nome}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          doc.status === 'finalizado' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {doc.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                        </span>
                        {doc.unidade && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            {doc.unidade.replace('_', ' ')}
                          </span>
                        )}
                        {doc.investigations && (
                          <span className="truncate">{doc.investigations.titulo}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedDoc(doc)}
                      className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                      title="Visualizar"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDownload(doc)}
                      className="p-2 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors"
                      title="Download"
                    >
                      <Download className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
            <FileOutput className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">
            {searchTerm || filterTipo || filterStatus
              ? 'Nenhum documento encontrado'
              : 'Nenhum documento gerado ainda'}
          </p>
          <Link href="/dashboard/assistente" className="btn-primary mt-4 inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Gerar primeiro documento
          </Link>
        </div>
      )}

      {/* Modal Visualização */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">{selectedDoc.titulo || selectedDoc.tipo}</h2>
                <p className="text-sm text-muted-foreground">
                  Criado em {new Date(selectedDoc.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(selectedDoc)}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
                <button onClick={() => setSelectedDoc(null)}>
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="prose prose-invert max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-foreground bg-secondary/30 p-6 rounded-xl font-mono overflow-x-auto">
                {selectedDoc.conteudo}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
