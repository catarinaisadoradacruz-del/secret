"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Upload, Trash2, Eye, X, Image as ImageIcon } from 'lucide-react'
import { useDropzone } from 'react-dropzone'

interface ForensicAnalysis {
  id: string
  investigation_id: string
  tipo: string
  file_url: string
  thumbnail_url: string | null
  analise_gemini: any
  observacoes: string | null
  created_at: string
  investigations?: { titulo: string }
}

interface Investigation {
  id: string
  titulo: string
}

export default function ForensicPage() {
  const [analyses, setAnalyses] = useState<ForensicAnalysis[]>([])
  const [investigations, setInvestigations] = useState<Investigation[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedAnalysis, setSelectedAnalysis] = useState<ForensicAnalysis | null>(null)
  const [formData, setFormData] = useState({
    investigation_id: '',
    observacoes: '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setFile(acceptedFiles[0])
      }
    },
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data: analysesData, error: analysesError } = await supabase
        .from('forensic_analysis')
        .select(`
          *,
          investigations (titulo)
        `)
        .order('created_at', { ascending: false })

      if (analysesError) throw analysesError
      setAnalyses(analysesData || [])

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

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('Selecione uma imagem')
      return
    }

    setError('')
    setProcessing(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Não autenticado')

      // Convert file to base64
      const reader = new FileReader()
      reader.readAsDataURL(file)

      reader.onload = async () => {
        const base64Image = reader.result as string

        // Call API to analyze
        const response = await fetch('/api/forensic/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            investigation_id: formData.investigation_id,
            imageData: base64Image,
            mimeType: file.type,
            observacoes: formData.observacoes,
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Erro ao analisar imagem')
        }

        setShowModal(false)
        setFile(null)
        setFormData({ investigation_id: '', observacoes: '' })
        fetchData()
        setProcessing(false)
      }

      reader.onerror = () => {
        setError('Erro ao ler arquivo')
        setProcessing(false)
      }
    } catch (error: any) {
      setError(error.message)
      setProcessing(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta análise?')) return

    try {
      const { error } = await supabase.from('forensic_analysis').delete().eq('id', id)
      if (error) throw error
      fetchData()
    } catch (error: any) {
      setError(error.message)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Análise Forense</h1>
          <p className="text-muted-foreground mt-1">
            Análise de imagens e vídeos com IA (Gemini Vision)
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Upload className="h-5 w-5" />
          Analisar Imagem
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {analyses.map((analysis) => (
          <div
            key={analysis.id}
            className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
          >
            {analysis.thumbnail_url || analysis.file_url ? (
              <div className="aspect-video bg-muted relative">
                <img
                  src={analysis.thumbnail_url || analysis.file_url}
                  alt="Análise"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-video bg-muted flex items-center justify-center">
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
              </div>
            )}

            <div className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-500">
                  {analysis.tipo}
                </span>
              </div>

              {analysis.investigations && (
                <div className="mb-4">
                  <span className="text-sm text-muted-foreground">Investigação:</span>
                  <p className="text-sm font-medium">{analysis.investigations.titulo}</p>
                </div>
              )}

              {analysis.analise_gemini?.descricao_geral && (
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                  {analysis.analise_gemini.descricao_geral}
                </p>
              )}

              <div className="flex gap-2 pt-4 border-t border-border">
                <button
                  onClick={() => setSelectedAnalysis(analysis)}
                  className="flex-1 flex items-center justify-center gap-2 text-blue-500 hover:bg-blue-500/10 px-3 py-2 rounded-md transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  Detalhes
                </button>
                <button
                  onClick={() => handleDelete(analysis.id)}
                  className="flex-1 flex items-center justify-center gap-2 text-destructive hover:bg-destructive/10 px-3 py-2 rounded-md transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {analyses.length === 0 && (
        <div className="text-center py-12">
          <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            Nenhuma análise forense encontrada. Faça sua primeira análise!
          </p>
        </div>
      )}

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-lg max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Analisar Imagem</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleAnalyze} className="space-y-4">
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
                <label className="block text-sm font-medium mb-2">Imagem *</label>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <input {...getInputProps()} />
                  {file ? (
                    <div>
                      <ImageIcon className="h-12 w-12 mx-auto mb-2 text-primary" />
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Arraste uma imagem ou clique para selecionar
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Observações</label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Observações adicionais sobre a análise..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
                  disabled={processing}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processing || !file}
                  className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {processing ? 'Analisando...' : 'Analisar com IA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedAnalysis && selectedAnalysis.analise_gemini && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-card border border-border rounded-lg max-w-4xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Detalhes da Análise Forense</h2>
              <button onClick={() => setSelectedAnalysis(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {selectedAnalysis.file_url && (
                <div className="bg-background p-4 rounded-lg">
                  <img
                    src={selectedAnalysis.file_url}
                    alt="Análise"
                    className="w-full rounded-lg"
                  />
                </div>
              )}

              {selectedAnalysis.analise_gemini.descricao_geral && (
                <div className="bg-background p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Descrição Geral</h3>
                  <p className="text-sm">{selectedAnalysis.analise_gemini.descricao_geral}</p>
                </div>
              )}

              {selectedAnalysis.analise_gemini.elementos_relevantes?.length > 0 && (
                <div className="bg-background p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Elementos Relevantes</h3>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {selectedAnalysis.analise_gemini.elementos_relevantes.map((elem: string, idx: number) => (
                      <li key={idx}>{elem}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedAnalysis.analise_gemini.caracteristicas_identificaveis?.length > 0 && (
                <div className="bg-background p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Características Identificáveis</h3>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {selectedAnalysis.analise_gemini.caracteristicas_identificaveis.map((char: string, idx: number) => (
                      <li key={idx}>{char}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedAnalysis.analise_gemini.evidencias?.length > 0 && (
                <div className="bg-background p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Evidências</h3>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {selectedAnalysis.analise_gemini.evidencias.map((ev: string, idx: number) => (
                      <li key={idx}>{ev}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedAnalysis.observacoes && (
                <div className="bg-background p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Observações</h3>
                  <p className="text-sm">{selectedAnalysis.observacoes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedAnalysis(null)}
                className="px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
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
