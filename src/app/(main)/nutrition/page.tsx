'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Apple, Droplets, Flame, Target, Plus, Utensils, ChefHat, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Meal {
  name: string
  description: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

interface DayPlan {
  breakfast: Meal
  morning_snack: Meal
  lunch: Meal
  afternoon_snack: Meal
  dinner: Meal
  tips: string[]
}

export default function NutritionPage() {
  const [tab, setTab] = useState<'hoje' | 'plano' | 'receitas'>('hoje')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [stats, setStats] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0, water: 0, waterGoal: 2000, caloriesGoal: 2000 })
  const [plan, setPlan] = useState<DayPlan[] | null>(null)
  const [selectedDay, setSelectedDay] = useState(0)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date().toISOString().split('T')[0]

      const [mealsRes, waterRes, userRes, planRes] = await Promise.all([
        supabase.from('meals').select('calories, protein, carbs, fat').eq('user_id', user.id).gte('created_at', today),
        supabase.from('water_intake').select('amount').eq('user_id', user.id).gte('created_at', today),
        supabase.from('users').select('daily_calories_goal, daily_water_goal, phase').eq('id', user.id).single(),
        supabase.from('nutrition_plans').select('plan_data').eq('user_id', user.id).eq('is_active', true).single()
      ])

      const meals = mealsRes.data || []
      const water = (waterRes.data || []).reduce((sum: number, w: any) => sum + w.amount, 0)

      setStats({
        calories: meals.reduce((sum: number, m: any) => sum + (m.calories || 0), 0),
        protein: meals.reduce((sum: number, m: any) => sum + (m.protein || 0), 0),
        carbs: meals.reduce((sum: number, m: any) => sum + (m.carbs || 0), 0),
        fat: meals.reduce((sum: number, m: any) => sum + (m.fat || 0), 0),
        water,
        waterGoal: userRes.data?.daily_water_goal || 2000,
        caloriesGoal: userRes.data?.daily_calories_goal || 2000
      })

      if (planRes.data?.plan_data) {
        setPlan(planRes.data.plan_data)
      }
    } catch (e) { console.error(e) }
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

  const generatePlan = async (days: number) => {
    setGenerating(true)
    try {
      const response = await fetch('/api/nutrition-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days })
      })
      const data = await response.json()
      if (data.plan) {
        setPlan(data.plan)
        setSelectedDay(0)
      }
    } catch (e) { console.error(e) }
    finally { setGenerating(false) }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-xl"><ArrowLeft className="w-5 h-5" /></Link>
          <div><h1 className="text-xl font-bold">Nutrição</h1><p className="text-sm text-gray-500">Seu plano alimentar</p></div>
        </div>

        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {[
            { id: 'hoje', label: 'Hoje' },
            { id: 'plano', label: 'Plano' },
            { id: 'receitas', label: 'Receitas' }
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-white shadow-sm' : ''}`}>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="p-4 space-y-4">
        {tab === 'hoje' && (
          <>
            {/* Resumo */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-semibold mb-3">Resumo do Dia</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-orange-50 rounded-xl p-3">
                  <Flame className="w-5 h-5 text-orange-500 mb-1" />
                  <p className="text-lg font-bold">{stats.calories}</p>
                  <p className="text-xs text-gray-500">/ {stats.caloriesGoal} kcal</p>
                  <div className="h-1.5 bg-orange-200 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min((stats.calories / stats.caloriesGoal) * 100, 100)}%` }} />
                  </div>
                </div>
                <div className="bg-blue-50 rounded-xl p-3">
                  <Droplets className="w-5 h-5 text-blue-500 mb-1" />
                  <p className="text-lg font-bold">{stats.water}ml</p>
                  <p className="text-xs text-gray-500">/ {stats.waterGoal}ml</p>
                  <div className="h-1.5 bg-blue-200 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min((stats.water / stats.waterGoal) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>

              {/* Macros */}
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="text-center p-2 bg-green-50 rounded-xl">
                  <p className="text-sm font-bold text-green-700">{stats.protein}g</p>
                  <p className="text-xs text-gray-500">Proteína</p>
                </div>
                <div className="text-center p-2 bg-yellow-50 rounded-xl">
                  <p className="text-sm font-bold text-yellow-700">{stats.carbs}g</p>
                  <p className="text-xs text-gray-500">Carbos</p>
                </div>
                <div className="text-center p-2 bg-red-50 rounded-xl">
                  <p className="text-sm font-bold text-red-700">{stats.fat}g</p>
                  <p className="text-xs text-gray-500">Gordura</p>
                </div>
              </div>
            </div>

            {/* Água */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Droplets className="w-5 h-5 text-blue-500" /> Adicionar Água
              </h3>
              <div className="flex gap-2">
                {[200, 300, 500].map(ml => (
                  <button key={ml} onClick={() => addWater(ml)} className="flex-1 py-3 bg-blue-50 text-blue-600 rounded-xl font-medium hover:bg-blue-100">
                    +{ml}ml
                  </button>
                ))}
              </div>
            </div>

            {/* Ações */}
            <div className="grid grid-cols-2 gap-3">
              <Link href="/scanner" className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Target className="w-5 h-5 text-purple-600" />
                </div>
                <span className="font-medium text-sm">Scanner</span>
              </Link>
              <Link href="/recipes" className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <ChefHat className="w-5 h-5 text-green-600" />
                </div>
                <span className="font-medium text-sm">Receitas</span>
              </Link>
            </div>
          </>
        )}

        {tab === 'plano' && (
          <>
            {!plan ? (
              <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
                <Apple className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <h3 className="font-bold text-lg mb-2">Gere seu Plano Alimentar</h3>
                <p className="text-gray-500 text-sm mb-4">Nossa IA criará um plano personalizado para você</p>
                <div className="flex gap-2">
                  {[7, 15, 30].map(d => (
                    <button key={d} onClick={() => generatePlan(d)} disabled={generating} className="flex-1 py-3 bg-primary-500 text-white rounded-xl font-medium disabled:opacity-50">
                      {generating ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : `${d} dias`}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Seletor de dias */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {plan.map((_, i) => (
                    <button key={i} onClick={() => setSelectedDay(i)} className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-medium ${selectedDay === i ? 'bg-primary-500 text-white' : 'bg-white'}`}>
                      {i + 1}
                    </button>
                  ))}
                </div>

                {/* Refeições do dia */}
                {plan[selectedDay] && (
                  <div className="space-y-3">
                    {[
                      { key: 'breakfast', label: 'Café da Manhã', icon: '☕' },
                      { key: 'morning_snack', label: 'Lanche Manhã', icon: '🍎' },
                      { key: 'lunch', label: 'Almoço', icon: '🍽️' },
                      { key: 'afternoon_snack', label: 'Lanche Tarde', icon: '🥤' },
                      { key: 'dinner', label: 'Jantar', icon: '🌙' },
                    ].map(meal => {
                      const m = plan[selectedDay][meal.key as keyof DayPlan] as Meal
                      if (!m) return null
                      return (
                        <div key={meal.key} className="bg-white rounded-xl p-4 shadow-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">{meal.icon}</span>
                            <h4 className="font-semibold">{meal.label}</h4>
                          </div>
                          <p className="font-medium text-gray-800">{m.name}</p>
                          <p className="text-sm text-gray-500 mb-2">{m.description}</p>
                          <div className="flex gap-3 text-xs">
                            <span className="text-orange-600">{m.calories} kcal</span>
                            <span className="text-green-600">{m.protein}g prot</span>
                            <span className="text-yellow-600">{m.carbs}g carb</span>
                            <span className="text-red-600">{m.fat}g gord</span>
                          </div>
                        </div>
                      )
                    })}

                    {plan[selectedDay].tips && (
                      <div className="bg-yellow-50 rounded-xl p-4">
                        <h4 className="font-semibold text-yellow-800 mb-2">💡 Dicas do Dia</h4>
                        <ul className="space-y-1">
                          {plan[selectedDay].tips.map((tip, i) => (
                            <li key={i} className="text-sm text-yellow-700">• {tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <button onClick={() => setPlan(null)} className="w-full py-3 border border-gray-200 rounded-xl font-medium">
                  Gerar Novo Plano
                </button>
              </>
            )}
          </>
        )}

        {tab === 'receitas' && (
          <div className="space-y-3">
            {[
              { href: '/recipes?cat=breakfast', label: 'Café da Manhã', icon: '☕', count: 12 },
              { href: '/recipes?cat=lunch', label: 'Almoço', icon: '🍽️', count: 24 },
              { href: '/recipes?cat=dinner', label: 'Jantar', icon: '🌙', count: 18 },
              { href: '/recipes?cat=snacks', label: 'Lanches', icon: '🥤', count: 15 },
              { href: '/recipes?cat=pregnant', label: 'Para Gestantes', icon: '🤰', count: 10 },
            ].map(cat => (
              <Link key={cat.href} href={cat.href} className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm">
                <span className="text-2xl">{cat.icon}</span>
                <div className="flex-1">
                  <h4 className="font-semibold">{cat.label}</h4>
                  <p className="text-sm text-gray-500">{cat.count} receitas</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
