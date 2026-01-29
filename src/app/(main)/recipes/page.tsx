'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, Heart, Clock, ChefHat, Plus, Sparkles } from 'lucide-react'
import { Button, Card, Input, LoadingSpinner, Modal } from '@/components/ui'

interface Recipe {
  id: string
  name: string
  description: string
  category: string
  difficulty: string
  prep_time: number
  cook_time: number
  servings: number
  calories_per_serving: number
  protein_per_serving: number
  image_url?: string
  is_favorite?: boolean
}

const CATEGORIES = [
  { value: 'all', label: 'Todas' },
  { value: 'breakfast', label: 'Café da manhã' },
  { value: 'lunch', label: 'Almoço' },
  { value: 'dinner', label: 'Jantar' },
  { value: 'snack', label: 'Lanches' },
  { value: 'dessert', label: 'Sobremesas' },
]

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [preferences, setPreferences] = useState({
    type: 'lunch',
    restrictions: '',
    ingredients: '',
  })

  useEffect(() => {
    fetchRecipes()
  }, [category])

  const fetchRecipes = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (category !== 'all') params.append('category', category)

      const response = await fetch(`/api/recipes?${params}`)
      const data = await response.json()
      setRecipes(data || [])
    } catch (error) {
      console.error('Error fetching recipes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateRecipe = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/recipes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      })
      const data = await response.json()
      if (data.recipe) {
        setRecipes((prev) => [data.recipe, ...prev])
        setShowGenerateModal(false)
      }
    } catch (error) {
      console.error('Error generating recipe:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const toggleFavorite = async (recipeId: string) => {
    try {
      await fetch('/api/recipes/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId }),
      })
      setRecipes((prev) =>
        prev.map((r) =>
          r.id === recipeId ? { ...r, is_favorite: !r.is_favorite } : r
        )
      )
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const filteredRecipes = recipes.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Receitas</h1>
          <p className="text-gray-600 mt-1">Encontre receitas saudáveis</p>
        </div>
        <Button onClick={() => setShowGenerateModal(true)} size="sm">
          <Sparkles className="w-4 h-4 mr-1" />
          Gerar
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar receitas..."
          className="pl-10"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
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

      {/* Recipes List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredRecipes.length === 0 ? (
        <Card className="text-center py-12">
          <ChefHat className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhuma receita encontrada
          </h3>
          <p className="text-gray-500 mb-4">
            Gere uma receita personalizada com IA
          </p>
          <Button onClick={() => setShowGenerateModal(true)}>
            <Sparkles className="w-4 h-4 mr-2" />
            Gerar Receita
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredRecipes.map((recipe, index) => (
            <motion.div
              key={recipe.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="overflow-hidden">
                <div className="flex gap-4">
                  {/* Image */}
                  <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center shrink-0">
                    <ChefHat className="w-8 h-8 text-primary" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 truncate">
                          {recipe.name}
                        </h3>
                        <p className="text-sm text-gray-500 line-clamp-1">
                          {recipe.description}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleFavorite(recipe.id)}
                        className="p-1"
                      >
                        <Heart
                          className={`w-5 h-5 ${
                            recipe.is_favorite
                              ? 'fill-red-500 text-red-500'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {recipe.prep_time + recipe.cook_time} min
                      </span>
                      <span className="px-2 py-0.5 bg-gray-100 rounded-full">
                        {recipe.calories_per_serving} kcal
                      </span>
                      <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                        {recipe.protein_per_serving}g proteína
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Generate Modal */}
      <Modal
        open={showGenerateModal}
        onOpenChange={setShowGenerateModal}
        title="Gerar Receita com IA"
        description="Descreva o que você quer e a Vita cria para você"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de refeição
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['breakfast', 'lunch', 'dinner', 'snack'].map((type) => (
                <button
                  key={type}
                  onClick={() => setPreferences({ ...preferences, type })}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    preferences.type === type
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {type === 'breakfast'
                    ? 'Café da manhã'
                    : type === 'lunch'
                    ? 'Almoço'
                    : type === 'dinner'
                    ? 'Jantar'
                    : 'Lanche'}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Restrições alimentares"
            value={preferences.restrictions}
            onChange={(e) =>
              setPreferences({ ...preferences, restrictions: e.target.value })
            }
            placeholder="Ex: sem lactose, vegetariano..."
          />

          <Input
            label="Ingredientes disponíveis (opcional)"
            value={preferences.ingredients}
            onChange={(e) =>
              setPreferences({ ...preferences, ingredients: e.target.value })
            }
            placeholder="Ex: frango, brócolis, arroz..."
          />

          <Button onClick={generateRecipe} fullWidth isLoading={isGenerating}>
            <Sparkles className="w-4 h-4 mr-2" />
            Gerar Receita
          </Button>
        </div>
      </Modal>
    </div>
  )
}
