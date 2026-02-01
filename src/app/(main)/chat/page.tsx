'use client'

import { useState, useEffect, useRef } from 'react'
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
    inputRef.current?.focus()
  }

  const deleteSession = async (sessionId: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!confirm('Tem certeza que deseja excluir esta conversa?')) return
    
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
    } catch (e) { console.error(e) }
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

      const { data: savedUserMsg } = await supabase
        .from('messages')
        .insert({ session_id: sessionId, role: 'user', content: userMessage })
        .select()
        .single()

      if (savedUserMsg) {
        setMessages(prev => prev.map(m => m.id === tempId ? savedUserMsg : m))
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, sessionId })
      })

      const data = await response.json()
      const assistantContent = data.response || 'Desculpe, não consegui processar.'
      
      const { data: savedAssistantMsg } = await supabase
        .from('messages')
        .insert({ session_id: sessionId, role: 'assistant', content: assistantContent })
        .select()
        .single()

      setMessages(prev => [...prev, savedAssistantMsg || { id: 'a-' + Date.now(), role: 'assistant', content: assistantContent, created_at: new Date().toISOString() }])

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

  // Componente de item da sessão - reutilizado desktop e mobile
  const renderSessionItem = (s: ChatSession, isMobile: boolean) => (
    <div
      key={s.id}
      className={`group relative rounded-xl transition-colors cursor-pointer ${currentSession === s.id ? 'bg-primary-50 border border-primary-200' : 'hover:bg-gray-100 border border-transparent'}`}
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
          <button type="submit" className="p-1.5 text-green-600 hover:bg-green-50 rounded"><Check className="w-4 h-4" /></button>
          <button type="button" onClick={(e) => { e.stopPropagation(); setEditingSession(null); }} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
        </form>
      ) : (
        <div className="p-2.5 pr-10">
          <div className="flex items-center gap-2">
            <MessageCircle className={`w-4 h-4 flex-shrink-0 ${currentSession === s.id ? 'text-primary-600' : 'text-gray-400'}`} />
            <span className={`truncate text-sm ${currentSession === s.id ? 'text-primary-700 font-medium' : ''}`}>{s.title}</span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5 ml-6">{formatDate(s.updated_at)}</p>
        </div>
      )}
      
      {editingSession !== s.id && (
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === s.id ? null : s.id); }}
            className={`p-1.5 rounded-lg hover:bg-gray-200 transition-all ${isMobile ? '' : 'opacity-0 group-hover:opacity-100'}`}
            style={menuOpen === s.id ? { opacity: 1 } : undefined}
          >
            <MoreVertical className="w-4 h-4 text-gray-500" />
          </button>
          {menuOpen === s.id && (
            <div className={`absolute right-0 top-8 bg-white border rounded-lg shadow-lg py-1 min-w-[140px] ${isMobile ? 'z-[60]' : 'z-20'}`}>
              <button onClick={(e) => startEditSession(s, e)} className="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-100 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-gray-600" /> Renomear
              </button>
              <button onClick={(e) => deleteSession(s.id, e)} className="w-full px-3 py-2.5 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> Excluir
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )

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
                filteredSessions.map(s => renderSessionItem(s, false))
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

      {/* Sidebar Mobile - COM editar/excluir/busca */}
      {showMobileSidebar && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => { setShowMobileSidebar(false); setMenuOpen(null); }} />
          <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white flex flex-col md:hidden">
            <div className="p-3 border-b flex items-center justify-between">
              <h2 className="font-bold">Conversas</h2>
              <button onClick={() => { setShowMobileSidebar(false); setMenuOpen(null); }} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-2">
              <button onClick={createNewSession} className="w-full flex items-center justify-center gap-2 p-2.5 bg-primary-500 text-white rounded-xl font-medium"><Plus className="w-5 h-5" /> Nova Conversa</button>
            </div>
            
            {/* Busca no mobile */}
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

            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
              {filteredSessions.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">{searchQuery ? 'Nenhuma encontrada' : 'Nenhuma conversa'}</p>
              ) : (
                filteredSessions.map(s => renderSessionItem(s, true))
              )}
            </div>
          </div>
        </>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b px-4 py-3 flex items-center gap-3">
          <button onClick={() => setShowMobileSidebar(true)} className="p-2 hover:bg-gray-100 rounded-xl md:hidden"><Menu className="w-5 h-5" /></button>
          {sidebarCollapsed && <button onClick={() => setSidebarCollapsed(false)} className="p-2 hover:bg-gray-100 rounded-xl hidden md:block"><Menu className="w-5 h-5" /></button>}
          <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-xl"><ArrowLeft className="w-5 h-5" /></Link>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center"><Sparkles className="w-5 h-5 text-white" /></div>
            <div><h1 className="font-semibold">Vita AI</h1><p className="text-xs text-gray-500">Sua assistente</p></div>
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
                <div className={`max-w-[85%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-primary-500 text-white rounded-br-md' : 'bg-white shadow-sm border rounded-bl-md'}`}>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white shadow-sm border p-4 rounded-2xl rounded-bl-md flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-primary-500" /><span className="text-sm text-gray-500">Pensando...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()} placeholder="Digite sua mensagem..." className="flex-1 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" />
            <button onClick={sendMessage} disabled={loading || !input.trim()} className="px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl disabled:opacity-50 transition-colors"><Send className="w-5 h-5" /></button>
          </div>
        </div>
      </div>
    </div>
  )
}
