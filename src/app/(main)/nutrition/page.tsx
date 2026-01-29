'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Apple, ChefHat, Calendar, ShoppingCart, Sparkles, 
  ChevronRight, ArrowLeft, Plus, Clock, Flame, 
  Check, RefreshCw, Loader2, BookOpen, Utensils,
  Coffee, Sun, Moon, Cookie, Target, TrendingUp
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Meal {
  name: string
  description: string
  calories: number
  protein: number
  carbs: number
  fat: number
  time?: string
}

interface DayPlan {
  day: number
  date: string
  meals: {
    breakfast: Meal
    morning_snack: Meal
    lunch: Meal
    afternoon_snack: Meal
    dinner: Meal
  }
  totalCalories: number
  tips?: string
}

interface NutritionPlan {
  id: string
  name: string
  days: DayPlan[]
  duration: number
  created_at: string
  is_active: boolean
  weekly_tips?: string[]
  shopping_list?: string[]
}

interface UserStats {
  todayCalories: number
  todayProtein: number
  todayCarbs: number
  todayFat: number
  todayWater: number
  goalCalories: number
  mealsLogged: number
}

export default function NutritionPage() {
  const [activeTab, setActiveTab] = useState<'hoje' | 'plano' | 'receitas'>('hoje')
  const [currentPlan, setCurrentPlan] = useState<NutritionPlan | null>(null)
  const [stats, setStats] = useState<UserStats>({
    todayCalories: 0,
    todayProtein: 0,
    todayCarbs: 0,
    todayFat: 0,
    todayWater: 0,
    goalCalories: 2000,
    mealsLogged: 0
  })
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedDay, setSelectedDay] = useState(0)
  const [userPhase, setUserPhase] = useState('ACTIVE')
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [planDuration, setPlanDuration] = useState(7)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Carregar perfil
      const { data: profile } = await supabase
        .from('users')
        .select('phase, daily_calorie_goal')
        .eq('id', user.id)
        .single()

      if (profile) {
        setUserPhase(profile.phase || 'ACTIVE')
        setStats(prev => ({ ...prev, goalCalories: profile.daily_calorie_goal || 2000 }))
      }

      // Carregar plano ativo
      const { data: plans } = await supabase
        .from('nutrition_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)

      if (plans && plans.length > 0) {
        setCurrentPlan({
          ...plans[0],
          days: plans[0].plan_data?.days || []
        })
      }

      // Carregar refeições de hoje
      const today = new Date().toISOString().split('T')[0]
      const { data: meals } = await supabase
        .from('meals')
        .select('calories, protein, carbs, fat')
        .eq('user_id', user.id)
        .gte('created_at', today)

      if (meals) {
        const totals = meals.reduce((acc, meal) => ({
          calories: acc.calories + (meal.calories || 0),
          protein: acc.protein + (meal.protein || 0),
          carbs: acc.carbs + (meal.carbs || 0),
          fat: acc.fat + (meal.fat || 0),
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

        setStats(prev => ({
          ...prev,
          todayCalories: totals.calories,
          todayProtein: totals.protein,
          todayCarbs: totals.carbs,
          todayFat: totals.fat,
          mealsLogged: meals.length
        }))
      }

      // Carregar água de hoje
      const { data: water } = await supabase
        .from('water_intake')
        .select('amount')
        .eq('user_id', user.id)
        .gte('created_at', today)

      if (water) {
        const totalWater = water.reduce((sum, w) => sum + w.amount, 0)
        setStats(prev => ({ ...prev, todayWater: totalWater }))
      }

    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const generatePlan = async () => {
    setGenerating(true)
    setShowGenerateModal(false)
    
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const response = await fetch('/api/nutrition-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: planDuration })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.plan) {
          setCurrentPlan({
            id: data.savedId,
            name: `Plano ${planDuration} dias`,
            days: data.plan.days || [],
            duration: planDuration,
            created_at: new Date().toISOString(),
            is_active: true,
            weekly_tips: data.plan.weeklyTips,
            shopping_list: data.plan.shoppingList
          })
        }
      }
    } catch (e) {
      console.error(e)
      alert('Erro ao gerar plano. Tente novamente.')
    } finally {
      setGenerating(false)
    }
  }

  const addWater = async (amount: number) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('water_intake').insert({
        user_id: user.id,
        amount
      })

      setStats(prev => ({ ...prev, todayWater: prev.todayWater + amount }))
    } catch (e) {
      console.error(e)
    }
  }

  const logMeal = async (mealType: string, meal: Meal) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('meals').insert({
        user_id: user.id,
        name: meal.name,
        meal_type: mealType,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        notes: meal.description
      })

      setStats(prev => ({
        ...prev,
        todayCalories: prev.todayCalories + meal.calories,
        todayProtein: prev.todayProtein + meal.protein,
        todayCarbs: prev.todayCarbs + meal.carbs,
        todayFat: prev.todayFat + meal.fat,
        mealsLogged: prev.mealsLogged + 1
      }))

      alert('Refeição registrada! ✅')
    } catch (e) {
      console.error(e)
    }
  }

  const calorieProgress = Math.min((stats.todayCalories / stats.goalCalories) * 100, 100)
  const waterProgress = Math.min((stats.todayWater / 2000) * 100, 100)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-xl">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Nutrição</h1>
            <p className="text-sm text-gray-500">Seu plano alimentar personalizado</p>
          </div>
          <Link href="/scanner" className="p-2 bg-primary-100 rounded-xl">
            <Apple className="w-5 h-5 text-primary-600" />
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white px-4 py-2 border-b border-gray-100">
        <div className="flex gap-2">
          {[
            { id: 'hoje', label: 'Hoje', icon: Sun },
            { id: 'plano', label: 'Plano', icon: Calendar },
            { id: 'receitas', label: 'Receitas', icon: ChefHat },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors ${
                activeTab === tab.id 
                  ? 'bg-primary-500 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        <AnimatePresence mode="wait">
          {/* TAB: HOJE */}
          {activeTab === 'hoje' && (
            <motion.div
              key="hoje"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Resumo Diário */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary-500" />
                  Resumo de Hoje
                </h3>
                
                {/* Calorias */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Calorias</span>
                    <span className="font-medium">{stats.todayCalories} / {stats.goalCalories} kcal</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div 
                      className={`h-full rounded-full ${calorieProgress > 100 ? 'bg-red-500' : 'bg-primary-500'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${calorieProgress}%` }}
                    />
                  </div>
                </div>

                {/* Macros */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-blue-600 mb-1">Proteína</p>
                    <p className="font-bold text-blue-700">{stats.todayProtein}g</p>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-orange-600 mb-1">Carboidratos</p>
                    <p className="font-bold text-orange-700">{stats.todayCarbs}g</p>
                  </div>
                  <div className="bg-yellow-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-yellow-600 mb-1">Gorduras</p>
                    <p className="font-bold text-yellow-700">{stats.todayFat}g</p>
                  </div>
                </div>

                {/* Água */}
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">💧 Água</span>
                    <span className="text-sm font-medium">{stats.todayWater}ml / 2000ml</span>
                  </div>
                  <div className="h-3 bg-blue-100 rounded-full overflow-hidden mb-3">
                    <motion.div 
                      className="h-full bg-blue-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${waterProgress}%` }}
                    />
                  </div>
                  <div className="flex gap-2">
                    {[200, 300, 500].map(amount => (
                      <button
                        key={amount}
                        onClick={() => addWater(amount)}
                        className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100"
                      >
                        +{amount}ml
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Refeições de Hoje do Plano */}
              {currentPlan && currentPlan.days.length > 0 && (
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Utensils className="w-5 h-5 text-primary-500" />
                    Refeições Sugeridas
                  </h3>
                  
                  <div className="space-y-3">
                    {Object.entries(currentPlan.days[0]?.meals || {}).map(([key, meal]: [string, any]) => {
                      const icons: Record<string, any> = {
                        breakfast: { icon: Coffee, label: 'Café da Manhã', time: '07:00' },
                        morning_snack: { icon: Cookie, label: 'Lanche Manhã', time: '10:00' },
                        lunch: { icon: Sun, label: 'Almoço', time: '12:30' },
                        afternoon_snack: { icon: Cookie, label: 'Lanche Tarde', time: '16:00' },
                        dinner: { icon: Moon, label: 'Jantar', time: '19:30' },
                      }
                      const info = icons[key]
                      if (!info || !meal) return null
                      const Icon = info.icon

                      return (
                        <div key={key} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-primary-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{info.label}</p>
                            <p className="text-sm text-gray-500 truncate">{meal.description}</p>
                            <p className="text-xs text-gray-400">{meal.calories} kcal • {info.time}</p>
                          </div>
                          <button
                            onClick={() => logMeal(key, meal)}
                            className="px-3 py-1 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Ações Rápidas */}
              <div className="grid grid-cols-2 gap-3">
                <Link href="/scanner" className="bg-white rounded-2xl p-4 shadow-sm flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-2">
                    <Apple className="w-6 h-6 text-purple-600" />
                  </div>
                  <span className="font-medium">Escanear</span>
                  <span className="text-xs text-gray-500">Código de barras</span>
                </Link>
                
                <Link href="/recipes" className="bg-white rounded-2xl p-4 shadow-sm flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-2">
                    <ChefHat className="w-6 h-6 text-orange-600" />
                  </div>
                  <span className="font-medium">Receitas</span>
                  <span className="text-xs text-gray-500">Ideias saudáveis</span>
                </Link>
              </div>
            </motion.div>
          )}

          {/* TAB: PLANO */}
          {activeTab === 'plano' && (
            <motion.div
              key="plano"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {!currentPlan ? (
                <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
                  <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-10 h-10 text-primary-500" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Crie seu Plano Alimentar</h3>
                  <p className="text-gray-500 mb-6">
                    A IA irá criar um plano personalizado baseado no seu perfil e objetivos
                  </p>
                  <button
                    onClick={() => setShowGenerateModal(true)}
                    disabled={generating}
                    className="btn-primary px-8 py-3 rounded-xl flex items-center gap-2 mx-auto"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Gerar Plano com IA
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <>
                  {/* Info do Plano */}
                  <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-4 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold">{currentPlan.name}</h3>
                      <button
                        onClick={() => setShowGenerateModal(true)}
                        className="p-2 bg-white/20 rounded-lg hover:bg-white/30"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-white/80 text-sm">
                      {currentPlan.duration} dias • Criado em {new Date(currentPlan.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>

                  {/* Seletor de Dias */}
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
                    {currentPlan.days.map((day, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedDay(index)}
                        className={`flex-shrink-0 w-16 py-3 rounded-xl text-center transition-colors ${
                          selectedDay === index
                            ? 'bg-primary-500 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <p className="text-xs opacity-70">Dia</p>
                        <p className="text-lg font-bold">{day.day}</p>
                      </button>
                    ))}
                  </div>

                  {/* Refeições do Dia */}
                  {currentPlan.days[selectedDay] && (
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-gray-100">
                        <div className="flex justify-between items-center">
                          <h3 className="font-semibold">Dia {currentPlan.days[selectedDay].day}</h3>
                          <span className="text-sm text-primary-600 font-medium">
                            {currentPlan.days[selectedDay].totalCalories} kcal total
                          </span>
                        </div>
                      </div>
                      
                      <div className="divide-y divide-gray-100">
                        {Object.entries(currentPlan.days[selectedDay].meals).map(([key, meal]: [string, any]) => {
                          const labels: Record<string, string> = {
                            breakfast: '☀️ Café da Manhã',
                            morning_snack: '🍎 Lanche Manhã',
                            lunch: '🍽️ Almoço',
                            afternoon_snack: '🥤 Lanche Tarde',
                            dinner: '🌙 Jantar',
                          }
                          if (!meal) return null

                          return (
                            <div key={key} className="p-4">
                              <p className="text-sm text-gray-500 mb-1">{labels[key]}</p>
                              <p className="font-medium">{meal.description}</p>
                              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                                <span>{meal.calories} kcal</span>
                                <span>P: {meal.protein || 0}g</span>
                                <span>C: {meal.carbs || 0}g</span>
                                <span>G: {meal.fat || 0}g</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {currentPlan.days[selectedDay].tips && (
                        <div className="p-4 bg-yellow-50 border-t border-yellow-100">
                          <p className="text-sm text-yellow-800">
                            💡 {currentPlan.days[selectedDay].tips}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Lista de Compras */}
                  {currentPlan.shopping_list && currentPlan.shopping_list.length > 0 && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold flex items-center gap-2">
                          <ShoppingCart className="w-5 h-5 text-primary-500" />
                          Lista de Compras
                        </h3>
                        <Link href="/shopping" className="text-sm text-primary-600">
                          Ver completa →
                        </Link>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {currentPlan.shopping_list.slice(0, 10).map((item, i) => (
                          <span key={i} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                            {item}
                          </span>
                        ))}
                        {currentPlan.shopping_list.length > 10 && (
                          <span className="px-3 py-1 bg-primary-100 text-primary-600 rounded-full text-sm">
                            +{currentPlan.shopping_list.length - 10} itens
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* TAB: RECEITAS */}
          {activeTab === 'receitas' && (
            <motion.div
              key="receitas"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <Link href="/recipes" className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                    <ChefHat className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Receitas Saudáveis</h3>
                    <p className="text-sm text-gray-500">Explore receitas para cada refeição</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-semibold mb-4">Categorias de Receitas</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { name: 'Café da Manhã', icon: '🌅', count: 25 },
                    { name: 'Almoço', icon: '🍽️', count: 40 },
                    { name: 'Jantar', icon: '🌙', count: 35 },
                    { name: 'Lanches', icon: '🍎', count: 20 },
                    { name: 'Sobremesas', icon: '🍰', count: 15 },
                    { name: 'Gestantes', icon: '🤰', count: 30 },
                  ].map(cat => (
                    <Link
                      key={cat.name}
                      href={`/recipes?category=${cat.name.toLowerCase()}`}
                      className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <span className="text-2xl mb-2 block">{cat.icon}</span>
                      <p className="font-medium">{cat.name}</p>
                      <p className="text-xs text-gray-500">{cat.count} receitas</p>
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal Gerar Plano */}
      <AnimatePresence>
        {showGenerateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowGenerateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4">Gerar Plano Alimentar</h3>
              <p className="text-gray-600 mb-6">
                Escolha a duração do seu plano personalizado
              </p>

              <div className="grid grid-cols-3 gap-3 mb-6">
                {[7, 15, 30].map(days => (
                  <button
                    key={days}
                    onClick={() => setPlanDuration(days)}
                    className={`p-4 rounded-xl border-2 transition-colors ${
                      planDuration === days
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-2xl font-bold text-primary-600">{days}</p>
                    <p className="text-sm text-gray-500">dias</p>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={generatePlan}
                  disabled={generating}
                  className="flex-1 py-3 bg-primary-500 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Gerar
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
