'use client'

import { useState, useEffect } from 'react'
import { 
  Heart, Apple, Dumbbell, TrendingUp, ChevronRight, Sparkles, 
  Calendar, Bell, Trophy, Camera, ShoppingCart, BookOpen, 
  Star, Flame, Target, Droplets, Baby, Clock, Plus, Watch,
  Users, Zap, ScanLine
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    streak: 0, points: 0, level: 1, workoutsThisWeek: 0,
    waterToday: 0, waterGoal: 2000, caloriesTotal: 0, caloriesGoal: 2000,
    gestationWeek: 0, daysUntilDue: 0
  })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { setLoading(false); return }

      const { data: userData } = await supabase.from('users').select('*').eq('id', authUser.id).single()
      setUser(userData)

      const today = new Date().toISOString().split('T')[0]
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const [pointsRes, workoutsRes, mealsRes, waterRes] = await Promise.all([
        supabase.from('user_points').select('total_points, current_streak').eq('user_id', authUser.id).single(),
        supabase.from('workouts').select('id', { count: 'exact' }).eq('user_id', authUser.id).eq('completed', true).gte('created_at', weekAgo),
        supabase.from('meals').select('calories').eq('user_id', authUser.id).gte('created_at', today),
        supabase.from('water_intake').select('amount').eq('user_id', authUser.id).gte('created_at', today)
      ])

      let gestationWeek = 0, daysUntilDue = 0
      if (userData?.phase === 'PREGNANT' && userData?.last_menstrual_date) {
        const dum = new Date(userData.last_menstrual_date)
        const totalDays = Math.floor((Date.now() - dum.getTime()) / (1000 * 60 * 60 * 24))
        gestationWeek = Math.floor(totalDays / 7)
        daysUntilDue = Math.max(0, 280 - totalDays)
      }

      const totalWater = (waterRes.data || []).reduce((sum: number, w: any) => sum + (w.amount || 0), 0)
      const totalCalories = (mealsRes.data || []).reduce((sum: number, m: any) => sum + (m.calories || 0), 0)
      const totalPoints = pointsRes.data?.total_points || 0

      // Update streak on daily visit
      const lastVisit = localStorage.getItem('vitafit-last-visit')
      const todayStr = new Date().toDateString()
      if (lastVisit !== todayStr) {
        localStorage.setItem('vitafit-last-visit', todayStr)
        fetch('/api/gamification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: authUser.id, action: 'updateStreak' })
        }).catch(() => {})
      }

      setStats({
        streak: pointsRes.data?.current_streak || 0,
        points: totalPoints,
        level: Math.floor(totalPoints / 100) + 1,
        workoutsThisWeek: workoutsRes.count || 0,
        waterToday: totalWater,
        waterGoal: userData?.daily_water_goal || 2000,
        caloriesTotal: totalCalories,
        caloriesGoal: userData?.daily_calories_goal || 2000,
        gestationWeek, daysUntilDue
      })
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const addWater = async (amount: number) => {
    try {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return
      await supabase.from('water_intake').insert({ user_id: authUser.id, amount })
      setStats(prev => ({ ...prev, waterToday: prev.waterToday + amount }))

      // Award points
      fetch('/api/gamification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authUser.id, action: 'addPoints', points: 2, reason: 'Registrou água', category: 'nutrition' })
      }).catch(() => {})
    } catch (e) { console.error(e) }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bom dia'
    if (hour < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  const waterPct = Math.min((stats.waterToday / stats.waterGoal) * 100, 100)
  const calPct = Math.min((stats.caloriesTotal / stats.caloriesGoal) * 100, 100)

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white px-4 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm">{greeting()},</p>
            <h1 className="text-xl font-bold">{user?.name?.split(' ')[0] || 'Usuária'} 💜</h1>
          </div>
          <div className="flex gap-2">
            <Link href="/achievements" className="p-2.5 bg-yellow-50 rounded-xl relative">
              <Trophy className="w-5 h-5 text-yellow-600" />
              {stats.points > 0 && (
                <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {stats.level}
                </span>
              )}
            </Link>
            <Link href="/notifications" className="p-2.5 bg-primary-50 rounded-xl">
              <Bell className="w-5 h-5 text-primary-600" />
            </Link>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Gestação */}
        {user?.phase === 'PREGNANT' && stats.gestationWeek > 0 && (
          <Link href="/baby-development" className="block">
            <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Baby className="w-5 h-5" />
                    <span className="text-sm opacity-90">Sua Gestação</span>
                  </div>
                  <h2 className="text-2xl font-bold">{stats.gestationWeek} semanas</h2>
                  <p className="text-white/80 text-sm">Faltam {stats.daysUntilDue} dias 🎀</p>
                </div>
                <div className="bg-white/20 p-3 rounded-xl">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-2">
          <Link href="/achievements" className="bg-white rounded-xl p-3 text-center shadow-sm">
            <Flame className="w-5 h-5 mx-auto mb-1 text-orange-500" />
            <p className="text-lg font-bold">{stats.streak}</p>
            <p className="text-xs text-gray-500">Dias</p>
          </Link>
          <Link href="/achievements" className="bg-white rounded-xl p-3 text-center shadow-sm">
            <Star className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
            <p className="text-lg font-bold">{stats.points}</p>
            <p className="text-xs text-gray-500">Pontos</p>
          </Link>
          <Link href="/achievements" className="bg-white rounded-xl p-3 text-center shadow-sm">
            <Target className="w-5 h-5 mx-auto mb-1 text-green-500" />
            <p className="text-lg font-bold">Nv.{stats.level}</p>
            <p className="text-xs text-gray-500">Nível</p>
          </Link>
          <Link href="/workout" className="bg-white rounded-xl p-3 text-center shadow-sm">
            <Dumbbell className="w-5 h-5 mx-auto mb-1 text-primary-500" />
            <p className="text-lg font-bold">{stats.workoutsThisWeek}</p>
            <p className="text-xs text-gray-500">Treinos</p>
          </Link>
        </div>

        {/* Água e Calorias */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Droplets className="w-5 h-5 text-blue-500" />
              <span className="font-semibold text-sm">Água</span>
            </div>
            <p className="text-xs text-gray-500 mb-2">{stats.waterToday}ml / {stats.waterGoal}ml</p>
            <div className="h-2 bg-blue-100 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${waterPct}%` }} />
            </div>
            <div className="flex gap-1">
              {[200, 300].map(ml => (
                <button key={ml} onClick={() => addWater(ml)} className="flex-1 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium">
                  +{ml}ml
                </button>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Apple className="w-5 h-5 text-green-500" />
              <span className="font-semibold text-sm">Calorias</span>
            </div>
            <p className="text-xs text-gray-500 mb-2">{stats.caloriesTotal} / {stats.caloriesGoal} kcal</p>
            <div className="h-2 bg-green-100 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${calPct}%` }} />
            </div>
            <Link href="/nutrition" className="block w-full py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-medium text-center">
              Ver Plano
            </Link>
          </div>
        </div>

        {/* AI Card */}
        <Link href="/chat" className="block">
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold">Vita - Sua Assistente IA</h3>
                <p className="text-white/80 text-sm">Tire dúvidas e peça dicas!</p>
              </div>
              <div className="bg-white text-primary-600 px-4 py-2 rounded-xl text-sm font-semibold">
                Chat
              </div>
            </div>
          </div>
        </Link>

        {/* Quick Actions - Primary */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { href: '/workout', icon: Dumbbell, label: 'Treinos', color: 'bg-orange-100 text-orange-600' },
            { href: '/nutrition', icon: Apple, label: 'Nutrição', color: 'bg-green-100 text-green-600' },
            { href: '/scanner', icon: ScanLine, label: 'Scanner', color: 'bg-purple-100 text-purple-600' },
            { href: '/shopping', icon: ShoppingCart, label: 'Compras', color: 'bg-pink-100 text-pink-600' },
          ].map(item => (
            <Link key={item.href} href={item.href} className="bg-white rounded-xl p-3 shadow-sm text-center active:scale-95 transition-transform">
              <div className={`w-10 h-10 mx-auto mb-1 ${item.color} rounded-xl flex items-center justify-center`}>
                <item.icon className="w-5 h-5" />
              </div>
              <p className="text-xs font-medium">{item.label}</p>
            </Link>
          ))}
        </div>

        {/* Quick Actions - Secondary */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { href: '/community', icon: Users, label: 'Comunidade', color: 'bg-indigo-100 text-indigo-600' },
            { href: '/wearables', icon: Watch, label: 'Wearables', color: 'bg-cyan-100 text-cyan-600' },
            { href: '/achievements', icon: Trophy, label: 'Conquistas', color: 'bg-yellow-100 text-yellow-600' },
            { href: '/content', icon: BookOpen, label: 'Conteúdo', color: 'bg-blue-100 text-blue-600' },
          ].map(item => (
            <Link key={item.href} href={item.href} className="bg-white rounded-xl p-3 shadow-sm text-center active:scale-95 transition-transform">
              <div className={`w-10 h-10 mx-auto mb-1 ${item.color} rounded-xl flex items-center justify-center`}>
                <item.icon className="w-5 h-5" />
              </div>
              <p className="text-xs font-medium">{item.label}</p>
            </Link>
          ))}
        </div>

        {/* More Links */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {[
            { href: '/progress', icon: TrendingUp, label: 'Meu Progresso', color: 'text-indigo-600' },
            { href: '/appointments', icon: Calendar, label: 'Consultas', color: 'text-cyan-600' },
            { href: '/maternity-bag', icon: ShoppingCart, label: 'Mala Maternidade', color: 'text-pink-600' },
            { href: '/baby-names', icon: Heart, label: 'Nomes de Bebê', color: 'text-rose-600' },
            { href: '/contractions', icon: Clock, label: 'Contrações', color: 'text-red-600' },
          ].map(item => (
            <Link key={item.href} href={item.href} className="flex items-center gap-4 p-4 border-b border-gray-100 last:border-0 active:bg-gray-50">
              <item.icon className={`w-5 h-5 ${item.color}`} />
              <span className="flex-1 font-medium">{item.label}</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
