'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Trophy, Star, Flame, Target, Dumbbell, Apple, Droplets,
  ArrowLeft, Lock, Check, Sparkles, TrendingUp, Zap, Heart
} from 'lucide-react'
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
  rarity: 'comum' | 'raro' | 'épico' | 'lendário'
  unlocked?: boolean
  progress?: number
}

interface Challenge {
  id: string
  name: string
  description: string
  icon: string
  points: number
  type: 'daily' | 'weekly'
  target: number
  current: number
  completed: boolean
}

const ACHIEVEMENTS: Achievement[] = [
  // Treino
  { id: 'first-workout', name: 'Primeiro Passo', description: 'Complete seu primeiro treino', icon: '🎯', points: 50, category: 'Treino', requirement: 1, rarity: 'comum' },
  { id: 'workout-5', name: 'Pegando o Ritmo', description: 'Complete 5 treinos', icon: '💪', points: 100, category: 'Treino', requirement: 5, rarity: 'comum' },
  { id: 'workout-20', name: 'Atleta Dedicada', description: 'Complete 20 treinos', icon: '🏃‍♀️', points: 250, category: 'Treino', requirement: 20, rarity: 'raro' },
  { id: 'workout-50', name: 'Guerreira Fitness', description: 'Complete 50 treinos', icon: '🦸‍♀️', points: 500, category: 'Treino', requirement: 50, rarity: 'épico' },
  { id: 'workout-100', name: 'Lenda do Fitness', description: 'Complete 100 treinos', icon: '👑', points: 1000, category: 'Treino', requirement: 100, rarity: 'lendário' },
  
  // Sequência
  { id: 'streak-3', name: 'Consistência', description: 'Mantenha 3 dias de sequência', icon: '🔥', points: 75, category: 'Sequência', requirement: 3, rarity: 'comum' },
  { id: 'streak-7', name: 'Semana Perfeita', description: 'Mantenha 7 dias de sequência', icon: '⭐', points: 200, category: 'Sequência', requirement: 7, rarity: 'raro' },
  { id: 'streak-30', name: 'Mês Imbatível', description: 'Mantenha 30 dias de sequência', icon: '🏆', points: 750, category: 'Sequência', requirement: 30, rarity: 'épico' },
  
  // Nutrição
  { id: 'meals-10', name: 'Diário Alimentar', description: 'Registre 10 refeições', icon: '🥗', points: 50, category: 'Nutrição', requirement: 10, rarity: 'comum' },
  { id: 'meals-50', name: 'Consciente', description: 'Registre 50 refeições', icon: '🍎', points: 150, category: 'Nutrição', requirement: 50, rarity: 'raro' },
  { id: 'water-7', name: 'Hidratada', description: 'Bata a meta de água 7 dias', icon: '💧', points: 100, category: 'Nutrição', requirement: 7, rarity: 'comum' },
  
  // Gestante
  { id: 'pregnant-workout', name: 'Mamãe Fitness', description: 'Complete 1 treino de gestante', icon: '🤰', points: 100, category: 'Gestante', requirement: 1, rarity: 'comum' },
  { id: 'pregnant-10', name: 'Gravidez Ativa', description: 'Complete 10 treinos de gestante', icon: '🌸', points: 300, category: 'Gestante', requirement: 10, rarity: 'raro' },
  
  // App
  { id: 'profile-complete', name: 'Perfil Completo', description: 'Complete seu perfil', icon: '✅', points: 75, category: 'App', requirement: 1, rarity: 'comum' },
  { id: 'scanner-first', name: 'Detetive Nutricional', description: 'Use o scanner pela primeira vez', icon: '📷', points: 50, category: 'App', requirement: 1, rarity: 'comum' },
]

const CHALLENGES: Challenge[] = [
  { id: 'daily-water', name: 'Hidratação', description: 'Beba 2L de água hoje', icon: '💧', points: 20, type: 'daily', target: 2000, current: 0, completed: false },
  { id: 'daily-workout', name: 'Movimento', description: 'Faça 1 treino hoje', icon: '🏃‍♀️', points: 30, type: 'daily', target: 1, current: 0, completed: false },
  { id: 'daily-meals', name: 'Alimentação', description: 'Registre 3 refeições', icon: '🍽️', points: 25, type: 'daily', target: 3, current: 0, completed: false },
  { id: 'weekly-workouts', name: 'Meta Semanal', description: 'Complete 4 treinos esta semana', icon: '💪', points: 150, type: 'weekly', target: 4, current: 0, completed: false },
  { id: 'weekly-streak', name: 'Sequência 5 Dias', description: 'Mantenha 5 dias de sequência', icon: '🔥', points: 200, type: 'weekly', target: 5, current: 0, completed: false },
]

