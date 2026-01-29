'use client'

import { useState, useEffect } from 'react'
import { Trophy, Star, Flame, Target, Dumbbell, Apple, Droplets, ArrowLeft, Lock, Check, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  points: number
  category: string
  requirement: number
  rarity: string
  unlocked?: boolean
  progress?: number
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-workout', name: 'Primeiro Passo', description: 'Complete seu primeiro treino', icon: '🎯', points: 50, category: 'Treino', requirement: 1, rarity: 'comum' },
  { id: 'workout-5', name: 'Pegando o Ritmo', description: 'Complete 5 treinos', icon: '💪', points: 100, category: 'Treino', requirement: 5, rarity: 'comum' },
  { id: 'workout-20', name: 'Atleta Dedicada', description: 'Complete 20 treinos', icon: '🏃‍♀️', points: 250, category: 'Treino', requirement: 20, rarity: 'raro' },
  { id: 'workout-50', name: 'Guerreira Fitness', description: 'Complete 50 treinos', icon: '🦸‍♀️', points: 500, category: 'Treino', requirement: 50, rarity: 'épico' },
  { id: 'streak-3', name: 'Consistência', description: 'Mantenha 3 dias de sequência', icon: '🔥', points: 75, category: 'Sequência', requirement: 3, rarity: 'comum' },
  { id: 'streak-7', name: 'Semana Perfeita', description: 'Mantenha 7 dias de sequência', icon: '⭐', points: 200, category: 'Sequência', requirement: 7, rarity: 'raro' },
  { id: 'streak-30', name: 'Mês Imbatível', description: 'Mantenha 30 dias', icon: '🏆', points: 750, category: 'Sequência', requirement: 30, rarity: 'épico' },
  { id: 'meals-10', name: 'Diário Alimentar', description: 'Registre 10 refeições', icon: '🥗', points: 50, category: 'Nutrição', requirement: 10, rarity: 'comum' },
  { id: 'water-7', name: 'Hidratada', description: 'Bata a meta de água 7 dias', icon: '💧', points: 100, category: 'Nutrição', requirement: 7, rarity: 'comum' },
  { id: 'pregnant-workout', name: 'Mamãe Fitness', description: 'Complete 1 treino de gestante', icon: '🤰', points: 100, category: 'Gestante', requirement: 1, rarity: 'comum' },
  { id: 'scanner-first', name: 'Detetive Nutricional', description: 'Use o scanner', icon: '📷', points: 50, category: 'App', requirement: 1, rarity: 'comum' },
]

interface Challenge {
  id: string
  name: string
  description: string
  icon: string
  points: number
  type: string
  target: number
  current: number
}

