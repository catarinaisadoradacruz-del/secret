'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, Sparkles, ArrowLeft, MessageSquare, Plus, Trash2, Edit2, X, Check, Menu } from 'lucide-react'
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
  const [showSidebar, setShowSidebar] = useState(false)
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
        
        // Carregar sessões
        loadSessions(user.id)
      }
    }
    loadUser()
  }, [])

  const loadSessions = async (uid: string) => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', uid)
        .order('updated_at', { ascending: false })
      
      if (data) {
        setSessions(data)
      }
    } catch (error) {
      console.error('Erro ao carregar sessões:', error)
    } finally {
      setLoadingSessions(false)
    }
  }

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('chat_sessions')
        .select('messages')
        .eq('id', sessionId)
        .single()
      
      if (data?.messages) {
        setMessages(data.messages)
        setCurrentSessionId(sessionId)
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error)
    }
    setShowSidebar(false)
  }

  const createNewSession = async () => {
    if (!userId) return

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

      if (data) {
        setSessions(prev => [data, ...prev])
        setCurrentSessionId(data.id)
        setMessages([])
      }
    } catch (error) {
      console.error('Erro ao criar sessão:', error)
    }
    setShowSidebar(false)
  }

  const startNewConversation = () => {
    setMessages([])
    setCurrentSessionId(null)
    setShowSidebar(false)
  }

  const updateSessionTitle = async (sessionId: string, newTitle: string) => {
    if (!newTitle.trim()) return

    try {
      const supabase = createClient()
      await supabase
        .from('chat_sessions')
        .update({ title: newTitle.trim() })
        .eq('id', sessionId)

      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, title: newTitle.trim() } : s
      ))
    } catch (error) {
      console.error('Erro ao atualizar título:', error)
    }
    setEditingSessionId(null)
  }

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conversa?')) return

    try {
      const supabase = createClient()
      await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId)

      setSessions(prev => prev.filter(s => s.id !== sessionId))
      
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null)
        setMessages([])
      }
    } catch (error) {
      console.error('Erro ao deletar sessão:', error)
    }
  }

  const deleteAllSessions = async () => {
    if (!userId) return
    if (!confirm('Tem certeza que deseja excluir TODAS as conversas? Esta ação não pode ser desfeita.')) return

    try {
      const supabase = createClient()
      await supabase
        .from('chat_sessions')
        .delete()
        .eq('user_id', userId)

      setSessions([])
      setCurrentSessionId(null)
      setMessages([])
    } catch (error) {
      console.error('Erro ao deletar todas sessões:', error)
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const saveSession = async (newMessages: Message[]) => {
    if (!userId) return

    const supabase = createClient()
    
    // Gerar título automático da primeira mensagem do usuário
    const firstUserMessage = newMessages.find(m => m.role === 'user')?.content || 'Nova conversa'
    const title = firstUserMessage.slice(0, 50) + (firstUserMessage.length > 50 ? '...' : '')

    if (currentSessionId) {
      // Atualizar sessão existente
      await supabase
        .from('chat_sessions')
        .update({ 
          messages: newMessages,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentSessionId)

      setSessions(prev => prev.map(s => 
        s.id === currentSessionId 
          ? { ...s, updated_at: new Date().toISOString() }
          : s
      ))
    } else {
      // Criar nova sessão
      const { data } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: userId,
          title,
          messages: newMessages
        })
        .select()
        .single()

      if (data) {
        setCurrentSessionId(data.id)
        setSessions(prev => [data, ...prev])
      }
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    const newMessages = [...messages, { role: 'user' as const, content: userMessage }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: messages
        })
      })

      const data = await response.json()

      if (data.response) {
        const updatedMessages = [...newMessages, { role: 'assistant' as const, content: data.response }]
        setMessages(updatedMessages)
        // Salvar sessão
        await saveSession(updatedMessages)
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro. Tente novamente.'
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
    inputRef.current?.focus()
  }

  const suggestions = [
    'O que posso comer hoje?',
    'Sugira um treino rápido',
    'Como melhorar meu sono?',
    'Dicas para mais energia'
  ]

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) return 'Hoje'
    if (date.toDateString() === yesterday.toDateString()) return 'Ontem'
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }

  return (
    <div className="flex h-[100dvh] bg-gray-50">
      {/* Sidebar de Conversas */}
      <AnimatePresence>
        {showSidebar && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSidebar(false)}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            />
            
            {/* Sidebar */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-full w-80 bg-white z-50 shadow-xl flex flex-col"
            >
              {/* Header Sidebar */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-lg">Conversas</h2>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Botão Nova Conversa */}
              <div className="p-3 border-b border-gray-100">
                <button
                  onClick={startNewConversation}
                  className="w-full btn-primary py-3 rounded-xl flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Nova Conversa
                </button>
              </div>

              {/* Lista de Conversas */}
              <div className="flex-1 overflow-y-auto">
                {loadingSessions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhuma conversa ainda</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {sessions.map(session => (
                      <div 
                        key={session.id}
                        className={`p-3 hover:bg-gray-50 cursor-pointer group ${
                          currentSessionId === session.id ? 'bg-primary-50' : ''
                        }`}
                      >
                        {editingSessionId === session.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={e => setEditingTitle(e.target.value)}
                              className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm"
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter') updateSessionTitle(session.id, editingTitle)
                                if (e.key === 'Escape') setEditingSessionId(null)
                              }}
                            />
                            <button 
                              onClick={() => updateSessionTitle(session.id, editingTitle)}
                              className="p-1 text-green-600"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setEditingSessionId(null)}
                              className="p-1 text-gray-400"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div 
                            className="flex items-start justify-between"
                            onClick={() => loadSessionMessages(session.id)}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{session.title}</p>
                              <p className="text-xs text-gray-500">{formatDate(session.updated_at)}</p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  setEditingSessionId(session.id)
                                  setEditingTitle(session.title)
                                }}
                                className="p-1.5 hover:bg-gray-200 rounded"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                              </button>
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  deleteSession(session.id)
                                }}
                                className="p-1.5 hover:bg-red-100 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer - Excluir Todas */}
              {sessions.length > 0 && (
                <div className="p-3 border-t border-gray-100">
                  <button
                    onClick={deleteAllSessions}
                    className="w-full py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir todas as conversas
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Área Principal do Chat */}
      <div className="flex-1 flex flex-col h-full">
        {/* Header Fixo */}
        <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-4 flex-shrink-0 z-10">
          <button 
            onClick={() => setShowSidebar(true)}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">Vita</h1>
              <p className="text-xs text-gray-500">Sua assistente de bem-estar</p>
            </div>
          </div>
          <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </header>

        {/* Área de Mensagens - Scrollável */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center mb-6 shadow-lg">
                <Sparkles className="w-10 h-10 text-primary-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Olá{userName ? `, ${userName.split(' ')[0]}` : ''}!
              </h2>
              <p className="text-gray-600 mb-8 max-w-sm">
                Sou a Vita, sua assistente de nutrição e bem-estar. Como posso te ajudar?
              </p>

              <div className="flex flex-wrap justify-center gap-2 max-w-md">
                {suggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-4 py-2.5 bg-white text-primary-700 rounded-full text-sm font-medium hover:bg-primary-50 transition-all shadow-sm border border-primary-100"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-primary-500 text-white rounded-br-md shadow-md'
                        : 'bg-white text-gray-900 rounded-bl-md shadow-sm border border-gray-100'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{message.content}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="bg-white shadow-sm px-4 py-3 rounded-2xl rounded-bl-md border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                    <span className="text-gray-500 text-sm">Vita está digitando...</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Input Fixo na Parte Inferior */}
        <div className="bg-white border-t border-gray-200 p-4 pb-24 flex-shrink-0">
          <form onSubmit={sendMessage} className="flex items-center gap-3 max-w-2xl mx-auto">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="flex-1 px-4 py-3.5 bg-gray-100 border-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-gray-900 placeholder-gray-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-12 h-12 bg-primary-500 text-white rounded-2xl flex items-center justify-center hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
