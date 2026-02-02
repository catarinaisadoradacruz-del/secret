'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Apple, Droplets, Flame, Target, Plus, Utensils, ChefHat, Loader2, Save, Sparkles, Heart, X, Clock, Users, Check, RefreshCw, Edit3, Trash2, Coffee, Sun, Moon, Cookie, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Meal {
  id?: string
  name: string
  description: string
  calories: number
  protein: number
  carbs: number
  fat: number
  time?: string
  type: string
  user_id?: string
}

interface DayPlan {
  day: number
  meals: {
    breakfast: Meal
    morning_snack: Meal
    lunch: Meal
    afternoon_snack: Meal
    dinner: Meal
  }
  tips: string[]
}

interface Recipe {
  id?: string
  name: string
  description: string
  category: string
  prep_time: number
  servings: number
  calories: number
  protein: number
  carbs: number
  fat: number
  ingredients: string[]
  instructions: string[]
  is_favorite?: boolean
  user_id?: string
}

type GenerationStatus = 'idle' | 'generating' | 'success' | 'error'

export default function NutritionPage() {
  const [tab, setTab] = useState<'hoje' | 'plano' | 'receitas'>('hoje')
  const [loading, setLoading] = useState(true)
  const [todayMeals, setTodayMeals] = useState<Meal[]>([])
  const [stats, setStats] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0, water: 0, waterGoal: 2000, caloriesGoal: 2000 })
  const [plan, setPlan] = useState<DayPlan[] | null>(null)
  const [planSaved, setPlanSaved] = useState(false)
  const [selectedDay, setSelectedDay] = useState(0)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [recipeCategory, setRecipeCategory] = useState('all')
  const [userProfile, setUserProfile] = useState<any>(null)
  const [showPlanOptions, setShowPlanOptions] = useState(false)
  const [planDays, setPlanDays] = useState(7)
  const [showAddMeal, setShowAddMeal] = useState(false)
  const [newMealType, setNewMealType] = useState('breakfast')
  const [editingPlan, setEditingPlan] = useState(false)
  const [planFeedback, setPlanFeedback] = useState('')
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)

  // Background generation state
  const [genStatus, setGenStatus] = useState<GenerationStatus>('idle')
  const [genType, setGenType] = useState<'plan' | 'recipes'>('plan')
  const [genProgress, setGenProgress] = useState(0)
  const [genMessage, setGenMessage] = useState('')
  const [showGenModal, setShowGenModal] = useState(false)

  // Recipe generation
  const [recipeGenStatus, setRecipeGenStatus] = useState<GenerationStatus>('idle')

  useEffect(() => { loadData() }, [])

  // Auto-hide success modal after 4 seconds
  useEffect(() => {
    if (genStatus === 'success') {
      const timer = setTimeout(() => {
        setShowGenModal(false)
        setGenStatus('idle')
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [genStatus])

  const loadData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date().toISOString().split('T')[0]

      const [mealsRes, waterRes, userRes, planRes, recipesRes] = await Promise.all([
        supabase.from('meals').select('*').eq('user_id', user.id).gte('created_at', today).order('created_at', { ascending: true }),
        supabase.from('water_intake').select('amount').eq('user_id', user.id).gte('created_at', today),
        supabase.from('users').select('*').eq('id', user.id).single(),
        supabase.from('nutrition_plans').select('*').eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: false }).limit(1).single(),
        supabase.from('recipes').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      ])

      const meals = mealsRes.data || []
      const water = (waterRes.data || []).reduce((sum: number, w: any) => sum + w.amount, 0)
      const dailyCalories = userRes.data?.phase === 'PREGNANT' ? 2200 : userRes.data?.phase === 'POSTPARTUM' ? 2500 : 1800

      setTodayMeals(meals)
      setUserProfile(userRes.data)
      setRecipes(recipesRes.data || [])
      setStats({
        calories: meals.reduce((sum: number, m: any) => sum + (m.calories || 0), 0),
        protein: meals.reduce((sum: number, m: any) => sum + (m.protein || 0), 0),
        carbs: meals.reduce((sum: number, m: any) => sum + (m.carbs || 0), 0),
        fat: meals.reduce((sum: number, m: any) => sum + (m.fat || 0), 0),
        water,
        waterGoal: 2000,
        caloriesGoal: dailyCalories
      })

      if (planRes.data?.plan_data) {
        const pd = planRes.data.plan_data
        setPlan(Array.isArray(pd) ? pd : pd.days || null)
        setPlanSaved(true)
      }
    } catch (e) { console.error('Load error:', e) }
    finally { setLoading(false) }
  }

  const addWater = async (amount: number) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('water_intake').insert({ user_id: user.id, amount })
      setStats(prev => ({ ...prev, water: prev.water + amount }))
    } catch (e) { console.error(e) }
  }

  const addMeal = async (meal: Meal) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('meals').insert({ user_id: user.id, ...meal }).select().single()
      if (data) {
        setTodayMeals(prev => [...prev, data])
        setStats(prev => ({ ...prev, calories: prev.calories + meal.calories, protein: prev.protein + meal.protein, carbs: prev.carbs + meal.carbs, fat: prev.fat + meal.fat }))
      }
      setShowAddMeal(false)
    } catch (e) { console.error(e) }
  }

  // ===== GERAÇÃO EM SEGUNDO PLANO =====
  const generatePlanBackground = useCallback(async () => {
    setGenType('plan')
    setGenStatus('generating')
    setShowGenModal(true)
    setGenProgress(0)
    setGenMessage('Analisando seu perfil nutricional...')
    setShowPlanOptions(false)

    // Simular progresso enquanto a IA trabalha
    const progressSteps = [
      { p: 10, msg: 'Analisando seu perfil nutricional...' },
      { p: 25, msg: 'Calculando necessidades calóricas...' },
      { p: 40, msg: 'Selecionando alimentos para sua fase...' },
      { p: 55, msg: 'Montando cardápio de cada dia...' },
      { p: 70, msg: 'Equilibrando macronutrientes...' },
      { p: 85, msg: 'Finalizando o plano personalizado...' },
    ]

    let stepIdx = 0
    const progressInterval = setInterval(() => {
      if (stepIdx < progressSteps.length) {
        setGenProgress(progressSteps[stepIdx].p)
        setGenMessage(progressSteps[stepIdx].msg)
        stepIdx++
      }
    }, 2000)

    try {
      const response = await fetch('/api/nutrition-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: planDays, profile: userProfile, feedback: planFeedback })
      })
      
      clearInterval(progressInterval)
      
      const data = await response.json()
      if (data.plan) {
        const planData = Array.isArray(data.plan) ? data.plan : data.plan.days || data.plan
        setPlan(planData)
        setPlanSaved(true)
        setGenProgress(100)
        setGenMessage(`Plano de ${planDays} dias gerado com sucesso!`)
        setGenStatus('success')
        setEditingPlan(false)
        setPlanFeedback('')
        setTab('plano')
      } else {
        throw new Error('Plano não gerado')
      }
    } catch (e) {
      clearInterval(progressInterval)
      console.error('Generate plan error:', e)
      setGenProgress(0)
      setGenMessage('Erro ao gerar o plano. Tente novamente.')
      setGenStatus('error')
    }
  }, [planDays, userProfile, planFeedback])

  const generateRecipes = async (category: string) => {
    setRecipeGenStatus('generating')
    setGenType('recipes')
    setGenStatus('generating')
    setShowGenModal(true)
    setGenProgress(30)
    setGenMessage('Criando receitas personalizadas...')

    try {
      const response = await fetch('/api/recipes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, profile: userProfile, count: 5 })
      })
      const data = await response.json()
      if (data.recipes?.length > 0) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const recipesToSave = data.recipes.map((r: Recipe) => ({ ...r, user_id: user.id }))
          const { data: saved } = await supabase.from('recipes').insert(recipesToSave).select()
          if (saved) setRecipes(prev => [...saved, ...prev])
        }
        setGenProgress(100)
        setGenMessage(`${data.recipes.length} receitas criadas!`)
        setGenStatus('success')
      }
    } catch (e) { 
      console.error(e)
      setGenMessage('Erro ao gerar receitas. Tente novamente.')
      setGenStatus('error')
    }
    finally { setRecipeGenStatus('idle') }
  }

  const toggleFavorite = async (recipe: Recipe) => {
    try {
      const supabase = createClient()
      const newFav = !recipe.is_favorite
      await supabase.from('recipes').update({ is_favorite: newFav }).eq('id', recipe.id)
      setRecipes(prev => prev.map(r => r.id === recipe.id ? ({ ...r, is_favorite: newFav } as Recipe) : r))
      if (selectedRecipe?.id === recipe.id) setSelectedRecipe({ ...selectedRecipe, is_favorite: newFav } as Recipe)
    } catch (e) { console.error(e) }
  }

  const deleteRecipe = async (recipeId: string) => {
    if (!confirm('Excluir esta receita?')) return
    try {
      const supabase = createClient()
      await supabase.from('recipes').delete().eq('id', recipeId)
      setRecipes(prev => prev.filter(r => r.id !== recipeId))
      setSelectedRecipe(null)
    } catch (e) { console.error(e) }
  }

  const getMealIcon = (type: string) => {
    const icons: Record<string, JSX.Element> = {
      breakfast: <Coffee className="w-5 h-5 text-orange-500" />,
      morning_snack: <Cookie className="w-5 h-5 text-yellow-500" />,
      lunch: <Sun className="w-5 h-5 text-amber-500" />,
      afternoon_snack: <Apple className="w-5 h-5 text-green-500" />,
      dinner: <Moon className="w-5 h-5 text-indigo-500" />
    }
    return icons[type] || <Utensils className="w-5 h-5 text-gray-500" />
  }

  const getMealTypeName = (type: string) => {
    const names: Record<string, string> = { breakfast: 'Café da Manhã', morning_snack: 'Lanche da Manhã', lunch: 'Almoço', afternoon_snack: 'Lanche da Tarde', dinner: 'Jantar' }
    return names[type] || type
  }

  const getDayCalories = (day: DayPlan) => {
    if (!day?.meals) return 0
    return Object.values(day.meals).reduce((sum, m: any) => sum + (m?.calories || 0), 0)
  }

  const recipeCategories = [
    { id: 'all', name: 'Todas', icon: '🍽️', count: recipes.length },
    { id: 'Café da Manhã', name: 'Café', icon: '☕', count: recipes.filter(r => r.category === 'Café da Manhã').length },
    { id: 'Almoço', name: 'Almoço', icon: '🍲', count: recipes.filter(r => r.category === 'Almoço').length },
    { id: 'Jantar', name: 'Jantar', icon: '🌙', count: recipes.filter(r => r.category === 'Jantar').length },
    { id: 'Lanches', name: 'Lanches', icon: '🥪', count: recipes.filter(r => r.category === 'Lanches').length },
    { id: 'Para Gestantes', name: 'Gestantes', icon: '🤰', count: recipes.filter(r => r.category === 'Para Gestantes').length }
  ]

  const filteredRecipes = recipeCategory === 'all' ? recipes : recipes.filter(r => r.category === recipeCategory)

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-xl"><ArrowLeft className="w-5 h-5" /></Link>
        <div><h1 className="font-bold text-lg">Nutrição</h1><p className="text-xs text-gray-500">Seu plano alimentar personalizado</p></div>
      </header>

      <div className="bg-white border-b px-4 py-2">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {(['hoje', 'plano', 'receitas'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-white shadow text-primary-600' : 'text-gray-600'}`}>
              {t === 'hoje' ? '📊 Hoje' : t === 'plano' ? '📋 Plano' : '👩‍🍳 Receitas'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {/* ===== TAB HOJE ===== */}
        {tab === 'hoje' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="flex items-center gap-2 mb-2"><Flame className="w-5 h-5 text-orange-500" /><span className="text-sm text-gray-600">Calorias</span></div>
                <div className="flex items-end gap-1"><span className="text-2xl font-bold">{stats.calories}</span><span className="text-gray-400 text-sm mb-1">/ {stats.caloriesGoal}</span></div>
                <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-500" style={{ width: `${Math.min((stats.calories / stats.caloriesGoal) * 100, 100)}%` }} /></div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="flex items-center gap-2 mb-2"><Droplets className="w-5 h-5 text-blue-500" /><span className="text-sm text-gray-600">Água</span></div>
                <div className="flex items-end gap-1"><span className="text-2xl font-bold">{stats.water}</span><span className="text-gray-400 text-sm mb-1">/ {stats.waterGoal}ml</span></div>
                <div className="mt-2 flex gap-1">{[200, 300, 500].map(ml => (<button key={ml} onClick={() => addWater(ml)} className="flex-1 py-1 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 active:scale-95 transition-all">+{ml}ml</button>))}</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm">
              <h3 className="font-semibold mb-3">Macronutrientes</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div><div className="text-2xl font-bold text-green-600">{stats.protein}g</div><div className="text-xs text-gray-500">Proteínas</div><div className="mt-1 h-1.5 bg-gray-100 rounded-full"><div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min((stats.protein / 70) * 100, 100)}%` }} /></div></div>
                <div><div className="text-2xl font-bold text-amber-600">{stats.carbs}g</div><div className="text-xs text-gray-500">Carbos</div><div className="mt-1 h-1.5 bg-gray-100 rounded-full"><div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min((stats.carbs / 250) * 100, 100)}%` }} /></div></div>
                <div><div className="text-2xl font-bold text-purple-600">{stats.fat}g</div><div className="text-xs text-gray-500">Gorduras</div><div className="mt-1 h-1.5 bg-gray-100 rounded-full"><div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min((stats.fat / 65) * 100, 100)}%` }} /></div></div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-3"><h3 className="font-semibold">Refeições de Hoje</h3><button onClick={() => setShowAddMeal(true)} className="p-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100"><Plus className="w-5 h-5" /></button></div>
              {todayMeals.length === 0 ? (
                <div className="text-center py-8 text-gray-400"><Utensils className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>Nenhuma refeição registrada</p><button onClick={() => setShowAddMeal(true)} className="mt-3 px-4 py-2 bg-primary-500 text-white rounded-xl text-sm">Adicionar Refeição</button></div>
              ) : (
                <div className="space-y-3">{todayMeals.map((meal, idx) => (<div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">{getMealIcon(meal.type)}<div className="flex-1 min-w-0"><p className="font-medium truncate">{meal.name}</p><p className="text-xs text-gray-500">{getMealTypeName(meal.type)}</p></div><div className="text-right"><p className="font-semibold text-orange-600">{meal.calories} kcal</p><p className="text-xs text-gray-500">P:{meal.protein}g C:{meal.carbs}g</p></div></div>))}</div>
              )}
            </div>
          </div>
        )}

        {/* ===== TAB PLANO ===== */}
        {tab === 'plano' && (
          <div className="space-y-4">
            {!plan ? (
              <div className="bg-white p-6 rounded-xl shadow-sm text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center"><ChefHat className="w-10 h-10 text-white" /></div>
                <h2 className="text-xl font-bold mb-2">Plano Alimentar com IA</h2>
                <p className="text-gray-500 mb-6">Gere um plano personalizado com refeições variadas, macros calculados e dicas diárias</p>
                {showPlanOptions ? (
                  <div className="space-y-4 text-left">
                    <div>
                      <label className="block text-sm font-medium mb-2">Duração do plano</label>
                      <div className="flex gap-2">
                        {[7, 14, 30].map(d => (
                          <button key={d} onClick={() => setPlanDays(d)} className={`flex-1 py-3 rounded-xl border-2 font-medium transition-all ${planDays === d ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-gray-200 hover:border-gray-300'}`}>
                            <span className="text-lg">{d}</span><br/><span className="text-xs text-gray-500">dias</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Preferências ou restrições (opcional)</label>
                      <textarea value={planFeedback} onChange={(e) => setPlanFeedback(e.target.value)} placeholder="Ex: Vegetariana, sem glúten, refeições rápidas, baixo carboidrato..." className="w-full p-3 border rounded-xl text-sm resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" rows={3} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setShowPlanOptions(false)} className="flex-1 py-3 border rounded-xl font-medium hover:bg-gray-50">Cancelar</button>
                      <button onClick={generatePlanBackground} disabled={genStatus === 'generating'} className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:from-primary-600 hover:to-primary-700 active:scale-[0.98] transition-all disabled:opacity-50">
                        <Sparkles className="w-5 h-5" /> Gerar Plano com IA
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowPlanOptions(true)} className="px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 mx-auto hover:from-primary-600 hover:to-primary-700 active:scale-[0.98] transition-all shadow-lg shadow-primary-500/20">
                    <Sparkles className="w-5 h-5" /> Criar Meu Plano
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Plano header */}
                <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-4 rounded-xl text-white">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="font-bold text-lg">Seu Plano de {plan.length} Dias</h2>
                    <div className="flex gap-1">
                      <button onClick={() => { setShowPlanOptions(true); setPlan(null); setPlanSaved(false) }} className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-all" title="Novo plano"><RefreshCw className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <p className="text-sm text-white/80">
                    Dia {selectedDay + 1} • {getDayCalories(plan[selectedDay])} kcal total
                  </p>
                </div>

                {/* Ajustar plano */}
                {editingPlan && (
                  <div className="bg-white p-4 rounded-xl shadow-sm">
                    <h3 className="font-semibold mb-2">O que gostaria de mudar?</h3>
                    <textarea value={planFeedback} onChange={(e) => setPlanFeedback(e.target.value)} placeholder="Ex: Mais opções rápidas, trocar peixe por frango, menos carboidrato..." className="w-full p-3 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500" rows={3} />
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => { setEditingPlan(false); setPlanFeedback('') }} className="flex-1 py-2 border rounded-lg font-medium">Cancelar</button>
                      <button onClick={generatePlanBackground} disabled={genStatus === 'generating' || !planFeedback.trim()} className="flex-1 py-2 bg-primary-500 text-white rounded-lg font-medium flex items-center justify-center gap-1 disabled:opacity-50">
                        <RefreshCw className="w-4 h-4" /> Regenerar
                      </button>
                    </div>
                  </div>
                )}

                {!editingPlan && (
                  <button onClick={() => setEditingPlan(true)} className="w-full py-2 text-sm text-primary-600 bg-primary-50 rounded-xl flex items-center justify-center gap-1 hover:bg-primary-100">
                    <Edit3 className="w-4 h-4" /> Ajustar este plano
                  </button>
                )}

                {/* Day selector */}
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                  {plan.map((_, idx) => (
                    <button key={idx} onClick={() => setSelectedDay(idx)} className={`flex-shrink-0 w-12 h-12 rounded-xl font-medium flex flex-col items-center justify-center transition-all ${selectedDay === idx ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30 scale-105' : 'bg-white border hover:border-primary-300'}`}>
                      <span className="text-xs opacity-70">Dia</span>
                      <span className="font-bold">{idx + 1}</span>
                    </button>
                  ))}
                </div>

                {/* Day meals */}
                {plan[selectedDay] && (
                  <div className="space-y-3">
                    {Object.entries(plan[selectedDay].meals).map(([type, meal]) => (
                      <div key={type} className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <button onClick={() => setExpandedMeal(expandedMeal === `${selectedDay}-${type}` ? null : `${selectedDay}-${type}`)} className="w-full p-4 flex items-center gap-3 text-left">
                          {getMealIcon(type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 font-medium">{getMealTypeName(type)}</p>
                            <p className="font-semibold truncate">{(meal as Meal).name}</p>
                          </div>
                          <div className="text-right flex items-center gap-2">
                            <div>
                              <p className="font-bold text-orange-600">{(meal as Meal).calories}<span className="text-xs font-normal"> kcal</span></p>
                              <p className="text-xs text-gray-400">P:{(meal as Meal).protein}g</p>
                            </div>
                            {expandedMeal === `${selectedDay}-${type}` ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                          </div>
                        </button>
                        {expandedMeal === `${selectedDay}-${type}` && (
                          <div className="px-4 pb-4 border-t">
                            <p className="text-sm text-gray-600 mt-3 leading-relaxed">{(meal as Meal).description}</p>
                            <div className="flex gap-4 mt-3 pt-3 border-t border-dashed">
                              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /><span className="text-xs text-gray-600">Prot: {(meal as Meal).protein}g</span></div>
                              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-xs text-gray-600">Carbs: {(meal as Meal).carbs}g</span></div>
                              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500" /><span className="text-xs text-gray-600">Gord: {(meal as Meal).fat}g</span></div>
                            </div>
                            <button onClick={() => addMeal({ ...(meal as Meal), type })} className="mt-3 w-full py-2 text-sm bg-green-50 text-green-600 rounded-lg flex items-center justify-center gap-1 hover:bg-green-100">
                              <Plus className="w-4 h-4" /> Registrar esta refeição
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Day tips */}
                    {plan[selectedDay].tips?.length > 0 && (
                      <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                        <h4 className="font-semibold text-amber-800 mb-2 flex items-center gap-1">💡 Dicas do Dia {selectedDay + 1}</h4>
                        <ul className="space-y-1.5">{plan[selectedDay].tips.map((tip, idx) => (<li key={idx} className="text-sm text-amber-700 flex gap-2"><span className="text-amber-500 mt-0.5">•</span><span>{tip}</span></li>))}</ul>
                      </div>
                    )}

                    {/* Day summary */}
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                      <h4 className="font-semibold mb-3 text-sm text-gray-600">Resumo do Dia {selectedDay + 1}</h4>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="p-2 bg-orange-50 rounded-lg"><p className="text-lg font-bold text-orange-600">{getDayCalories(plan[selectedDay])}</p><p className="text-[10px] text-gray-500">kcal</p></div>
                        <div className="p-2 bg-green-50 rounded-lg"><p className="text-lg font-bold text-green-600">{Object.values(plan[selectedDay].meals).reduce((s, m: any) => s + (m?.protein || 0), 0)}g</p><p className="text-[10px] text-gray-500">proteína</p></div>
                        <div className="p-2 bg-amber-50 rounded-lg"><p className="text-lg font-bold text-amber-600">{Object.values(plan[selectedDay].meals).reduce((s, m: any) => s + (m?.carbs || 0), 0)}g</p><p className="text-[10px] text-gray-500">carbs</p></div>
                        <div className="p-2 bg-purple-50 rounded-lg"><p className="text-lg font-bold text-purple-600">{Object.values(plan[selectedDay].meals).reduce((s, m: any) => s + (m?.fat || 0), 0)}g</p><p className="text-[10px] text-gray-500">gorduras</p></div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ===== TAB RECEITAS ===== */}
        {tab === 'receitas' && (
          <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-2">{recipeCategories.map(cat => (<button key={cat.id} onClick={() => setRecipeCategory(cat.id)} className={`flex-shrink-0 px-3 py-2 rounded-xl flex items-center gap-1 transition-all ${recipeCategory === cat.id ? 'bg-primary-500 text-white shadow-md' : 'bg-white border hover:border-primary-300'}`}><span>{cat.icon}</span><span className="text-sm">{cat.name}</span>{cat.count > 0 && <span className={`text-xs px-1.5 rounded-full ${recipeCategory === cat.id ? 'bg-white/20' : 'bg-gray-100'}`}>{cat.count}</span>}</button>))}</div>
            <button onClick={() => generateRecipes(recipeCategory === 'all' ? 'Almoço' : recipeCategory)} disabled={recipeGenStatus === 'generating'} className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 hover:from-primary-600 hover:to-primary-700 active:scale-[0.98] transition-all shadow-lg shadow-primary-500/20">
              {recipeGenStatus === 'generating' ? <><Loader2 className="w-5 h-5 animate-spin" />Gerando...</> : <><Sparkles className="w-5 h-5" />Gerar Receitas com IA</>}
            </button>
            {filteredRecipes.length === 0 ? (
              <div className="bg-white p-8 rounded-xl text-center shadow-sm"><ChefHat className="w-16 h-16 mx-auto mb-4 text-gray-300" /><h3 className="font-semibold text-gray-600 mb-2">Nenhuma receita ainda</h3><p className="text-gray-400 text-sm">Gere receitas personalizadas com IA!</p></div>
            ) : (
              <div className="grid gap-3">{filteredRecipes.map(recipe => (
                <div key={recipe.id} onClick={() => setSelectedRecipe(recipe)} className="bg-white p-4 rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-[0.98]">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center flex-shrink-0"><Utensils className="w-6 h-6 text-orange-600" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2"><h3 className="font-semibold truncate">{recipe.name}</h3>{recipe.is_favorite && <Heart className="w-4 h-4 text-red-500 fill-red-500 flex-shrink-0" />}</div>
                      <p className="text-sm text-gray-500 line-clamp-1">{recipe.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400"><span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {recipe.prep_time}min</span><span className="flex items-center gap-1"><Users className="w-3 h-3" /> {recipe.servings}</span><span className="flex items-center gap-1"><Flame className="w-3 h-3" /> {recipe.calories}kcal</span></div>
                    </div>
                  </div>
                </div>
              ))}</div>
            )}
          </div>
        )}
      </div>

      {/* ===== MODAL DE RECEITA ===== */}
      {selectedRecipe && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setSelectedRecipe(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="font-bold text-lg truncate pr-4">{selectedRecipe.name}</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleFavorite(selectedRecipe)} className="p-2 hover:bg-gray-100 rounded-lg"><Heart className={`w-5 h-5 ${selectedRecipe.is_favorite ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} /></button>
                <button onClick={() => { if (selectedRecipe.id) deleteRecipe(selectedRecipe.id) }} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"><Trash2 className="w-5 h-5" /></button>
                <button onClick={() => setSelectedRecipe(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-gray-600">{selectedRecipe.description}</p>
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-gray-50 p-3 rounded-xl text-center"><Clock className="w-5 h-5 mx-auto text-gray-400 mb-1" /><p className="text-sm font-semibold">{selectedRecipe.prep_time}</p><p className="text-xs text-gray-400">min</p></div>
                <div className="bg-gray-50 p-3 rounded-xl text-center"><Users className="w-5 h-5 mx-auto text-gray-400 mb-1" /><p className="text-sm font-semibold">{selectedRecipe.servings}</p><p className="text-xs text-gray-400">porções</p></div>
                <div className="bg-orange-50 p-3 rounded-xl text-center"><Flame className="w-5 h-5 mx-auto text-orange-400 mb-1" /><p className="text-sm font-semibold text-orange-600">{selectedRecipe.calories}</p><p className="text-xs text-gray-400">kcal</p></div>
                <div className="bg-green-50 p-3 rounded-xl text-center"><Target className="w-5 h-5 mx-auto text-green-400 mb-1" /><p className="text-sm font-semibold text-green-600">{selectedRecipe.protein}g</p><p className="text-xs text-gray-400">prot</p></div>
              </div>
              <div><h3 className="font-semibold mb-2">🥗 Ingredientes</h3>{selectedRecipe.ingredients?.length > 0 ? (<ul className="space-y-1.5">{selectedRecipe.ingredients.map((ing, idx) => (<li key={idx} className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-green-500 flex-shrink-0" />{ing}</li>))}</ul>) : <p className="text-gray-400 text-sm">Não disponível</p>}</div>
              <div><h3 className="font-semibold mb-2">👩‍🍳 Modo de Preparo</h3>{selectedRecipe.instructions?.length > 0 ? (<ol className="space-y-2">{selectedRecipe.instructions.map((step, idx) => (<li key={idx} className="flex gap-3 text-sm"><span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0 text-xs font-semibold">{idx + 1}</span><span className="text-gray-600">{step}</span></li>))}</ol>) : <p className="text-gray-400 text-sm">Não disponível</p>}</div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL ADD MEAL ===== */}
      {showAddMeal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowAddMeal(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between"><h2 className="font-bold text-lg">Adicionar Refeição</h2><button onClick={() => setShowAddMeal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button></div>
            <div className="p-4 space-y-4">
              <div><label className="block text-sm font-medium mb-2">Tipo de Refeição</label><div className="grid grid-cols-3 gap-2">{[{id:'breakfast',name:'Café',icon:'☕'},{id:'morning_snack',name:'Lanche AM',icon:'🍎'},{id:'lunch',name:'Almoço',icon:'🍲'},{id:'afternoon_snack',name:'Lanche PM',icon:'🥪'},{id:'dinner',name:'Jantar',icon:'🌙'}].map(t=>(<button key={t.id} onClick={()=>setNewMealType(t.id)} className={`p-2 rounded-lg border-2 text-sm transition-all ${newMealType===t.id?'border-primary-500 bg-primary-50 font-medium':'border-gray-200 hover:border-gray-300'}`}>{t.icon} {t.name}</button>))}</div></div>
              <div><label className="block text-sm font-medium mb-2">Sugestões Rápidas</label><div className="grid grid-cols-2 gap-2">{[{name:'Ovos mexidos + torrada',calories:350,protein:20,carbs:25,fat:18},{name:'Iogurte com frutas',calories:200,protein:10,carbs:30,fat:5},{name:'Frango grelhado + arroz',calories:450,protein:35,carbs:45,fat:12},{name:'Salada com atum',calories:300,protein:25,carbs:15,fat:16},{name:'Banana + pasta de amendoim',calories:250,protein:7,carbs:30,fat:12},{name:'Sopa de legumes',calories:280,protein:15,carbs:30,fat:8}].map((meal,idx)=>(<button key={idx} onClick={()=>addMeal({...meal,type:newMealType,description:''})} className="p-3 bg-gray-50 rounded-xl text-left hover:bg-gray-100 active:scale-[0.98] transition-all"><p className="font-medium text-sm">{meal.name}</p><p className="text-xs text-gray-500 mt-1">{meal.calories}kcal • P:{meal.protein}g</p></button>))}</div></div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL DE GERAÇÃO EM SEGUNDO PLANO (CANTO INFERIOR DIREITO) ===== */}
      {showGenModal && (
        <div className="fixed bottom-20 right-4 z-40 w-80 animate-in slide-in-from-bottom-5 duration-300">
          <div className={`rounded-2xl shadow-2xl border overflow-hidden ${genStatus === 'success' ? 'bg-green-50 border-green-200' : genStatus === 'error' ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                {genStatus === 'generating' && <Loader2 className="w-4 h-4 animate-spin text-primary-500" />}
                {genStatus === 'success' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                {genStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-600" />}
                <span className="text-sm font-semibold">
                  {genStatus === 'generating' ? (genType === 'plan' ? 'Gerando Plano...' : 'Gerando Receitas...') : genStatus === 'success' ? 'Pronto!' : 'Erro'}
                </span>
              </div>
              <button onClick={() => { setShowGenModal(false); if (genStatus !== 'generating') setGenStatus('idle') }} className="p-1 hover:bg-gray-200/50 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
            </div>

            {/* Content */}
            <div className="px-4 pb-4">
              <p className="text-xs text-gray-600 mb-2">{genMessage}</p>
              
              {/* Progress bar */}
              {genStatus === 'generating' && (
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-1000 ease-out" style={{ width: `${genProgress}%` }} />
                </div>
              )}
              {genStatus === 'success' && (
                <div className="h-2 bg-green-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full w-full" />
                </div>
              )}

              {/* Action buttons */}
              {genStatus === 'success' && (
                <button onClick={() => { setShowGenModal(false); setGenStatus('idle'); setTab(genType === 'plan' ? 'plano' : 'receitas') }} className="mt-3 w-full py-2 bg-green-600 text-white text-sm rounded-lg font-medium hover:bg-green-700 active:scale-[0.98] transition-all">
                  Ver {genType === 'plan' ? 'Plano' : 'Receitas'} →
                </button>
              )}
              {genStatus === 'error' && (
                <button onClick={genType === 'plan' ? generatePlanBackground : () => generateRecipes(recipeCategory)} className="mt-3 w-full py-2 bg-red-600 text-white text-sm rounded-lg font-medium hover:bg-red-700">
                  Tentar Novamente
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
