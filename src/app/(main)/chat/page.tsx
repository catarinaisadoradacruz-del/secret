'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  ArrowLeft, Send, Sparkles, Loader2, Menu, Plus, MessageCircle, X,
  MoreVertical, Edit2, Trash2, Check, ChevronLeft, ChevronRight, Search, Bot
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [editingSession, setEditingSession] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadSessions()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-menu-trigger]') && !target.closest('[data-menu-dropdown]')) {
        setMenuOpen(null)
      }
    }
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

      const { data } = await supabase
        .from('chat_sessions')
        .select('id, title, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(100)

      if (data) setSessions(data)
    } catch (e) { console.error(e) }
  }

  const loadMessages = async (sessionId: string) => {
    setLoadingMessages(true)
    setCurrentSession(sessionId)
    setMessages([])
    setShowMobileSidebar(false)
    setMenuOpen(null)
    setConfirmDelete(null)
    
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('messages')
        .select('id, role, content, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error loading messages:', error)
        setLoadingMessages(false)
        return
      }

      setMessages(data || [])
    } catch (e) { 
      console.error(e)
    } finally {
      setLoadingMessages(false)
    }
  }

  const createNewSession = () => {
    setCurrentSession(null)
    setMessages([])
    setShowMobileSidebar(false)
    setMenuOpen(null)
    inputRef.current?.focus()
  }

  const deleteSession = async (sessionId: string) => {
    try {
      const supabase = createClient()
      await supabase.from('messages').delete().eq('session_id', sessionId)
      await supabase.from('chat_sessions').delete().eq('id', sessionId)
      
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      if (currentSession === sessionId) {
        setCurrentSession(null)
        setMessages([])
      }
      setMenuOpen(null)
      setConfirmDelete(null)
    } catch (e) { console.error(e) }
  }

  const startEditSession = (session: ChatSession) => {
    setEditingSession(session.id)
    setEditTitle(session.title)
    setMenuOpen(null)
  }

  const saveSessionTitle = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!editingSession || !editTitle.trim()) return
    
    try {
      const supabase = createClient()
      await supabase.from('chat_sessions').update({ title: editTitle.trim() }).eq('id', editingSession)
      setSessions(prev => prev.map(s => s.id === editingSession ? { ...s, title: editTitle.trim() } : s))
      setEditingSession(null)
    } catch (e) { console.error(e) }
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)

    const tempId = 'temp-' + Date.now()
    setMessages(prev => [...prev, { id: tempId, role: 'user', content: userMessage, created_at: new Date().toISOString() }])

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')

      let sessionId = currentSession
      
      if (!sessionId) {
        const title = userMessage.length > 50 ? userMessage.slice(0, 47) + '...' : userMessage
        const { data: newSession } = await supabase
          .from('chat_sessions')
          .insert({ user_id: user.id, title })
          .select('id, title, updated_at')
          .single()
        
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
        .select()
        .single()

      if (savedUserMsg) {
        setMessages(prev => prev.map(m => m.id === tempId ? savedUserMsg : m))
      }

      // Chamar API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, sessionId })
      })

      const data = await response.json()
      const assistantContent = data.response || 'Desculpe, não consegui processar.'
      
      // Salvar resposta
      const { data: savedAssistantMsg } = await supabase
        .from('messages')
        .insert({ session_id: sessionId, role: 'assistant', content: assistantContent })
        .select()
        .single()

      setMessages(prev => [...prev, savedAssistantMsg || { id: 'a-' + Date.now(), role: 'assistant', content: assistantContent, created_at: new Date().toISOString() }])

      // Atualizar sessão
      await supabase.from('chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sessionId)
      setSessions(prev => {
        const updated = prev.map(s => s.id === sessionId ? { ...s, updated_at: new Date().toISOString() } : s)
        return updated.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      })

    } catch (e) {
      console.error(e)
      setMessages(prev => [...prev.filter(m => m.id !== tempId), { id: 'err-' + Date.now(), role: 'assistant', content: 'Erro ao enviar. Tente novamente.', created_at: new Date().toISOString() }])
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
    if (days < 7) return `${days}d atrás`
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  const filteredSessions = sessions.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()))

  // Componente reutilizável da lista de sessões (usado tanto no desktop quanto no mobile)
  const SessionItem = ({ session, isMobile = false }: { session: ChatSession, isMobile?: boolean }) => {
    const isEditing = editingSession === session.id
    const isActive = currentSession === session.id
    const isDeleting = confirmDelete === session.id
    const isMenuOpen = menuOpen === session.id

    if (isEditing) {
      return (
        <form onSubmit={saveSessionTitle} className="flex items-center gap-1 p-2 bg-white border rounded-xl">
          <input 
            type="text" 
            value={editTitle} 
            onChange={(e) => setEditTitle(e.target.value)} 
            className="flex-1 px-2 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" 
            autoFocus 
            onClick={(e) => e.stopPropagation()} 
            onKeyDown={(e) => { if (e.key === 'Escape') setEditingSession(null) }}
          />
          <button type="submit" className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg">
            <Check className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => setEditingSession(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </form>
      )
    }

    if (isDeleting) {
      return (
        <div className="p-2.5 rounded-xl border border-red-200 bg-red-50">
          <p className="text-xs text-red-600 font-medium mb-2">Excluir esta conversa?</p>
          <div className="flex gap-2">
            <button 
              onClick={() => deleteSession(session.id)} 
              className="flex-1 px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 transition-colors"
            >
              Excluir
            </button>
            <button 
              onClick={() => setConfirmDelete(null)} 
              className="flex-1 px-3 py-1.5 bg-white text-gray-600 text-xs font-medium rounded-lg border hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )
    }

    return (
      <div
        className={`group relative rounded-xl transition-all cursor-pointer ${
          isActive 
            ? 'bg-primary-50 border border-primary-200 shadow-sm' 
            : 'hover:bg-gray-50 border border-transparent'
        }`}
        onClick={() => loadMessages(session.id)}
      >
        <div className="p-2.5 pr-9">
          <div className="flex items-center gap-2">
            <MessageCircle className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
            <span className={`truncate text-sm ${isActive ? 'text-primary-700 font-medium' : 'text-gray-700'}`}>
              {session.title}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5 ml-6">{formatDate(session.updated_at)}</p>
        </div>
        
        {/* Menu trigger - visível no hover (desktop) ou sempre (mobile) */}
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
          <button 
            data-menu-trigger
            onClick={(e) => { 
              e.stopPropagation()
              setMenuOpen(isMenuOpen ? null : session.id)
              setConfirmDelete(null)
            }} 
            className={`p-1.5 rounded-lg transition-all ${
              isMobile 
                ? 'opacity-70 hover:opacity-100 hover:bg-gray-200' 
                : 'opacity-0 group-hover:opacity-100 hover:bg-gray-200'
            }`}
          >
            <MoreVertical className="w-4 h-4 text-gray-500" />
          </button>
          
          {/* Dropdown menu */}
          {isMenuOpen && (
            <div 
              data-menu-dropdown
              className="absolute right-0 top-8 bg-white border rounded-xl shadow-lg py-1 z-[60] min-w-[140px] overflow-hidden"
            >
              <button 
                onClick={(e) => { 
                  e.stopPropagation()
                  startEditSession(session)
                }} 
                className="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
              >
                <Edit2 className="w-4 h-4 text-gray-500" /> 
                <span>Renomear</span>
              </button>
              <button 
                onClick={(e) => { 
                  e.stopPropagation()
                  setConfirmDelete(session.id)
                  setMenuOpen(null)
                }} 
                className="w-full px-3 py-2.5 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> 
                <span>Excluir</span>
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar Desktop */}
      <div className={`hidden md:flex flex-col bg-white border-r transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-72'}`}>
        {!sidebarCollapsed ? (
          <>
            <div className="p-3 border-b flex items-center justify-between">
              <h2 className="font-bold">Conversas</h2>
              <button onClick={() => setSidebarCollapsed(true)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Recolher">
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-2">
              <button onClick={createNewSession} className="w-full flex items-center justify-center gap-2 p-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors">
                <Plus className="w-5 h-5" /> Nova Conversa
              </button>
            </div>

            <div className="px-2 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
              {filteredSessions.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">{searchQuery ? 'Nenhuma encontrada' : 'Nenhuma conversa'}</p>
              ) : (
                filteredSessions.map(s => (
                  <SessionItem key={s.id} session={s} />
                ))
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center py-3 gap-2">
            <button onClick={() => setSidebarCollapsed(false)} className="p-2 hover:bg-gray-100 rounded-lg" title="Expandir"><ChevronRight className="w-5 h-5" /></button>
            <button onClick={createNewSession} className="p-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg" title="Nova conversa"><Plus className="w-5 h-5" /></button>
          </div>
        )}
      </div>

      {/* Sidebar Mobile - AGORA COM EDITAR/EXCLUIR */}
      {showMobileSidebar && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => { setShowMobileSidebar(false); setMenuOpen(null); setConfirmDelete(null); }} />
          <div className="fixed inset-y-0 left-0 z-50 w-[280px] bg-white flex flex-col md:hidden shadow-2xl">
            <div className="p-3 border-b flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Conversas</h2>
              <button onClick={() => { setShowMobileSidebar(false); setMenuOpen(null); setConfirmDelete(null); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-2">
              <button onClick={createNewSession} className="w-full flex items-center justify-center gap-2 p-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors">
                <Plus className="w-5 h-5" /> Nova Conversa
              </button>
            </div>

            {/* Busca mobile */}
            {sessions.length > 3 && (
              <div className="px-2 pb-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar conversa..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
              {filteredSessions.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">{searchQuery ? 'Nenhuma encontrada' : 'Nenhuma conversa ainda'}</p>
                </div>
              ) : (
                filteredSessions.map(s => (
                  <SessionItem key={s.id} session={s} isMobile />
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b px-4 py-3 flex items-center gap-3">
          <button onClick={() => setShowMobileSidebar(true)} className="p-2 hover:bg-gray-100 rounded-xl md:hidden"><Menu className="w-5 h-5" /></button>
          {sidebarCollapsed && <button onClick={() => setSidebarCollapsed(false)} className="p-2 hover:bg-gray-100 rounded-xl hidden md:block"><Menu className="w-5 h-5" /></button>}
          <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-xl"><ArrowLeft className="w-5 h-5" /></Link>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center"><Sparkles className="w-5 h-5 text-white" /></div>
            <div><h1 className="font-semibold">Vita AI</h1><p className="text-xs text-gray-500">Sua assistente de bem-estar</p></div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loadingMessages ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center"><Sparkles className="w-8 h-8 text-white" /></div>
              <h2 className="text-xl font-semibold mb-2">Olá! Sou a Vita 💜</h2>
              <p className="text-gray-500 max-w-md mx-auto mb-6">Pergunte sobre alimentação, exercícios, gestação ou qualquer dúvida!</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
                {['O que posso comer na gestação?', 'Quais exercícios são seguros?', 'Como melhorar minha alimentação?', 'Dicas para mais energia'].map((s, i) => (
                  <button key={i} onClick={() => { setInput(s); inputRef.current?.focus(); }} className="p-3 text-left text-sm bg-white border rounded-xl hover:border-primary-300 hover:bg-primary-50 transition-colors">{s}</button>
                ))}
              </div>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-primary-500 text-white rounded-br-md' : 'bg-white shadow-sm border rounded-bl-md'}`}>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white shadow-sm border p-4 rounded-2xl rounded-bl-md">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-sm text-gray-400 ml-1">Pensando...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 sm:p-4 bg-white border-t">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <input 
              ref={inputRef} 
              type="text" 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()} 
              placeholder="Digite sua mensagem..." 
              className="flex-1 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm" 
            />
            <button 
              onClick={sendMessage} 
              disabled={loading || !input.trim()} 
              className="px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl disabled:opacity-50 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
