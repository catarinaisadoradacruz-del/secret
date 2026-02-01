'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Apple, Droplets, Flame, Target, Plus, Utensils, ChefHat, Loader2, Save, Sparkles, Heart, X, Clock, Users, Check, RefreshCw, Edit3, Trash2, Coffee, Sun, Moon, Cookie } from 'lucide-react'
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

export default function NutritionPage() {
  const [tab, setTab] = useState<'hoje' | 'plano' | 'receitas'>('hoje')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
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

  useEffect(() => { loadData() }, [])

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
        supabase.from('nutrition_plans').select('*').eq('user_id', user.id).eq('is_active', true).single(),
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
        setPlan(planRes.data.plan_data)
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

  const generatePlan = async () => {
    setGenerating(true)
    setShowPlanOptions(false)
    try {
      const response = await fetch('/api/nutrition-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: planDays, profile: userProfile, feedback: planFeedback })
      })
      const data = await response.json()
      if (data.plan) { setPlan(data.plan); setPlanSaved(false); setEditingPlan(false); setPlanFeedback('') }
    } catch (e) { console.error('Generate plan error:', e) }
    finally { setGenerating(false) }
  }

  const savePlan = async () => {
    if (!plan) return
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('nutrition_plans').update({ is_active: false }).eq('user_id', user.id)
      await supabase.from('nutrition_plans').insert({ user_id: user.id, plan_data: plan, days: planDays, is_active: true })
      setPlanSaved(true)
    } catch (e) { console.error(e) }
  }

  const generateRecipes = async (category: string) => {
    setGenerating(true)
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
      }
    } catch (e) { console.error(e) }
    finally { setGenerating(false) }
  }

  const toggleFavorite = async (recipe: Recipe) => {
    try {
      const supabase = createClient()
      const newFav = !recipe.is_favorite
      await supabase.from('recipes').update({ is_favorite: newFav }).eq('id', recipe.id)
      
      // Atualizar lista de receitas
      setRecipes(prev => prev.map(r => r.id === recipe.id ? ({ ...r, is_favorite: newFav } as Recipe) : r))
      
      // Atualizar receita selecionada se for a mesma
      if (selectedRecipe !== null && selectedRecipe.id === recipe.id) {
        setSelectedRecipe({
          ...selectedRecipe,
          is_favorite: newFav
        } as Recipe)
      }
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
        <div><h1 className="font-bold text-lg">Nutrição</h1><p className="text-xs text-gray-500">Seu plano alimentar</p></div>
      </header>

      <div className="bg-white border-b px-4 py-2">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {(['hoje', 'plano', 'receitas'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-white shadow text-primary-600' : 'text-gray-600'}`}>
              {t === 'hoje' ? 'Hoje' : t === 'plano' ? 'Plano' : 'Receitas'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {tab === 'hoje' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="flex items-center gap-2 mb-2"><Flame className="w-5 h-5 text-orange-500" /><span className="text-sm text-gray-600">Calorias</span></div>
                <div className="flex items-end gap-1"><span className="text-2xl font-bold">{stats.calories}</span><span className="text-gray-400 text-sm mb-1">/ {stats.caloriesGoal}</span></div>
                <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full" style={{ width: `${Math.min((stats.calories / stats.caloriesGoal) * 100, 100)}%` }} /></div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="flex items-center gap-2 mb-2"><Droplets className="w-5 h-5 text-blue-500" /><span className="text-sm text-gray-600">Água</span></div>
                <div className="flex items-end gap-1"><span className="text-2xl font-bold">{stats.water}</span><span className="text-gray-400 text-sm mb-1">/ {stats.waterGoal}ml</span></div>
                <div className="mt-2 flex gap-1">{[200, 300, 500].map(ml => (<button key={ml} onClick={() => addWater(ml)} className="flex-1 py-1 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">+{ml}ml</button>))}</div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <h3 className="font-semibold mb-3">Macros</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div><div className="text-2xl font-bold text-green-600">{stats.protein}g</div><div className="text-xs text-gray-500">Proteínas</div></div>
                <div><div className="text-2xl font-bold text-amber-600">{stats.carbs}g</div><div className="text-xs text-gray-500">Carbos</div></div>
                <div><div className="text-2xl font-bold text-purple-600">{stats.fat}g</div><div className="text-xs text-gray-500">Gorduras</div></div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-3"><h3 className="font-semibold">Refeições de Hoje</h3><button onClick={() => setShowAddMeal(true)} className="p-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100"><Plus className="w-5 h-5" /></button></div>
              {todayMeals.length === 0 ? (
                <div className="text-center py-8 text-gray-400"><Utensils className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>Nenhuma refeição hoje</p><button onClick={() => setShowAddMeal(true)} className="mt-3 px-4 py-2 bg-primary-500 text-white rounded-xl text-sm">Adicionar</button></div>
              ) : (
                <div className="space-y-3">{todayMeals.map((meal, idx) => (<div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">{getMealIcon(meal.type)}<div className="flex-1 min-w-0"><p className="font-medium truncate">{meal.name}</p><p className="text-xs text-gray-500">{getMealTypeName(meal.type)}</p></div><div className="text-right"><p className="font-semibold text-orange-600">{meal.calories} kcal</p><p className="text-xs text-gray-500">P:{meal.protein}g C:{meal.carbs}g</p></div></div>))}</div>
              )}
            </div>
          </div>
        )}

        {tab === 'plano' && (
          <div className="space-y-4">
            {!plan ? (
              <div className="bg-white p-6 rounded-xl shadow-sm text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center"><ChefHat className="w-8 h-8 text-white" /></div>
                <h2 className="text-xl font-bold mb-2">Plano Alimentar</h2>
                <p className="text-gray-500 mb-6">Gere um plano personalizado</p>
                {showPlanOptions ? (
                  <div className="space-y-4 text-left">
                    <div><label className="block text-sm font-medium mb-2">Duração</label><div className="flex gap-2">{[7, 14, 30].map(d => (<button key={d} onClick={() => setPlanDays(d)} className={`flex-1 py-2 rounded-lg border ${planDays === d ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-gray-200'}`}>{d} dias</button>))}</div></div>
                    <div><label className="block text-sm font-medium mb-2">Preferências</label><textarea value={planFeedback} onChange={(e) => setPlanFeedback(e.target.value)} placeholder="Ex: Vegetariana, sem glúten..." className="w-full p-3 border rounded-xl text-sm resize-none" rows={3} /></div>
                    <div className="flex gap-2"><button onClick={() => setShowPlanOptions(false)} className="flex-1 py-3 border rounded-xl">Cancelar</button><button onClick={generatePlan} disabled={generating} className="flex-1 py-3 bg-primary-500 text-white rounded-xl flex items-center justify-center gap-2">{generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}Gerar</button></div>
                  </div>
                ) : (
                  <button onClick={() => setShowPlanOptions(true)} className="px-6 py-3 bg-primary-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 mx-auto"><Sparkles className="w-5 h-5" /> Criar Plano</button>
                )}
              </div>
            ) : (
              <>
                {!planSaved && (
                  <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                    <div className="flex items-center gap-2 mb-3"><Sparkles className="w-5 h-5 text-green-600" /><h3 className="font-semibold text-green-800">Plano Gerado!</h3></div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={savePlan} className="flex-1 py-2 bg-green-600 text-white rounded-lg flex items-center justify-center gap-2"><Save className="w-4 h-4" /> Salvar</button>
                      <button onClick={() => setEditingPlan(true)} className="flex-1 py-2 bg-white border border-green-300 text-green-700 rounded-lg flex items-center justify-center gap-2"><Edit3 className="w-4 h-4" /> Ajustar</button>
                      <button onClick={() => { setPlan(null); setPlanSaved(false) }} className="py-2 px-4 text-gray-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}
                {editingPlan && (
                  <div className="bg-white p-4 rounded-xl shadow-sm">
                    <h3 className="font-semibold mb-2">O que mudar?</h3>
                    <textarea value={planFeedback} onChange={(e) => setPlanFeedback(e.target.value)} placeholder="Ex: Mais opções rápidas..." className="w-full p-3 border rounded-xl text-sm" rows={3} />
                    <div className="flex gap-2 mt-3"><button onClick={() => { setEditingPlan(false); setPlanFeedback('') }} className="flex-1 py-2 border rounded-lg">Cancelar</button><button onClick={generatePlan} disabled={generating || !planFeedback.trim()} className="flex-1 py-2 bg-primary-500 text-white rounded-lg disabled:opacity-50">{generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Regenerar</button></div>
                  </div>
                )}
                <div className="flex gap-2 overflow-x-auto pb-2">{plan.map((_, idx) => (<button key={idx} onClick={() => setSelectedDay(idx)} className={`flex-shrink-0 px-4 py-2 rounded-xl font-medium ${selectedDay === idx ? 'bg-primary-500 text-white' : 'bg-white border'}`}>Dia {idx + 1}</button>))}</div>
                {plan[selectedDay] && (
                  <div className="space-y-3">
                    {Object.entries(plan[selectedDay].meals).map(([type, meal]) => (
                      <div key={type} className="bg-white p-4 rounded-xl shadow-sm">
                        <div className="flex items-center gap-3 mb-2">{getMealIcon(type)}<div><p className="font-semibold">{getMealTypeName(type)}</p><p className="text-sm text-gray-500">{meal.name}</p></div><div className="ml-auto text-right"><p className="font-semibold text-orange-600">{meal.calories} kcal</p></div></div>
                        <p className="text-sm text-gray-600">{meal.description}</p>
                        <div className="flex gap-4 mt-2 text-xs text-gray-500"><span>P: {meal.protein}g</span><span>C: {meal.carbs}g</span><span>G: {meal.fat}g</span></div>
                      </div>
                    ))}
                    {plan[selectedDay].tips?.length > 0 && (<div className="bg-amber-50 p-4 rounded-xl"><h4 className="font-semibold text-amber-800 mb-2">💡 Dicas</h4><ul className="space-y-1">{plan[selectedDay].tips.map((tip, idx) => (<li key={idx} className="text-sm text-amber-700">• {tip}</li>))}</ul></div>)}
                  </div>
                )}
                {planSaved && (<button onClick={() => setShowPlanOptions(true)} className="w-full py-3 bg-primary-500 text-white rounded-xl flex items-center justify-center gap-2"><RefreshCw className="w-5 h-5" /> Novo Plano</button>)}
              </>
            )}
          </div>
        )}

        {tab === 'receitas' && (
          <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-2">{recipeCategories.map(cat => (<button key={cat.id} onClick={() => setRecipeCategory(cat.id)} className={`flex-shrink-0 px-3 py-2 rounded-xl flex items-center gap-1 ${recipeCategory === cat.id ? 'bg-primary-500 text-white' : 'bg-white border'}`}><span>{cat.icon}</span><span className="text-sm">{cat.name}</span><span className={`text-xs px-1.5 rounded-full ${recipeCategory === cat.id ? 'bg-white/20' : 'bg-gray-100'}`}>{cat.count}</span></button>))}</div>
            <button onClick={() => generateRecipes(recipeCategory === 'all' ? 'Almoço' : recipeCategory)} disabled={generating} className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50">{generating ? <><Loader2 className="w-5 h-5 animate-spin" />Gerando...</> : <><Sparkles className="w-5 h-5" />Gerar Receitas</>}</button>
            {filteredRecipes.length === 0 ? (
              <div className="bg-white p-8 rounded-xl text-center"><ChefHat className="w-16 h-16 mx-auto mb-4 text-gray-300" /><h3 className="font-semibold text-gray-600 mb-2">Nenhuma receita</h3><p className="text-gray-400 text-sm">Gere receitas personalizadas</p></div>
            ) : (
              <div className="grid gap-3">{filteredRecipes.map(recipe => (
                <div key={recipe.id} onClick={() => setSelectedRecipe(recipe)} className="bg-white p-4 rounded-xl shadow-sm cursor-pointer hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center flex-shrink-0"><Utensils className="w-6 h-6 text-orange-600" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2"><h3 className="font-semibold truncate">{recipe.name}</h3>{recipe.is_favorite && <Heart className="w-4 h-4 text-red-500 fill-red-500" />}</div>
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

      {selectedRecipe && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
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
              <div><h3 className="font-semibold mb-2">🥗 Ingredientes</h3>{selectedRecipe.ingredients?.length > 0 ? (<ul className="space-y-1">{selectedRecipe.ingredients.map((ing, idx) => (<li key={idx} className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-green-500" />{ing}</li>))}</ul>) : <p className="text-gray-400 text-sm">Não disponível</p>}</div>
              <div><h3 className="font-semibold mb-2">👩‍🍳 Preparo</h3>{selectedRecipe.instructions?.length > 0 ? (<ol className="space-y-2">{selectedRecipe.instructions.map((step, idx) => (<li key={idx} className="flex gap-3 text-sm"><span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0 text-xs font-semibold">{idx + 1}</span><span className="text-gray-600">{step}</span></li>))}</ol>) : <p className="text-gray-400 text-sm">Não disponível</p>}</div>
            </div>
          </div>
        </div>
      )}

      {showAddMeal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg">
            <div className="p-4 border-b flex items-center justify-between"><h2 className="font-bold text-lg">Adicionar Refeição</h2><button onClick={() => setShowAddMeal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button></div>
            <div className="p-4 space-y-4">
              <div><label className="block text-sm font-medium mb-2">Tipo</label><div className="grid grid-cols-3 gap-2">{[{id:'breakfast',name:'Café',icon:'☕'},{id:'morning_snack',name:'Lanche AM',icon:'🍎'},{id:'lunch',name:'Almoço',icon:'🍲'},{id:'afternoon_snack',name:'Lanche PM',icon:'🥪'},{id:'dinner',name:'Jantar',icon:'🌙'}].map(t=>(<button key={t.id} onClick={()=>setNewMealType(t.id)} className={`p-2 rounded-lg border text-sm ${newMealType===t.id?'border-primary-500 bg-primary-50':'border-gray-200'}`}>{t.icon} {t.name}</button>))}</div></div>
              <div><label className="block text-sm font-medium mb-2">Sugestões</label><div className="grid grid-cols-2 gap-2">{[{name:'Ovos mexidos',calories:350,protein:20,carbs:25,fat:18},{name:'Iogurte com frutas',calories:200,protein:10,carbs:30,fat:5},{name:'Frango grelhado',calories:450,protein:35,carbs:45,fat:12},{name:'Salada com atum',calories:300,protein:25,carbs:15,fat:16}].map((meal,idx)=>(<button key={idx} onClick={()=>addMeal({...meal,type:newMealType,description:''})} className="p-3 bg-gray-50 rounded-lg text-left hover:bg-gray-100"><p className="font-medium text-sm">{meal.name}</p><p className="text-xs text-gray-500">{meal.calories}kcal • P:{meal.protein}g</p></button>))}</div></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
