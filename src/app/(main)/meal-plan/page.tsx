'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, Calendar, Sparkles, ChevronRight, ChevronLeft,
  Clock, Flame, Utensils, Plus, Check, RefreshCw, Loader2,
  ShoppingCart, BookOpen, Target, AlertCircle, Star, Trash2,
  Coffee, Sun, Moon, Apple
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Meal {
  name: string
  description: string
  calories: number
  protein?: number
  carbs?: number
  fat?: number
  time?: string
  recipe?: string
}

interface DayPlan {
  day: number
  dayName: string
  date: string
  meals: {
    breakfast: Meal
    morning_snack: Meal
    lunch: Meal
    afternoon_snack: Meal
    dinner: Meal
  }
  totalCalories: number
  completed: boolean
}

interface MealPlan {
  id: string
  name: string
  duration: number
  startDate: string
  endDate: string
  days: DayPlan[]
  weeklyTips: string[]
  shoppingList: string[]
  isActive: boolean
}

const MEAL_ICONS: Record<string, any> = {
  breakfast: Coffee,
  morning_snack: Apple,
  lunch: Sun,
  afternoon_snack: Apple,
  dinner: Moon
}

const MEAL_NAMES: Record<string, string> = {
  breakfast: 'Café da Manhã',
  morning_snack: 'Lanche Manhã',
  lunch: 'Almoço',
  afternoon_snack: 'Lanche Tarde',
  dinner: 'Jantar'
}

