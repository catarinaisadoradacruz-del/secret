"use client"

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  Brain,
  FileText,
  Send,
  Copy,
  Check,
  Loader2,
  Plus,
  Trash2,
  MessageSquare,
  X,
  ChevronDown,
  Download,
  FileOutput,
  Clock,
  Settings,
  Eye,
  Edit3,
  Save
} from 'lucide-react'

interface ChatMessage {
  id?: string
  role: 'user' | 'assistant'
  content: string
  tipo_acao?: string
  created_at?: string
}

interface ChatSession {
  id: string
  titulo: string
  tipo: string
  documento_em_construcao?: any
  status: string
  created_at: string
  updated_at: string
  investigation_id?: string
  investigations?: { titulo: string }
}

const tiposDocumento = [
  { id: 'general', nome: 'Assistente Geral' },
  { id: 'RELINT', nome: 'RELINT - Relatorio de Inteligencia' },
  { id: 'LEVANTAMENTO', nome: 'Levantamento de Enderecos' },
  { id: 'REP_INTERCEPTACAO', nome: 'Representacao - Interceptacao' },
  { id: 'REP_BA', nome: 'Representacao - Busca e Apreensao' },
  { id: 'REP_PREVENTIVA', nome: 'Representacao - Prisao Preventiva' },
  { id: 'RELATORIO', nome: 'Relatorio de Investigacao' },
  { id: 'RELATO_PC', nome: 'Relato PC' },
]

const unidades = [
  { id: 'DIH', nome: 'DIH - Homicidios' },
  { id: '4DP', nome: '4a DP Goiania' },
  { id: 'CENTRAL_FLAGRANTES', nome: 'Central de Flagrantes' },
  { id: 'ABADIA_DE_GOIAS', nome: 'Subdelegacia de Abadia de Goias' },
]

