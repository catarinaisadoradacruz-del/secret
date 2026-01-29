'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { 
  ArrowLeft, Send, Sparkles, Loader2, Menu, Plus, MessageCircle, X,
  MoreVertical, Edit2, Trash2, Check, ChevronLeft, ChevronRight, Search
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

interface ChatSession {
  id: string
  title: string
  updated_at: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSession, setCurrentSession] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [editingSession, setEditingSession] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadSessions()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClick = () => setMenuOpen(null)
    if (menuOpen) {
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [menuOpen])

  const loadSessions = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('chat_sessions')
        .select('id, title, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Error loading sessions:', error)
        return
      }

      if (data) {
        setSessions(data)
      }
    } catch (e) { 
      console.error('Load sessions error:', e) 
    }
  }

  const loadMessages = useCallback(async (sessionId: string) => {
    if (loadingMessages) return
    
    setLoadingMessages(true)
    setCurrentSession(sessionId)
    setShowMobileSidebar(false)
    
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('messages')
        .select('id, role, content, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error loading messages:', error)
        return
      }

      setMessages(data || [])
    } catch (e) { 
      console.error('Load messages error:', e) 
    } finally {
      setLoadingMessages(false)
    }
  }, [loadingMessages])

  const createNewSession = () => {
    setCurrentSession(null)
    setMessages([])
    setShowMobileSidebar(false)
    inputRef.current?.focus()
  }

  const deleteSession = async (sessionId: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    
    if (!confirm('Tem certeza que deseja excluir esta conversa?')) return
    
    try {
      const supabase = createClient()
      
      // Deletar mensagens primeiro
      await supabase.from('messages').delete().eq('session_id', sessionId)
      
      // Depois deletar a sessão
      const { error } = await supabase.from('chat_sessions').delete().eq('id', sessionId)
      
      if (error) {
        console.error('Error deleting session:', error)
        return
      }
      
      // Atualizar lista
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      
      // Se era a sessão atual, limpar
      if (currentSession === sessionId) {
        setCurrentSession(null)
        setMessages([])
      }
      
      setMenuOpen(null)
    } catch (e) { 
      console.error('Delete error:', e) 
    }
  }

  const startEditSession = (session: ChatSession, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setEditingSession(session.id)
    setEditTitle(session.title)
    setMenuOpen(null)
  }

  const saveSessionTitle = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!editingSession || !editTitle.trim()) return
    
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('chat_sessions')
        .update({ title: editTitle.trim() })
        .eq('id', editingSession)
      
      if (error) {
        console.error('Error updating title:', error)
        return
      }
      
      setSessions(prev => prev.map(s => 
        s.id === editingSession ? { ...s, title: editTitle.trim() } : s
      ))
      setEditingSession(null)
    } catch (e) { 
      console.error('Save title error:', e) 
    }
  }

  const cancelEdit = () => {
    setEditingSession(null)
    setEditTitle('')
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)

    const tempUserMsg: Message = {
      id: 'temp-' + Date.now(),
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempUserMsg])

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')

      let sessionId = currentSession
      
      // Criar nova sessão se não existir
      if (!sessionId) {
        const title = userMessage.length > 50 
          ? userMessage.slice(0, 47) + '...' 
          : userMessage
          
        const { data: newSession, error: sessionError } = await supabase
          .from('chat_sessions')
          .insert({ user_id: user.id, title })
          .select('id, title, updated_at')
          .single()
        
        if (sessionError) {
          console.error('Error creating session:', sessionError)
          throw sessionError
        }
        
        if (newSession) {
          sessionId = newSession.id
          setCurrentSession(sessionId)
          setSessions(prev => [newSession, ...prev])
        }
      }

      // Salvar mensagem do usuário
      const { data: savedUserMsg } = await supabase
        .from('messages')
        .insert({ session_id: sessionId, role: 'user', content: userMessage })
        .select('id, role, content, created_at')
        .single()

      if (savedUserMsg) {
        setMessages(prev => prev.map(m => m.id === tempUserMsg.id ? savedUserMsg : m))
      }

      // Chamar API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, sessionId })
      })

      const data = await response.json()
      const assistantContent = data.response || 'Desculpe, não consegui processar sua mensagem.'
      
      // Salvar resposta
      const { data: savedAssistantMsg } = await supabase
        .from('messages')
        .insert({ session_id: sessionId, role: 'assistant', content: assistantContent })
        .select('id, role, content, created_at')
        .single()

      if (savedAssistantMsg) {
        setMessages(prev => [...prev, savedAssistantMsg])
      } else {
        setMessages(prev => [...prev, {
          id: 'assistant-' + Date.now(),
          role: 'assistant',
          content: assistantContent,
          created_at: new Date().toISOString()
        }])
      }

      // Atualizar timestamp da sessão
      await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', sessionId)

      // Atualizar lista de sessões
      setSessions(prev => {
        const updated = prev.map(s => 
          s.id === sessionId ? { ...s, updated_at: new Date().toISOString() } : s
        )
        return updated.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      })

    } catch (e) {
      console.error('Send message error:', e)
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== tempUserMsg.id)
        return [...filtered, {
          id: 'error-' + Date.now(),
          role: 'assistant',
          content: 'Desculpe, ocorreu um erro. Tente novamente.',
          created_at: new Date().toISOString()
        }]
      })
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return 'Hoje'
    if (days === 1) return 'Ontem'
    if (days < 7) return `${days} dias atrás`
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const sidebarWidth = sidebarCollapsed ? 'w-0 md:w-16' : 'w-72'

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar Desktop */}
      <div className={`hidden md:flex flex-col bg-white border-r transition-all duration-300 ${sidebarWidth}`}>
        {!sidebarCollapsed ? (
          <>
            {/* Header */}
            <div className="p-3 border-b flex items-center justify-between">
              <h2 className="font-bold">Conversas</h2>
              <button 
                onClick={() => setSidebarCollapsed(true)}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
                title="Recolher menu"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
            
            {/* Nova conversa */}
            <div className="p-2">
              <button 
                onClick={createNewSession} 
                className="w-full flex items-center justify-center gap-2 p-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors"
              >
                <Plus className="w-5 h-5" /> Nova Conversa
              </button>
            </div>

            {/* Busca */}
            <div className="px-2 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar conversas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
            </div>

            {/* Lista de sessões */}
            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
              {filteredSessions.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">
                  {searchQuery ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
                </p>
              ) : (
                filteredSessions.map(s => (
                  <div
                    key={s.id}
                    className={`group relative rounded-xl transition-colors cursor-pointer ${
                      currentSession === s.id 
                        ? 'bg-primary-50 border border-primary-200' 
                        : 'hover:bg-gray-100 border border-transparent'
                    }`}
                    onClick={() => loadMessages(s.id)}
                  >
                    {editingSession === s.id ? (
                      <form onSubmit={saveSessionTitle} className="flex items-center gap-1 p-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-primary-500 outline-none"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button type="submit" className="p-1 text-green-600 hover:bg-green-50 rounded">
                          <Check className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); cancelEdit(); }} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </form>
                    ) : (
                      <div className="p-2.5 pr-8">
                        <div className="flex items-center gap-2">
                          <MessageCircle className={`w-4 h-4 flex-shrink-0 ${currentSession === s.id ? 'text-primary-600' : 'text-gray-400'}`} />
                          <span className={`truncate text-sm ${currentSession === s.id ? 'text-primary-700 font-medium' : ''}`}>
                            {s.title}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 ml-6">{formatDate(s.updated_at)}</p>
                      </div>
                    )}
                    
                    {editingSession !== s.id && (
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setMenuOpen(menuOpen === s.id ? null : s.id)
                          }}
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-all"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>
                        
                        {menuOpen === s.id && (
                          <div className="absolute right-0 top-8 bg-white border rounded-lg shadow-lg py-1 z-20 min-w-[130px]">
                            <button
                              onClick={(e) => startEditSession(s, e)}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                            >
                              <Edit2 className="w-4 h-4" /> Renomear
                            </button>
                            <button
                              onClick={(e) => deleteSession(s.id, e)}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" /> Excluir
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          /* Sidebar Collapsed */
          <div className="flex flex-col items-center py-3 gap-2">
            <button 
              onClick={() => setSidebarCollapsed(false)}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Expandir menu"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button 
              onClick={createNewSession}
              className="p-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg"
              title="Nova conversa"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Sidebar Mobile */}
      {showMobileSidebar && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setShowMobileSidebar(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white flex flex-col md:hidden">
            <div className="p-3 border-b flex items-center justify-between">
              <h2 className="font-bold">Conversas</h2>
              <button onClick={() => setShowMobileSidebar(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-2">
              <button 
                onClick={createNewSession} 
                className="w-full flex items-center justify-center gap-2 p-2.5 bg-primary-500 text-white rounded-xl font-medium"
              >
                <Plus className="w-5 h-5" /> Nova Conversa
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
              {sessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => loadMessages(s.id)}
                  className={`w-full text-left p-2.5 rounded-xl transition-colors ${
                    currentSession === s.id ? 'bg-primary-50' : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="truncate text-sm">{s.title}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 ml-6">{formatDate(s.updated_at)}</p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Main Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b px-4 py-3 flex items-center gap-3">
          <button onClick={() => setShowMobileSidebar(true)} className="p-2 hover:bg-gray-100 rounded-xl md:hidden">
            <Menu className="w-5 h-5" />
          </button>
          {sidebarCollapsed && (
            <button onClick={() => setSidebarCollapsed(false)} className="p-2 hover:bg-gray-100 rounded-xl hidden md:block">
              <Menu className="w-5 h-5" />
            </button>
          )}
          <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold">Vita AI</h1>
              <p className="text-xs text-gray-500">Sua assistente de saúde</p>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loadingMessages ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Olá! Sou a Vita 💜</h2>
              <p className="text-gray-500 max-w-md mx-auto mb-6">
                Sua assistente de nutrição e bem-estar. Pergunte sobre alimentação, exercícios, gestação ou qualquer dúvida!
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
                {[
                  'O que posso comer durante a gestação?',
                  'Quais exercícios são seguros?',
                  'Como melhorar minha alimentação?',
                  'Dicas para ter mais energia'
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                    className="p-3 text-left text-sm bg-white border border-gray-200 rounded-xl hover:border-primary-300 hover:bg-primary-50 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-primary-500 text-white rounded-br-md'
                    : 'bg-white shadow-sm border rounded-bl-md'
                }`}>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white shadow-sm border p-4 rounded-2xl rounded-bl-md">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
                  <span className="text-sm text-gray-500">Pensando...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Digite sua mensagem..."
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
