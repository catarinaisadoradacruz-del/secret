'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Video, Clock, ChevronRight } from 'lucide-react'
import { Card, LoadingSpinner } from '@/components/ui'

interface ContentItem {
  id: string
  title: string
  description: string
  type: 'article' | 'video'
  category: string
  duration: string
  image?: string
  userProgress?: {
    completed: boolean
    progress_percent: number
  }
}

const CATEGORIES = [
  { value: 'all', label: 'Todos' },
  { value: 'nutrition', label: 'Nutrição' },
  { value: 'workout', label: 'Exercícios' },
  { value: 'health', label: 'Saúde' },
  { value: 'baby', label: 'Bebê' },
]

export default function ContentPage() {
  const [content, setContent] = useState<ContentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [type, setType] = useState<'all' | 'article' | 'video'>('all')

  useEffect(() => {
    fetchContent()
  }, [category, type])

  const fetchContent = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (category !== 'all') params.append('category', category)
      if (type !== 'all') params.append('type', type)

      const response = await fetch(`/api/content?${params}`)
      const data = await response.json()
      setContent(data)
    } catch (error) {
      console.error('Error fetching content:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const markAsCompleted = async (contentId: string) => {
    try {
      await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, completed: true, progressPercent: 100 }),
      })
      fetchContent()
    } catch (error) {
      console.error('Error marking as completed:', error)
    }
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Conteúdos</h1>
        <p className="text-gray-600 mt-1">Artigos e vídeos para sua jornada</p>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
              category === cat.value
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Type Filter */}
      <div className="flex gap-2 mb-6">
        {[
          { value: 'all', label: 'Todos', icon: null },
          { value: 'article', label: 'Artigos', icon: BookOpen },
          { value: 'video', label: 'Vídeos', icon: Video },
        ].map((t) => (
          <button
            key={t.value}
            onClick={() => setType(t.value as typeof type)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              type === t.value
                ? 'bg-secondary/20 text-secondary font-medium'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {t.icon && <t.icon className="w-4 h-4" />}
            {t.label}
          </button>
        ))}
      </div>

      {/* Content List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : content.length === 0 ? (
        <Card className="text-center py-12">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum conteúdo encontrado
          </h3>
          <p className="text-gray-500">Tente mudar os filtros</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {content.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => markAsCompleted(item.id)}
              >
                <div className="flex gap-4">
                  {/* Thumbnail */}
                  <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center shrink-0">
                    {item.type === 'video' ? (
                      <Video className="w-8 h-8 text-primary" />
                    ) : (
                      <BookOpen className="w-8 h-8 text-primary" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          item.type === 'video'
                            ? 'bg-red-100 text-red-600'
                            : 'bg-blue-100 text-blue-600'
                        }`}
                      >
                        {item.type === 'video' ? 'Vídeo' : 'Artigo'}
                      </span>
                      {item.userProgress?.completed && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-600">
                          Concluído
                        </span>
                      )}
                    </div>

                    <h3 className="font-semibold text-gray-900 truncate">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {item.description}
                    </p>

                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.duration}
                      </div>
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-gray-300 self-center" />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
