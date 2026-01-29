'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Heart, Apple, Dumbbell, MessageCircle, TrendingUp,
  ChevronRight, Sparkles, Calendar, Bell, Trophy, Camera,
  ShoppingCart, BookOpen, Star, Flame, Target, Droplets,
  Baby, Clock, CheckCircle, AlertCircle, Plus, ArrowRight,
  Utensils, Moon, Sun, Activity
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface UserData {
  id: string
  name: string
  phase: string
  last_menstrual_date?: string
  due_date?: string
  baby_birth_date?: string
  daily_water_goal?: number
  daily_calories_goal?: number
}

interface DashboardStats {
  streak: number
  points: number
  level: number
  workoutsTotal: number
  workoutsThisWeek: number
  mealsToday: number
  waterToday: number
  waterGoal: number
  caloriesTotal: number
  caloriesGoal: number
  gestationWeek?: number
  gestationDay?: number
  daysUntilDue?: number
  nextAppointment?: { title: string; date: string }
  todayWorkout: boolean
  achievements: number
  dailyChallengesCompleted: number
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    streak: 0, points: 0, level: 1, workoutsTotal: 0, workoutsThisWeek: 0,
    mealsToday: 0, waterToday: 0, waterGoal: 2000, caloriesTotal: 0,
    caloriesGoal: 2000, todayWorkout: false, achievements: 0, dailyChallengesCompleted: 0
  })

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { setLoading(false); return }

      // Carregar perfil do usuário
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      setUser(userData)

      const today = new Date().toISOString().split('T')[0]
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      // Carregar pontos e streak
      const { data: pointsData } = await supabase
        .from('user_points')
        .select('total_points, current_streak')
        .eq('user_id', authUser.id)
        .single()

      // Treinos totais
      const { count: workoutsTotal } = await supabase
        .from('workouts')
        .select('id', { count: 'exact' })
        .eq('user_id', authUser.id)
        .eq('completed', true)

      // Treinos esta semana
      const { count: workoutsThisWeek } = await supabase
        .from('workouts')
        .select('id', { count: 'exact' })
        .eq('user_id', authUser.id)
        .eq('completed', true)
        .gte('created_at', weekAgo)

      // Treino de hoje
      const { count: todayWorkoutCount } = await supabase
        .from('workouts')
        .select('id', { count: 'exact' })
        .eq('user_id', authUser.id)
        .eq('completed', true)
        .gte('created_at', today)

      // Refeições de hoje
      const { data: mealsToday } = await supabase
        .from('meals')
        .select('calories')
        .eq('user_id', authUser.id)
        .gte('created_at', today)

      // Água de hoje
      const { data: waterToday } = await supabase
        .from('water_intake')
        .select('amount')
        .eq('user_id', authUser.id)
        .gte('created_at', today)

      // Conquistas desbloqueadas
      const { count: achievementsCount } = await supabase
        .from('user_achievements')
        .select('id', { count: 'exact' })
        .eq('user_id', authUser.id)

      // Próxima consulta
      const { data: nextAppt } = await supabase
        .from('appointments')
        .select('title, date')
        .eq('user_id', authUser.id)
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(1)
        .single()

      // Calcular semana gestacional
      let gestationWeek, gestationDay, daysUntilDue
      if (userData?.phase === 'PREGNANT' && userData?.last_menstrual_date) {
        const dum = new Date(userData.last_menstrual_date)
        const diffMs = Date.now() - dum.getTime()
        const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
        gestationWeek = Math.floor(totalDays / 7)
        gestationDay = totalDays % 7
        daysUntilDue = 280 - totalDays
      }

      const totalWater = (waterToday || []).reduce((sum, w) => sum + (w.amount || 0), 0)
      const totalCalories = (mealsToday || []).reduce((sum, m) => sum + (m.calories || 0), 0)
      const totalPoints = pointsData?.total_points || 0

      setStats({
        streak: pointsData?.current_streak || 0,
        points: totalPoints,
        level: Math.floor(totalPoints / 500) + 1,
        workoutsTotal: workoutsTotal || 0,
        workoutsThisWeek: workoutsThisWeek || 0,
        mealsToday: mealsToday?.length || 0,
        waterToday: totalWater,
        waterGoal: userData?.daily_water_goal || 2000,
        caloriesTotal: totalCalories,
        caloriesGoal: userData?.daily_calories_goal || 2000,
        gestationWeek,
        gestationDay,
        daysUntilDue,
        nextAppointment: nextAppt ? { title: nextAppt.title, date: nextAppt.date } : undefined,
        todayWorkout: (todayWorkoutCount || 0) > 0,
        achievements: achievementsCount || 0,
        dailyChallengesCompleted: 0
      })

    } catch (e) {
      console.error('Erro ao carregar dashboard:', e)
    } finally {
      setLoading(false)
    }
  }

  const addWater = async (amount: number) => {
    try {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return

      await supabase.from('water_intake').insert({
        user_id: authUser.id,
        amount,
        created_at: new Date().toISOString()
      })

      setStats(prev => ({ ...prev, waterToday: prev.waterToday + amount }))
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    )
  }

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bom dia'
    if (hour < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  const waterPercentage = Math.min((stats.waterToday / stats.waterGoal) * 100, 100)
  const caloriesPercentage = Math.min((stats.caloriesTotal / stats.caloriesGoal) * 100, 100)

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white px-4 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm">{greeting()},</p>
            <h1 className="text-xl font-bold text-gray-900">
              {user?.name?.split(' ')[0] || 'Usuária'} 💜
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/achievements" className="p-2.5 bg-yellow-50 rounded-xl hover:bg-yellow-100 transition-colors">
              <Trophy className="w-5 h-5 text-yellow-600" />
            </Link>
            <Link href="/notifications" className="p-2.5 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors">
              <Bell className="w-5 h-5 text-primary-600" />
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Card Gestação (se gestante) */}
        {user?.phase === 'PREGNANT' && stats.gestationWeek !== undefined && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl p-5 text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Baby className="w-5 h-5" />
                  <span className="text-sm font-medium opacity-90">Sua Gestação</span>
                </div>
                <h2 className="text-3xl font-bold">
                  {stats.gestationWeek} semanas {stats.gestationDay ? `e ${stats.gestationDay} dias` : ''}
                </h2>
                {stats.daysUntilDue && stats.daysUntilDue > 0 && (
                  <p className="text-white/80 text-sm mt-1">
                    🎀 Faltam {stats.daysUntilDue} dias para conhecer seu bebê!
                  </p>
                )}
              </div>
              <Link 
                href="/baby-development"
                className="bg-white/20 hover:bg-white/30 p-3 rounded-xl transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </Link>
            </div>
            <div className="mt-4 flex gap-2">
              <Link href="/contractions" className="flex-1 bg-white/20 hover:bg-white/30 rounded-xl p-3 text-center text-sm transition-colors">
                ⏱️ Contrações
              </Link>
              <Link href="/maternity-bag" className="flex-1 bg-white/20 hover:bg-white/30 rounded-xl p-3 text-center text-sm transition-colors">
                👜 Mala Maternidade
              </Link>
            </div>
          </motion.div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-3 text-center shadow-sm"
          >
            <Flame className="w-5 h-5 mx-auto mb-1 text-orange-500" />
            <p className="text-lg font-bold">{stats.streak}</p>
            <p className="text-xs text-gray-500">Sequência</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-xl p-3 text-center shadow-sm"
          >
            <Star className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
            <p className="text-lg font-bold">{stats.points}</p>
            <p className="text-xs text-gray-500">Pontos</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-3 text-center shadow-sm"
          >
            <Target className="w-5 h-5 mx-auto mb-1 text-green-500" />
            <p className="text-lg font-bold">Nv. {stats.level}</p>
            <p className="text-xs text-gray-500">Nível</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-xl p-3 text-center shadow-sm"
          >
            <Dumbbell className="w-5 h-5 mx-auto mb-1 text-primary-500" />
            <p className="text-lg font-bold">{stats.workoutsThisWeek}</p>
            <p className="text-xs text-gray-500">Semana</p>
          </motion.div>
        </div>

        {/* Progresso do Dia */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Água */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Droplets className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Hidratação</h3>
                  <p className="text-xs text-gray-500">{stats.waterToday}ml / {stats.waterGoal}ml</p>
                </div>
              </div>
              <span className="text-lg font-bold text-blue-600">{Math.round(waterPercentage)}%</span>
            </div>
            <div className="h-3 bg-blue-100 rounded-full overflow-hidden mb-3">
              <motion.div 
                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${waterPercentage}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <div className="flex gap-2">
              {[200, 300, 500].map(ml => (
                <button
                  key={ml}
                  onClick={() => addWater(ml)}
                  className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm font-medium text-blue-700 transition-colors"
                >
                  +{ml}ml
                </button>
              ))}
            </div>
          </motion.div>

          {/* Calorias */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <Utensils className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Alimentação</h3>
                  <p className="text-xs text-gray-500">{stats.caloriesTotal} / {stats.caloriesGoal} kcal</p>
                </div>
              </div>
              <span className="text-lg font-bold text-green-600">{stats.mealsToday} refeições</span>
            </div>
            <div className="h-3 bg-green-100 rounded-full overflow-hidden mb-3">
              <motion.div 
                className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${caloriesPercentage}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <Link 
              href="/meal-plan"
              className="block w-full py-2 bg-green-50 hover:bg-green-100 rounded-lg text-sm font-medium text-green-700 text-center transition-colors"
            >
              Ver Plano Alimentar
            </Link>
          </motion.div>
        </div>

        {/* Próxima Consulta */}
        {stats.nextAppointment && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-purple-50 border border-purple-200 rounded-2xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-200 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-700" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-purple-600 font-medium">PRÓXIMA CONSULTA</p>
                <h4 className="font-semibold text-purple-900">{stats.nextAppointment.title}</h4>
                <p className="text-sm text-purple-700">
                  {new Date(stats.nextAppointment.date).toLocaleDateString('pt-BR', { 
                    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
              <Link href="/appointments" className="p-2 hover:bg-purple-200 rounded-lg transition-colors">
                <ChevronRight className="w-5 h-5 text-purple-600" />
              </Link>
            </div>
          </motion.div>
        )}

        {/* Treino do Dia */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl p-4 ${stats.todayWorkout ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stats.todayWorkout ? 'bg-green-200' : 'bg-orange-200'}`}>
              {stats.todayWorkout ? (
                <CheckCircle className="w-6 h-6 text-green-700" />
              ) : (
                <Dumbbell className="w-6 h-6 text-orange-700" />
              )}
            </div>
            <div className="flex-1">
              <h4 className={`font-semibold ${stats.todayWorkout ? 'text-green-900' : 'text-orange-900'}`}>
                {stats.todayWorkout ? 'Treino Concluído! 🎉' : 'Você ainda não treinou hoje'}
              </h4>
              <p className={`text-sm ${stats.todayWorkout ? 'text-green-700' : 'text-orange-700'}`}>
                {stats.todayWorkout 
                  ? `${stats.workoutsTotal} treinos no total` 
                  : 'Que tal fazer um exercício agora?'}
              </p>
            </div>
            <Link 
              href="/workout" 
              className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                stats.todayWorkout 
                  ? 'bg-green-200 hover:bg-green-300 text-green-800' 
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
              }`}
            >
              {stats.todayWorkout ? 'Ver Treinos' : 'Treinar Agora'}
            </Link>
          </div>
        </motion.div>

        {/* AI Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-5 text-white"
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Vita - Sua Assistente</h3>
              <p className="text-white/80 text-sm mb-3">
                Tire dúvidas, peça receitas, dicas de exercícios ou converse sobre sua saúde.
              </p>
              <Link
                href="/chat"
                className="inline-flex items-center gap-2 bg-white text-primary-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-white/90 transition-colors"
              >
                Conversar Agora
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/meal-plan" className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-center">
            <div className="w-12 h-12 mx-auto mb-2 bg-green-100 rounded-xl flex items-center justify-center">
              <Apple className="w-6 h-6 text-green-600" />
            </div>
            <p className="font-medium text-sm">Plano Alimentar</p>
          </Link>
          
          <Link href="/recipes" className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-center">
            <div className="w-12 h-12 mx-auto mb-2 bg-orange-100 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-orange-600" />
            </div>
            <p className="font-medium text-sm">Receitas</p>
          </Link>
          
          <Link href="/scanner" className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-center">
            <div className="w-12 h-12 mx-auto mb-2 bg-purple-100 rounded-xl flex items-center justify-center">
              <Camera className="w-6 h-6 text-purple-600" />
            </div>
            <p className="font-medium text-sm">Scanner</p>
          </Link>
          
          <Link href="/shopping" className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-center">
            <div className="w-12 h-12 mx-auto mb-2 bg-pink-100 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-pink-600" />
            </div>
            <p className="font-medium text-sm">Compras</p>
          </Link>
        </div>

        {/* More Links */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <Link href="/progress" className="flex items-center gap-4 p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <span className="flex-1 font-medium">Meu Progresso</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
          <Link href="/content" className="flex items-center gap-4 p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <span className="flex-1 font-medium">Conteúdo Educativo</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
          <Link href="/appointments" className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
            <Calendar className="w-5 h-5 text-cyan-600" />
            <span className="flex-1 font-medium">Minhas Consultas</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
        </div>
      </div>
    </div>
  )
}
