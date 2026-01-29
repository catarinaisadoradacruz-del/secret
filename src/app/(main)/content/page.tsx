'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Video, Clock, ChevronRight, Sparkles, Check } from 'lucide-react'
import { Card, LoadingSpinner } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'

interface ContentItem {
  id: string
  title: string
  description: string
  type: 'article' | 'video'
  category: string
  duration?: string
  read_time?: number
  completed?: boolean
}

const CATEGORIES = [
  { value: 'all', label: 'Todos' },
  { value: 'nutrition', label: 'Nutrição' },
  { value: 'workout', label: 'Exercícios' },
  { value: 'health', label: 'Saúde' },
  { value: 'baby', label: 'Bebê' },
]

// Conteúdo padrão para quando o banco estiver vazio
const DEFAULT_CONTENT: ContentItem[] = [
  { id: '1', title: 'Alimentação no 1º Trimestre', description: 'Guia completo sobre o que comer e evitar nos primeiros meses de gestação', type: 'article', category: 'nutrition', duration: '8 min' },
  { id: '2', title: 'Exercícios Seguros na Gravidez', description: 'Atividades físicas recomendadas para cada fase da gestação', type: 'article', category: 'workout', duration: '10 min' },
  { id: '3', title: 'Preparando o Quarto do Bebê', description: 'Dicas essenciais para montar o quartinho do seu bebê', type: 'article', category: 'baby', duration: '6 min' },
  { id: '4', title: 'Sintomas Comuns da Gravidez', description: 'Entenda as mudanças no seu corpo durante a gestação', type: 'article', category: 'health', duration: '7 min' },
  { id: '5', title: 'Nutrientes Essenciais', description: 'Vitaminas e minerais importantes para gestantes', type: 'article', category: 'nutrition', duration: '5 min' },
  { id: '6', title: 'Yoga para Gestantes', description: 'Poses seguras e benéficas para a gravidez', type: 'video', category: 'workout', duration: '15 min' },
  { id: '7', title: 'Amamentação: Guia Inicial', description: 'Tudo o que você precisa saber sobre os primeiros dias', type: 'article', category: 'baby', duration: '12 min' },
  { id: '8', title: 'Cuidados com a Pele', description: 'Prevenção de estrias e manchas na gestação', type: 'article', category: 'health', duration: '5 min' },
  { id: '9', title: 'Receitas Saudáveis para Gestantes', description: 'Opções nutritivas e saborosas para o dia a dia', type: 'article', category: 'nutrition', duration: '8 min' },
  { id: '10', title: 'Alongamentos para Aliviar Dores', description: 'Exercícios simples para desconfortos comuns', type: 'video', category: 'workout', duration: '10 min' },
]

export default function ContentPage() {
  const [content, setContent] = useState<ContentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [completedIds, setCompletedIds] = useState<string[]>([])

  useEffect(() => {
    loadContent()
  }, [])

  const loadContent = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setContent(DEFAULT_CONTENT)
        setIsLoading(false)
        return
      }

      // Tentar carregar do banco
      const { data: dbContent } = await supabase
        .from('educational_content')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false })

      // Buscar progresso do usuário
      const { data: progress } = await supabase
        .from('user_content_progress')
        .select('content_id')
        .eq('user_id', user.id)
        .eq('completed', true)

      setCompletedIds((progress || []).map(p => p.content_id))

      // Usar dados do banco ou fallback
      if (dbContent && dbContent.length > 0) {
        setContent(dbContent.map(item => ({
          ...item,
          duration: item.read_time ? `${item.read_time} min` : '5 min'
        })))
      } else {
        setContent(DEFAULT_CONTENT)
      }
    } catch (error) {
      console.error('Erro:', error)
      setContent(DEFAULT_CONTENT)
    } finally {
      setIsLoading(false)
    }
  }

  const markAsCompleted = async (contentId: string) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      await supabase
        .from('user_content_progress')
        .upsert({
          user_id: user.id,
          content_id: contentId,
          completed: true,
          progress_percent: 100,
        })

      setCompletedIds(prev => [...prev, contentId])
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  // Filtrar por categoria localmente (sem recarregar)
  const filteredContent = category === 'all' 
    ? content 
    : content.filter(c => c.category === category)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Conteúdo</h1>
        <p className="text-gray-600 mt-1">Artigos e vídeos para sua jornada</p>
      </div>

      {/* Categorias - Filtro local sem reload */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200 ${
              category === cat.value
                ? 'bg-primary text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <Card className="mb-6 bg-gradient-to-br from-primary/10 to-secondary/10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Seu progresso</p>
            <p className="text-xl font-bold text-gray-900">
              {completedIds.length} de {content.length} concluídos
            </p>
          </div>
        </div>
      </Card>

      {/* Content List */}
      <AnimatePresence mode="wait">
        <motion.div
          key={category}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="space-y-4"
        >
          {filteredContent.length === 0 ? (
            <Card className="text-center py-12">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum conteúdo</h3>
              <p className="text-gray-500">Não há conteúdo nesta categoria ainda</p>
            </Card>
          ) : (
            filteredContent.map((item, index) => {
              const isCompleted = completedIds.includes(item.id)
              
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={`cursor-pointer hover:shadow-md transition-shadow ${isCompleted ? 'opacity-70' : ''}`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        item.type === 'video' ? 'bg-red-100' : 'bg-primary/10'
                      }`}>
                        {item.type === 'video' ? (
                          <Video className="w-6 h-6 text-red-500" />
                        ) : (
                          <BookOpen className="w-6 h-6 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-500 uppercase font-medium">
                            {CATEGORIES.find(c => c.value === item.category)?.label || item.category}
                          </span>
                          {isCompleted && (
                            <span className="flex items-center gap-1 text-xs text-green-600">
                              <Check className="w-3 h-3" />
                              Lido
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                        <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="w-3 h-3" />
                            {item.duration || '5 min'}
                          </span>
                          {!isCompleted && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                markAsCompleted(item.id)
                              }}
                              className="text-xs text-primary font-medium hover:underline"
                            >
                              Marcar como lido
                            </button>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </Card>
                </motion.div>
              )
            })
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
