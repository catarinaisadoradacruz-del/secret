'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Utensils, Plus, Calendar, Sparkles, ChevronRight, 
  Apple, Coffee, Sun, Moon, Cookie, Flame, Target,
  TrendingUp, Clock, Loader2, Check, X, Camera
} from 'lucide-react'
import Link from 'next/link'
import { Card, LoadingSpinner } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'

interface Meal {
  id: string
  date: string
  meal_type: string
  description: string
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
  foods: any[]
  created_at: string
}

interface DailyGoals {
  calories: number
  protein: number
  carbs: number
  fat: number
}

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Café da Manhã', icon: Coffee, color: 'bg-amber-100 text-amber-600', time: '07:00' },
  { key: 'morning_snack', label: 'Lanche da Manhã', icon: Apple, color: 'bg-green-100 text-green-600', time: '10:00' },
  { key: 'lunch', label: 'Almoço', icon: Sun, color: 'bg-orange-100 text-orange-600', time: '12:30' },
  { key: 'afternoon_snack', label: 'Lanche da Tarde', icon: Cookie, color: 'bg-pink-100 text-pink-600', time: '16:00' },
  { key: 'dinner', label: 'Jantar', icon: Moon, color: 'bg-indigo-100 text-indigo-600', time: '19:30' },
]

