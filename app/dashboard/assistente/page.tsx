"use client"

import { useState, useRef } from 'react'
import {
  Brain,
  FileText,
  Users,
  FileOutput,
  Upload,
  Send,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  Download,
  X,
  ChevronDown
} from 'lucide-react'

type TabType = 'rai' | 'relato' | 'alvos' | 'documentos'

interface Alvo {
  tipo: string
  nome: string
  cpf: string
  data_nascimento: string
  mae: string
  endereco: string
  telefone: string
}

interface RAIAnalise {
  numero_rai: string
  data_fato: string
  local_fato: string
  tipificacao: string
  pessoas: Alvo[]
  objetos_apreendidos: string[]
  diligencias_sugeridas: string[]
  observacoes: string
}

export default function AssistentePage() {
  const [activeTab, setActiveTab] = useState<TabType>('rai')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [result, setResult] = useState('')
  const [raiAnalise, setRaiAnalise] = useState<RAIAnalise | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estados dos formulários
  const [raiText, setRaiText] = useState('')
  const [relatoText, setRelatoText] = useState('')
  const [relatoMenor, setRelatoMenor] = useState(false)
  const [relatoDomestica, setRelatoDomestica] = useState(false)
  const [docTipo, setDocTipo] = useState('RELINT')
  const [docUnidade, setDocUnidade] = useState('ABADIA_DE_GOIAS')
  const [docDados, setDocDados] = useState('')
  const [analise5w2h, setAnalise5w2h] = useState('')

  const tabs = [
    { id: 'rai' as TabType, label: 'Análise RAI', icon: FileText },
    { id: 'relato' as TabType, label: 'Relato PC', icon: FileOutput },
    { id: 'alvos' as TabType, label: 'Gestão Alvos', icon: Users },
    { id: 'documentos' as TabType, label: 'Gerar Docs', icon: FileOutput },
  ]

  const unidades = [
    { id: 'ABADIA_DE_GOIAS', nome: 'Subdelegacia de Abadia de Goiás' },
    { id: 'DIH', nome: 'DIH - Homicídios' },
    { id: '4DP_GOIANIA', nome: '4ª DP Goiânia' },
    { id: 'CENTRAL_FLAGRANTES', nome: 'Central de Flagrantes' },
  ]

  const tiposDocumento = [
    { id: 'RELINT', nome: 'RELINT - Relatório de Inteligência' },
    { id: 'LEVANTAMENTO', nome: 'Levantamento de Endereços' },
    { id: 'REP_INTERCEPTACAO', nome: 'Representação - Interceptação Telefônica' },
    { id: 'REP_BA', nome: 'Representação - Busca e Apreensão' },
    { id: 'REP_PREVENTIVA', nome: 'Representação - Prisão Preventiva' },
    { id: 'RELATORIO', nome: 'Relatório de Investigação' },
    { id: 'OFICIO', nome: 'Ofício' },
  ]

  const callGemini = async (prompt: string, type: string, context?: any) => {
    setLoading(true)
    setError('')
    setResult('')
    setRaiAnalise(null)

    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, type, context })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar')
      }

      // Se for análise de RAI, tentar parsear JSON
      if (type === 'analisar_rai') {
        try {
          // Extrair JSON da resposta
          const jsonMatch = data.response.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            setRaiAnalise(parsed)
          }
        } catch (e) {
          // Se não conseguir parsear, mostrar texto
          setResult(data.response)
        }
      } else {
        setResult(data.response)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAnalisarRAI = () => {
    if (!raiText.trim()) {
      setError('Cole o texto do RAI para analisar')
      return
    }
    callGemini(raiText, 'analisar_rai')
  }

  const handleGerarRelato = () => {
    if (!relatoText.trim()) {
      setError('Descreva o fato ocorrido')
      return
    }
    let prompt = relatoText
    if (relatoMenor) prompt += '\n\nOBS: Vítima é MENOR DE IDADE (aplicar ECA)'
    if (relatoDomestica) prompt += '\n\nOBS: Caso de VIOLÊNCIA DOMÉSTICA (aplicar Maria da Penha)'
    callGemini(prompt, 'relato_pc')
  }

  const handleAplicar5W2H = () => {
    if (!analise5w2h.trim()) {
      setError('Descreva o caso para análise 5W2H')
      return
    }
    callGemini(analise5w2h, '5w2h')
  }

  const handleGerarDocumento = () => {
    if (!docDados.trim()) {
      setError('Forneça os dados para o documento')
      return
    }
    callGemini(docDados, 'gerar_documento', { tipo: docTipo, unidade: docUnidade })
  }

  const handleCopy = () => {
    const textToCopy = raiAnalise ? JSON.stringify(raiAnalise, null, 2) : result
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type === 'application/pdf') {
      setError('Upload de PDF em desenvolvimento. Por favor, cole o texto do RAI.')
      return
    }

    // Ler arquivo de texto
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setRaiText(text)
    }
    reader.readAsText(file)
  }

  const limpar = () => {
    setResult('')
    setRaiAnalise(null)
    setError('')
    setRaiText('')
    setRelatoText('')
    setDocDados('')
    setAnalise5w2h('')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Assistente IA</h1>
              <p className="text-muted-foreground">Sistema Investigativo PCGO</p>
            </div>
          </div>
        </div>
        <button
          onClick={limpar}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Limpar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-secondary/50 rounded-xl">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Painel de Entrada */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4 text-foreground">
            {activeTab === 'rai' && 'Análise de RAI'}
            {activeTab === 'relato' && 'Elaborar Relato PC'}
            {activeTab === 'alvos' && 'Gestão de Alvos - 5W2H'}
            {activeTab === 'documentos' && 'Gerar Documento'}
          </h2>

          {/* TAB: Análise RAI */}
          {activeTab === 'rai' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Texto do RAI
                </label>
                <textarea
                  value={raiText}
                  onChange={(e) => setRaiText(e.target.value)}
                  placeholder="Cole aqui o texto completo do RAI para análise..."
                  className="input-field min-h-[300px] font-mono text-sm"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".txt,.pdf"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-foreground hover:bg-secondary/80"
                >
                  <Upload className="h-4 w-4" />
                  Upload
                </button>
                <button
                  onClick={handleAnalisarRAI}
                  disabled={loading || !raiText.trim()}
                  className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Analisar RAI
                </button>
              </div>
            </div>
          )}

          {/* TAB: Relato PC */}
          {activeTab === 'relato' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Descrição do Fato
                </label>
                <textarea
                  value={relatoText}
                  onChange={(e) => setRelatoText(e.target.value)}
                  placeholder="Descreva o fato ocorrido com todos os detalhes relevantes (data, hora, local, envolvidos, circunstâncias)..."
                  className="input-field min-h-[200px]"
                />
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={relatoMenor}
                    onChange={(e) => setRelatoMenor(e.target.checked)}
                    className="w-4 h-4 rounded border-border"
                  />
                  <span className="text-sm text-foreground">Vítima menor de idade</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={relatoDomestica}
                    onChange={(e) => setRelatoDomestica(e.target.checked)}
                    className="w-4 h-4 rounded border-border"
                  />
                  <span className="text-sm text-foreground">Violência doméstica</span>
                </label>
              </div>
              <button
                onClick={handleGerarRelato}
                disabled={loading || !relatoText.trim()}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileOutput className="h-4 w-4" />
                )}
                Gerar Relato PC
              </button>
            </div>
          )}

          {/* TAB: Gestão Alvos / 5W2H */}
          {activeTab === 'alvos' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Descrição do Caso para Análise 5W2H
                </label>
                <textarea
                  value={analise5w2h}
                  onChange={(e) => setAnalise5w2h(e.target.value)}
                  placeholder="Descreva o caso ou investigação para aplicar a metodologia 5W2H (What, Why, Where, When, Who, How, How Much)..."
                  className="input-field min-h-[200px]"
                />
              </div>
              <div className="p-4 bg-secondary/50 rounded-lg">
                <h3 className="font-medium text-foreground mb-2">Metodologia 5W2H:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li><strong>WHAT:</strong> O que aconteceu?</li>
                  <li><strong>WHY:</strong> Por que/qual motivação?</li>
                  <li><strong>WHERE:</strong> Onde ocorreu?</li>
                  <li><strong>WHEN:</strong> Quando ocorreu?</li>
                  <li><strong>WHO:</strong> Quem são os envolvidos?</li>
                  <li><strong>HOW:</strong> Como foi executado?</li>
                  <li><strong>HOW MUCH:</strong> Qual o prejuízo/quantidade?</li>
                </ul>
              </div>
              <button
                onClick={handleAplicar5W2H}
                disabled={loading || !analise5w2h.trim()}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4" />
                )}
                Aplicar 5W2H
              </button>
            </div>
          )}

          {/* TAB: Gerar Documentos */}
          {activeTab === 'documentos' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Tipo de Documento
                </label>
                <div className="relative">
                  <select
                    value={docTipo}
                    onChange={(e) => setDocTipo(e.target.value)}
                    className="input-field appearance-none pr-10"
                  >
                    {tiposDocumento.map((tipo) => (
                      <option key={tipo.id} value={tipo.id}>{tipo.nome}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Unidade PCGO
                </label>
                <div className="relative">
                  <select
                    value={docUnidade}
                    onChange={(e) => setDocUnidade(e.target.value)}
                    className="input-field appearance-none pr-10"
                  >
                    {unidades.map((unidade) => (
                      <option key={unidade.id} value={unidade.id}>{unidade.nome}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Dados para o Documento
                </label>
                <textarea
                  value={docDados}
                  onChange={(e) => setDocDados(e.target.value)}
                  placeholder="Forneça todos os dados necessários para gerar o documento: alvos, endereços, telefones, justificativa, etc..."
                  className="input-field min-h-[200px]"
                />
              </div>
              <button
                onClick={handleGerarDocumento}
                disabled={loading || !docDados.trim()}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileOutput className="h-4 w-4" />
                )}
                Gerar Documento
              </button>
            </div>
          )}
        </div>

        {/* Painel de Resultado */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Resultado</h2>
            {(result || raiAnalise) && (
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 text-sm"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-green-500" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copiar
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Processando com IA...</p>
            </div>
          )}

          {!loading && !result && !raiAnalise && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Brain className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                Os resultados aparecerão aqui após o processamento
              </p>
            </div>
          )}

          {/* Resultado de Análise RAI */}
          {raiAnalise && (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <h3 className="font-semibold text-primary mb-2">RAI Analisado</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>Número:</strong> {raiAnalise.numero_rai || 'N/I'}</div>
                  <div><strong>Data:</strong> {raiAnalise.data_fato || 'N/I'}</div>
                  <div className="col-span-2"><strong>Local:</strong> {raiAnalise.local_fato || 'N/I'}</div>
                  <div className="col-span-2"><strong>Tipificação:</strong> {raiAnalise.tipificacao || 'N/I'}</div>
                </div>
              </div>

              {raiAnalise.pessoas && raiAnalise.pessoas.length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Pessoas Envolvidas</h3>
                  <div className="space-y-2">
                    {raiAnalise.pessoas.map((pessoa, index) => (
                      <div key={index} className="p-3 bg-secondary/50 rounded-lg text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            pessoa.tipo === 'AUTOR' ? 'bg-red-500/20 text-red-400' :
                            pessoa.tipo === 'VITIMA' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {pessoa.tipo}
                          </span>
                          <strong>{pessoa.nome}</strong>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                          <div>CPF: {pessoa.cpf || 'N/I'}</div>
                          <div>DN: {pessoa.data_nascimento || 'N/I'}</div>
                          <div className="col-span-2">Mãe: {pessoa.mae || 'N/I'}</div>
                          <div className="col-span-2">End: {pessoa.endereco || 'N/I'}</div>
                          <div className="col-span-2">Tel: {pessoa.telefone || 'N/I'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {raiAnalise.objetos_apreendidos && raiAnalise.objetos_apreendidos.length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Objetos Apreendidos</h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    {raiAnalise.objetos_apreendidos.map((obj, index) => (
                      <li key={index}>{obj}</li>
                    ))}
                  </ul>
                </div>
              )}

              {raiAnalise.diligencias_sugeridas && raiAnalise.diligencias_sugeridas.length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Diligências Sugeridas</h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    {raiAnalise.diligencias_sugeridas.map((dil, index) => (
                      <li key={index}>{dil}</li>
                    ))}
                  </ul>
                </div>
              )}

              {raiAnalise.observacoes && (
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Observações</h3>
                  <p className="text-sm text-muted-foreground">{raiAnalise.observacoes}</p>
                </div>
              )}
            </div>
          )}

          {/* Resultado de Texto (Relato PC, Documentos, 5W2H) */}
          {result && !raiAnalise && (
            <div className="prose prose-invert max-w-none max-h-[600px] overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-foreground bg-secondary/30 p-4 rounded-lg font-mono">
                {result}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Informações */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-500" />
            </div>
            <h3 className="font-semibold text-foreground">Análise RAI</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Extrai automaticamente dados de RAIs: envolvidos, endereços, telefones, tipificação criminal.
          </p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <FileOutput className="h-5 w-5 text-green-500" />
            </div>
            <h3 className="font-semibold text-foreground">Relato PC</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Gera relatos técnicos com linguagem jurídica, blocos automáticos para Maria da Penha e ECA.
          </p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Brain className="h-5 w-5 text-purple-500" />
            </div>
            <h3 className="font-semibold text-foreground">Documentos</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Gera RELINT, Levantamentos, Representações judiciais com formatação oficial PCGO.
          </p>
        </div>
      </div>
    </div>
  )
}
