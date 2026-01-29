'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Heart, Apple, Dumbbell, MessageCircle, TrendingUp,
  ChevronRight, Sparkles, Calendar, Bell, Trophy, Camera,
  ShoppingCart, BookOpen, Star, Flame, Target, Droplets,
  Moon, Baby, Activity, Utensils, Scale, Clock, ArrowUp,
  ArrowDown, Minus, AlertCircle, CheckCircle2, Plus
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface DashboardData {
  user: any
  stats: {
    streak: number
    points: number
    level: number
    workoutsThisWeek: number
    workoutsTotal: number
    mealsToday: number
    waterToday: number
    waterGoal: number
    caloriesTotal: number
    caloriesGoal: number
  }
  pregnancy: {
    isPregnant: boolean
    currentWeek: number
    dueDate: string | null
    trimester: number
    daysUntilDue: number
    babySize: string
    babySizeComparison: string
  } | null
  todayWorkout: any | null
  todayMeals: any[]
  upcomingAppointments: any[]
  recentAchievements: any[]
  dailyTip: string
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [waterAmount, setWaterAmount] = useState(250)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        setLoading(false)
        return
      }

      // Carregar usuário
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      // Carregar pontos
      const { data: pointsData } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', authUser.id)
        .single()

      // Treinos desta semana
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      const { count: workoutsWeek } = await supabase
        .from('workouts')
        .select('id', { count: 'exact' })
        .eq('user_id', authUser.id)
        .eq('completed', true)
        .gte('created_at', weekStart.toISOString())

      // Total de treinos
      const { count: workoutsTotal } = await supabase
        .from('workouts')
        .select('id', { count: 'exact' })
        .eq('user_id', authUser.id)
        .eq('completed', true)

      // Refeições de hoje
      const today = new Date().toISOString().split('T')[0]
      const { data: mealsToday } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', authUser.id)
        .gte('created_at', today)

      // Água de hoje
      const { data: waterData } = await supabase
        .from('water_intake')
        .select('amount')
        .eq('user_id', authUser.id)
        .gte('created_at', today)

      const waterToday = (waterData || []).reduce((sum, w) => sum + w.amount, 0)

      // Próximas consultas
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', authUser.id)
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(3)

      // Conquistas recentes
      const { data: achievements } = await supabase
        .from('user_achievements')
        .select('*, achievements(*)')
        .eq('user_id', authUser.id)
        .order('unlocked_at', { ascending: false })
        .limit(3)

      // Calcular dados da gravidez
      let pregnancy = null
      if (userData?.phase === 'PREGNANT' && userData?.last_menstrual_date) {
        const dum = new Date(userData.last_menstrual_date)
        const today = new Date()
        const diffDays = Math.floor((today.getTime() - dum.getTime()) / (1000 * 60 * 60 * 24))
        const currentWeek = Math.floor(diffDays / 7)
        const dueDate = new Date(dum.getTime() + 280 * 24 * 60 * 60 * 1000)
        const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        const trimester = currentWeek <= 12 ? 1 : currentWeek <= 27 ? 2 : 3

        // Tamanho do bebê por semana
        const babySizes: Record<number, { size: string, comparison: string }> = {
          4: { size: '1mm', comparison: 'semente de papoula' },
          5: { size: '2mm', comparison: 'semente de gergelim' },
          6: { size: '4mm', comparison: 'lentilha' },
          7: { size: '8mm', comparison: 'mirtilo' },
          8: { size: '1.6cm', comparison: 'framboesa' },
          9: { size: '2.3cm', comparison: 'azeitona' },
          10: { size: '3.1cm', comparison: 'ameixa seca' },
          11: { size: '4.1cm', comparison: 'figo' },
          12: { size: '5.4cm', comparison: 'limão' },
          13: { size: '7.4cm', comparison: 'pêssego' },
          14: { size: '8.7cm', comparison: 'maçã' },
          15: { size: '10.1cm', comparison: 'laranja' },
          16: { size: '11.6cm', comparison: 'abacate' },
          17: { size: '13cm', comparison: 'pera' },
          18: { size: '14.2cm', comparison: 'batata doce' },
          19: { size: '15.3cm', comparison: 'manga' },
          20: { size: '25.6cm', comparison: 'banana' },
          24: { size: '30cm', comparison: 'milho' },
          28: { size: '37.6cm', comparison: 'berinjela' },
          32: { size: '42.4cm', comparison: 'abóbora' },
          36: { size: '47.4cm', comparison: 'melão' },
          40: { size: '51.2cm', comparison: 'melancia pequena' },
        }
        
        const weekForSize = Object.keys(babySizes)
          .map(Number)
          .filter(w => w <= currentWeek)
          .pop() || 4

        pregnancy = {
          isPregnant: true,
          currentWeek,
          dueDate: dueDate.toISOString(),
          trimester,
          daysUntilDue: Math.max(0, daysUntilDue),
          babySize: babySizes[weekForSize]?.size || '?',
          babySizeComparison: babySizes[weekForSize]?.comparison || 'semente'
        }
      }

      // Calorias de hoje
      const caloriesToday = (mealsToday || []).reduce((sum, m) => sum + (m.calories || 0), 0)

      // Dicas do dia
      const tips = [
        'Beba água regularmente! A hidratação ajuda na digestão e energia.',
        'Inclua vegetais coloridos em suas refeições para mais nutrientes.',
        'Pequenas caminhadas após as refeições ajudam na digestão.',
        'Durma bem! O sono é essencial para a recuperação do corpo.',
        'Prefira alimentos integrais aos refinados.',
        'Faça pausas para alongamento durante o trabalho.',
        'Mastigue bem os alimentos para melhor absorção.',
        'Evite alimentos ultraprocessados.',
      ]
      const dailyTip = tips[new Date().getDate() % tips.length]

      setData({
        user: userData,
        stats: {
          streak: pointsData?.current_streak || 0,
          points: pointsData?.total_points || 0,
          level: Math.floor((pointsData?.total_points || 0) / 500) + 1,
          workoutsThisWeek: workoutsWeek || 0,
          workoutsTotal: workoutsTotal || 0,
          mealsToday: mealsToday?.length || 0,
          waterToday,
          waterGoal: 2000,
          caloriesTotal: caloriesToday,
          caloriesGoal: userData?.phase === 'PREGNANT' ? 2300 : 2000
        },
        pregnancy,
        todayWorkout: null,
        todayMeals: mealsToday || [],
        upcomingAppointments: appointments || [],
        recentAchievements: achievements || [],
        dailyTip
      })

    } catch (e) {
      console.error('Erro ao carregar dashboard:', e)
    } finally {
      setLoading(false)
    }
  }

  const addWater = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('water_intake').insert({
        user_id: user.id,
        amount: waterAmount
      })

      // Atualizar estado local
      setData(prev => prev ? {
        ...prev,
        stats: {
          ...prev.stats,
          waterToday: prev.stats.waterToday + waterAmount
        }
      } : null)

    } catch (e) {
      console.error(e)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Erro ao carregar dados</p>
      </div>
    )
  }

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bom dia'
    if (hour < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  const waterPercentage = Math.min((data.stats.waterToday / data.stats.waterGoal) * 100, 100)
  const caloriesPercentage = Math.min((data.stats.caloriesTotal / data.stats.caloriesGoal) * 100, 100)

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-500 to-primary-600 text-white px-4 pt-6 pb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-white/80">{greeting()},</p>
            <h1 className="text-2xl font-bold">{data.user?.name?.split(' ')[0] || 'Usuária'}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/achievements" className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </Link>
            <Link href="/notifications" className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <Flame className="w-5 h-5 mx-auto mb-1" />
            <p className="text-lg font-bold">{data.stats.streak}</p>
            <p className="text-xs text-white/70">Dias</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <Star className="w-5 h-5 mx-auto mb-1" />
            <p className="text-lg font-bold">{data.stats.points}</p>
            <p className="text-xs text-white/70">Pontos</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <Dumbbell className="w-5 h-5 mx-auto mb-1" />
            <p className="text-lg font-bold">{data.stats.workoutsThisWeek}</p>
            <p className="text-xs text-white/70">Semana</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <Target className="w-5 h-5 mx-auto mb-1" />
            <p className="text-lg font-bold">Nv {data.stats.level}</p>
            <p className="text-xs text-white/70">Nível</p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Card de Gravidez */}
        {data.pregnancy && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl p-5 text-white shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Baby className="w-5 h-5" />
                  <span className="text-sm font-medium">Semana {data.pregnancy.currentWeek}</span>
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                    {data.pregnancy.trimester}º Trimestre
                  </span>
                </div>
                <h2 className="text-2xl font-bold mb-1">
                  {data.pregnancy.daysUntilDue} dias para o parto
                </h2>
                <p className="text-white/80 text-sm">
                  Seu bebê tem aproximadamente {data.pregnancy.babySize} - tamanho de um(a) {data.pregnancy.babySizeComparison}! 🍼
                </p>
              </div>
              <div className="text-5xl">👶</div>
            </div>
            <Link 
              href="/baby-development" 
              className="mt-4 inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl text-sm hover:bg-white/30 transition"
            >
              Ver desenvolvimento
              <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>
        )}

        {/* Card AI Chat */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Assistente Vita</h3>
              <p className="text-sm text-gray-500">Como posso ajudar hoje?</p>
            </div>
            <Link href="/chat" className="btn-primary px-4 py-2 rounded-xl text-sm">
              Conversar
            </Link>
          </div>
        </motion.div>

        {/* Hidratação e Calorias */}
        <div className="grid grid-cols-2 gap-4">
          {/* Água */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Droplets className="w-5 h-5 text-blue-500" />
                <span className="font-medium text-sm">Água</span>
              </div>
              <span className="text-xs text-gray-500">{data.stats.waterToday}ml / {data.stats.waterGoal}ml</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-400 to-cyan-400"
                initial={{ width: 0 }}
                animate={{ width: `${waterPercentage}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <div className="flex gap-2">
              <select
                value={waterAmount}
                onChange={(e) => setWaterAmount(Number(e.target.value))}
                className="flex-1 text-sm border rounded-lg px-2 py-1"
              >
                <option value={150}>150ml</option>
                <option value={200}>200ml</option>
                <option value={250}>250ml</option>
                <option value={300}>300ml</option>
                <option value={500}>500ml</option>
              </select>
              <button onClick={addWater} className="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </motion.div>

          {/* Calorias */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Utensils className="w-5 h-5 text-orange-500" />
                <span className="font-medium text-sm">Calorias</span>
              </div>
              <span className="text-xs text-gray-500">{data.stats.caloriesTotal} / {data.stats.caloriesGoal}</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
              <motion.div
                className={`h-full ${caloriesPercentage > 100 ? 'bg-red-400' : 'bg-gradient-to-r from-orange-400 to-yellow-400'}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(caloriesPercentage, 100)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <Link href="/nutrition" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
              Registrar refeição <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>

        {/* Refeições de Hoje */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Apple className="w-5 h-5 text-green-500" />
              Refeições Hoje
            </h3>
            <Link href="/meal-plan" className="text-sm text-primary-600 hover:underline">
              Ver plano
            </Link>
          </div>
          
          {data.todayMeals.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Utensils className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma refeição registrada hoje</p>
              <Link href="/nutrition" className="text-primary-600 text-sm mt-2 inline-block">
                Registrar agora
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {data.todayMeals.slice(0, 3).map((meal, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {meal.meal_type === 'breakfast' ? '🌅' : 
                       meal.meal_type === 'lunch' ? '☀️' : 
                       meal.meal_type === 'dinner' ? '🌙' : '🍎'}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{meal.name}</p>
                      <p className="text-xs text-gray-500">{meal.calories || 0} kcal</p>
                    </div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Próximas Consultas */}
        {data.upcomingAppointments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-500" />
                Próximas Consultas
              </h3>
              <Link href="/appointments" className="text-sm text-primary-600 hover:underline">
                Ver todas
              </Link>
            </div>
            <div className="space-y-2">
              {data.upcomingAppointments.map((apt, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
                  <div>
                    <p className="font-medium text-sm">{apt.title}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(apt.date).toLocaleDateString('pt-BR')} às {apt.time}
                    </p>
                  </div>
                  <span className="text-sm text-purple-600">{apt.doctor}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Ações Rápidas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <h3 className="font-semibold mb-3">Acesso Rápido</h3>
          <div className="grid grid-cols-4 gap-3">
            {[
              { href: '/workout', icon: Dumbbell, label: 'Treinos', color: 'bg-orange-100 text-orange-600' },
              { href: '/meal-plan', icon: Utensils, label: 'Cardápio', color: 'bg-green-100 text-green-600' },
              { href: '/scanner', icon: Camera, label: 'Scanner', color: 'bg-purple-100 text-purple-600' },
              { href: '/shopping', icon: ShoppingCart, label: 'Compras', color: 'bg-pink-100 text-pink-600' },
              { href: '/recipes', icon: BookOpen, label: 'Receitas', color: 'bg-amber-100 text-amber-600' },
              { href: '/content', icon: Sparkles, label: 'Conteúdo', color: 'bg-blue-100 text-blue-600' },
              { href: '/progress', icon: TrendingUp, label: 'Progresso', color: 'bg-indigo-100 text-indigo-600' },
              { href: '/profile', icon: Heart, label: 'Perfil', color: 'bg-rose-100 text-rose-600' },
            ].map((item, i) => (
              <Link
                key={i}
                href={item.href}
                className="flex flex-col items-center p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition"
              >
                <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center mb-2`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-gray-700">{item.label}</span>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Dica do Dia */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-4"
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <h4 className="font-semibold text-amber-800">Dica do Dia</h4>
              <p className="text-sm text-amber-700 mt-1">{data.dailyTip}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
