'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, X, Sparkles, Filter } from 'lucide-react'
import { Button, Card, LoadingSpinner } from '@/components/ui'

interface BabyName {
  id: string
  name: string
  gender: 'MALE' | 'FEMALE' | 'NEUTRAL'
  origin: string
  meaning: string
}

export default function BabyNamesPage() {
  const [names, setNames] = useState<BabyName[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [filter, setFilter] = useState<'all' | 'MALE' | 'FEMALE' | 'NEUTRAL'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showFavorites, setShowFavorites] = useState(false)

  useEffect(() => {
    fetchNames()
  }, [filter])

  const fetchNames = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/baby-names?gender=${filter}`)
      const data = await response.json()
      setNames(data.names || [])
      setFavorites(data.favorites?.filter((f: { liked: boolean }) => f.liked).map((f: { name_id: string }) => f.name_id) || [])
      setCurrentIndex(0)
    } catch (error) {
      console.error('Error fetching names:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSwipe = async (liked: boolean) => {
    if (currentIndex >= names.length) return

    const name = names[currentIndex]

    try {
      await fetch('/api/baby-names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'favorite', nameId: name.id, liked }),
      })

      if (liked) {
        setFavorites((prev) => [...prev, name.id])
      }
    } catch (error) {
      console.error('Error saving preference:', error)
    }

    setCurrentIndex((prev) => prev + 1)
  }

  const generateNames = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/baby-names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          preferences: {
            gender: filter === 'all' ? null : filter,
            style: 'clássico e moderno',
          },
        }),
      })

      const data = await response.json()
      if (data.names) {
        setNames(data.names)
        setCurrentIndex(0)
      }
    } catch (error) {
      console.error('Error generating names:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const currentName = names[currentIndex]
  const favoriteNames = names.filter((n) => favorites.includes(n.id))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nomes de Bebê</h1>
          <p className="text-gray-600 mt-1">Encontre o nome perfeito</p>
        </div>
        <button
          onClick={() => setShowFavorites(!showFavorites)}
          className="relative p-2 rounded-full bg-primary/10 text-primary"
        >
          <Heart className={`w-5 h-5 ${showFavorites ? 'fill-primary' : ''}`} />
          {favoriteNames.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center">
              {favoriteNames.length}
            </span>
          )}
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { value: 'all', label: 'Todos' },
          { value: 'MALE', label: 'Masculinos' },
          { value: 'FEMALE', label: 'Femininos' },
          { value: 'NEUTRAL', label: 'Neutros' },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value as typeof filter)}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
              filter === option.value
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {showFavorites ? (
        /* Favorites List */
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Favoritos ({favoriteNames.length})
          </h2>
          {favoriteNames.length === 0 ? (
            <Card className="text-center py-8">
              <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum favorito ainda</p>
            </Card>
          ) : (
            favoriteNames.map((name) => (
              <Card key={name.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{name.name}</h3>
                    <p className="text-sm text-gray-500">{name.meaning}</p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      name.gender === 'MALE'
                        ? 'bg-blue-100 text-blue-600'
                        : name.gender === 'FEMALE'
                        ? 'bg-pink-100 text-pink-600'
                        : 'bg-purple-100 text-purple-600'
                    }`}
                  >
                    {name.gender === 'MALE' ? 'M' : name.gender === 'FEMALE' ? 'F' : 'N'}
                  </span>
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        /* Swipe Card */
        <div className="relative h-[400px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {currentName ? (
              <motion.div
                key={currentName.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, x: 100 }}
                className="absolute inset-0"
              >
                <Card className="h-full flex flex-col items-center justify-center text-center">
                  <span
                    className={`px-3 py-1 text-sm rounded-full mb-4 ${
                      currentName.gender === 'MALE'
                        ? 'bg-blue-100 text-blue-600'
                        : currentName.gender === 'FEMALE'
                        ? 'bg-pink-100 text-pink-600'
                        : 'bg-purple-100 text-purple-600'
                    }`}
                  >
                    {currentName.gender === 'MALE'
                      ? 'Masculino'
                      : currentName.gender === 'FEMALE'
                      ? 'Feminino'
                      : 'Neutro'}
                  </span>

                  <h2 className="text-4xl font-bold text-gray-900 mb-2">
                    {currentName.name}
                  </h2>

                  <p className="text-gray-500 mb-2">Origem: {currentName.origin}</p>
                  <p className="text-gray-600 italic">&quot;{currentName.meaning}&quot;</p>

                  <div className="flex gap-6 mt-8">
                    <button
                      onClick={() => handleSwipe(false)}
                      className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                    >
                      <X className="w-8 h-8 text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleSwipe(true)}
                      className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                    >
                      <Heart className="w-8 h-8 text-primary" />
                    </button>
                  </div>
                </Card>
              </motion.div>
            ) : (
              <Card className="text-center py-12">
                <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Acabaram os nomes!
                </h3>
                <p className="text-gray-500 mb-4">
                  Quer gerar mais sugestões com IA?
                </p>
                <Button onClick={generateNames} isLoading={isGenerating}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Gerar mais nomes
                </Button>
              </Card>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Generate Button */}
      {!showFavorites && currentName && (
        <div className="mt-6">
          <Button
            variant="outline"
            fullWidth
            onClick={generateNames}
            isLoading={isGenerating}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Gerar sugestões com IA
          </Button>
        </div>
      )}
    </div>
  )
}
