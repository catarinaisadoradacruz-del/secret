'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, Sparkles, ArrowLeft, MessageSquare, Plus, Trash2, Edit2, X, Check, Menu, History, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatSession {
  id: string
  title: string
  created_at: string
  updated_at: string
  messages?: Message[]
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [userName, setUserName] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  
  // Estados para histórico
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [showSidebar, setShowSidebar] = useState(true)
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const { data } = await supabase
          .from('users')
          .select('name')
          .eq('id', user.id)
          .single()
        if (data) setUserName(data.name)
        
        // Carregar sessões de chat
        loadSessions(user.id)
      }
    }
    loadUser()
  }, [])

  const loadSessions = async (uid: string) => {
    setLoadingSessions(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('id, title, created_at, updated_at, messages')
        .eq('user_id', uid)
        .order('updated_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setSessions(data || [])
    } catch (err) {
      console.error('Erro ao carregar sessões:', err)
    } finally {
      setLoadingSessions(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const createNewSession = async () => {
    if (!userId) return null
    
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: userId,
          title: 'Nova conversa',
          messages: []
        })
        .select()
        .single()

      if (error) throw error
      
      setSessions(prev => [data, ...prev])
      setCurrentSessionId(data.id)
      setMessages([])
      return data.id
    } catch (err) {
      console.error('Erro ao criar sessão:', err)
      return null
    }
  }

  const loadSession = async (session: ChatSession) => {
    setCurrentSessionId(session.id)
    setMessages(session.messages || [])
  }

  const updateSessionInDB = async (sessionId: string, newMessages: Message[], newTitle?: string) => {
    try {
      const supabase = createClient()
      const updateData: any = {
        messages: newMessages,
        updated_at: new Date().toISOString()
      }
      if (newTitle) {
        updateData.title = newTitle
      }
      
      await supabase
        .from('chat_sessions')
        .update(updateData)
        .eq('id', sessionId)

      // Atualizar estado local
      setSessions(prev => prev.map(s => 
        s.id === sessionId 
          ? { ...s, messages: newMessages, title: newTitle || s.title, updated_at: updateData.updated_at }
          : s
      ))
    } catch (err) {
      console.error('Erro ao atualizar sessão:', err)
    }
  }

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Excluir esta conversa?')) return
    
    try {
      const supabase = createClient()
      await supabase.from('chat_sessions').delete().eq('id', sessionId)
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null)
        setMessages([])
      }
    } catch (err) {
      console.error('Erro ao excluir sessão:', err)
    }
  }

  const deleteAllSessions = async () => {
    if (!userId) return
    if (!confirm('Excluir TODAS as conversas? Esta ação não pode ser desfeita.')) return
    
    try {
      const supabase = createClient()
      await supabase.from('chat_sessions').delete().eq('user_id', userId)
      setSessions([])
      setCurrentSessionId(null)
      setMessages([])
    } catch (err) {
      console.error('Erro ao excluir todas sessões:', err)
    }
  }

  const startEditingTitle = (session: ChatSession) => {
    setEditingSessionId(session.id)
    setEditingTitle(session.title)
  }

  const saveTitle = async () => {
    if (!editingSessionId || !editingTitle.trim()) {
      setEditingSessionId(null)
      return
    }
    
    try {
      const supabase = createClient()
      await supabase
        .from('chat_sessions')
        .update({ title: editingTitle.trim() })
        .eq('id', editingSessionId)
      
      setSessions(prev => prev.map(s => 
        s.id === editingSessionId ? { ...s, title: editingTitle.trim() } : s
      ))
    } catch (err) {
      console.error('Erro ao salvar título:', err)
    } finally {
      setEditingSessionId(null)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    
    // Criar nova sessão se não existir
    let sessionId = currentSessionId
    if (!sessionId) {
      sessionId = await createNewSession()
      if (!sessionId) {
        alert('Erro ao criar sessão de chat')
        return
      }
    }

    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: messages.slice(-10)
        }),
      })

      const data = await response.json()
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || 'Desculpe, tive um probleminha. Pode tentar de novo? 💜'
      }
      
      const updatedMessages = [...newMessages, assistantMessage]
      setMessages(updatedMessages)
      
      // Gerar título automático na primeira mensagem
      const isFirstMessage = newMessages.length === 1
      const autoTitle = isFirstMessage 
        ? userMessage.slice(0, 40) + (userMessage.length > 40 ? '...' : '')
        : undefined
      
      await updateSessionInDB(sessionId, updatedMessages, autoTitle)
    } catch (error) {
      console.error('Erro:', error)
      setMessages([...newMessages, {
        role: 'assistant',
        content: 'Desculpe, tive um probleminha. Pode tentar de novo? 💜'
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleQuickMessage = (message: string) => {
    setInput(message)
    setTimeout(() => handleSend(), 100)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Hoje'
    if (diffDays === 1) return 'Ontem'
    if (diffDays < 7) return `${diffDays} dias atrás`
    return date.toLocaleDateString('pt-BR')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/50 to-white flex">
      {/* Sidebar - Histórico de conversas */}
      <AnimatePresence>
        {showSidebar && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="bg-white border-r border-gray-100 flex flex-col h-screen overflow-hidden"
          >
            {/* Header do sidebar */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <History className="w-5 h-5 text-rose-500" />
                  Conversas
                </h2>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg lg:hidden"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <button
                onClick={createNewSession}
                className="w-full flex items-center justify-center gap-2 bg-rose-500 text-white py-2.5 px-4 rounded-xl hover:bg-rose-600 transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                Nova conversa
              </button>
            </div>

            {/* Lista de sessões */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loadingSessions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-rose-400" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nenhuma conversa ainda</p>
                  <p className="text-xs mt-1">Comece uma nova conversa!</p>
                </div>
              ) : (
                <>
                  {sessions.map((session) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`group relative p-3 rounded-xl cursor-pointer transition-all ${
                        currentSessionId === session.id
                          ? 'bg-rose-50 border-2 border-rose-200'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                      onClick={() => loadSession(session)}
                    >
                      {editingSessionId === session.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            className="flex-1 px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveTitle()
                              if (e.key === 'Escape') setEditingSessionId(null)
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            onClick={(e) => { e.stopPropagation(); saveTitle() }}
                            className="p-1 text-green-600 hover:bg-green-100 rounded"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingSessionId(null) }}
                            className="p-1 text-gray-500 hover:bg-gray-200 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-800 truncate text-sm">
                                {session.title || 'Nova conversa'}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatDate(session.updated_at)}
                              </p>
                            </div>
                            <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${
                              currentSessionId === session.id ? 'text-rose-500' : ''
                            }`} />
                          </div>
                          
                          {/* Ações (aparecem no hover) */}
                          <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); startEditingTitle(session) }}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Editar nome"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteSession(session.id) }}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </motion.div>
                  ))}
                  
                  {sessions.length > 0 && (
                    <button
                      onClick={deleteAllSessions}
                      className="w-full mt-4 py-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      🗑️ Excluir todas as conversas
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Área principal do chat */}
      <div className="flex-1 flex flex-col h-screen">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 p-4 flex items-center gap-4 sticky top-0 z-10">
          {!showSidebar && (
            <button
              onClick={() => setShowSidebar(true)}
              className="p-2 hover:bg-gray-100 rounded-xl"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
          )}
          
          <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-xl">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-100 to-rose-200 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-800">Vita</h1>
              <p className="text-xs text-gray-500">Sua assistente de bem-estar</p>
            </div>
          </div>
        </header>

        {/* Área de mensagens */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full text-center px-4"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-rose-100 to-rose-200 flex items-center justify-center mb-6 shadow-lg shadow-rose-100">
                <Sparkles className="w-10 h-10 text-rose-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Olá, {userName || 'Querida'}!
              </h2>
              <p className="text-gray-600 mb-8 max-w-md">
                Sou a Vita, sua assistente de nutrição e bem-estar.
                Como posso te ajudar?
              </p>

              <div className="flex flex-wrap justify-center gap-3 max-w-lg">
                {[
                  'O que posso comer hoje?',
                  'Sugira um treino rápido',
                  'Como melhorar meu sono?',
                  'Dicas para mais energia'
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleQuickMessage(suggestion)}
                    className="px-4 py-2.5 bg-white border-2 border-gray-200 rounded-full text-sm text-gray-700 hover:border-rose-300 hover:bg-rose-50 transition-all shadow-sm"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-rose-500 text-white rounded-br-md'
                        : 'bg-white border border-gray-100 text-gray-800 rounded-bl-md shadow-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                  </div>
                </motion.div>
              ))}

              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                      <span className="text-sm text-gray-500">Pensando...</span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="bg-white border-t border-gray-100 p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-2 border-2 border-gray-100 focus-within:border-rose-300 transition-colors">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Digite sua mensagem..."
                className="flex-1 bg-transparent outline-none text-gray-800 placeholder-gray-400"
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="p-2.5 bg-rose-500 text-white rounded-xl hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
