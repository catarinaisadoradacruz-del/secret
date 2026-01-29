'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, ArrowLeft, BookOpen, Loader2, ExternalLink, 
  Clock, Star, Heart, Baby, Apple, Dumbbell, Brain,
  ChevronRight, Sparkles, RefreshCw, Save, Bookmark,
  X, Filter
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

interface SearchResult {
  title: string
  snippet: string
  link: string
  imageUrl?: string
  date?: string
}

interface SavedSearch {
  id: string
  query: string
  results: SearchResult[]
  created_at: string
}

const CATEGORIES = [
  { id: 'gravidez', name: 'Gravidez', icon: Baby, color: 'rose', emoji: '🤰' },
  { id: 'nutricao', name: 'Nutrição', icon: Apple, color: 'green', emoji: '🍎' },
  { id: 'exercicios', name: 'Exercícios', icon: Dumbbell, color: 'orange', emoji: '💪' },
  { id: 'bemestar', name: 'Bem-estar', icon: Heart, color: 'pink', emoji: '💜' },
  { id: 'desenvolvimento', name: 'Bebê', icon: Star, color: 'amber', emoji: '👶' },
  { id: 'saude', name: 'Saúde', icon: Brain, color: 'blue', emoji: '🧠' },
]

const SUGGESTED_SEARCHES = [
  'alimentação saudável na gravidez',
  'exercícios seguros para gestantes',
  'desenvolvimento do bebê semana a semana',
  'sintomas comuns da gravidez',
  'como melhorar o sono na gravidez',
  'nutrientes essenciais gestação',
  'preparação para o parto normal',
  'amamentação dicas iniciantes',
  'recuperação pós-parto',
  'cuidados com recém-nascido',
]