const CATEGORY_COLORS: Record<string, string> = {
  'Treino': 'bg-orange-100 text-orange-700',
  'Sequência': 'bg-red-100 text-red-700',
  'Nutrição': 'bg-green-100 text-green-700',
  'Gestante': 'bg-pink-100 text-pink-700',
  'App': 'bg-blue-100 text-blue-700',
}

const RARITY_COLORS: Record<string, string> = {
  'comum': 'border-gray-300 bg-gray-50',
  'raro': 'border-blue-400 bg-blue-50',
  'épico': 'border-purple-400 bg-purple-50',
  'lendário': 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-100',
}

export default function AchievementsPage() {
  const [stats, setStats] = useState({ points: 0, level: 1, streak: 0, workouts: 0, achievements: 0 })
  const [achievements, setAchievements] = useState<Achievement[]>(ACHIEVEMENTS)
  const [challenges, setChallenges] = useState<Challenge[]>(CHALLENGES)
  const [activeTab, setActiveTab] = useState<'conquistas' | 'desafios'>('conquistas')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Carregar pontos
      const { data: pointsData } = await supabase
        .from('user_points')
        .select('total_points, current_streak')
        .eq('user_id', user.id)
        .single()

      // Contar treinos
      const { count: workoutCount } = await supabase
        .from('workouts')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('completed', true)

      // Conquistas desbloqueadas
      const { data: unlockedData } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', user.id)

      const unlockedIds = (unlockedData || []).map(u => u.achievement_id)

      // Dados de hoje para desafios
      const today = new Date().toISOString().split('T')[0]
      const { data: todayMeals } = await supabase
        .from('meals')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', today)

      const { data: todayWater } = await supabase
        .from('water_intake')
        .select('amount')
        .eq('user_id', user.id)
        .gte('created_at', today)

      const { count: todayWorkouts } = await supabase
        .from('workouts')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('completed', true)
        .gte('created_at', today)

      // Treinos da semana
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { count: weekWorkouts } = await supabase
        .from('workouts')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('completed', true)
        .gte('created_at', weekAgo)

      const totalPoints = pointsData?.total_points || 0
      const streak = pointsData?.current_streak || 0
      const totalWater = (todayWater || []).reduce((sum, w) => sum + w.amount, 0)

      setStats({
        points: totalPoints,
        level: Math.floor(totalPoints / 500) + 1,
        streak,
        workouts: workoutCount || 0,
        achievements: unlockedIds.length
      })

      // Marcar conquistas desbloqueadas
      setAchievements(prev => prev.map(a => ({
        ...a,
        unlocked: unlockedIds.includes(a.id),
        progress: a.category === 'Treino' ? Math.min((workoutCount || 0) / a.requirement * 100, 100) :
                  a.category === 'Sequência' ? Math.min(streak / a.requirement * 100, 100) : 0
      })))

      // Atualizar desafios
      setChallenges(prev => prev.map(c => {
        let current = 0
        if (c.id === 'daily-water') current = totalWater
        else if (c.id === 'daily-workout') current = todayWorkouts || 0
        else if (c.id === 'daily-meals') current = todayMeals?.length || 0
        else if (c.id === 'weekly-workouts') current = weekWorkouts || 0
        else if (c.id === 'weekly-streak') current = streak
        
        return { ...c, current, completed: current >= c.target }
      }))

    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const categories = [...new Set(ACHIEVEMENTS.map(a => a.category))]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white px-4 pt-4 pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/dashboard" className="p-2 hover:bg-white/10 rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">Conquistas</h1>
              <p className="text-sm text-white/80">Suas metas e recompensas</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <Star className="w-5 h-5 mx-auto mb-1" />
              <p className="text-lg font-bold">{stats.points}</p>
              <p className="text-xs text-white/70">Pontos</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <TrendingUp className="w-5 h-5 mx-auto mb-1" />
              <p className="text-lg font-bold">Nv. {stats.level}</p>
              <p className="text-xs text-white/70">Nível</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <Flame className="w-5 h-5 mx-auto mb-1" />
              <p className="text-lg font-bold">{stats.streak}</p>
              <p className="text-xs text-white/70">Sequência</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <Trophy className="w-5 h-5 mx-auto mb-1" />
              <p className="text-lg font-bold">{stats.achievements}</p>
              <p className="text-xs text-white/70">Conquistas</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 -mt-4">
        {/* Tabs */}
        <div className="bg-white rounded-xl p-1 shadow-sm mb-4 flex">
          <button
            onClick={() => setActiveTab('conquistas')}
            className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'conquistas' ? 'bg-primary-500 text-white' : 'text-gray-600'
            }`}
          >
            🏆 Conquistas
          </button>
          <button
            onClick={() => setActiveTab('desafios')}
            className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'desafios' ? 'bg-primary-500 text-white' : 'text-gray-600'
            }`}
          >
            🎯 Desafios
          </button>
        </div>

        {activeTab === 'conquistas' ? (
          <div className="space-y-6">
            {categories.map(category => {
              const catAchievements = achievements.filter(a => a.category === category)
              const unlocked = catAchievements.filter(a => a.unlocked).length

              return (
                <div key={category}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-lg">{category}</h3>
                    <span className="text-sm text-gray-500">{unlocked}/{catAchievements.length}</span>
                  </div>
                  
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {catAchievements.map(achievement => (
                      <motion.div
                        key={achievement.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`relative bg-white rounded-xl p-4 border-2 ${
                          achievement.unlocked ? RARITY_COLORS[achievement.rarity] : 'border-gray-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`text-3xl ${!achievement.unlocked && 'grayscale'}`}>
                            {achievement.unlocked ? achievement.icon : '🔒'}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold">{achievement.name}</h4>
                            <p className="text-xs text-gray-500">{achievement.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Star className="w-3 h-3 text-yellow-500" />
                              <span className="text-xs font-medium text-yellow-600">{achievement.points} pts</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${CATEGORY_COLORS[category]}`}>
                                {achievement.rarity}
                              </span>
                            </div>
                          </div>
                          {achievement.unlocked && (
                            <Check className="w-5 h-5 text-green-500" />
                          )}
                        </div>
                        
                        {!achievement.unlocked && achievement.progress !== undefined && achievement.progress > 0 && (
                          <div className="mt-3">
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary-500 rounded-full"
                                style={{ width: `${achievement.progress}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{Math.round(achievement.progress)}%</p>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desafios Diários */}
            <div>
              <h3 className="font-bold text-lg mb-3">📅 Desafios Diários</h3>
              <div className="space-y-3">
                {challenges.filter(c => c.type === 'daily').map(challenge => (
                  <div 
                    key={challenge.id}
                    className={`bg-white rounded-xl p-4 border-2 ${
                      challenge.completed ? 'border-green-400 bg-green-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{challenge.icon}</span>
                      <div className="flex-1">
                        <h4 className="font-semibold">{challenge.name}</h4>
                        <p className="text-xs text-gray-500">{challenge.description}</p>
                        <div className="mt-2">
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${challenge.completed ? 'bg-green-500' : 'bg-primary-500'}`}
                              style={{ width: `${Math.min((challenge.current / challenge.target) * 100, 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {challenge.current} / {challenge.target}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-yellow-600">+{challenge.points}</p>
                        {challenge.completed && <Check className="w-5 h-5 text-green-500 ml-auto" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desafios Semanais */}
            <div>
              <h3 className="font-bold text-lg mb-3">📆 Desafios Semanais</h3>
              <div className="space-y-3">
                {challenges.filter(c => c.type === 'weekly').map(challenge => (
                  <div 
                    key={challenge.id}
                    className={`bg-white rounded-xl p-4 border-2 ${
                      challenge.completed ? 'border-green-400 bg-green-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{challenge.icon}</span>
                      <div className="flex-1">
                        <h4 className="font-semibold">{challenge.name}</h4>
                        <p className="text-xs text-gray-500">{challenge.description}</p>
                        <div className="mt-2">
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${challenge.completed ? 'bg-green-500' : 'bg-primary-500'}`}
                              style={{ width: `${Math.min((challenge.current / challenge.target) * 100, 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {challenge.current} / {challenge.target}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-yellow-600">+{challenge.points}</p>
                        {challenge.completed && <Check className="w-5 h-5 text-green-500 ml-auto" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
