"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
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
  FileImage,
  File,
  FileSpreadsheet,
  Pencil,
  RefreshCw,
  Eraser,
  Search,
  Star,
  StarOff,
  FileDown,
  Zap,
  AlertCircle,
  RotateCcw,
  Keyboard,
  ChevronRight,
  Image as ImageIcon
} from 'lucide-react'
import jsPDF from 'jspdf'

// ==================== INTERFACES ====================
interface ChatMessage {
  id?: string
  role: 'user' | 'assistant'
  content: string
  tipo_acao?: string
  created_at?: string
  is_favorite?: boolean
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
  preview_url?: string
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

// ==================== CONSTANTES ====================
const tiposDocumento = [
  { id: 'general', nome: 'Assistente Geral', icon: Brain },
  { id: 'RELINT', nome: 'RELINT', icon: FileText },
  { id: 'LEVANTAMENTO', nome: 'Levantamento', icon: FileText },
  { id: 'REP_INTERCEPTACAO', nome: 'Rep. Interceptacao', icon: FileText },
  { id: 'REP_BA', nome: 'Rep. Busca e Apreensao', icon: FileText },
  { id: 'REP_PREVENTIVA', nome: 'Rep. Preventiva', icon: FileText },
  { id: 'RELATORIO', nome: 'Relatorio', icon: FileText },
  { id: 'RELATO_PC', nome: 'Relato PC', icon: FileText },
]

const unidades = [
  { id: 'DIH', nome: 'DIH - Homicidios' },
  { id: '4DP', nome: '4a DP Goiania' },
  { id: 'CENTRAL_FLAGRANTES', nome: 'Central de Flagrantes' },
  { id: 'ABADIA_DE_GOIAS', nome: 'Subdelegacia de Abadia de Goias' },
]

// Templates de perguntas rapidas
const quickTemplates = [
  { label: 'Analisar RAI', prompt: 'Analise este RAI e extraia os dados estruturados:', type: 'analisar_rai' },
  { label: 'Gerar RELINT', prompt: 'Gere um RELINT com base nas informacoes:', type: 'gerar_documento' },
  { label: 'Analise 5W2H', prompt: 'Aplique a metodologia 5W2H neste caso:', type: '5w2h' },
  { label: 'Relato PC', prompt: 'Elabore um Relato PC para este caso:', type: 'relato_pc' },
  { label: 'Resumir texto', prompt: 'Resuma o seguinte texto de forma objetiva:', type: 'general' },
  { label: 'Extrair nomes', prompt: 'Extraia todos os nomes de pessoas mencionados:', type: 'general' },
]

// ==================== UTILS ====================
const getFileIcon = (mimeType: string) => {
  if (mimeType?.startsWith('image/')) return <FileImage className="h-5 w-5 text-purple-400" />
  if (mimeType?.includes('pdf')) return <FileText className="h-5 w-5 text-red-400" />
  if (mimeType?.includes('word') || mimeType?.includes('document')) return <FileText className="h-5 w-5 text-blue-400" />
  if (mimeType?.includes('sheet') || mimeType?.includes('excel')) return <FileSpreadsheet className="h-5 w-5 text-green-400" />
  return <File className="h-5 w-5 text-gray-400" />
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// ==================== COMPONENTE PRINCIPAL ====================
export default function AssistentePage() {
  // Estados principais
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Estados do documento
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

  // Estados de upload
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [sessionAttachments, setSessionAttachments] = useState<ChatAttachment[]>([])
  const [showAttachments, setShowAttachments] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [pendingPreviews, setPendingPreviews] = useState<{ [key: number]: string }>({})
  const [dragOver, setDragOver] = useState(false)

  // Estados de edicao de mensagem
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null)
  const [editingMessageContent, setEditingMessageContent] = useState('')

  // Estados de busca
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [searchResults, setSearchResults] = useState<{ sessionId: string; messageIndex: number; content: string }[]>([])

  // Estados de streaming
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)

  // Estados de atalhos
  const [showShortcuts, setShowShortcuts] = useState(false)

  // Estados de templates
  const [showTemplates, setShowTemplates] = useState(false)