export default function AssistentePage() {
  // Estados principais
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  // Estados do documento em construcao
  const [documentoAtual, setDocumentoAtual] = useState('')
  const [showDocPreview, setShowDocPreview] = useState(false)
  const [editingDoc, setEditingDoc] = useState(false)

  // Estados de configuracao
  const [tipoDocumento, setTipoDocumento] = useState('general')
  const [unidadeSelecionada, setUnidadeSelecionada] = useState('DIH')
  const [showConfig, setShowConfig] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Carregar sessoes ao iniciar
  useEffect(() => {
    loadSessions()
  }, [])

  // Auto-scroll para ultima mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*, investigations(titulo)')
        .order('updated_at', { ascending: false })
        .limit(50)

      if (error) {
        if (error.code === '42P01') {
          // Tabela nao existe ainda
          setSessions([])
        } else {
          throw error
        }
      } else {
        setSessions(data || [])
      }
    } catch (err: any) {
      console.error('Erro ao carregar sessoes:', err)
    } finally {
      setLoadingSessions(false)
    }
  }

  const createNewSession = async () => {
    try {
      const titulo = tipoDocumento === 'general'
        ? 'Nova Conversa'
        : `${tiposDocumento.find(t => t.id === tipoDocumento)?.nome || tipoDocumento}`

      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          titulo,
          tipo: tipoDocumento,
          status: 'ativo'
        })
        .select()
        .single()

      if (error) throw error

      setSessions(prev => [data, ...prev])
      setCurrentSession(data)
      setMessages([])
      setDocumentoAtual('')
    } catch (err: any) {
      setError(err.message)
    }
  }

  const loadSession = async (session: ChatSession) => {
    setCurrentSession(session)
    setTipoDocumento(session.tipo || 'general')
    setDocumentoAtual(session.documento_em_construcao?.conteudo || '')

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (err: any) {
      console.error('Erro ao carregar mensagens:', err)
    }
  }

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Excluir esta conversa?')) return

    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId)

      if (error) throw error

      setSessions(prev => prev.filter(s => s.id !== sessionId))
      if (currentSession?.id === sessionId) {
        setCurrentSession(null)
        setMessages([])
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage,
      created_at: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setLoading(true)
    setError('')

    try {
      // Determinar o tipo de acao
      let actionType = 'general'
      if (tipoDocumento === 'RELATO_PC') actionType = 'relato_pc'
      else if (tipoDocumento === 'RELINT') actionType = 'gerar_documento'
      else if (tipoDocumento.startsWith('REP_')) actionType = 'gerar_documento'
      else if (tipoDocumento === 'LEVANTAMENTO') actionType = 'gerar_documento'
      else if (inputMessage.toLowerCase().includes('5w2h')) actionType = '5w2h'
      else if (inputMessage.toLowerCase().includes('rai')) actionType = 'analisar_rai'

      // Se estamos construindo um documento, usar continue_document
      if (documentoAtual && tipoDocumento !== 'general') {
        actionType = 'continue_document'
      }

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: inputMessage,
          type: actionType,
          sessionId: currentSession?.id,
          context: {
            tipo: tipoDocumento,
            unidade: unidadeSelecionada,
            documentoAtual
          },
          history: messages.slice(-10) // Ultimas 10 mensagens para contexto
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar')
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.response,
        tipo_acao: actionType,
        created_at: new Date().toISOString()
      }

      setMessages(prev => [...prev, assistantMessage])

      // Se for documento, atualizar preview
      if (tipoDocumento !== 'general' && actionType !== 'analisar_rai') {
        setDocumentoAtual(data.response)

        // Salvar documento na sessao
        if (currentSession) {
          await supabase
            .from('chat_sessions')
            .update({
              documento_em_construcao: { conteudo: data.response },
              updated_at: new Date().toISOString()
            })
            .eq('id', currentSession.id)
        }
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadDocument = (format: 'txt' | 'html') => {
    const content = documentoAtual
    const filename = `${tipoDocumento}_${new Date().toISOString().split('T')[0]}`

    if (format === 'txt') {
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}.txt`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      // HTML com formatacao basica
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${tipoDocumento}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
    pre { white-space: pre-wrap; font-family: inherit; }
  </style>
</head>
<body>
  <pre>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body>
</html>`
      const blob = new Blob([htmlContent], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}.html`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const saveDocument = async () => {
    if (!documentoAtual || !currentSession) return

    try {
      // Salvar como documento
      const { error } = await supabase.from('documentos').insert({
        tipo: tipoDocumento,
        titulo: `${tipoDocumento} - ${new Date().toLocaleDateString('pt-BR')}`,
        conteudo: documentoAtual,
        unidade: unidadeSelecionada,
        status: 'rascunho'
      })

      if (error) throw error
      alert('Documento salvo com sucesso!')
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* Sidebar de Sessoes */}
      {showSidebar && (
        <div className="w-72 border-r border-border flex flex-col bg-card">
          <div className="p-4 border-b border-border">
            <button
              onClick={createNewSession}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nova Conversa
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingSessions ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                Nenhuma conversa ainda
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${
                      currentSession?.id === session.id
                        ? 'bg-primary/20 text-primary'
                        : 'hover:bg-secondary text-foreground'
                    }`}
                    onClick={() => loadSession(session)}
                  >
                    <MessageSquare className="h-4 w-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{session.titulo}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(session.updated_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteSession(session.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Area Principal */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 rounded-lg hover:bg-secondary"
            >
              <MessageSquare className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-foreground">
                  {currentSession?.titulo || 'Assistente PCGO'}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {tiposDocumento.find(t => t.id === tipoDocumento)?.nome || 'Assistente Geral'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Seletor de tipo */}
            <div className="relative">
              <select
                value={tipoDocumento}
                onChange={(e) => setTipoDocumento(e.target.value)}
                className="input-field pr-8 text-sm min-w-[180px]"
              >
                {tiposDocumento.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>{tipo.nome}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>

            {/* Botao de config */}
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="p-2 rounded-lg hover:bg-secondary"
            >
              <Settings className="h-5 w-5" />
            </button>

            {/* Preview do documento */}
            {documentoAtual && (
              <button
                onClick={() => setShowDocPreview(!showDocPreview)}
                className={`p-2 rounded-lg transition-colors ${
                  showDocPreview ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
                }`}
              >
                <Eye className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Config Panel */}
        {showConfig && (
          <div className="p-4 border-b border-border bg-secondary/30">
            <div className="flex items-center gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Unidade</label>
                <select
                  value={unidadeSelecionada}
                  onChange={(e) => setUnidadeSelecionada(e.target.value)}
                  className="input-field text-sm"
                >
                  {unidades.map((u) => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Area de Mensagens / Preview */}
        <div className="flex-1 overflow-hidden flex">
          {/* Chat */}
          <div className={`flex-1 flex flex-col ${showDocPreview ? 'w-1/2' : 'w-full'}`}>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-600/20 flex items-center justify-center mb-4">
                    <Brain className="h-10 w-10 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    Assistente Investigativo PCGO
                  </h2>
                  <p className="text-muted-foreground max-w-md mb-6">
                    {tipoDocumento === 'general'
                      ? 'Posso ajudar com analise de RAI, geracao de relatos, RELINT, representacoes e muito mais.'
                      : `Vamos construir seu ${tiposDocumento.find(t => t.id === tipoDocumento)?.nome}. O que voce gostaria de adicionar?`
                    }
                  </p>
                  {!currentSession && (
                    <button onClick={createNewSession} className="btn-primary">
                      Iniciar Nova Conversa
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-foreground'
                        }`}
                      >
                        <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                        {msg.role === 'assistant' && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
                            <button
                              onClick={() => copyToClipboard(msg.content)}
                              className="text-xs flex items-center gap-1 opacity-70 hover:opacity-100"
                            >
                              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              {copied ? 'Copiado' : 'Copiar'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-secondary rounded-2xl px-4 py-3">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            {currentSession && (
              <div className="p-4 border-t border-border">
                {error && (
                  <div className="mb-3 bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-lg text-sm flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError('')}><X className="h-4 w-4" /></button>
                  </div>
                )}
                <div className="flex gap-2">
                  <textarea
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      tipoDocumento === 'general'
                        ? 'Digite sua mensagem...'
                        : 'Adicione informacoes ao documento...'
                    }
                    className="input-field flex-1 resize-none min-h-[48px] max-h-[200px]"
                    rows={1}
                    disabled={loading}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={loading || !inputMessage.trim()}
                    className="btn-primary px-4 disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Preview do Documento */}
          {showDocPreview && documentoAtual && (
            <div className="w-1/2 border-l border-border flex flex-col bg-background">
              <div className="p-3 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Preview do Documento
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingDoc(!editingDoc)}
                    className={`p-1.5 rounded-lg ${editingDoc ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={saveDocument}
                    className="p-1.5 rounded-lg hover:bg-secondary text-green-500"
                    title="Salvar documento"
                  >
                    <Save className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => downloadDocument('txt')}
                    className="p-1.5 rounded-lg hover:bg-secondary"
                    title="Download TXT"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => downloadDocument('html')}
                    className="p-1.5 rounded-lg hover:bg-secondary"
                    title="Download HTML"
                  >
                    <FileOutput className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setShowDocPreview(false)}
                    className="p-1.5 rounded-lg hover:bg-secondary"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {editingDoc ? (
                  <textarea
                    value={documentoAtual}
                    onChange={(e) => setDocumentoAtual(e.target.value)}
                    className="w-full h-full input-field font-mono text-sm resize-none"
                  />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm text-foreground font-mono bg-secondary/30 p-4 rounded-lg">
                    {documentoAtual}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
