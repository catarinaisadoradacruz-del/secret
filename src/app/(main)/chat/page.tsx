'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { 
  ArrowLeft, Send, Sparkles, Loader2, Menu, Plus, MessageCircle, X,
  MoreVertical, Edit2, Trash2, Check, ChevronLeft, Search,
  Utensils, Baby, Dumbbell, Moon, Pill, Smile, FileText
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  suggestions?: string[]
}

interface ChatSession {
  id: string
  title: string
  updated_at: string
}

// ============================================================
// COMPONENTE DE MARKDOWN RENDERER
// ============================================================
function MarkdownRenderer({ content }: { content: string }) {
  const rendered = useMemo(() => {
    let html = content
    
    // Escapar HTML perigoso
    html = html.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    
    // Headers (### primeiro, ## depois, # por último)
    html = html.replace(/^### (.+)$/gm, '<h3 class="text-base font-bold mt-4 mb-2 text-gray-800">$1</h3>')
    html = html.replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-5 mb-2 text-gray-900">$1</h2>')
    html = html.replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-5 mb-3 text-gray-900">$1</h1>')
    
    // Tabelas - processar antes de outros elementos
    html = html.replace(/(\|.+\|[\r\n]+\|[-\s|:]+\|[\r\n]+((\|.+\|[\r\n]*)+))/g, (match) => {
      const lines = match.trim().split('\n').filter(line => line.trim())
      if (lines.length < 3) return match
      
      const headerCells = lines[0].split('|').filter(c => c.trim()).map(c => c.trim())
      // Skip separator line (lines[1])
      const bodyRows = lines.slice(2)
      
      let table = '<div class="overflow-x-auto my-3"><table class="w-full text-sm border-collapse">'
      table += '<thead><tr class="bg-primary-50 border-b-2 border-primary-200">'
      headerCells.forEach(cell => {
        table += `<th class="px-3 py-2 text-left font-semibold text-primary-800">${cell}</th>`
      })
      table += '</tr></thead><tbody>'
      
      bodyRows.forEach((row, idx) => {
        const cells = row.split('|').filter(c => c.trim()).map(c => c.trim())
        const bgClass = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
        table += `<tr class="${bgClass} border-b border-gray-100">`
        cells.forEach(cell => {
          table += `<td class="px-3 py-2 text-gray-700">${cell}</td>`
        })
        table += '</tr>'
      })
      
      table += '</tbody></table></div>'
      return table
    })
    
    // Bold (** e __)
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    html = html.replace(/__(.+?)__/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    
    // Italic (* e _) - cuidado para não conflitar com listas
    html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    
    // Listas com - 
    html = html.replace(/^- (.+)$/gm, '<li class="ml-4 pl-2 py-0.5 text-gray-700 list-disc">$1</li>')
    // Agrupar <li> consecutivos
    html = html.replace(/((<li[^>]*>.*?<\/li>\s*)+)/g, '<ul class="my-2 space-y-0.5">$1</ul>')
    
    // Listas numeradas
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-4 pl-2 py-0.5 text-gray-700">$1</li>')
    
    // Listas com •
    html = html.replace(/^[•●]\s*(.+)$/gm, '<li class="ml-4 pl-2 py-0.5 text-gray-700 list-disc">$1</li>')
    
    // Horizontal rule
    html = html.replace(/^---$/gm, '<hr class="my-4 border-gray-200">')
    
    // Parágrafos - converter linhas duplas em breaks
    html = html.replace(/\n\n/g, '</p><p class="mb-3 text-gray-700 leading-relaxed">')
    html = html.replace(/\n/g, '<br>')
    
    // Wrap em parágrafo se não começa com tag
    if (!html.startsWith('<')) {
      html = `<p class="mb-3 text-gray-700 leading-relaxed">${html}</p>`
    }
    
    // Limpar parágrafos vazios
    html = html.replace(/<p[^>]*>\s*<\/p>/g, '')
    html = html.replace(/<p[^>]*>\s*<br>\s*<\/p>/g, '')
    
    return html
  }, [content])
  
  return (
    <div 
      className="prose prose-sm max-w-none markdown-content"
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  )
}


// ============================================================
// COMPONENTE PRINCIPAL DO CHAT
// ============================================================
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
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [provider, setProvider] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadSessions() }, [])
  useEffect(() => { 
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }, [messages, suggestions])
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
    setSuggestions([])
    setShowMobileSidebar(false)
    
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('messages')
        .eq('id', sessionId)
        .single()

      if (error) { console.error('Erro ao carregar mensagens:', error); return }

      const rawMessages = data?.messages || []
      const formatted: Message[] = rawMessages.map((msg: { role: string; content: string }, i: number) => ({
        id: `msg-${sessionId.slice(0, 8)}-${i}`,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        created_at: new Date().toISOString()
      }))
      setMessages(formatted)
    } catch (e) { console.error(e) }
    finally { setLoadingMessages(false) }
  }

  const createNewSession = () => {
    setCurrentSession(null)
    setMessages([])
    setSuggestions([])
    setShowMobileSidebar(false)
    inputRef.current?.focus()
  }

  const deleteSession = async (sessionId: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!confirm('Excluir esta conversa?')) return
    try {
      const supabase = createClient()
      await supabase.from('chat_sessions').delete().eq('id', sessionId)
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      if (currentSession === sessionId) { setCurrentSession(null); setMessages([]) }
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

  const sendMessage = async (text?: string) => {
    const userMessage = (text || input).trim()
    if (!userMessage || loading) return
    setInput('')
    setLoading(true)
    setSuggestions([])

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
          .insert({ 
            user_id: user.id, 
            title, 
            messages: [{ role: 'user', content: userMessage }],
            message_count: 1
          })
          .select('id, title, updated_at')
          .single()
        
        if (newSession) {
          sessionId = newSession.id
          setCurrentSession(sessionId)
          setSessions(prev => [newSession, ...prev])
        }
      } else {
        const { data: session } = await supabase.from('chat_sessions').select('messages').eq('id', sessionId).single()
        const currentMsgs = session?.messages || []
        await supabase.from('chat_sessions').update({ 
          messages: [...currentMsgs, { role: 'user', content: userMessage }],
          message_count: currentMsgs.length + 1,
          updated_at: new Date().toISOString()
        }).eq('id', sessionId)
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage, 
          sessionId,
          history: messages.slice(-15).map(m => ({ role: m.role, content: m.content }))
        })
      })

      const data = await response.json()
      const aiContent = data.response || 'Desculpe, não consegui processar.'
      const aiSuggestions = data.suggestions || []

      setMessages(prev => [...prev, { 
        id: 'ai-' + Date.now(), role: 'assistant', content: aiContent, created_at: new Date().toISOString(), suggestions: aiSuggestions
      }])
      setSuggestions(aiSuggestions)
      setProvider(data.provider || '')

      if (sessionId) {
        const { data: session } = await supabase.from('chat_sessions').select('messages').eq('id', sessionId).single()
        const currentMsgs = session?.messages || []
        await supabase.from('chat_sessions').update({ 
          messages: [...currentMsgs, { role: 'assistant', content: aiContent }],
          message_count: currentMsgs.length + 1,
          updated_at: new Date().toISOString()
        }).eq('id', sessionId)

        setSessions(prev => {
          const updated = prev.map(s => s.id === sessionId ? { ...s, updated_at: new Date().toISOString() } : s)
          return updated.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        })
      }
    } catch (e) {
      console.error(e)
      setMessages(prev => [...prev, { 
        id: 'err-' + Date.now(), role: 'assistant', content: 'Erro ao enviar. Tente novamente.', created_at: new Date().toISOString()
      }])
    } finally { setLoading(false) }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setSuggestions([])
    sendMessage(suggestion)
  }

  const filteredSessions = sessions.filter(s => !searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase()))

  const formatDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 86400000) return 'Hoje'
    if (diff < 172800000) return 'Ontem'
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  const renderSessionItem = (s: ChatSession) => (
    <div key={s.id} onClick={() => loadMessages(s.id)} className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${currentSession === s.id ? 'bg-primary-50 border border-primary-200' : 'hover:bg-gray-50'}`}>
      <MessageCircle className={`w-4 h-4 flex-shrink-0 ${currentSession === s.id ? 'text-primary-500' : 'text-gray-400'}`} />
      <div className="flex-1 min-w-0">
        {editingSession === s.id ? (
          <form onSubmit={saveSessionTitle} className="flex gap-1"><input autoFocus value={editTitle} onChange={e => setEditTitle(e.target.value)} className="flex-1 text-sm px-2 py-0.5 border rounded" /><button type="submit" className="p-0.5"><Check className="w-4 h-4 text-green-500" /></button></form>
        ) : (
          <p className="text-sm truncate font-medium">{s.title}</p>
        )}
        <p className="text-xs text-gray-400">{formatDate(s.updated_at)}</p>
      </div>
      {editingSession !== s.id && (
        <div className="relative">
          <button onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === s.id ? null : s.id) }} className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded transition-all"><MoreVertical className="w-4 h-4 text-gray-400" /></button>
          {menuOpen === s.id && (
            <div className="absolute right-0 top-8 bg-white shadow-xl border rounded-xl py-1 z-50 w-36">
              <button onClick={(e) => startEditSession(s, e)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 w-full"><Edit2 className="w-3.5 h-3.5" /> Renomear</button>
              <button onClick={(e) => deleteSession(s.id, e)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-50 text-red-600 w-full"><Trash2 className="w-3.5 h-3.5" /> Excluir</button>
            </div>
          )}
        </div>
      )}
    </div>
  )

  const quickTopics = [
    { icon: <Utensils className="w-4 h-4" />, label: 'Monte um plano alimentar completo', color: 'text-orange-600 bg-orange-50 border-orange-200' },
    { icon: <Dumbbell className="w-4 h-4" />, label: 'Crie um treino personalizado', color: 'text-green-600 bg-green-50 border-green-200' },
    { icon: <Baby className="w-4 h-4" />, label: 'Como está meu bebê?', color: 'text-pink-600 bg-pink-50 border-pink-200' },
    { icon: <Moon className="w-4 h-4" />, label: 'Dicas para dormir melhor', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    { icon: <Pill className="w-4 h-4" />, label: 'Vitaminas e suplementos', color: 'text-purple-600 bg-purple-50 border-purple-200' },
    { icon: <Smile className="w-4 h-4" />, label: 'Preciso de apoio emocional', color: 'text-rose-600 bg-rose-50 border-rose-200' },
  ]

  return (
    <div className="flex h-[100dvh] bg-gray-50">
      {/* Estilos globais para markdown */}
      <style jsx global>{`
        .markdown-content h1, .markdown-content h2, .markdown-content h3 {
          color: #1a1a2e;
        }
        .markdown-content table {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }
        .markdown-content th {
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .markdown-content ul {
          list-style-type: disc;
          padding-left: 1.2rem;
        }
        .markdown-content li {
          margin-bottom: 0.15rem;
        }
        .markdown-content strong {
          color: #1a1a2e;
        }
        .markdown-content p {
          margin-bottom: 0.5rem;
          line-height: 1.65;
        }
        .markdown-content p:last-child {
          margin-bottom: 0;
        }
      `}</style>

      {/* Desktop Sidebar */}
      {!sidebarCollapsed && (
        <div className="hidden md:flex w-72 border-r bg-white flex-col">
          <div className="p-3 border-b flex items-center justify-between">
            <button onClick={createNewSession} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 active:scale-[0.98] transition-all font-medium"><Plus className="w-4 h-4" /> Nova conversa</button>
            <button onClick={() => setSidebarCollapsed(true)} className="ml-2 p-2 hover:bg-gray-100 rounded-xl"><ChevronLeft className="w-4 h-4" /></button>
          </div>
          <div className="px-2 py-2">
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" placeholder="Buscar conversas..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" /></div>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
            {filteredSessions.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">{searchQuery ? 'Nenhuma encontrada' : 'Nenhuma conversa ainda'}</p>
            ) : filteredSessions.map(s => renderSessionItem(s))}
          </div>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {showMobileSidebar && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setShowMobileSidebar(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-80 bg-white z-50 flex flex-col md:hidden animate-in slide-in-from-left duration-200">
            <div className="p-3 border-b flex items-center justify-between">
              <button onClick={createNewSession} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary-500 text-white rounded-xl font-medium"><Plus className="w-4 h-4" /> Nova conversa</button>
              <button onClick={() => setShowMobileSidebar(false)} className="ml-2 p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-2 pb-2 pt-2">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" /></div>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
              {filteredSessions.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">{searchQuery ? 'Nenhuma encontrada' : 'Nenhuma conversa'}</p>
              ) : filteredSessions.map(s => renderSessionItem(s))}
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
            <div>
              <h1 className="font-semibold">Vita AI</h1>
              <p className="text-xs text-gray-500">
                Sua assistente de saúde materna
                {provider && <span className="ml-1 text-gray-300">• {provider === 'groq' ? '⚡' : provider === 'gemini' ? '✨' : provider === 'local' ? '💜' : ''}</span>}
              </p>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {loadingMessages ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-xl font-bold mb-2">Olá! Sou a Vita 💜</h2>
              <p className="text-gray-500 max-w-md mx-auto mb-6">Sua assistente especialista em saúde materna. Respostas completas e detalhadas como uma profissional.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-xl mx-auto">
                {quickTopics.map((topic, i) => (
                  <button key={i} onClick={() => sendMessage(topic.label)} className={`p-3 text-left text-sm border rounded-xl hover:shadow-md transition-all active:scale-[0.98] flex items-center gap-2 ${topic.color}`}>
                    {topic.icon}
                    <span className="font-medium">{topic.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className={`${msg.role === 'user' 
                    ? 'max-w-[85%] sm:max-w-[70%] px-4 py-3 bg-primary-500 text-white rounded-2xl rounded-br-md' 
                    : 'max-w-[90%] sm:max-w-[80%] px-5 py-4 bg-white shadow-sm border rounded-2xl rounded-bl-md'}`}>
                    {msg.role === 'user' ? (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    ) : (
                      <MarkdownRenderer content={msg.content} />
                    )}
                  </div>
                </div>
              ))}

              {/* Suggestion chips */}
              {!loading && suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 pl-11">
                  {suggestions.map((s, i) => (
                    <button key={i} onClick={() => handleSuggestionClick(s)} className="px-3 py-2 text-sm bg-white border border-primary-200 text-primary-700 rounded-xl hover:bg-primary-50 hover:border-primary-300 active:scale-[0.97] transition-all shadow-sm">
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Typing indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white shadow-sm border px-5 py-4 rounded-2xl rounded-bl-md">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-sm text-gray-400">Vita está elaborando uma resposta completa...</span>
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
              placeholder="Pergunte sobre alimentação, exercícios, gravidez..." 
              className="flex-1 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm" 
            />
            <button onClick={() => sendMessage()} disabled={loading || !input.trim()} className="px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl disabled:opacity-50 transition-all active:scale-[0.95]">
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">Vita é uma IA e pode cometer erros. Por favor, verifique as respostas.</p>
        </div>
      </div>
    </div>
  )
}