export default function ContentPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showSaved, setShowSaved] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastSearchQuery, setLastSearchQuery] = useState('')

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserId(user.id)
      loadSavedSearches(user.id)
    }
  }

  const loadSavedSearches = async (uid: string) => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('educational_content')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (data) {
        setSavedSearches(data.map(item => ({
          id: item.id,
          query: item.title,
          results: item.content || [],
          created_at: item.created_at
        })))
      }
    } catch (err) {
      console.error('Erro ao carregar pesquisas salvas:', err)
    }
  }

  const searchContent = async (query: string) => {
    if (!query.trim()) return
    
    setIsSearching(true)
    setError(null)
    setLastSearchQuery(query)
    
    try {
      // Adicionar contexto brasileiro à busca
      const enhancedQuery = `${query} Brasil gestante maternidade site:br OR site:com.br`
      
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: enhancedQuery })
      })
      
      if (!response.ok) {
        throw new Error('Erro na pesquisa')
      }
      
      const data = await response.json()
      setSearchResults(data.results || [])
      
      if (data.results?.length === 0) {
        setError('Nenhum resultado encontrado. Tente outros termos.')
      }
    } catch (err) {
      console.error('Erro na pesquisa:', err)
      setError('Não foi possível realizar a pesquisa. Tente novamente.')
      
      // Fallback: resultados locais
      setSearchResults(getLocalResults(query))
    } finally {
      setIsSearching(false)
    }
  }

  const getLocalResults = (query: string): SearchResult[] => {
    const topics: Record<string, SearchResult[]> = {
      'gravidez': [
        { title: 'Guia Completo da Gravidez', snippet: 'Tudo que você precisa saber sobre cada trimestre da gestação, desde os primeiros sintomas até o parto.', link: 'https://www.minhavida.com.br/familia/materias/33087-gravidez-guia-completo' },
        { title: 'Alimentação na Gravidez', snippet: 'Descubra quais alimentos são essenciais e quais evitar durante a gestação para uma gravidez saudável.', link: 'https://www.tuasaude.com/alimentacao-na-gravidez/' },
      ],
      'nutrição': [
        { title: 'Nutrientes Essenciais para Gestantes', snippet: 'Ácido fólico, ferro, cálcio e outros nutrientes fundamentais para o desenvolvimento do bebê.', link: 'https://www.gineco.com.br/saude-feminina/gravidez/nutricao-na-gravidez' },
        { title: 'Cardápio Saudável para Grávidas', snippet: 'Sugestões de refeições balanceadas para cada fase da gestação.', link: 'https://www.nutricionista.com.br/gravidez' },
      ],
      'exercícios': [
        { title: 'Exercícios Seguros na Gravidez', snippet: 'Atividades físicas recomendadas para gestantes em cada trimestre, com orientações de profissionais.', link: 'https://www.saudeemmovimento.com.br/exercicios-gravidez' },
        { title: 'Yoga para Gestantes', snippet: 'Benefícios e posturas seguras de yoga durante a gravidez.', link: 'https://www.yogagestante.com.br' },
      ],
    }
    
    const lowerQuery = query.toLowerCase()
    for (const [key, results] of Object.entries(topics)) {
      if (lowerQuery.includes(key)) return results
    }
    return topics['gravidez']
  }

  const saveSearch = async () => {
    if (!userId || !lastSearchQuery || searchResults.length === 0) return
    
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('educational_content')
        .insert({
          user_id: userId,
          title: lastSearchQuery,
          content: searchResults,
          type: 'search',
          category: selectedCategory || 'geral'
        })
        .select()
        .single()
      
      if (error) throw error
      
      setSavedSearches(prev => [{
        id: data.id,
        query: lastSearchQuery,
        results: searchResults,
        created_at: data.created_at
      }, ...prev])
      
      alert('Pesquisa salva com sucesso! 💜')
    } catch (err) {
      console.error('Erro ao salvar pesquisa:', err)
      alert('Erro ao salvar pesquisa')
    }
  }

  const deleteSavedSearch = async (id: string) => {
    if (!confirm('Excluir esta pesquisa salva?')) return
    
    try {
      const supabase = createClient()
      await supabase.from('educational_content').delete().eq('id', id)
      setSavedSearches(prev => prev.filter(s => s.id !== id))
    } catch (err) {
      console.error('Erro ao excluir:', err)
    }
  }

  const loadSavedSearch = (saved: SavedSearch) => {
    setLastSearchQuery(saved.query)
    setSearchResults(saved.results)
    setShowSaved(false)
  }

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId)
    const categoryName = CATEGORIES.find(c => c.id === categoryId)?.name || ''
    searchContent(`${categoryName} gestante`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/50 to-white pb-24">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-20 border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-xl">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div className="flex-1">
              <h1 className="font-bold text-xl text-gray-800">Conteúdo Educativo</h1>
              <p className="text-sm text-gray-500">Pesquise e aprenda sobre maternidade</p>
            </div>
            <button
              onClick={() => setShowSaved(!showSaved)}
              className={`p-2 rounded-xl transition-colors ${showSaved ? 'bg-rose-100 text-rose-600' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              <Bookmark className="w-5 h-5" />
            </button>
          </div>

          {/* Barra de pesquisa */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchContent(searchQuery)}
              placeholder="Pesquisar sobre gravidez, nutrição, exercícios..."
              className="w-full pl-12 pr-24 py-3 bg-gray-50 rounded-2xl border-2 border-gray-100 focus:border-rose-300 focus:outline-none transition-colors"
            />
            <button
              onClick={() => searchContent(searchQuery)}
              disabled={isSearching || !searchQuery.trim()}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-rose-500 text-white rounded-xl text-sm font-medium hover:bg-rose-600 disabled:opacity-50 transition-colors"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Pesquisas salvas (modal) */}
        <AnimatePresence>
          {showSaved && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Bookmark className="w-5 h-5 text-rose-500" />
                    Pesquisas Salvas
                  </h3>
                  <button onClick={() => setShowSaved(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                
                {savedSearches.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">Nenhuma pesquisa salva ainda</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {savedSearches.map((saved) => (
                      <div
                        key={saved.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer group"
                        onClick={() => loadSavedSearch(saved)}
                      >
                        <Search className="w-4 h-4 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-700 truncate">{saved.query}</p>
                          <p className="text-xs text-gray-500">{new Date(saved.created_at).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteSavedSearch(saved.id) }}
                          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded-lg transition-opacity"
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Resultados da pesquisa */}
        {searchResults.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">
                Resultados para "{lastSearchQuery}"
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={saveSearch}
                  className="flex items-center gap-1 px-3 py-1.5 bg-rose-100 text-rose-600 rounded-lg text-sm hover:bg-rose-200 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Salvar
                </button>
                <button
                  onClick={() => searchContent(lastSearchQuery)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Atualizar
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {searchResults.map((result, index) => (
                <motion.a
                  key={index}
                  href={result.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="block bg-white rounded-2xl border border-gray-100 p-4 hover:border-rose-200 hover:shadow-md transition-all group"
                >
                  <div className="flex gap-4">
                    {result.imageUrl && (
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                        <img 
                          src={result.imageUrl} 
                          alt="" 
                          className="w-full h-full object-cover"
                          onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 mb-1 group-hover:text-rose-600 transition-colors line-clamp-2">
                        {result.title}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {result.snippet}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <ExternalLink className="w-3 h-3" />
                        <span className="truncate">{new URL(result.link).hostname}</span>
                        {result.date && (
                          <>
                            <span>•</span>
                            <Clock className="w-3 h-3" />
                            <span>{result.date}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-rose-400 transition-colors flex-shrink-0" />
                  </div>
                </motion.a>
              ))}
            </div>

            <button
              onClick={() => { setSearchResults([]); setLastSearchQuery('') }}
              className="w-full mt-6 py-3 text-gray-500 hover:text-gray-700 text-sm"
            >
              ← Voltar para categorias
            </button>
          </div>
        ) : (
          <>
            {/* Erro */}
            {error && (
              <div className="mb-6 bg-red-50 text-red-600 rounded-xl p-4 text-sm">
                {error}
              </div>
            )}

            {/* Categorias */}
            <div className="mb-8">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Filter className="w-5 h-5 text-rose-500" />
                Categorias
              </h2>
              
              <div className="grid grid-cols-3 gap-3">
                {CATEGORIES.map((category) => {
                  const Icon = category.icon
                  return (
                    <motion.button
                      key={category.id}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleCategoryClick(category.id)}
                      className={`p-4 rounded-2xl text-center transition-all ${
                        selectedCategory === category.id
                          ? `bg-${category.color}-100 border-2 border-${category.color}-300`
                          : 'bg-white border border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <span className="text-3xl mb-2 block">{category.emoji}</span>
                      <span className="text-sm font-medium text-gray-700">{category.name}</span>
                    </motion.button>
                  )
                })}
              </div>
            </div>

            {/* Sugestões de pesquisa */}
            <div>
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Sugestões Populares
              </h2>
              
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_SEARCHES.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setSearchQuery(suggestion)
                      searchContent(suggestion)
                    }}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:border-rose-300 hover:bg-rose-50 transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Loading state */}
            {isSearching && (
              <div className="mt-8 flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-rose-500 mb-4" />
                <p className="text-gray-500">Buscando conteúdo atualizado...</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