export default function MealPlanPage() {
  const [plan, setPlan] = useState<MealPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedDay, setSelectedDay] = useState(0)
  const [showGenerator, setShowGenerator] = useState(false)
  const [duration, setDuration] = useState(7)
  const [goal, setGoal] = useState('')
  const [userPhase, setUserPhase] = useState('ACTIVE')
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)

  useEffect(() => {
    loadPlan()
  }, [])

  const loadPlan = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Carregar fase do usuário
      const { data: userData } = await supabase
        .from('users')
        .select('phase')
        .eq('id', user.id)
        .single()
      
      if (userData?.phase) setUserPhase(userData.phase)

      // Carregar plano ativo
      const { data: planData } = await supabase
        .from('nutrition_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (planData?.plan_data) {
        const today = new Date().toISOString().split('T')[0]
        const startDate = new Date(planData.start_date)
        const diffDays = Math.floor((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        
        setPlan({
          id: planData.id,
          name: planData.name,
          duration: planData.plan_data.days?.length || 7,
          startDate: planData.start_date,
          endDate: planData.end_date,
          days: planData.plan_data.days || [],
          weeklyTips: planData.plan_data.weeklyTips || [],
          shoppingList: planData.plan_data.shoppingList || [],
          isActive: true
        })
        
        setSelectedDay(Math.min(Math.max(diffDays, 0), (planData.plan_data.days?.length || 7) - 1))
      }
    } catch (e) {
      console.error('Erro ao carregar plano:', e)
    } finally {
      setLoading(false)
    }
  }

  const generatePlan = async () => {
    setGenerating(true)
    try {
      const response = await fetch('/api/nutrition-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: duration, goal })
      })

      const data = await response.json()
      
      if (data.plan) {
        // Formatar os dias
        const formattedDays = data.plan.days?.map((d: any, i: number) => {
          const date = new Date()
          date.setDate(date.getDate() + i)
          const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
          
          return {
            day: i + 1,
            dayName: dayNames[date.getDay()],
            date: date.toISOString().split('T')[0],
            meals: d.meals || {},
            totalCalories: d.totalCalories || 1800,
            completed: false
          }
        }) || []

        setPlan({
          id: data.savedId || Date.now().toString(),
          name: `Plano ${duration} dias`,
          duration,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          days: formattedDays,
          weeklyTips: data.plan.weeklyTips || [],
          shoppingList: data.plan.shoppingList || [],
          isActive: true
        })
        
        setSelectedDay(0)
        setShowGenerator(false)
      }
    } catch (e) {
      console.error('Erro ao gerar plano:', e)
      alert('Erro ao gerar plano. Tente novamente.')
    } finally {
      setGenerating(false)
    }
  }

  const markMealCompleted = async (mealType: string) => {
    if (!plan) return

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const meal = plan.days[selectedDay]?.meals?.[mealType as keyof typeof plan.days[0]['meals']]
      if (!meal) return

      await supabase.from('meals').insert({
        user_id: user.id,
        name: meal.name || mealType,
        meal_type: mealType,
        calories: meal.calories || 0,
        protein: meal.protein || 0,
        carbs: meal.carbs || 0,
        fat: meal.fat || 0,
        notes: meal.description
      })

      // Atualizar UI
      alert('Refeição registrada! ✅')
    } catch (e) {
      console.error(e)
    }
  }

  const generateShoppingList = () => {
    if (!plan?.shoppingList?.length) return
    
    // Redirecionar para shopping com a lista
    const items = plan.shoppingList.join(',')
    window.location.href = `/shopping?items=${encodeURIComponent(items)}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary-500 mx-auto mb-2" />
          <p className="text-gray-500">Carregando plano...</p>
        </div>
      </div>
    )
  }

  const currentDay = plan?.days?.[selectedDay]

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-xl">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">Plano Alimentar</h1>
              {plan && (
                <p className="text-sm text-gray-500">{plan.duration} dias • {plan.name}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowGenerator(true)}
            className="p-2 hover:bg-primary-50 rounded-xl text-primary-600"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Sem plano */}
      {!plan && (
        <div className="p-4">
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Utensils className="w-10 h-10 text-primary-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Crie seu Plano Alimentar</h2>
            <p className="text-gray-500 mb-6">
              Nossa IA vai criar um plano personalizado com base no seu perfil e objetivos.
            </p>
            <button
              onClick={() => setShowGenerator(true)}
              className="btn-primary px-6 py-3 rounded-xl inline-flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Gerar Plano com IA
            </button>
          </div>
        </div>
      )}

      {/* Com plano */}
      {plan && currentDay && (
        <>
          {/* Navegação de dias */}
          <div className="bg-white px-4 py-3 border-b border-gray-100 overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              {plan.days.map((day, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedDay(i)}
                  className={`flex flex-col items-center p-3 rounded-xl min-w-[70px] transition-all ${
                    i === selectedDay 
                      ? 'bg-primary-500 text-white' 
                      : day.completed 
                        ? 'bg-green-50 text-green-700' 
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-xs font-medium">{day.dayName.slice(0, 3)}</span>
                  <span className="text-lg font-bold">{new Date(day.date).getDate()}</span>
                  {day.completed && <Check className="w-3 h-3" />}
                </button>
              ))}
            </div>
          </div>

          {/* Info do dia */}
          <div className="p-4">
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-4 text-white mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">{currentDay.dayName}</h3>
                  <p className="text-white/80 text-sm">
                    {new Date(currentDay.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{currentDay.totalCalories}</p>
                  <p className="text-white/80 text-sm">kcal total</p>
                </div>
              </div>
            </div>

            {/* Refeições do dia */}
            <div className="space-y-3">
              {Object.entries(currentDay.meals).map(([type, meal]) => {
                const Icon = MEAL_ICONS[type] || Utensils
                const isExpanded = expandedMeal === type
                
                return (
                  <motion.div
                    key={type}
                    layout
                    className="bg-white rounded-2xl shadow-sm overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedMeal(isExpanded ? null : type)}
                      className="w-full p-4 flex items-center gap-4 text-left"
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        type === 'breakfast' ? 'bg-amber-100 text-amber-600' :
                        type === 'lunch' ? 'bg-orange-100 text-orange-600' :
                        type === 'dinner' ? 'bg-indigo-100 text-indigo-600' :
                        'bg-green-100 text-green-600'
                      }`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 uppercase">{MEAL_NAMES[type]}</p>
                        <p className="font-semibold">{meal.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary-600">{meal.calories} kcal</p>
                        <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-4 pb-4"
                        >
                          <div className="pt-3 border-t border-gray-100">
                            <p className="text-gray-600 text-sm mb-3">{meal.description}</p>
                            
                            {(meal.protein || meal.carbs || meal.fat) && (
                              <div className="flex gap-4 mb-4">
                                {meal.protein && (
                                  <div className="text-center">
                                    <p className="text-lg font-bold text-blue-600">{meal.protein}g</p>
                                    <p className="text-xs text-gray-500">Proteína</p>
                                  </div>
                                )}
                                {meal.carbs && (
                                  <div className="text-center">
                                    <p className="text-lg font-bold text-orange-600">{meal.carbs}g</p>
                                    <p className="text-xs text-gray-500">Carbos</p>
                                  </div>
                                )}
                                {meal.fat && (
                                  <div className="text-center">
                                    <p className="text-lg font-bold text-yellow-600">{meal.fat}g</p>
                                    <p className="text-xs text-gray-500">Gordura</p>
                                  </div>
                                )}
                              </div>
                            )}

                            <button
                              onClick={() => markMealCompleted(type)}
                              className="w-full btn-primary py-2 rounded-xl flex items-center justify-center gap-2"
                            >
                              <Check className="w-4 h-4" />
                              Marcar como Consumido
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </div>

            {/* Ações */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={generateShoppingList}
                className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-3 hover:shadow-md transition"
              >
                <ShoppingCart className="w-6 h-6 text-pink-500" />
                <div className="text-left">
                  <p className="font-semibold text-sm">Lista de Compras</p>
                  <p className="text-xs text-gray-500">{plan.shoppingList?.length || 0} itens</p>
                </div>
              </button>

              <Link
                href="/recipes"
                className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-3 hover:shadow-md transition"
              >
                <BookOpen className="w-6 h-6 text-amber-500" />
                <div className="text-left">
                  <p className="font-semibold text-sm">Ver Receitas</p>
                  <p className="text-xs text-gray-500">Detalhes</p>
                </div>
              </Link>
            </div>

            {/* Dicas da semana */}
            {plan.weeklyTips?.length > 0 && (
              <div className="mt-6 bg-green-50 border border-green-200 rounded-2xl p-4">
                <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Dicas da Semana
                </h3>
                <ul className="space-y-2">
                  {plan.weeklyTips.slice(0, 4).map((tip, i) => (
                    <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal Gerador */}
      <AnimatePresence>
        {showGenerator && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => !generating && setShowGenerator(false)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-primary-600" />
                </div>
                <h2 className="text-xl font-bold">Gerar Plano com IA</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Personalizado para {userPhase === 'PREGNANT' ? 'gestantes' : 'você'}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Duração do Plano</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[7, 15, 30].map(d => (
                      <button
                        key={d}
                        onClick={() => setDuration(d)}
                        className={`py-3 rounded-xl font-medium transition ${
                          duration === d 
                            ? 'bg-primary-500 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {d} dias
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Objetivo (opcional)</label>
                  <input
                    type="text"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="Ex: Perder peso, mais energia..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <button
                  onClick={generatePlan}
                  disabled={generating}
                  className="w-full btn-primary py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Gerando plano...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Gerar Plano
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowGenerator(false)}
                  disabled={generating}
                  className="w-full py-3 text-gray-500 hover:text-gray-700"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