export default function AchievementsPage() {
  const [stats, setStats] = useState({ points: 0, level: 1, streak: 0, achievements: 0 })
  const [achievements, setAchievements] = useState<Achievement[]>(ACHIEVEMENTS)
  const [challenges, setChallenges] = useState<Challenge[]>([
    { id: 'daily-water', name: 'Hidratação', description: 'Beba 2L de água', icon: '💧', points: 20, type: 'daily', target: 2000, current: 0 },
    { id: 'daily-workout', name: 'Movimento', description: 'Faça 1 treino', icon: '🏃‍♀️', points: 30, type: 'daily', target: 1, current: 0 },
    { id: 'daily-meals', name: 'Alimentação', description: 'Registre 3 refeições', icon: '🍽️', points: 25, type: 'daily', target: 3, current: 0 },
  ])
  const [tab, setTab] = useState<'conquistas' | 'desafios'>('conquistas')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date().toISOString().split('T')[0]

      const [pointsRes, workoutsRes, unlockedRes, mealsRes, waterRes, todayWorkoutsRes] = await Promise.all([
        supabase.from('user_points').select('total_points, current_streak').eq('user_id', user.id).single(),
        supabase.from('workouts').select('id', { count: 'exact' }).eq('user_id', user.id).eq('completed', true),
        supabase.from('user_achievements').select('achievement_id').eq('user_id', user.id),
        supabase.from('meals').select('id').eq('user_id', user.id).gte('created_at', today),
        supabase.from('water_intake').select('amount').eq('user_id', user.id).gte('created_at', today),
        supabase.from('workouts').select('id', { count: 'exact' }).eq('user_id', user.id).eq('completed', true).gte('created_at', today),
      ])

      const unlockedIds = (unlockedRes.data || []).map((u: any) => u.achievement_id)
      const totalPoints = pointsRes.data?.total_points || 0
      const streak = pointsRes.data?.current_streak || 0
      const workouts = workoutsRes.count || 0
      const totalWater = (waterRes.data || []).reduce((sum: number, w: any) => sum + w.amount, 0)

      setStats({ points: totalPoints, level: Math.floor(totalPoints / 500) + 1, streak, achievements: unlockedIds.length })

      setAchievements(prev => prev.map(a => ({
        ...a,
        unlocked: unlockedIds.includes(a.id),
        progress: a.category === 'Treino' ? Math.min(workouts / a.requirement * 100, 100) :
                  a.category === 'Sequência' ? Math.min(streak / a.requirement * 100, 100) : 0
      })))

      setChallenges(prev => prev.map(c => ({
        ...c,
        current: c.id === 'daily-water' ? totalWater : c.id === 'daily-workout' ? (todayWorkoutsRes.count || 0) : c.id === 'daily-meals' ? (mealsRes.data?.length || 0) : 0
      })))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  const categories = [...new Set(ACHIEVEMENTS.map(a => a.category))]

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white px-4 pt-4 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/dashboard" className="p-2 hover:bg-white/10 rounded-xl"><ArrowLeft className="w-5 h-5" /></Link>
          <div><h1 className="text-xl font-bold">Conquistas</h1><p className="text-sm text-white/80">Suas metas e recompensas</p></div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white/10 rounded-xl p-2 text-center">
            <Star className="w-4 h-4 mx-auto mb-1" /><p className="font-bold">{stats.points}</p><p className="text-xs text-white/70">Pontos</p>
          </div>
          <div className="bg-white/10 rounded-xl p-2 text-center">
            <TrendingUp className="w-4 h-4 mx-auto mb-1" /><p className="font-bold">Nv.{stats.level}</p><p className="text-xs text-white/70">Nível</p>
          </div>
          <div className="bg-white/10 rounded-xl p-2 text-center">
            <Flame className="w-4 h-4 mx-auto mb-1" /><p className="font-bold">{stats.streak}</p><p className="text-xs text-white/70">Dias</p>
          </div>
          <div className="bg-white/10 rounded-xl p-2 text-center">
            <Trophy className="w-4 h-4 mx-auto mb-1" /><p className="font-bold">{stats.achievements}</p><p className="text-xs text-white/70">Conquistas</p>
          </div>
        </div>
      </header>

      <div className="px-4 -mt-3">
        <div className="bg-white rounded-xl p-1 shadow-sm mb-4 flex">
          <button onClick={() => setTab('conquistas')} className={`flex-1 py-2 rounded-lg font-medium text-sm ${tab === 'conquistas' ? 'bg-primary-500 text-white' : 'text-gray-600'}`}>
            🏆 Conquistas
          </button>
          <button onClick={() => setTab('desafios')} className={`flex-1 py-2 rounded-lg font-medium text-sm ${tab === 'desafios' ? 'bg-primary-500 text-white' : 'text-gray-600'}`}>
            🎯 Desafios
          </button>
        </div>

        {tab === 'conquistas' ? (
          <div className="space-y-4">
            {categories.map(cat => (
              <div key={cat}>
                <h3 className="font-bold mb-2">{cat}</h3>
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                  {achievements.filter(a => a.category === cat).map(a => (
                    <div key={a.id} className={`bg-white rounded-xl p-3 border-2 ${a.unlocked ? 'border-green-400' : 'border-gray-200 opacity-60'}`}>
                      <div className="flex items-center gap-3">
                        <span className={`text-2xl ${!a.unlocked && 'grayscale'}`}>{a.unlocked ? a.icon : '🔒'}</span>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">{a.name}</h4>
                          <p className="text-xs text-gray-500 truncate">{a.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Star className="w-3 h-3 text-yellow-500" />
                            <span className="text-xs font-medium text-yellow-600">{a.points} pts</span>
                          </div>
                        </div>
                        {a.unlocked && <Check className="w-5 h-5 text-green-500" />}
                      </div>
                      {!a.unlocked && a.progress !== undefined && a.progress > 0 && (
                        <div className="mt-2">
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary-500 rounded-full" style={{ width: `${a.progress}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="font-bold">📅 Desafios Diários</h3>
            {challenges.map(c => (
              <div key={c.id} className={`bg-white rounded-xl p-3 border-2 ${c.current >= c.target ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{c.icon}</span>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">{c.name}</h4>
                    <p className="text-xs text-gray-500">{c.description}</p>
                    <div className="mt-2">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${c.current >= c.target ? 'bg-green-500' : 'bg-primary-500'}`} style={{ width: `${Math.min((c.current / c.target) * 100, 100)}%` }} />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{c.current} / {c.target}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-yellow-600">+{c.points}</p>
                    {c.current >= c.target && <Check className="w-5 h-5 text-green-500" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
