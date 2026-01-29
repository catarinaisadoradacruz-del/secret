'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  ArrowLeft, Send, Sparkles, Loader2, Menu, Plus, MessageCircle, X,
  MoreVertical, Edit2, Trash2, Check
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
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSession, setCurrentSession] = useState<string | null>(null)
  const [showSidebar, setShowSidebar] = useState(false)
  const [editingSession, setEditingSession] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadSessions()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
        .limit(50)

      if (data) {
        setSessions(data)
        // Carregar última sessão automaticamente
        if (data.length > 0 && !currentSession) {
          loadMessages(data[0].id)
        }
      }
    } catch (e) { console.error(e) }
  }

  const loadMessages = async (sessionId: string) => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (data) setMessages(data)
      setCurrentSession(sessionId)
      setShowSidebar(false)
    } catch (e) { console.error(e) }
  }

  const createNewSession = async () => {
    setCurrentSession(null)
    setMessages([])
    setShowSidebar(false)
  }

  const deleteSession = async (sessionId: string) => {
    try {
      const supabase = createClient()
      
      // Deletar mensagens primeiro
      await supabase.from('messages').delete().eq('session_id', sessionId)
      
      // Depois deletar a sessão
      await supabase.from('chat_sessions').delete().eq('id', sessionId)
      
      // Atualizar lista
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      
      // Se era a sessão atual, limpar
      if (currentSession === sessionId) {
        setCurrentSession(null)
        setMessages([])
      }
      
      setMenuOpen(null)
    } catch (e) { 
      console.error(e) 
    }
  }

  const startEditSession = (session: ChatSession) => {
    setEditingSession(session.id)
    setEditTitle(session.title)
    setMenuOpen(null)
  }

  const saveSessionTitle = async () => {
    if (!editingSession || !editTitle.trim()) return
    
    try {
      const supabase = createClient()
      await supabase
        .from('chat_sessions')
        .update({ title: editTitle.trim() })
        .eq('id', editingSession)
      
      setSessions(prev => prev.map(s => 
        s.id === editingSession ? { ...s, title: editTitle.trim() } : s
      ))
      setEditingSession(null)
    } catch (e) { 
      console.error(e) 
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)

    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, newUserMsg])

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not auth')

      let sessionId = currentSession
      
      // Criar nova sessão se não existir
      if (!sessionId) {
        const { data: newSession, error: sessionError } = await supabase
          .from('chat_sessions')
          .insert({ 
            user_id: user.id, 
            title: userMessage.slice(0, 50) + (userMessage.length > 50 ? '...' : '')
          })
          .select()
          .single()
        
        if (sessionError) throw sessionError
        
        if (newSession) {
          sessionId = newSession.id
          setCurrentSession(sessionId)
          setSessions(prev => [newSession, ...prev])
        }
      }

      // Salvar mensagem do usuário
      await supabase.from('messages').insert({
        session_id: sessionId,
        role: 'user',
        content: userMessage
      })

      // Chamar API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, sessionId })
      })

      const data = await response.json()
      
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'Desculpe, não consegui processar sua mensagem.',
        created_at: new Date().toISOString()
      }
      setMessages(prev => [...prev, assistantMsg])

      // Salvar resposta
      await supabase.from('messages').insert({
        session_id: sessionId,
        role: 'assistant',
        content: assistantMsg.content
      })

      // Atualizar timestamp da sessão
      await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', sessionId)

    } catch (e) {
      console.error(e)
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro. Tente novamente.',
        created_at: new Date().toISOString()
      }])
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
    return date.toLocaleDateString('pt-BR')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r transform transition-transform duration-200 ${showSidebar ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-bold text-lg">Conversas</h2>
            <button onClick={() => setShowSidebar(false)} className="md:hidden p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <button 
            onClick={createNewSession} 
            className="m-3 flex items-center justify-center gap-2 p-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors"
          >
            <Plus className="w-5 h-5" /> Nova Conversa
          </button>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">
                Nenhuma conversa ainda
              </p>
            ) : (
              sessions.map(s => (
                <div
                  key={s.id}
                  className={`group relative rounded-xl transition-colors ${
                    currentSession === s.id ? 'bg-primary-50' : 'hover:bg-gray-100'
                  }`}
                >
                  {editingSession === s.id ? (
                    <div className="flex items-center gap-2 p-2">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveSessionTitle()}
                        className="flex-1 px-2 py-1 text-sm border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                        autoFocus
                      />
                      <button onClick={saveSessionTitle} className="p-1 text-green-600 hover:bg-green-50 rounded">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingSession(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => loadMessages(s.id)}
                      className="w-full text-left p-3 pr-10"
                    >
                      <div className="flex items-center gap-2">
                        <MessageCircle className={`w-4 h-4 flex-shrink-0 ${currentSession === s.id ? 'text-primary-600' : 'text-gray-400'}`} />
                        <span className={`truncate text-sm ${currentSession === s.id ? 'text-primary-700 font-medium' : ''}`}>
                          {s.title}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 ml-6">{formatDate(s.updated_at)}</p>
                    </button>
                  )}
                  
                  {editingSession !== s.id && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setMenuOpen(menuOpen === s.id ? null : s.id)
                        }}
                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-opacity"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-500" />
                      </button>
                      
                      {menuOpen === s.id && (
                        <div className="absolute right-0 top-8 bg-white border rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              startEditSession(s)
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                          >
                            <Edit2 className="w-4 h-4" /> Renomear
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (confirm('Excluir esta conversa?')) {
                                deleteSession(s.id)
                              }
                            }}
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
        </div>
      </div>

      {/* Overlay */}
      {showSidebar && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setShowSidebar(false)} 
        />
      )}

      {/* Main Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b px-4 py-3 flex items-center gap-3">
          <button 
            onClick={() => setShowSidebar(true)} 
            className="p-2 hover:bg-gray-100 rounded-xl md:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
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
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Olá! Sou a Vita 💜</h2>
              <p className="text-gray-500 max-w-md mx-auto">
                Sua assistente de nutrição e bem-estar. Pergunte sobre alimentação, exercícios, gestação ou qualquer dúvida!
              </p>
              
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
                {[
                  'O que posso comer durante a gestação?',
                  'Quais exercícios são seguros?',
                  'Como melhorar minha alimentação?',
                  'Dicas para ter mais energia'
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(suggestion)}
                    className="p-3 text-left text-sm bg-white border border-gray-200 rounded-xl hover:border-primary-300 hover:bg-primary-50 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-4 rounded-2xl ${
                msg.role === 'user'
                  ? 'bg-primary-500 text-white rounded-br-md'
                  : 'bg-white shadow-sm border rounded-bl-md'
              }`}>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}

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
