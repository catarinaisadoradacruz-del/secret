"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
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
  Save,
  Upload,
  Paperclip,
  Image as ImageIcon,
  FileImage,
  File,
  FileSpreadsheet,
  Pencil,
  RefreshCw,
  RotateCcw,
  Eraser
} from 'lucide-react'

interface ChatMessage {
  id?: string
  role: 'user' | 'assistant'
  content: string
  tipo_acao?: string
  created_at?: string
  attachments?: ChatAttachment[]
}

interface ChatAttachment {
  id: string
  nome_arquivo: string
  tipo_arquivo: string
  tamanho: number
  mime_type: string
  conteudo_extraido?: string
  url_storage?: string
  metadata?: any
  created_at: string
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

// Funcao para identificar tipo de arquivo pelo MIME
const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <FileImage className="h-5 w-5 text-purple-400" />
  if (mimeType.includes('pdf')) return <FileText className="h-5 w-5 text-red-400" />
  if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className="h-5 w-5 text-blue-400" />
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return <FileSpreadsheet className="h-5 w-5 text-green-400" />
  return <File className="h-5 w-5 text-gray-400" />
}

// Formatar tamanho de arquivo
const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

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

  // Estados de edicao de sessao
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingSessionTitle, setEditingSessionTitle] = useState('')

  // Estados de upload de arquivos
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [sessionAttachments, setSessionAttachments] = useState<ChatAttachment[]>([])
  const [showAttachments, setShowAttachments] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)

  // Estados de edicao de mensagem
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null)
  const [editingMessageContent, setEditingMessageContent] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Carregar sessoes ao iniciar
  useEffect(() => {
    loadSessions()
  }, [])

  // Auto-scroll para ultima mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Carregar anexos quando mudar a sessao
  useEffect(() => {
    if (currentSession) {
      loadSessionAttachments(currentSession.id)
    } else {
      setSessionAttachments([])
    }
  }, [currentSession])

  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*, investigations(titulo)')
        .order('updated_at', { ascending: false })
        .limit(50)

      if (error) {
        if (error.code === '42P01') {
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

  const loadSessionAttachments = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_attachments')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })

      if (error && error.code !== '42P01') throw error
      setSessionAttachments(data || [])
    } catch (err: any) {
      console.error('Erro ao carregar anexos:', err)
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
      setSessionAttachments([])
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
        setSessionAttachments([])
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Funcao para editar o titulo da sessao
  const startEditingSession = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingSessionId(session.id)
    setEditingSessionTitle(session.titulo)
  }

  const saveSessionTitle = async (sessionId: string) => {
    if (!editingSessionTitle.trim()) {
      setEditingSessionId(null)
      return
    }

    try {
      const { error } = await supabase
        .from('chat_sessions')
        .update({
          titulo: editingSessionTitle.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      if (error) throw error

      setSessions(prev => prev.map(s =>
        s.id === sessionId ? { ...s, titulo: editingSessionTitle.trim() } : s
      ))

      if (currentSession?.id === sessionId) {
        setCurrentSession(prev => prev ? { ...prev, titulo: editingSessionTitle.trim() } : null)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setEditingSessionId(null)
    }
  }

  // Funcoes de upload de arquivos
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setPendingFiles(prev => [...prev, ...files])
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      setPendingFiles(prev => [...prev, ...files])
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index))
  }

  const processAndUploadFiles = async (files: File[], sessionId: string, messageId?: string) => {
    const uploadedAttachments: ChatAttachment[] = []

    for (const file of files) {
      try {
        let conteudoExtraido = ''
        let base64Data = ''

        // Ler o arquivo
        const arrayBuffer = await file.arrayBuffer()
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        )
        base64Data = base64

        // Processar com base no tipo
        if (file.type.startsWith('image/')) {
          // Para imagens, usar Gemini Vision para OCR
          try {
            const ocrResponse = await fetch('/api/gemini', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt: 'Extraia todo o texto visivel nesta imagem. Se houver tabelas, formate-as de forma estruturada. Se houver documentos, transcreva o conteudo completo.',
                type: 'ocr',
                imageData: {
                  mimeType: file.type,
                  data: base64
                }
              })
            })

            if (ocrResponse.ok) {
              const ocrData = await ocrResponse.json()
              conteudoExtraido = ocrData.response || ''
            }
          } catch (err) {
            console.error('Erro no OCR:', err)
          }
        } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
          // Arquivos de texto
          conteudoExtraido = await file.text()
        } else if (file.type === 'application/pdf') {
          // PDF - enviar para API processar
          try {
            const pdfResponse = await fetch('/api/gemini', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt: 'Extraia todo o texto deste documento PDF.',
                type: 'pdf_extract',
                fileData: {
                  mimeType: file.type,
                  data: base64,
                  name: file.name
                }
              })
            })

            if (pdfResponse.ok) {
              const pdfData = await pdfResponse.json()
              conteudoExtraido = pdfData.response || ''
            }
          } catch (err) {
            console.error('Erro ao processar PDF:', err)
          }
        }

        // Salvar no banco de dados
        const { data: attachment, error } = await supabase
          .from('chat_attachments')
          .insert({
            session_id: sessionId,
            message_id: messageId || null,
            nome_arquivo: file.name,
            tipo_arquivo: file.type.split('/')[0],
            tamanho: file.size,
            mime_type: file.type,
            conteudo_extraido: conteudoExtraido,
            metadata: {
              base64: base64Data.substring(0, 1000) + '...', // Salvar preview truncado
              originalName: file.name
            }
          })
          .select()
          .single()

        if (error) throw error
        uploadedAttachments.push(attachment)
      } catch (err) {
        console.error('Erro ao processar arquivo:', file.name, err)
      }
    }

    return uploadedAttachments
  }

  const sendMessage = async () => {
    if ((!inputMessage.trim() && pendingFiles.length === 0) || loading) return

    // Criar sessao se nao existir
    let sessionId = currentSession?.id
    if (!sessionId) {
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
        sessionId = data.id
        setSessions(prev => [data, ...prev])
        setCurrentSession(data)
      } catch (err: any) {
        setError(err.message)
        return
      }
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage || (pendingFiles.length > 0 ? `[${pendingFiles.length} arquivo(s) enviado(s)]` : ''),
      created_at: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    const messageText = inputMessage
    const filesToUpload = [...pendingFiles]
    setInputMessage('')
    setPendingFiles([])
    setLoading(true)
    setError('')

    try {
      // Processar uploads primeiro
      let uploadedFiles: ChatAttachment[] = []
      let filesContext = ''

      if (filesToUpload.length > 0) {
        setUploadingFiles(true)
        uploadedFiles = await processAndUploadFiles(filesToUpload, sessionId)
        setSessionAttachments(prev => [...uploadedFiles, ...prev])
        setUploadingFiles(false)

        // Montar contexto com conteudo dos arquivos
        filesContext = uploadedFiles.map(f => {
          if (f.conteudo_extraido) {
            return `\n\n--- CONTEUDO DO ARQUIVO: ${f.nome_arquivo} ---\n${f.conteudo_extraido}\n--- FIM DO ARQUIVO ---`
          }
          return `\n[Arquivo anexado: ${f.nome_arquivo}]`
        }).join('')
      }

      // Determinar o tipo de acao
      let actionType = 'general'
      if (tipoDocumento === 'RELATO_PC') actionType = 'relato_pc'
      else if (tipoDocumento === 'RELINT') actionType = 'gerar_documento'
      else if (tipoDocumento.startsWith('REP_')) actionType = 'gerar_documento'
      else if (tipoDocumento === 'LEVANTAMENTO') actionType = 'gerar_documento'
      else if (messageText.toLowerCase().includes('5w2h')) actionType = '5w2h'
      else if (messageText.toLowerCase().includes('rai')) actionType = 'analisar_rai'

      // Se estamos construindo um documento, usar continue_document
      if (documentoAtual && tipoDocumento !== 'general') {
        actionType = 'continue_document'
      }

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: messageText + filesContext,
          type: actionType,
          sessionId,
          context: {
            tipo: tipoDocumento,
            unidade: unidadeSelecionada,
            documentoAtual,
            anexos: uploadedFiles.map(f => ({
              nome: f.nome_arquivo,
              tipo: f.tipo_arquivo,
              conteudo: f.conteudo_extraido?.substring(0, 5000) // Limitar tamanho
            }))
          },
          history: messages.slice(-10)
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

        if (sessionId) {
          await supabase
            .from('chat_sessions')
            .update({
              documento_em_construcao: { conteudo: data.response },
              updated_at: new Date().toISOString()
            })
            .eq('id', sessionId)
        }
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
      setUploadingFiles(false)
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

  const deleteAttachment = async (attachmentId: string) => {
    if (!confirm('Excluir este arquivo?')) return

    try {
      const { error } = await supabase
        .from('chat_attachments')
        .delete()
        .eq('id', attachmentId)

      if (error) throw error
      setSessionAttachments(prev => prev.filter(a => a.id !== attachmentId))
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Limpar toda a conversa
  const clearConversation = async () => {
    if (!currentSession) return
    if (!confirm('Limpar todas as mensagens desta conversa? Os arquivos tambem serao removidos.')) return

    try {
      const response = await fetch(`/api/gemini?sessionId=${currentSession.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Erro ao limpar conversa')

      setMessages([])
      setDocumentoAtual('')
      setSessionAttachments([])
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Iniciar edicao de mensagem do usuario
  const startEditingMessage = (index: number, content: string) => {
    setEditingMessageIndex(index)
    setEditingMessageContent(content)
  }

  // Cancelar edicao
  const cancelEditingMessage = () => {
    setEditingMessageIndex(null)
    setEditingMessageContent('')
  }

  // Reenviar mensagem editada
  const resendEditedMessage = async () => {
    if (editingMessageIndex === null || !editingMessageContent.trim()) return

    // Remover mensagens a partir da editada
    const newMessages = messages.slice(0, editingMessageIndex)
    setMessages(newMessages)

    // Limpar estado de edicao
    const newContent = editingMessageContent
    setEditingMessageIndex(null)
    setEditingMessageContent('')

    // Definir a nova mensagem como input e enviar
    setInputMessage(newContent)

    // Aguardar um tick para que o estado seja atualizado
    setTimeout(() => {
      sendMessage()
    }, 100)
  }

  // Regenerar ultima resposta
  const regenerateLastResponse = async () => {
    if (messages.length < 2 || loading) return

    // Encontrar a ultima mensagem do usuario
    let lastUserIndex = -1
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserIndex = i
        break
      }
    }

    if (lastUserIndex === -1) return

    // Manter mensagens ate a ultima do usuario (inclusive) e remover resposta do assistente
    const newMessages = messages.slice(0, lastUserIndex + 1)
    const lastUserMessage = messages[lastUserIndex]
    setMessages(newMessages)

    // Reenviar a mensagem
    setLoading(true)
    setError('')

    try {
      let actionType = 'general'
      if (tipoDocumento === 'RELATO_PC') actionType = 'relato_pc'
      else if (tipoDocumento === 'RELINT') actionType = 'gerar_documento'
      else if (tipoDocumento.startsWith('REP_')) actionType = 'gerar_documento'
      else if (tipoDocumento === 'LEVANTAMENTO') actionType = 'gerar_documento'

      if (documentoAtual && tipoDocumento !== 'general') {
        actionType = 'continue_document'
      }

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: lastUserMessage.content,
          type: actionType,
          sessionId: currentSession?.id,
          context: {
            tipo: tipoDocumento,
            unidade: unidadeSelecionada,
            documentoAtual
          },
          history: newMessages.slice(0, -1).slice(-10)
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

      setMessages([...newMessages, assistantMessage])

      if (tipoDocumento !== 'general' && actionType !== 'analisar_rai') {
        setDocumentoAtual(data.response)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
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
                      {editingSessionId === session.id ? (
                        <input
                          type="text"
                          value={editingSessionTitle}
                          onChange={(e) => setEditingSessionTitle(e.target.value)}
                          onBlur={() => saveSessionTitle(session.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveSessionTitle(session.id)
                            if (e.key === 'Escape') setEditingSessionId(null)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full bg-background border border-primary rounded px-2 py-1 text-sm"
                          autoFocus
                        />
                      ) : (
                        <>
                          <p className="text-sm font-medium truncate">{session.titulo}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(session.updated_at).toLocaleDateString('pt-BR')}
                          </p>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => startEditingSession(session, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-primary/20 text-primary"
                        title="Editar nome"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteSession(session.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-red-400"
                        title="Excluir"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
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

            {/* Botao de anexos */}
            {currentSession && sessionAttachments.length > 0 && (
              <button
                onClick={() => setShowAttachments(!showAttachments)}
                className={`p-2 rounded-lg transition-colors relative ${
                  showAttachments ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
                }`}
                title="Ver arquivos anexados"
              >
                <Paperclip className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {sessionAttachments.length}
                </span>
              </button>
            )}

            {/* Botao de limpar conversa */}
            {currentSession && messages.length > 0 && (
              <button
                onClick={clearConversation}
                className="p-2 rounded-lg hover:bg-red-500/20 text-red-400"
                title="Limpar conversa"
              >
                <Eraser className="h-5 w-5" />
              </button>
            )}

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

        {/* Painel de Anexos */}
        {showAttachments && sessionAttachments.length > 0 && (
          <div className="p-4 border-b border-border bg-secondary/30 max-h-48 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Arquivos da Sessao</h3>
              <button onClick={() => setShowAttachments(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {sessionAttachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center gap-2 p-2 bg-background rounded-lg border border-border"
                >
                  {getFileIcon(attachment.mime_type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{attachment.nome_arquivo}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(attachment.tamanho)}</p>
                  </div>
                  <button
                    onClick={() => deleteAttachment(attachment.id)}
                    className="p-1 hover:bg-red-500/20 rounded text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Area de Mensagens / Preview */}
        <div className="flex-1 overflow-hidden flex">
          {/* Chat */}
          <div className={`flex-1 flex flex-col ${showDocPreview ? 'w-1/2' : 'w-full'}`}>
            <div
              className={`flex-1 overflow-y-auto p-4 space-y-4 ${dragOver ? 'bg-primary/10 border-2 border-dashed border-primary' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {dragOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-primary/10 z-10 pointer-events-none">
                  <div className="text-center">
                    <Upload className="h-12 w-12 text-primary mx-auto mb-2" />
                    <p className="text-lg font-medium text-foreground">Solte os arquivos aqui</p>
                  </div>
                </div>
              )}

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
                      ? 'Posso ajudar com analise de RAI, geracao de relatos, RELINT, representacoes e muito mais. Voce pode enviar arquivos, imagens e documentos.'
                      : `Vamos construir seu ${tiposDocumento.find(t => t.id === tipoDocumento)?.nome}. O que voce gostaria de adicionar?`
                    }
                  </p>
                  <div className="flex gap-3">
                    <button onClick={createNewSession} className="btn-primary">
                      Iniciar Nova Conversa
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Enviar Arquivo
                    </button>
                  </div>
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
                        {/* Se estiver editando esta mensagem */}
                        {editingMessageIndex === idx && msg.role === 'user' ? (
                          <div className="space-y-2">
                            <textarea
                              value={editingMessageContent}
                              onChange={(e) => setEditingMessageContent(e.target.value)}
                              className="w-full bg-background text-foreground border border-primary rounded-lg px-3 py-2 text-sm resize-none min-h-[80px]"
                              autoFocus
                            />
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={cancelEditingMessage}
                                className="text-xs px-3 py-1 rounded bg-secondary text-foreground hover:bg-secondary/80"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={resendEditedMessage}
                                className="text-xs px-3 py-1 rounded bg-background text-primary hover:bg-background/80 flex items-center gap-1"
                              >
                                <Send className="h-3 w-3" />
                                Reenviar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                            {/* Botoes de acao para mensagem do usuario */}
                            {msg.role === 'user' && (
                              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
                                <button
                                  onClick={() => startEditingMessage(idx, msg.content)}
                                  className="text-xs flex items-center gap-1 opacity-70 hover:opacity-100"
                                  title="Editar e reenviar"
                                >
                                  <Pencil className="h-3 w-3" />
                                  Editar
                                </button>
                              </div>
                            )}
                            {/* Botoes de acao para mensagem do assistente */}
                            {msg.role === 'assistant' && (
                              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
                                <button
                                  onClick={() => copyToClipboard(msg.content)}
                                  className="text-xs flex items-center gap-1 opacity-70 hover:opacity-100"
                                >
                                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                  {copied ? 'Copiado' : 'Copiar'}
                                </button>
                                {/* Mostrar regenerar apenas na ultima mensagem do assistente */}
                                {idx === messages.length - 1 && (
                                  <button
                                    onClick={regenerateLastResponse}
                                    disabled={loading}
                                    className="text-xs flex items-center gap-1 opacity-70 hover:opacity-100 disabled:opacity-30"
                                    title="Gerar nova resposta"
                                  >
                                    <RefreshCw className="h-3 w-3" />
                                    Regenerar
                                  </button>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {(loading || uploadingFiles) && (
                    <div className="flex justify-start">
                      <div className="bg-secondary rounded-2xl px-4 py-3 flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">
                          {uploadingFiles ? 'Processando arquivos...' : 'Gerando resposta...'}
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input com upload */}
            <div className="p-4 border-t border-border">
              {error && (
                <div className="mb-3 bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-lg text-sm flex items-center justify-between">
                  <span>{error}</span>
                  <button onClick={() => setError('')}><X className="h-4 w-4" /></button>
                </div>
              )}

              {/* Arquivos pendentes */}
              {pendingFiles.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {pendingFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-secondary px-3 py-1.5 rounded-lg"
                    >
                      {getFileIcon(file.type)}
                      <span className="text-sm truncate max-w-[150px]">{file.name}</span>
                      <button
                        onClick={() => removePendingFile(idx)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 rounded-xl hover:bg-secondary border border-border"
                  title="Anexar arquivo"
                >
                  <Paperclip className="h-5 w-5 text-muted-foreground" />
                </button>
                <textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    pendingFiles.length > 0
                      ? 'Adicione uma mensagem ou envie os arquivos...'
                      : tipoDocumento === 'general'
                        ? 'Digite sua mensagem ou arraste arquivos aqui...'
                        : 'Adicione informacoes ao documento...'
                  }
                  className="input-field flex-1 resize-none min-h-[48px] max-h-[200px]"
                  rows={1}
                  disabled={loading}
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || (!inputMessage.trim() && pendingFiles.length === 0)}
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
