"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { FileText, Upload, Trash2, Eye, X } from 'lucide-react'

interface RAIAnalysis {
  id: string
  investigation_id: string
  rai_numero: string | null
  file_url: string | null
  dados_extraidos: any
  analise_completa: string | null
  created_at: string
  investigations?: { titulo: string }
}

interface Investigation {
  id: string
  titulo: string
}

export default function RAIPage() {
  const [analyses, setAnalyses] = useState<RAIAnalysis[]>([])
  const [investigations, setInvestigations] = useState<Investigation[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedAnalysis, setSelectedAnalysis] = useState<RAIAnalysis | null>(null)
  const [formData, setFormData] = useState({
    investigation_id: '',
    rai_text: '',
  })
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch analyses
      const { data: analysesData, error: analysesError } = await supabase
        .from('rai_analysis')
        .select(`
          *,
          investigations (titulo)
        `)
        .order('created_at', { ascending: false })

      if (analysesError) throw analysesError
      setAnalyses(analysesData || [])

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

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setProcessing(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Não autenticado')

      // Call API to analyze RAI
      const response = await fetch('/api/rai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investigation_id: formData.investigation_id,
          rai_text: formData.rai_text,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao analisar RAI')
      }

      setShowModal(false)
      setFormData({ investigation_id: '', rai_text: '' })
      fetchData()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta análise?')) return

    try {
      const { error } = await supabase.from('rai_analysis').delete().eq('id', id)
      if (error) throw error
      fetchData()
    } catch (error: any) {
      setError(error.message)
    }
  }

  const openModal = () => {
    setFormData({ investigation_id: '', rai_text: '' })
    setShowModal(true)
  }

  const viewAnalysis = (analysis: RAIAnalysis) => {
    setSelectedAnalysis(analysis)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Análise de RAI</h1>
          <p className="text-muted-foreground mt-1">
            Análise automática de RAI com IA (Gemini)
          </p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Upload className="h-5 w-5" />
          Analisar RAI
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
            className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-semibold">
                    {analysis.rai_numero || 'RAI sem número'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {new Date(analysis.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>

            {analysis.investigations && (
              <div className="mb-4">
                <span className="text-sm text-muted-foreground">Investigação:</span>
                <p className="text-sm font-medium">{analysis.investigations.titulo}</p>
              </div>
            )}

            {analysis.dados_extraidos && (
              <div className="space-y-2 text-sm mb-4">
                {analysis.dados_extraidos.tipo_crime && (
                  <div>
                    <span className="text-muted-foreground">Crime:</span>{' '}
                    <span className="font-medium">{analysis.dados_extraidos.tipo_crime}</span>
                  </div>
                )}
                {analysis.dados_extraidos.vitima?.nome && (
                  <div>
                    <span className="text-muted-foreground">Vítima:</span>{' '}
                    <span className="font-medium">{analysis.dados_extraidos.vitima.nome}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t border-border">
              <button
                onClick={() => viewAnalysis(analysis)}
                className="flex-1 flex items-center justify-center gap-2 text-blue-500 hover:bg-blue-500/10 px-3 py-2 rounded-md transition-colors"
              >
                <Eye className="h-4 w-4" />
                Ver Detalhes
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
        ))}
      </div>

      {analyses.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            Nenhuma análise de RAI encontrada. Faça sua primeira análise!
          </p>
        </div>
      )}

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-card border border-border rounded-lg max-w-2xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Analisar RAI</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
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
                    <option key={inv.id} value={inv.id}>
                      {inv.titulo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Texto do RAI * (cole o texto completo)
                </label>
                <textarea
                  value={formData.rai_text}
                  onChange={(e) => setFormData({ ...formData, rai_text: e.target.value })}
                  required
                  rows={12}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                  placeholder="Cole aqui o texto completo do RAI..."
                />
              </div>

              <div className="bg-blue-500/10 border border-blue-500 text-blue-500 px-4 py-3 rounded-md text-sm">
                <p className="font-medium mb-1">A IA irá extrair automaticamente:</p>
                <ul className="list-disc list-inside text-xs space-y-1">
                  <li>Número do RAI e data da ocorrência</li>
                  <li>Dados da vítima e autor</li>
                  <li>Tipo de crime e narrativa dos fatos</li>
                  <li>Objetos envolvidos e testemunhas</li>
                </ul>
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
                  disabled={processing}
                  className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {processing ? 'Analisando...' : 'Analisar com IA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {selectedAnalysis && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-card border border-border rounded-lg max-w-4xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                Detalhes da Análise - {selectedAnalysis.rai_numero || 'RAI'}
              </h2>
              <button
                onClick={() => setSelectedAnalysis(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {selectedAnalysis.dados_extraidos && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-background p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Informações Básicas</h3>
                    <div className="space-y-2 text-sm">
                      {selectedAnalysis.dados_extraidos.numero_rai && (
                        <p>
                          <span className="text-muted-foreground">RAI:</span>{' '}
                          {selectedAnalysis.dados_extraidos.numero_rai}
                        </p>
                      )}
                      {selectedAnalysis.dados_extraidos.data_ocorrencia && (
                        <p>
                          <span className="text-muted-foreground">Data:</span>{' '}
                          {new Date(selectedAnalysis.dados_extraidos.data_ocorrencia).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                      {selectedAnalysis.dados_extraidos.tipo_crime && (
                        <p>
                          <span className="text-muted-foreground">Crime:</span>{' '}
                          {selectedAnalysis.dados_extraidos.tipo_crime}
                        </p>
                      )}
                      {selectedAnalysis.dados_extraidos.local_fatos && (
                        <p>
                          <span className="text-muted-foreground">Local:</span>{' '}
                          {selectedAnalysis.dados_extraidos.local_fatos}
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedAnalysis.dados_extraidos.vitima && (
                    <div className="bg-background p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Vítima</h3>
                      <div className="space-y-2 text-sm">
                        {selectedAnalysis.dados_extraidos.vitima.nome && (
                          <p>
                            <span className="text-muted-foreground">Nome:</span>{' '}
                            {selectedAnalysis.dados_extraidos.vitima.nome}
                          </p>
                        )}
                        {selectedAnalysis.dados_extraidos.vitima.cpf && (
                          <p>
                            <span className="text-muted-foreground">CPF:</span>{' '}
                            {selectedAnalysis.dados_extraidos.vitima.cpf}
                          </p>
                        )}
                        {selectedAnalysis.dados_extraidos.vitima.telefone && (
                          <p>
                            <span className="text-muted-foreground">Telefone:</span>{' '}
                            {selectedAnalysis.dados_extraidos.vitima.telefone}
                          </p>
                        )}
                        {selectedAnalysis.dados_extraidos.vitima.endereco && (
                          <p>
                            <span className="text-muted-foreground">Endereço:</span>{' '}
                            {selectedAnalysis.dados_extraidos.vitima.endereco}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {selectedAnalysis.dados_extraidos.autor && (
                  <div className="bg-background p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Autor</h3>
                    <div className="space-y-2 text-sm">
                      {selectedAnalysis.dados_extraidos.autor.nome && (
                        <p>
                          <span className="text-muted-foreground">Nome:</span>{' '}
                          {selectedAnalysis.dados_extraidos.autor.nome}
                        </p>
                      )}
                      {selectedAnalysis.dados_extraidos.autor.cpf && (
                        <p>
                          <span className="text-muted-foreground">CPF:</span>{' '}
                          {selectedAnalysis.dados_extraidos.autor.cpf}
                        </p>
                      )}
                      {selectedAnalysis.dados_extraidos.autor.caracteristicas && (
                        <p>
                          <span className="text-muted-foreground">Características:</span>{' '}
                          {selectedAnalysis.dados_extraidos.autor.caracteristicas}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {selectedAnalysis.dados_extraidos.narrativa_fatos && (
                  <div className="bg-background p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Narrativa dos Fatos</h3>
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedAnalysis.dados_extraidos.narrativa_fatos}
                    </p>
                  </div>
                )}

                {selectedAnalysis.dados_extraidos.objetos && selectedAnalysis.dados_extraidos.objetos.length > 0 && (
                  <div className="bg-background p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Objetos</h3>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {selectedAnalysis.dados_extraidos.objetos.map((obj: string, idx: number) => (
                        <li key={idx}>{obj}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedAnalysis.dados_extraidos.testemunhas && selectedAnalysis.dados_extraidos.testemunhas.length > 0 && (
                  <div className="bg-background p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Testemunhas</h3>
                    <div className="space-y-2">
                      {selectedAnalysis.dados_extraidos.testemunhas.map((testemunha: any, idx: number) => (
                        <div key={idx} className="text-sm">
                          <p>
                            <span className="font-medium">{testemunha.nome}</span>
                            {testemunha.contato && (
                              <span className="text-muted-foreground ml-2">
                                - {testemunha.contato}
                              </span>
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

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