  // Estados de retry
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 3

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // ==================== EFFECTS ====================
  useEffect(() => {
    loadSessions()
    // Atalhos de teclado globais
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K - Busca
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault()
        setShowSearch(prev => !prev)
      }
      // Ctrl+N - Nova conversa
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault()
        createNewSession()
      }
      // Ctrl+/ - Mostrar atalhos
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault()
        setShowShortcuts(prev => !prev)
      }
      // Escape - Fechar modais
      if (e.key === 'Escape') {
        setShowSearch(false)
        setShowShortcuts(false)
        setShowTemplates(false)
        setEditingMessageIndex(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  useEffect(() => {
    if (currentSession) {
      loadSessionAttachments(currentSession.id)
    } else {
      setSessionAttachments([])
    }
  }, [currentSession])

  // Criar previews para arquivos pendentes
  useEffect(() => {
    const newPreviews: { [key: number]: string } = {}
    pendingFiles.forEach((file, idx) => {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file)
        newPreviews[idx] = url
      }
    })
    setPendingPreviews(newPreviews)

    return () => {
      Object.values(newPreviews).forEach(url => URL.revokeObjectURL(url))
    }
  }, [pendingFiles])

  // ==================== FUNCOES DE SESSAO ====================
  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*, investigations(titulo)')
        .order('updated_at', { ascending: false })
        .limit(50)

      if (error && error.code !== '42P01') throw error
      setSessions(data || [])
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
        .insert({ titulo, tipo: tipoDocumento, status: 'ativo' })
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
      const { error } = await supabase.from('chat_sessions').delete().eq('id', sessionId)
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
        .update({ titulo: editingSessionTitle.trim(), updated_at: new Date().toISOString() })
        .eq('id', sessionId)

      if (error) throw error

      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, titulo: editingSessionTitle.trim() } : s))
      if (currentSession?.id === sessionId) {
        setCurrentSession(prev => prev ? { ...prev, titulo: editingSessionTitle.trim() } : null)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setEditingSessionId(null)
    }
  }

  // ==================== FUNCOES DE UPLOAD ====================
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setPendingFiles(prev => [...prev, ...files])
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
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
    if (pendingPreviews[index]) {
      URL.revokeObjectURL(pendingPreviews[index])
    }
    setPendingFiles(prev => prev.filter((_, i) => i !== index))
  }

  const processAndUploadFiles = async (files: File[], sessionId: string) => {
    const uploadedAttachments: ChatAttachment[] = []

    for (const file of files) {
      try {
        let conteudoExtraido = ''
        let base64Data = ''

        const arrayBuffer = await file.arrayBuffer()
        const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''))
        base64Data = base64

        // OCR para imagens
        if (file.type.startsWith('image/')) {
          try {
            const ocrResponse = await fetch('/api/gemini', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt: 'Extraia todo o texto visivel nesta imagem.',
                type: 'ocr',
                imageData: { mimeType: file.type, data: base64 }
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
          conteudoExtraido = await file.text()
        } else if (file.type === 'application/pdf') {
          try {
            const pdfResponse = await fetch('/api/gemini', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt: 'Extraia todo o texto deste documento PDF.',
                type: 'pdf_extract',
                fileData: { mimeType: file.type, data: base64, name: file.name }
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

        const { data: attachment, error } = await supabase
          .from('chat_attachments')
          .insert({
            session_id: sessionId,
            nome_arquivo: file.name,
            tipo_arquivo: file.type.split('/')[0],
            tamanho: file.size,
            mime_type: file.type,
            conteudo_extraido: conteudoExtraido,
            metadata: { base64Preview: base64Data.substring(0, 500) }
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

  // ==================== FUNCOES DE MENSAGEM ====================
  const sendMessage = async (useStreaming = true) => {
    if ((!inputMessage.trim() && pendingFiles.length === 0) || loading) return

    // Criar sessao se necessario
    let sessionId: string = currentSession?.id || ''
    if (!sessionId) {
      try {
        const titulo = tipoDocumento === 'general' ? 'Nova Conversa' : `${tiposDocumento.find(t => t.id === tipoDocumento)?.nome || tipoDocumento}`
        const { data, error } = await supabase
          .from('chat_sessions')
          .insert({ titulo, tipo: tipoDocumento, status: 'ativo' })
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
      content: inputMessage || `[${pendingFiles.length} arquivo(s)]`,
      created_at: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    const messageText = inputMessage
    const filesToUpload = [...pendingFiles]
    setInputMessage('')
    setPendingFiles([])
    setLoading(true)
    setError('')
    setRetryCount(0)

    try {
      // Processar uploads
      let uploadedFiles: ChatAttachment[] = []
      let filesContext = ''

      if (filesToUpload.length > 0) {
        setUploadingFiles(true)
        uploadedFiles = await processAndUploadFiles(filesToUpload, sessionId)
        setSessionAttachments(prev => [...uploadedFiles, ...prev])
        setUploadingFiles(false)

        filesContext = uploadedFiles.map(f => {
          if (f.conteudo_extraido) {
            return `\n\n--- ARQUIVO: ${f.nome_arquivo} ---\n${f.conteudo_extraido}\n--- FIM ---`
          }
          return `\n[Arquivo: ${f.nome_arquivo}]`
        }).join('')
      }

      // Determinar tipo de acao
      let actionType = 'general'
      if (tipoDocumento === 'RELATO_PC') actionType = 'relato_pc'
      else if (tipoDocumento === 'RELINT') actionType = 'gerar_documento'
      else if (tipoDocumento.startsWith('REP_')) actionType = 'gerar_documento'
      else if (tipoDocumento === 'LEVANTAMENTO') actionType = 'gerar_documento'
      else if (messageText.toLowerCase().includes('5w2h')) actionType = '5w2h'
      else if (messageText.toLowerCase().includes('rai')) actionType = 'analisar_rai'

      if (documentoAtual && tipoDocumento !== 'general') {
        actionType = 'continue_document'
      }

      if (useStreaming) {
        // Usar streaming
        await sendWithStreaming(messageText + filesContext, actionType, sessionId, uploadedFiles)
      } else {
        // Fallback sem streaming
        await sendWithoutStreaming(messageText + filesContext, actionType, sessionId, uploadedFiles)
      }
    } catch (err: any) {
      // Retry automatico
      if (retryCount < maxRetries) {
        setRetryCount(prev => prev + 1)
        setTimeout(() => sendMessage(useStreaming), 1000 * (retryCount + 1))
        return
      }
      setError(err.message)
    } finally {
      setLoading(false)
      setUploadingFiles(false)
      setIsStreaming(false)
    }
  }

  const sendWithStreaming = async (prompt: string, actionType: string, sessionId: string, uploadedFiles: ChatAttachment[]) => {
    setIsStreaming(true)
    setStreamingContent('')

    abortControllerRef.current = new AbortController()

    const response = await fetch('/api/gemini/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        type: actionType,
        sessionId,
        context: {
          tipo: tipoDocumento,
          unidade: unidadeSelecionada,
          documentoAtual,
          anexos: uploadedFiles.map(f => ({ nome: f.nome_arquivo, tipo: f.tipo_arquivo, conteudo: f.conteudo_extraido?.substring(0, 5000) }))
        },
        history: messages.slice(-10)
      }),
      signal: abortControllerRef.current.signal
    })

    if (!response.ok) {
      throw new Error('Erro na resposta do servidor')
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let fullText = ''

    while (reader) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.text) {
              fullText += data.text
              setStreamingContent(fullText)
            }
            if (data.done) {
              fullText = data.fullText || fullText
            }
          } catch (e) { }
        }
      }
    }

    setIsStreaming(false)
    setStreamingContent('')

    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: fullText,
      tipo_acao: actionType,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, assistantMessage])

    if (tipoDocumento !== 'general' && actionType !== 'analisar_rai') {
      setDocumentoAtual(fullText)
      if (sessionId) {
        await supabase
          .from('chat_sessions')
          .update({ documento_em_construcao: { conteudo: fullText }, updated_at: new Date().toISOString() })
          .eq('id', sessionId)
      }
    }
  }

  const sendWithoutStreaming = async (prompt: string, actionType: string, sessionId: string, uploadedFiles: ChatAttachment[]) => {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        type: actionType,
        sessionId,
        context: {
          tipo: tipoDocumento,
          unidade: unidadeSelecionada,
          documentoAtual,
          anexos: uploadedFiles.map(f => ({ nome: f.nome_arquivo, tipo: f.tipo_arquivo, conteudo: f.conteudo_extraido?.substring(0, 5000) }))
        },
        history: messages.slice(-10)
      })
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Erro ao processar')

    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: data.response,
      tipo_acao: actionType,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, assistantMessage])

    if (tipoDocumento !== 'general' && actionType !== 'analisar_rai') {
      setDocumentoAtual(data.response)
    }
  }

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsStreaming(false)
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
    // Ctrl+Enter para enviar sem streaming
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault()
      sendMessage(false)
    }
  }

  // ==================== FUNCOES DE EDICAO ====================
  const startEditingMessage = (index: number, content: string) => {
    setEditingMessageIndex(index)
    setEditingMessageContent(content)
  }

  const cancelEditingMessage = () => {
    setEditingMessageIndex(null)
    setEditingMessageContent('')
  }

  const resendEditedMessage = async () => {
    if (editingMessageIndex === null || !editingMessageContent.trim()) return

    const newMessages = messages.slice(0, editingMessageIndex)
    setMessages(newMessages)

    const newContent = editingMessageContent
    setEditingMessageIndex(null)
    setEditingMessageContent('')
    setInputMessage(newContent)

    setTimeout(() => sendMessage(), 100)
  }

  const regenerateLastResponse = async () => {
    if (messages.length < 2 || loading) return

    let lastUserIndex = -1
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserIndex = i
        break
      }
    }

    if (lastUserIndex === -1) return

    const newMessages = messages.slice(0, lastUserIndex + 1)
    const lastUserMessage = messages[lastUserIndex]
    setMessages(newMessages)
    setInputMessage(lastUserMessage.content)

    setTimeout(() => sendMessage(), 100)
  }

  // ==================== FUNCOES DE FAVORITO ====================
  const toggleFavorite = async (messageIndex: number) => {
    const message = messages[messageIndex]
    const newMessages = [...messages]
    newMessages[messageIndex] = { ...message, is_favorite: !message.is_favorite }
    setMessages(newMessages)

    // Salvar no banco se tiver ID
    if (message.id) {
      try {
        await supabase
          .from('chat_messages')
          .update({ is_favorite: !message.is_favorite })
          .eq('id', message.id)
      } catch (err) {
        console.error('Erro ao favoritar:', err)
      }
    }
  }

  // ==================== FUNCOES DE BUSCA ====================
  const searchInMessages = (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    const results: { sessionId: string; messageIndex: number; content: string }[] = []
    const lowerQuery = query.toLowerCase()

    messages.forEach((msg, idx) => {
      if (msg.content.toLowerCase().includes(lowerQuery)) {
        results.push({
          sessionId: currentSession?.id || '',
          messageIndex: idx,
          content: msg.content.substring(0, 100) + '...'
        })
      }
    })

    setSearchResults(results)
  }

  useEffect(() => {
    searchInMessages(searchQuery)
  }, [searchQuery, messages])

  // ==================== FUNCOES DE EXPORTACAO ====================
  const exportConversation = async (format: 'txt' | 'pdf' | 'html') => {
    if (messages.length === 0) return

    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `conversa_${currentSession?.titulo || 'chat'}_${timestamp}`

    if (format === 'txt') {
      const content = messages.map(m => `[${m.role.toUpperCase()}]\n${m.content}\n`).join('\n---\n\n')
      const blob = new Blob([content], { type: 'text/plain' })
      downloadBlob(blob, `${filename}.txt`)
    } else if (format === 'html') {
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${currentSession?.titulo || 'Conversa'}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .message { margin: 15px 0; padding: 15px; border-radius: 10px; }
    .user { background: #2563eb; color: white; margin-left: 20%; }
    .assistant { background: #374151; color: white; margin-right: 20%; }
    .role { font-weight: bold; margin-bottom: 5px; text-transform: uppercase; font-size: 12px; }
    pre { white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>${currentSession?.titulo || 'Conversa'}</h1>
  <p>Exportado em ${new Date().toLocaleString('pt-BR')}</p>
  <hr>
  ${messages.map(m => `
    <div class="message ${m.role}">
      <div class="role">${m.role}</div>
      <pre>${m.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
    </div>
  `).join('')}
</body>
</html>`
      const blob = new Blob([html], { type: 'text/html' })
      downloadBlob(blob, `${filename}.html`)
    } else if (format === 'pdf') {
      const pdf = new jsPDF()
      let y = 20

      pdf.setFontSize(16)
      pdf.text(currentSession?.titulo || 'Conversa', 20, y)
      y += 10

      pdf.setFontSize(10)
      pdf.text(`Exportado em ${new Date().toLocaleString('pt-BR')}`, 20, y)
      y += 15

      messages.forEach(m => {
        pdf.setFontSize(8)
        pdf.setTextColor(m.role === 'user' ? 37 : 100, m.role === 'user' ? 99 : 100, m.role === 'user' ? 235 : 100)
        pdf.text(m.role.toUpperCase(), 20, y)
        y += 5

        pdf.setFontSize(10)
        pdf.setTextColor(0, 0, 0)
        const lines = pdf.splitTextToSize(m.content, 170)
        lines.forEach((line: string) => {
          if (y > 280) {
            pdf.addPage()
            y = 20
          }
          pdf.text(line, 20, y)
          y += 5
        })
        y += 10
      })

      pdf.save(`${filename}.pdf`)
    }
  }

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  // ==================== FUNCOES DE LIMPEZA ====================
  const clearConversation = async () => {
    if (!currentSession) return
    if (!confirm('Limpar todas as mensagens?')) return

    try {
      await fetch(`/api/gemini?sessionId=${currentSession.id}`, { method: 'DELETE' })
      setMessages([])
      setDocumentoAtual('')
      setSessionAttachments([])
    } catch (err: any) {
      setError(err.message)
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const downloadDocument = (format: 'txt' | 'html') => {
    const content = documentoAtual
    const filename = `${tipoDocumento}_${new Date().toISOString().split('T')[0]}`

    if (format === 'txt') {
      const blob = new Blob([content], { type: 'text/plain' })
      downloadBlob(blob, `${filename}.txt`)
    } else {
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${tipoDocumento}</title><style>body{font-family:Arial;max-width:800px;margin:40px auto;padding:20px;line-height:1.6}pre{white-space:pre-wrap}</style></head><body><pre>${content.replace(/</g, '&lt;')}</pre></body></html>`
      const blob = new Blob([html], { type: 'text/html' })
      downloadBlob(blob, `${filename}.html`)
    }
  }

  const saveDocument = async () => {
    if (!documentoAtual || !currentSession) return

    try {
      await supabase.from('documentos').insert({
        tipo: tipoDocumento,
        titulo: `${tipoDocumento} - ${new Date().toLocaleDateString('pt-BR')}`,
        conteudo: documentoAtual,
        unidade: unidadeSelecionada,
        status: 'rascunho'
      })
      alert('Documento salvo!')
    } catch (err: any) {
      setError(err.message)
    }
  }

  const deleteAttachment = async (attachmentId: string) => {
    if (!confirm('Excluir arquivo?')) return

    try {
      await supabase.from('chat_attachments').delete().eq('id', attachmentId)
      setSessionAttachments(prev => prev.filter(a => a.id !== attachmentId))
    } catch (err: any) {
      setError(err.message)
    }
  }

  const applyTemplate = (template: typeof quickTemplates[0]) => {
    setInputMessage(template.prompt + '\n\n')
    setShowTemplates(false)
    inputRef.current?.focus()
  }

  // ==================== RENDER ====================
  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* Modal de Atalhos */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowShortcuts(false)}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2"><Keyboard className="h-5 w-5" /> Atalhos de Teclado</h2>
              <button onClick={() => setShowShortcuts(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Nova conversa</span><kbd className="px-2 py-1 bg-secondary rounded">Ctrl + N</kbd></div>
              <div className="flex justify-between"><span>Buscar</span><kbd className="px-2 py-1 bg-secondary rounded">Ctrl + K</kbd></div>
              <div className="flex justify-between"><span>Enviar mensagem</span><kbd className="px-2 py-1 bg-secondary rounded">Enter</kbd></div>
              <div className="flex justify-between"><span>Enviar sem streaming</span><kbd className="px-2 py-1 bg-secondary rounded">Ctrl + Enter</kbd></div>
              <div className="flex justify-between"><span>Nova linha</span><kbd className="px-2 py-1 bg-secondary rounded">Shift + Enter</kbd></div>
              <div className="flex justify-between"><span>Fechar modal</span><kbd className="px-2 py-1 bg-secondary rounded">Esc</kbd></div>
              <div className="flex justify-between"><span>Mostrar atalhos</span><kbd className="px-2 py-1 bg-secondary rounded">Ctrl + /</kbd></div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Busca */}
      {showSearch && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 z-50" onClick={() => setShowSearch(false)}>
          <div className="bg-card border border-border rounded-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar nas mensagens..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-secondary rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>
            </div>
            {searchResults.length > 0 && (
              <div className="max-h-80 overflow-y-auto p-2">
                {searchResults.map((result, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      messagesEndRef.current?.scrollIntoView()
                      setShowSearch(false)
                    }}
                    className="w-full text-left p-3 hover:bg-secondary rounded-lg"
                  >
                    <p className="text-sm text-muted-foreground truncate">{result.content}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sidebar */}
      {showSidebar && (
        <div className="w-72 border-r border-border flex flex-col bg-card">
          <div className="p-4 border-b border-border">
            <button onClick={createNewSession} className="w-full btn-primary flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" /> Nova Conversa
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingSessions ? (
              <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : sessions.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">Nenhuma conversa</div>
            ) : (
              <div className="space-y-1 p-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${currentSession?.id === session.id ? 'bg-primary/20 text-primary' : 'hover:bg-secondary'}`}
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
                          onKeyDown={(e) => { if (e.key === 'Enter') saveSessionTitle(session.id); if (e.key === 'Escape') setEditingSessionId(null) }}
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
                      <button onClick={(e) => startEditingSession(session, e)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-primary/20 text-primary"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={(e) => { e.stopPropagation(); deleteSession(session.id) }} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
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
            <button onClick={() => setShowSidebar(!showSidebar)} className="p-2 rounded-lg hover:bg-secondary">
              <MessageSquare className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold">{currentSession?.titulo || 'Assistente PCGO'}</h1>
                <p className="text-xs text-muted-foreground">{tiposDocumento.find(t => t.id === tipoDocumento)?.nome}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)} className="input-field pr-8 text-sm min-w-[160px]">
              {tiposDocumento.map((tipo) => (<option key={tipo.id} value={tipo.id}>{tipo.nome}</option>))}
            </select>

            {currentSession && sessionAttachments.length > 0 && (
              <button onClick={() => setShowAttachments(!showAttachments)} className={`p-2 rounded-lg relative ${showAttachments ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}>
                <Paperclip className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">{sessionAttachments.length}</span>
              </button>
            )}

            {currentSession && messages.length > 0 && (
              <>
                <button onClick={clearConversation} className="p-2 rounded-lg hover:bg-red-500/20 text-red-400" title="Limpar"><Eraser className="h-5 w-5" /></button>
                <div className="relative">
                  <button onClick={() => setShowTemplates(false)} className="p-2 rounded-lg hover:bg-secondary group">
                    <FileDown className="h-5 w-5" />
                  </button>
                  <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg hidden group-hover:block">
                    <button onClick={() => exportConversation('txt')} className="block w-full px-4 py-2 text-sm hover:bg-secondary text-left">Exportar TXT</button>
                    <button onClick={() => exportConversation('html')} className="block w-full px-4 py-2 text-sm hover:bg-secondary text-left">Exportar HTML</button>
                    <button onClick={() => exportConversation('pdf')} className="block w-full px-4 py-2 text-sm hover:bg-secondary text-left">Exportar PDF</button>
                  </div>
                </div>
              </>
            )}

            <button onClick={() => setShowSearch(true)} className="p-2 rounded-lg hover:bg-secondary" title="Buscar (Ctrl+K)"><Search className="h-5 w-5" /></button>
            <button onClick={() => setShowConfig(!showConfig)} className="p-2 rounded-lg hover:bg-secondary"><Settings className="h-5 w-5" /></button>
            <button onClick={() => setShowShortcuts(true)} className="p-2 rounded-lg hover:bg-secondary" title="Atalhos (Ctrl+/)"><Keyboard className="h-5 w-5" /></button>

            {documentoAtual && (
              <button onClick={() => setShowDocPreview(!showDocPreview)} className={`p-2 rounded-lg ${showDocPreview ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}><Eye className="h-5 w-5" /></button>
            )}
          </div>
        </div>

        {/* Config Panel */}
        {showConfig && (
          <div className="p-4 border-b border-border bg-secondary/30">
            <div className="flex items-center gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Unidade</label>
                <select value={unidadeSelecionada} onChange={(e) => setUnidadeSelecionada(e.target.value)} className="input-field text-sm">
                  {unidades.map((u) => (<option key={u.id} value={u.id}>{u.nome}</option>))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Attachments Panel */}
        {showAttachments && sessionAttachments.length > 0 && (
          <div className="p-4 border-b border-border bg-secondary/30 max-h-48 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Arquivos ({sessionAttachments.length})</h3>
              <button onClick={() => setShowAttachments(false)}><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {sessionAttachments.map((att) => (
                <div key={att.id} className="flex items-center gap-2 p-2 bg-background rounded-lg border border-border">
                  {getFileIcon(att.mime_type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{att.nome_arquivo}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(att.tamanho)}</p>
                  </div>
                  <button onClick={() => deleteAttachment(att.id)} className="p-1 hover:bg-red-500/20 rounded text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 overflow-hidden flex">
          <div className={`flex-1 flex flex-col ${showDocPreview ? 'w-1/2' : 'w-full'}`}>
            <div
              className={`flex-1 overflow-y-auto p-4 space-y-4 relative ${dragOver ? 'bg-primary/10 border-2 border-dashed border-primary' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {dragOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-primary/10 z-10 pointer-events-none">
                  <div className="text-center">
                    <Upload className="h-12 w-12 text-primary mx-auto mb-2" />
                    <p className="text-lg font-medium">Solte os arquivos aqui</p>
                  </div>
                </div>
              )}

              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-600/20 flex items-center justify-center mb-4">
                    <Brain className="h-10 w-10 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">Assistente PCGO</h2>
                  <p className="text-muted-foreground max-w-md mb-6">
                    Analise de RAI, relatos, RELINT, representacoes e muito mais. Envie arquivos, imagens e documentos.
                  </p>

                  {/* Templates rapidos */}
                  <div className="flex flex-wrap gap-2 justify-center mb-6">
                    {quickTemplates.slice(0, 4).map((t, i) => (
                      <button key={i} onClick={() => applyTemplate(t)} className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 rounded-full text-sm flex items-center gap-1">
                        <Zap className="h-3 w-3" /> {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button onClick={createNewSession} className="btn-primary">Iniciar Conversa</button>
                    <button onClick={() => fileInputRef.current?.click()} className="btn-secondary flex items-center gap-2">
                      <Upload className="h-4 w-4" /> Enviar Arquivo
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                        {editingMessageIndex === idx && msg.role === 'user' ? (
                          <div className="space-y-2">
                            <textarea
                              value={editingMessageContent}
                              onChange={(e) => setEditingMessageContent(e.target.value)}
                              className="w-full bg-background text-foreground border border-primary rounded-lg px-3 py-2 text-sm resize-none min-h-[80px]"
                              autoFocus
                            />
                            <div className="flex gap-2 justify-end">
                              <button onClick={cancelEditingMessage} className="text-xs px-3 py-1 rounded bg-secondary text-foreground">Cancelar</button>
                              <button onClick={resendEditedMessage} className="text-xs px-3 py-1 rounded bg-background text-primary flex items-center gap-1">
                                <Send className="h-3 w-3" /> Reenviar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {msg.role === 'assistant' ? (
                              <MarkdownRenderer content={msg.content} />
                            ) : (
                              <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                            )}

                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
                              {msg.role === 'user' ? (
                                <button onClick={() => startEditingMessage(idx, msg.content)} className="text-xs flex items-center gap-1 opacity-70 hover:opacity-100">
                                  <Pencil className="h-3 w-3" /> Editar
                                </button>
                              ) : (
                                <>
                                  <button onClick={() => copyToClipboard(msg.content, `msg-${idx}`)} className="text-xs flex items-center gap-1 opacity-70 hover:opacity-100">
                                    {copiedId === `msg-${idx}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                    {copiedId === `msg-${idx}` ? 'Copiado' : 'Copiar'}
                                  </button>
                                  <button onClick={() => toggleFavorite(idx)} className="text-xs flex items-center gap-1 opacity-70 hover:opacity-100">
                                    {msg.is_favorite ? <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> : <StarOff className="h-3 w-3" />}
                                  </button>
                                  {idx === messages.length - 1 && (
                                    <button onClick={regenerateLastResponse} disabled={loading} className="text-xs flex items-center gap-1 opacity-70 hover:opacity-100 disabled:opacity-30">
                                      <RefreshCw className="h-3 w-3" /> Regenerar
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Streaming content */}
                  {isStreaming && streamingContent && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-secondary">
                        <MarkdownRenderer content={streamingContent} />
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
                          <button onClick={stopStreaming} className="text-xs flex items-center gap-1 text-red-400 hover:text-red-300">
                            <X className="h-3 w-3" /> Parar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {(loading || uploadingFiles) && !isStreaming && (
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

            {/* Input Area */}
            <div className="p-4 border-t border-border">
              {error && (
                <div className="mb-3 bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-lg text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {retryCount > 0 && <span className="text-xs">Tentativa {retryCount}/{maxRetries}</span>}
                    <button onClick={() => setError('')}><X className="h-4 w-4" /></button>
                  </div>
                </div>
              )}

              {/* Templates */}
              {showTemplates && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {quickTemplates.map((t, i) => (
                    <button key={i} onClick={() => applyTemplate(t)} className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 rounded-full text-sm flex items-center gap-1">
                      <Zap className="h-3 w-3" /> {t.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Pending files with preview */}
              {pendingFiles.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {pendingFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-secondary px-3 py-1.5 rounded-lg">
                      {pendingPreviews[idx] ? (
                        <img src={pendingPreviews[idx]} alt={file.name} className="h-8 w-8 object-cover rounded" />
                      ) : (
                        getFileIcon(file.type)
                      )}
                      <span className="text-sm truncate max-w-[150px]">{file.name}</span>
                      <button onClick={() => removePendingFile(idx)} className="text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx" className="hidden" />

                <button onClick={() => fileInputRef.current?.click()} className="p-3 rounded-xl hover:bg-secondary border border-border" title="Anexar">
                  <Paperclip className="h-5 w-5 text-muted-foreground" />
                </button>

                <button onClick={() => setShowTemplates(!showTemplates)} className={`p-3 rounded-xl border border-border ${showTemplates ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`} title="Templates">
                  <Zap className="h-5 w-5" />
                </button>

                <textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite sua mensagem... (Enter para enviar, Shift+Enter para nova linha)"
                  className="input-field flex-1 resize-none min-h-[48px] max-h-[200px]"
                  rows={1}
                  disabled={loading}
                />

                <button
                  onClick={() => sendMessage()}
                  disabled={loading || (!inputMessage.trim() && pendingFiles.length === 0)}
                  className="btn-primary px-4 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Document Preview */}
          {showDocPreview && documentoAtual && (
            <div className="w-1/2 border-l border-border flex flex-col bg-background">
              <div className="p-3 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> Preview</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => setEditingDoc(!editingDoc)} className={`p-1.5 rounded-lg ${editingDoc ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}><Edit3 className="h-4 w-4" /></button>
                  <button onClick={saveDocument} className="p-1.5 rounded-lg hover:bg-secondary text-green-500"><Save className="h-4 w-4" /></button>
                  <button onClick={() => downloadDocument('txt')} className="p-1.5 rounded-lg hover:bg-secondary"><Download className="h-4 w-4" /></button>
                  <button onClick={() => downloadDocument('html')} className="p-1.5 rounded-lg hover:bg-secondary"><FileOutput className="h-4 w-4" /></button>
                  <button onClick={() => setShowDocPreview(false)} className="p-1.5 rounded-lg hover:bg-secondary"><X className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {editingDoc ? (
                  <textarea value={documentoAtual} onChange={(e) => setDocumentoAtual(e.target.value)} className="w-full h-full input-field font-mono text-sm resize-none" />
                ) : (
                  <MarkdownRenderer content={documentoAtual} className="bg-secondary/30 p-4 rounded-lg" />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
