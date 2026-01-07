"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { FileText, Plus, Trash2, Download, Eye } from 'lucide-react'

interface Document {
  id: string
  investigation_id: string
  tipo: string
  titulo: string
  conteudo: any
  file_url: string | null
  created_at: string
  investigations?: { titulo: string }
}

interface Investigation {
  id: string
  titulo: string
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [investigations, setInvestigations] = useState<Investigation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data: documentsData, error: documentsError } = await supabase
        .from('documents')
        .select(`
          *,
          investigations (titulo)
        `)
        .order('created_at', { ascending: false })

      if (documentsError) throw documentsError
      setDocuments(documentsData || [])

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

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return

    try {
      const { error } = await supabase.from('documents').delete().eq('id', id)
      if (error) throw error
      fetchData()
    } catch (error: any) {
      setError(error.message)
    }
  }

  const getDocumentTypeColor = (tipo: string) => {
    switch (tipo) {
      case 'RELINT':
        return 'bg-blue-500/10 text-blue-500'
      case 'Representação Prisão':
        return 'bg-red-500/10 text-red-500'
      case 'Representação Busca':
        return 'bg-orange-500/10 text-orange-500'
      case 'Representação Quebra Sigilo':
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
          <h1 className="text-3xl font-bold">Documentos</h1>
          <p className="text-muted-foreground mt-1">
            Geração de documentos policiais com logos PCGO
          </p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500 text-blue-500 px-4 py-2 rounded-lg text-sm">
          <p className="font-medium">Módulo em Desenvolvimento</p>
          <p className="text-xs mt-1">Geração de RELINT, Representações, etc.</p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {documents.map((document) => (
          <div
            key={document.id}
            className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center shrink-0">
                <FileText className="h-6 w-6 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold mb-1 truncate">{document.titulo}</h3>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getDocumentTypeColor(document.tipo)}`}>
                  {document.tipo}
                </span>
              </div>
            </div>

            {document.investigations && (
              <div className="mb-4">
                <span className="text-sm text-muted-foreground">Investigação:</span>
                <p className="text-sm font-medium">{document.investigations.titulo}</p>
              </div>
            )}

            <p className="text-xs text-muted-foreground mb-4">
              Criado em {new Date(document.created_at).toLocaleDateString('pt-BR')}
            </p>

            <div className="flex gap-2 pt-4 border-t border-border">
              <button
                className="flex-1 flex items-center justify-center gap-2 text-blue-500 hover:bg-blue-500/10 px-3 py-2 rounded-md transition-colors"
                disabled
              >
                <Eye className="h-4 w-4" />
                Visualizar
              </button>
              {document.file_url && (
                <button
                  className="flex-1 flex items-center justify-center gap-2 text-green-500 hover:bg-green-500/10 px-3 py-2 rounded-md transition-colors"
                >
                  <Download className="h-4 w-4" />
                  PDF
                </button>
              )}
              <button
                onClick={() => handleDelete(document.id)}
                className="flex items-center justify-center gap-2 text-destructive hover:bg-destructive/10 px-3 py-2 rounded-md transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {documents.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">
            Nenhum documento encontrado.
          </p>
          <div className="max-w-lg mx-auto bg-card border border-border rounded-lg p-6">
            <h3 className="font-semibold mb-3">Tipos de Documentos Disponíveis:</h3>
            <ul className="text-sm text-left space-y-2">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span>RELINT - Relatório de Inteligência</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                <span>Representação por Prisão Preventiva/Temporária</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                <span>Representação por Busca e Apreensão</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                <span>Representação por Quebra de Sigilo</span>
              </li>
            </ul>
            <p className="text-xs text-muted-foreground mt-4">
              Todos os documentos gerados incluirão automaticamente os brasões da PCGO
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