export default function NutritionPage() {
  const [activeTab, setActiveTab] = useState<'today' | 'history' | 'plan'>('today')
  const [meals, setMeals] = useState<Meal[]>([])
  const [todayMeals, setTodayMeals] = useState<Meal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedMealType, setSelectedMealType] = useState('')
  const [mealPlan, setMealPlan] = useState<any>(null)
  const [userPhase, setUserPhase] = useState('ACTIVE')
  const [dailyGoals, setDailyGoals] = useState<DailyGoals>({
    calories: 2000,
    protein: 80,
    carbs: 250,
    fat: 65
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setIsLoading(false)
        return
      }

      // Buscar perfil do usuário
      const { data: profile } = await supabase
        .from('users')
        .select('phase, goals, dietary_restrictions')
        .eq('id', user.id)
        .single()

      if (profile) {
        setUserPhase(profile.phase || 'ACTIVE')
        if (profile.phase === 'PREGNANT') {
          setDailyGoals({ calories: 2300, protein: 90, carbs: 280, fat: 70 })
        } else if (profile.phase === 'POSTPARTUM') {
          setDailyGoals({ calories: 2500, protein: 100, carbs: 300, fat: 75 })
        }
      }

      // Buscar refeições de hoje
      const today = new Date().toISOString().split('T')[0]
      const { data: todayData } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .order('created_at', { ascending: true })

      if (todayData) {
        setTodayMeals(todayData)
      }

      // Buscar histórico (últimos 7 dias)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const { data: historyData } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', weekAgo.toISOString().split('T')[0])
        .order('date', { ascending: false })

      if (historyData) {
        setMeals(historyData)
      }

      // Buscar plano nutricional salvo
      const { data: planData } = await supabase
        .from('nutrition_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (planData?.plan_data) {
        setMealPlan(planData.plan_data)
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateMealPlan = async () => {
    setIsGeneratingPlan(true)
    try {
      const response = await fetch('/api/nutrition/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await response.json()
      if (data.plan) {
        setMealPlan(data.plan)
      }
    } catch (error) {
      console.error('Erro ao gerar plano:', error)
    } finally {
      setIsGeneratingPlan(false)
    }
  }

  const addQuickMeal = async (mealType: string, description: string, calories: number) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('meals')
        .insert({
          user_id: user.id,
          date: today,
          meal_type: mealType,
          description,
          total_calories: calories,
          total_protein: Math.round(calories * 0.15 / 4),
          total_carbs: Math.round(calories * 0.5 / 4),
          total_fat: Math.round(calories * 0.35 / 9),
          foods: [{ name: description, calories }]
        })
        .select()
        .single()

      if (data) {
        setTodayMeals(prev => [...prev, data])
        setShowAddModal(false)
        setSelectedMealType('')
      }
    } catch (error) {
      console.error('Erro ao adicionar refeição:', error)
    }
  }

  // Calcular totais do dia
  const todayTotals = todayMeals.reduce((acc, meal) => ({
    calories: acc.calories + (meal.total_calories || 0),
    protein: acc.protein + (meal.total_protein || 0),
    carbs: acc.carbs + (meal.total_carbs || 0),
    fat: acc.fat + (meal.total_fat || 0)
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

  const calorieProgress = Math.min((todayTotals.calories / dailyGoals.calories) * 100, 100)

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alimentação</h1>
          <p className="text-gray-600 mt-1">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <Link
          href="/nutrition/scan"
          className="p-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
        >
          <Camera className="w-5 h-5" />
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { key: 'today', label: 'Hoje' },
          { key: 'history', label: 'Histórico' },
          { key: 'plan', label: 'Plano Alimentar' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200 ${
              activeTab === tab.key
                ? 'bg-primary text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'today' && (
          <motion.div
            key="today"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Daily Summary Card */}
            <Card className="mb-6 bg-gradient-to-br from-primary-50 to-secondary-50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Resumo do Dia</h3>
                  <p className="text-sm text-gray-500">
                    {userPhase === 'PREGNANT' ? '🤰 Gestante' : userPhase === 'POSTPARTUM' ? '🤱 Pós-parto' : '💪 Ativa'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary-600">{todayTotals.calories}</p>
                  <p className="text-xs text-gray-500">/ {dailyGoals.calories} kcal</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-3 bg-white rounded-full overflow-hidden mb-4">
                <motion.div
                  className={`h-full ${calorieProgress >= 100 ? 'bg-green-500' : 'bg-gradient-to-r from-primary-400 to-primary-600'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${calorieProgress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              {/* Macros */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900">{todayTotals.protein}g</p>
                  <p className="text-xs text-gray-500">Proteína</p>
                  <div className="h-1 bg-white/50 rounded mt-1">
                    <div className="h-full bg-green-500 rounded" style={{width: `${Math.min((todayTotals.protein / dailyGoals.protein) * 100, 100)}%`}}/>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900">{todayTotals.carbs}g</p>
                  <p className="text-xs text-gray-500">Carboidratos</p>
                  <div className="h-1 bg-white/50 rounded mt-1">
                    <div className="h-full bg-amber-500 rounded" style={{width: `${Math.min((todayTotals.carbs / dailyGoals.carbs) * 100, 100)}%`}}/>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900">{todayTotals.fat}g</p>
                  <p className="text-xs text-gray-500">Gorduras</p>
                  <div className="h-1 bg-white/50 rounded mt-1">
                    <div className="h-full bg-orange-500 rounded" style={{width: `${Math.min((todayTotals.fat / dailyGoals.fat) * 100, 100)}%`}}/>
                  </div>
                </div>
              </div>
            </Card>

            {/* Meals List */}
            <h3 className="font-semibold text-gray-900 mb-3">Refeições</h3>
            <div className="space-y-3">
              {MEAL_TYPES.map((mealType) => {
                const meal = todayMeals.find(m => m.meal_type === mealType.key)
                const Icon = mealType.icon

                return (
                  <Card key={mealType.key} className="hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl ${mealType.color} flex items-center justify-center`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">{mealType.label}</h4>
                          <span className="text-xs text-gray-400">{mealType.time}</span>
                        </div>
                        {meal ? (
                          <p className="text-sm text-gray-600 line-clamp-1">{meal.description}</p>
                        ) : (
                          <p className="text-sm text-gray-400">Não registrado</p>
                        )}
                      </div>
                      {meal ? (
                        <div className="text-right">
                          <p className="font-semibold text-primary-600">{meal.total_calories} kcal</p>
                          <p className="text-xs text-gray-500">
                            P:{meal.total_protein}g C:{meal.total_carbs}g
                          </p>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedMealType(mealType.key)
                            setShowAddModal(true)
                          }}
                          className="p-2 bg-primary-50 text-primary-600 rounded-xl hover:bg-primary-100 transition-colors"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>

            {/* Quick Actions */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Link href="/nutrition/scan">
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                      <Camera className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Escanear</p>
                      <p className="text-xs text-gray-500">Foto da refeição</p>
                    </div>
                  </div>
                </Card>
              </Link>

              <button onClick={() => setShowAddModal(true)} className="text-left">
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary-100 flex items-center justify-center">
                      <Plus className="w-5 h-5 text-secondary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Adicionar</p>
                      <p className="text-xs text-gray-500">Manualmente</p>
                    </div>
                  </div>
                </Card>
              </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {meals.length === 0 ? (
              <Card className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-medium text-gray-900 mb-2">Nenhuma refeição registrada</h3>
                <p className="text-gray-500 text-sm">Comece a registrar suas refeições!</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {Object.entries(
                  meals.reduce((acc, meal) => {
                    const date = meal.date
                    if (!acc[date]) acc[date] = []
                    acc[date].push(meal)
                    return acc
                  }, {} as Record<string, Meal[]>)
                ).map(([date, dayMeals]) => {
                  const dayTotal = dayMeals.reduce((sum, m) => sum + (m.total_calories || 0), 0)
                  const isToday = date === new Date().toISOString().split('T')[0]
                  
                  return (
                    <Card key={date}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">
                          {isToday ? 'Hoje' : new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { 
                            weekday: 'short', 
                            day: 'numeric', 
                            month: 'short' 
                          })}
                        </h4>
                        <span className={`text-sm font-medium ${dayTotal >= dailyGoals.calories ? 'text-green-600' : 'text-primary-600'}`}>
                          {dayTotal} kcal
                        </span>
                      </div>
                      <div className="space-y-2">
                        {dayMeals.map((meal) => {
                          const mealInfo = MEAL_TYPES.find(m => m.key === meal.meal_type)
                          return (
                            <div key={meal.id} className="flex items-center justify-between text-sm py-1">
                              <div className="flex items-center gap-2">
                                <span>{mealInfo?.label || meal.meal_type}:</span>
                                <span className="text-gray-600 line-clamp-1">{meal.description}</span>
                              </div>
                              <span className="text-gray-500 whitespace-nowrap">{meal.total_calories} kcal</span>
                            </div>
                          )
                        })}
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'plan' && (
          <motion.div
            key="plan"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {!mealPlan ? (
              <Card className="text-center py-12">
                <Sparkles className="w-16 h-16 text-primary-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Crie seu Plano Alimentar</h3>
                <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
                  A IA vai criar um plano personalizado baseado no seu perfil
                  {userPhase === 'PREGNANT' && ', considerando sua fase da gestação'}
                  {userPhase === 'POSTPARTUM' && ', ideal para o pós-parto'}
                </p>
                <button
                  onClick={generateMealPlan}
                  disabled={isGeneratingPlan}
                  className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
                >
                  {isGeneratingPlan ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Gerando plano...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Gerar Plano com IA
                    </>
                  )}
                </button>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Plan Summary */}
                <Card className="bg-gradient-to-br from-primary-50 to-secondary-50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center">
                      <Target className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Seu Plano Personalizado</h3>
                      <p className="text-sm text-gray-600">Baseado no seu perfil e objetivos</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-white/60 rounded-lg py-2">
                      <p className="text-xl font-bold text-primary-600">{mealPlan.dailyCalories || 2000}</p>
                      <p className="text-xs text-gray-500">kcal/dia</p>
                    </div>
                    <div className="bg-white/60 rounded-lg py-2">
                      <p className="text-xl font-bold text-green-600">{mealPlan.dailyProtein || 80}g</p>
                      <p className="text-xs text-gray-500">Proteína</p>
                    </div>
                    <div className="bg-white/60 rounded-lg py-2">
                      <p className="text-xl font-bold text-amber-600">{mealPlan.dailyCarbs || 250}g</p>
                      <p className="text-xs text-gray-500">Carbs</p>
                    </div>
                    <div className="bg-white/60 rounded-lg py-2">
                      <p className="text-xl font-bold text-orange-600">{mealPlan.dailyFat || 65}g</p>
                      <p className="text-xs text-gray-500">Gordura</p>
                    </div>
                  </div>
                </Card>

                {/* Daily Meals */}
                {mealPlan.meals?.slice(0, 7).map((day: any, index: number) => (
                  <Card key={index}>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary-500" />
                      {day.day}
                    </h4>
                    <div className="space-y-2">
                      {day.breakfast && (
                        <div className="flex items-center justify-between text-sm py-1 border-b border-gray-50">
                          <span className="text-gray-600">☕ {day.breakfast.name}</span>
                          <span className="text-gray-500">{day.breakfast.calories} kcal</span>
                        </div>
                      )}
                      {day.morningSnack && (
                        <div className="flex items-center justify-between text-sm py-1 border-b border-gray-50">
                          <span className="text-gray-600">🍎 {day.morningSnack.name}</span>
                          <span className="text-gray-500">{day.morningSnack.calories} kcal</span>
                        </div>
                      )}
                      {day.lunch && (
                        <div className="flex items-center justify-between text-sm py-1 border-b border-gray-50">
                          <span className="text-gray-600">🍽️ {day.lunch.name}</span>
                          <span className="text-gray-500">{day.lunch.calories} kcal</span>
                        </div>
                      )}
                      {day.afternoonSnack && (
                        <div className="flex items-center justify-between text-sm py-1 border-b border-gray-50">
                          <span className="text-gray-600">🍪 {day.afternoonSnack.name}</span>
                          <span className="text-gray-500">{day.afternoonSnack.calories} kcal</span>
                        </div>
                      )}
                      {day.dinner && (
                        <div className="flex items-center justify-between text-sm py-1">
                          <span className="text-gray-600">🌙 {day.dinner.name}</span>
                          <span className="text-gray-500">{day.dinner.calories} kcal</span>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}

                {/* Tips */}
                {mealPlan.tips && mealPlan.tips.length > 0 && (
                  <Card>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      💡 Dicas Personalizadas
                    </h4>
                    <ul className="space-y-2">
                      {mealPlan.tips.map((tip: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {/* Regenerate Button */}
                <button
                  onClick={generateMealPlan}
                  disabled={isGeneratingPlan}
                  className="w-full py-3 border-2 border-primary text-primary rounded-xl font-medium hover:bg-primary/5 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {isGeneratingPlan ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5" />
                  )}
                  Gerar Novo Plano
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Meal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-t-3xl sm:rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Adicionar Refeição</h2>
              <button 
                onClick={() => {
                  setShowAddModal(false)
                  setSelectedMealType('')
                }} 
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!selectedMealType ? (
              <div className="space-y-3">
                <p className="text-gray-600 mb-4">Selecione o tipo de refeição:</p>
                {MEAL_TYPES.map((type) => {
                  const Icon = type.icon
                  return (
                    <button
                      key={type.key}
                      onClick={() => setSelectedMealType(type.key)}
                      className="w-full flex items-center gap-4 p-4 border rounded-xl hover:border-primary hover:bg-primary/5 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-xl ${type.color} flex items-center justify-center`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-medium flex-1 text-left">{type.label}</span>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </button>
                  )
                })}
              </div>
            ) : (
              <QuickMealForm
                mealType={selectedMealType}
                mealLabel={MEAL_TYPES.find(m => m.key === selectedMealType)?.label || ''}
                onSubmit={addQuickMeal}
                onBack={() => setSelectedMealType('')}
              />
            )}
          </motion.div>
        </div>
      )}
    </div>
  )
}

function QuickMealForm({ 
  mealType, 
  mealLabel,
  onSubmit, 
  onBack 
}: { 
  mealType: string
  mealLabel: string
  onSubmit: (type: string, desc: string, cal: number) => void
  onBack: () => void 
}) {
  const [description, setDescription] = useState('')
  const [calories, setCalories] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const quickOptions = [
    { desc: 'Refeição leve', cal: 300 },
    { desc: 'Refeição moderada', cal: 500 },
    { desc: 'Refeição completa', cal: 700 },
  ]

  const handleSubmit = async () => {
    if (!description || !calories) return
    setIsSubmitting(true)
    await onSubmit(mealType, description, parseInt(calories))
    setIsSubmitting(false)
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-primary font-medium flex items-center gap-1 mb-2">
        ← Voltar
      </button>
      
      <p className="text-gray-600">Adicionando: <strong>{mealLabel}</strong></p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Descrição da refeição
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: Arroz, feijão, frango grelhado e salada"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Calorias estimadas
        </label>
        <input
          type="number"
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
          placeholder="Ex: 500"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <p className="text-sm text-gray-500 mb-2">Ou escolha uma opção rápida:</p>
        <div className="flex gap-2">
          {quickOptions.map((opt) => (
            <button
              key={opt.cal}
              onClick={() => {
                setDescription(opt.desc)
                setCalories(opt.cal.toString())
              }}
              className="flex-1 py-2 px-3 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {opt.cal} kcal
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!description || !calories || isSubmitting}
        className="w-full py-3 bg-primary text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
      >
        {isSubmitting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Check className="w-5 h-5" />
            Adicionar Refeição
          </>
        )}
      </button>
    </div>
  )
}
