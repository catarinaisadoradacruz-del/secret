'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, Sparkles, ArrowLeft, MessageSquare, Plus, Trash2, Menu, History } from 'lucide-react'
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
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [showSidebar, setShowSidebar] = useState(false)
  const [loadingSessions, setLoadingSessions] = useState(true)
  
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const shouldAutoScroll = useRef(true)

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
        loadSessions(user.id)
      }
    }
    loadUser()
  }, [])

  const loadSessions = async (uid: string) => {
    setLoadingSessions(true)
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('chat_sessions')
        .select('id, title, created_at, updated_at, messages')
        .eq('user_id', uid)
        .order('updated_at', { ascending: false })
        .limit(50)

      setSessions(data || [])
    } catch (err) {
      console.error('Erro ao carregar sessões:', err)
    } finally {
      setLoadingSessions(false)
    }
  }

  // Scroll suave melhorado - não trava durante digitação
  const scrollToBottom = useCallback((force = false) => {
    if (!shouldAutoScroll.current && !force) return
    
    requestAnimationFrame(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }
    })
  }, [])

  // Detectar se usuário scrollou manualmente para cima
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
    shouldAutoScroll.current = isNearBottom
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const createNewSession = async () => {
    if (!userId) return null
    
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({ user_id: userId, title: 'Nova conversa', messages: [] })
        .select()
        .single()

      if (error) throw error
      
      setSessions(prev => [data, ...prev])
      setCurrentSessionId(data.id)
      setMessages([])
      setShowSidebar(false)
      return data.id
    } catch (err) {
      console.error('Erro ao criar sessão:', err)
      return null
    }
  }

  const loadSession = (session: ChatSession) => {
    setCurrentSessionId(session.id)
    setMessages(session.messages || [])
    setShowSidebar(false)
    setTimeout(() => scrollToBottom(true), 100)
  }

  const updateSessionInDB = async (sessionId: string, newMessages: Message[], newTitle?: string) => {
    try {
      const supabase = createClient()
      const updateData: any = {
        messages: newMessages,
        updated_at: new Date().toISOString()
      }
      if (newTitle) updateData.title = newTitle
      
      await supabase.from('chat_sessions').update(updateData).eq('id', sessionId)

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
      console.error('Erro ao excluir:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    shouldAutoScroll.current = true

    // Criar sessão se não existir
    let sessionId = currentSessionId
    if (!sessionId) {
      sessionId = await createNewSession()
      if (!sessionId) return
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
          history: messages.slice(-10) // Últimas 10 mensagens como contexto
        }),
      })

      const data = await response.json()
      
      const assistantMessage: Message = { 
        role: 'assistant', 
        content: data.response || 'Desculpe, não consegui processar sua mensagem.' 
      }
      
      const updatedMessages = [...newMessages, assistantMessage]
      setMessages(updatedMessages)

      // Atualizar título se for primeira mensagem
      const title = messages.length === 0 
        ? userMessage.slice(0, 40) + (userMessage.length > 40 ? '...' : '')
        : undefined

      await updateSessionInDB(sessionId, updatedMessages, title)

    } catch (error) {
      console.error('Erro:', error)
      setMessages([...newMessages, { 
        role: 'assistant', 
        content: 'Ops! Algo deu errado. Tente novamente! 💜' 
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="flex h-[100dvh] bg-background">
      {/* Sidebar - Histórico */}
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setShowSidebar(false)}
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed lg:relative left-0 top-0 h-full w-72 bg-white border-r border-gray-100 z-50 flex flex-col"
            >
              <div className="p-4 border-b border-gray-100">
                <button
                  onClick={createNewSession}
                  className="w-full flex items-center justify-center gap-2 bg-primary-500 text-white py-3 rounded-xl font-medium hover:bg-primary-600 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Nova Conversa
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {loadingSessions ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                  </div>
                ) : sessions.length === 0 ? (
                  <p className="text-center text-text-secondary py-8 text-sm">
                    Nenhuma conversa ainda
                  </p>
                ) : (
                  <div className="space-y-1">
                    {sessions.map(session => (
                      <div
                        key={session.id}
                        className={`group flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-colors ${
                          currentSessionId === session.id 
                            ? 'bg-primary-50 text-primary-700' 
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => loadSession(session)}
                      >
                        <MessageSquare className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1 truncate text-sm">{session.title}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteSession(session.id) }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Área Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <History className="w-5 h-5 text-gray-600" />
            </button>

            <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>

            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-gray-900">Vita</h1>
                <p className="text-xs text-gray-500">Sua assistente de bem-estar</p>
              </div>
            </div>

            <button
              onClick={createNewSession}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              title="Nova conversa"
            >
              <Plus className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </header>

        {/* Mensagens */}
        <div 
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scroll-smooth"
          style={{ overscrollBehavior: 'contain' }}
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center mb-4">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Olá{userName ? `, ${userName}` : ''}! 💜
              </h2>
              <p className="text-gray-500 mb-6 max-w-sm">
                Sou a Vita, sua assistente de bem-estar materno. Como posso te ajudar hoje?
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {['Dicas de alimentação', 'Exercícios seguros', 'Sintomas da gravidez', 'Receitas saudáveis'].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="px-4 py-2 bg-gray-100 hover:bg-primary-50 hover:text-primary-600 rounded-full text-sm transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-primary-500 text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-800 rounded-bl-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{message.content}</p>
                  </div>
                </motion.div>
              ))}
              
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                      <span className="text-sm text-gray-500">Pensando...</span>
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} className="h-1" />
            </>
          )}
        </div>

        {/* Input */}
        <div className="flex-shrink-0 border-t border-gray-100 bg-white p-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="flex-1 px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-4 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
