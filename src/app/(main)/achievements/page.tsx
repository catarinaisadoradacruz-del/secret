'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Trophy, Star, Flame, Target, Zap, Heart, Award,
  Lock, Check, ChevronRight, ArrowLeft, Gift, Crown,
  Sparkles, Medal, TrendingUp, Calendar, Dumbbell
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: string
  points: number
  requirement: number
  progress: number
  unlocked: boolean
  unlockedAt?: string
  rarity: 'comum' | 'raro' | 'épico' | 'lendário'
}

interface Challenge {
  id: string
  name: string
  description: string
  icon: string
  points: number
  deadline: string
  progress: number
  target: number
  type: string
}

interface UserStats {
  totalPoints: number
  level: number
  streak: number
  workoutsCompleted: number
  mealsLogged: number
  waterIntake: number
  achievementsUnlocked: number
}

const ACHIEVEMENTS: Achievement[] = [
  // Treinos
  { id: 'first-workout', name: 'Primeiro Passo', description: 'Complete seu primeiro treino', icon: '🎯', category: 'treino', points: 50, requirement: 1, progress: 0, unlocked: false, rarity: 'comum' },
  { id: 'workout-5', name: 'Pegando o Ritmo', description: 'Complete 5 treinos', icon: '💪', category: 'treino', points: 100, requirement: 5, progress: 0, unlocked: false, rarity: 'comum' },
  { id: 'workout-20', name: 'Atleta Dedicada', description: 'Complete 20 treinos', icon: '🏋️', category: 'treino', points: 250, requirement: 20, progress: 0, unlocked: false, rarity: 'raro' },
  { id: 'workout-50', name: 'Guerreira Fitness', description: 'Complete 50 treinos', icon: '⚔️', category: 'treino', points: 500, requirement: 50, progress: 0, unlocked: false, rarity: 'épico' },
  { id: 'workout-100', name: 'Lenda do Fitness', description: 'Complete 100 treinos', icon: '👑', category: 'treino', points: 1000, requirement: 100, progress: 0, unlocked: false, rarity: 'lendário' },
  
  // Sequência
  { id: 'streak-3', name: 'Consistência', description: '3 dias seguidos de treino', icon: '🔥', category: 'sequência', points: 75, requirement: 3, progress: 0, unlocked: false, rarity: 'comum' },
  { id: 'streak-7', name: 'Semana Perfeita', description: '7 dias seguidos de treino', icon: '⭐', category: 'sequência', points: 200, requirement: 7, progress: 0, unlocked: false, rarity: 'raro' },
  { id: 'streak-30', name: 'Mês Imbatível', description: '30 dias seguidos de treino', icon: '🌟', category: 'sequência', points: 750, requirement: 30, progress: 0, unlocked: false, rarity: 'épico' },
  { id: 'streak-100', name: 'Centenária', description: '100 dias seguidos!', icon: '💎', category: 'sequência', points: 2000, requirement: 100, progress: 0, unlocked: false, rarity: 'lendário' },
  
  // Nutrição
  { id: 'meals-10', name: 'Diário Alimentar', description: 'Registre 10 refeições', icon: '🍽️', category: 'nutrição', points: 50, requirement: 10, progress: 0, unlocked: false, rarity: 'comum' },
  { id: 'meals-50', name: 'Consciente', description: 'Registre 50 refeições', icon: '📝', category: 'nutrição', points: 150, requirement: 50, progress: 0, unlocked: false, rarity: 'raro' },
  { id: 'water-7', name: 'Hidratada', description: 'Bata meta de água 7 dias', icon: '💧', category: 'nutrição', points: 100, requirement: 7, progress: 0, unlocked: false, rarity: 'comum' },
  { id: 'healthy-week', name: 'Semana Saudável', description: 'Coma saudável por 7 dias', icon: '🥗', category: 'nutrição', points: 200, requirement: 7, progress: 0, unlocked: false, rarity: 'raro' },
  
  // Especiais Gestante
  { id: 'prenatal-first', name: 'Mamãe Fitness', description: 'Complete treino pré-natal', icon: '🤰', category: 'gestante', points: 100, requirement: 1, progress: 0, unlocked: false, rarity: 'comum' },
  { id: 'prenatal-10', name: 'Gravidez Ativa', description: '10 treinos pré-natais', icon: '🌸', category: 'gestante', points: 300, requirement: 10, progress: 0, unlocked: false, rarity: 'raro' },
  { id: 'vitamins-30', name: 'Suplementação', description: 'Tome vitaminas 30 dias', icon: '💊', category: 'gestante', points: 250, requirement: 30, progress: 0, unlocked: false, rarity: 'raro' },
  
  // Social
  { id: 'share-progress', name: 'Inspiradora', description: 'Compartilhe seu progresso', icon: '📱', category: 'social', points: 50, requirement: 1, progress: 0, unlocked: false, rarity: 'comum' },
  { id: 'invite-friend', name: 'Embaixadora', description: 'Convide uma amiga', icon: '👯', category: 'social', points: 150, requirement: 1, progress: 0, unlocked: false, rarity: 'raro' },
  
  // App
  { id: 'profile-complete', name: 'Perfil Completo', description: 'Preencha todo seu perfil', icon: '✨', category: 'app', points: 75, requirement: 1, progress: 0, unlocked: false, rarity: 'comum' },
  { id: 'first-scan', name: 'Detetive Nutricional', description: 'Escaneie um alimento', icon: '📷', category: 'app', points: 50, requirement: 1, progress: 0, unlocked: false, rarity: 'comum' },
]

const DAILY_CHALLENGES: Challenge[] = [
  { id: 'daily-water', name: 'Hidratação', description: 'Beba 2 litros de água', icon: '💧', points: 20, deadline: 'hoje', progress: 0, target: 2000, type: 'water' },
  { id: 'daily-steps', name: 'Movimento', description: 'Faça um treino', icon: '🏃', points: 30, deadline: 'hoje', progress: 0, target: 1, type: 'workout' },
  { id: 'daily-meals', name: 'Alimentação', description: 'Registre 3 refeições', icon: '🍎', points: 25, deadline: 'hoje', progress: 0, target: 3, type: 'meals' },
]

const WEEKLY_CHALLENGES: Challenge[] = [
  { id: 'weekly-workouts', name: 'Meta Semanal', description: 'Complete 4 treinos esta semana', icon: '🎯', points: 150, deadline: 'domingo', progress: 0, target: 4, type: 'workout' },
  { id: 'weekly-variety', name: 'Variedade', description: 'Faça 3 tipos de treino diferentes', icon: '🌈', points: 100, deadline: 'domingo', progress: 0, target: 3, type: 'variety' },
  { id: 'weekly-streak', name: 'Sequência', description: 'Treine 5 dias seguidos', icon: '🔥', points: 200, deadline: 'domingo', progress: 0, target: 5, type: 'streak' },
]

const RARITY_COLORS = {
  comum: 'from-gray-400 to-gray-500',
  raro: 'from-blue-400 to-blue-600',
  épico: 'from-purple-400 to-purple-600',
  lendário: 'from-yellow-400 to-orange-500',
}

const RARITY_BG = {
  comum: 'bg-gray-100',
  raro: 'bg-blue-50',
  épico: 'bg-purple-50',
  lendário: 'bg-gradient-to-r from-yellow-50 to-orange-50',
}

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>(ACHIEVEMENTS)
  const [dailyChallenges, setDailyChallenges] = useState<Challenge[]>(DAILY_CHALLENGES)
  const [weeklyChallenges, setWeeklyChallenges] = useState<Challenge[]>(WEEKLY_CHALLENGES)
  const [userStats, setUserStats] = useState<UserStats>({
    totalPoints: 0,
    level: 1,
    streak: 0,
    workoutsCompleted: 0,
    mealsLogged: 0,
    waterIntake: 0,
    achievementsUnlocked: 0
  })
  const [selectedTab, setSelectedTab] = useState<'conquistas' | 'desafios'>('conquistas')
  const [selectedCategory, setSelectedCategory] = useState('todas')
  const [loading, setLoading] = useState(true)
  const [showUnlockModal, setShowUnlockModal] = useState<Achievement | null>(null)

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setLoading(false)
        return
      }

      // Carregar pontos do usuário
      const { data: pointsData } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', user.id)
        .single()

      // Carregar conquistas desbloqueadas
      const { data: unlockedData } = await supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', user.id)

      // Carregar estatísticas
      const { data: workouts } = await supabase
        .from('workouts')
        .select('id')
        .eq('user_id', user.id)
        .eq('completed', true)

      const { data: meals } = await supabase
        .from('meals')
        .select('id')
        .eq('user_id', user.id)

      // Atualizar conquistas com progresso
      const unlockedIds = new Set((unlockedData || []).map(u => u.achievement_id))
      const updatedAchievements = ACHIEVEMENTS.map(a => {
        let progress = 0
        if (a.category === 'treino') progress = workouts?.length || 0
        if (a.category === 'nutrição' && a.id.includes('meals')) progress = meals?.length || 0
        
        return {
          ...a,
          progress: Math.min(progress, a.requirement),
          unlocked: unlockedIds.has(a.id),
          unlockedAt: unlockedData?.find(u => u.achievement_id === a.id)?.unlocked_at
        }
      })

      setAchievements(updatedAchievements)
      
      const totalPoints = pointsData?.total_points || 0
      const level = Math.floor(totalPoints / 500) + 1
      
      setUserStats({
        totalPoints,
        level,
        streak: pointsData?.current_streak || 0,
        workoutsCompleted: workouts?.length || 0,
        mealsLogged: meals?.length || 0,
        waterIntake: 0,
        achievementsUnlocked: unlockedIds.size
      })

      // Atualizar desafios diários com progresso real
      const today = new Date().toISOString().split('T')[0]
      const { data: todayWater } = await supabase
        .from('water_intake')
        .select('amount')
        .eq('user_id', user.id)
        .gte('created_at', today)

      const { data: todayWorkouts } = await supabase
        .from('workouts')
        .select('id')
        .eq('user_id', user.id)
        .eq('completed', true)
        .gte('created_at', today)

      const { data: todayMeals } = await supabase
        .from('meals')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', today)

      const totalWater = (todayWater || []).reduce((sum, w) => sum + w.amount, 0)
      
      setDailyChallenges(prev => prev.map(c => {
        if (c.type === 'water') return { ...c, progress: totalWater }
        if (c.type === 'workout') return { ...c, progress: todayWorkouts?.length || 0 }
        if (c.type === 'meals') return { ...c, progress: todayMeals?.length || 0 }
        return c
      }))

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const categories = ['todas', 'treino', 'sequência', 'nutrição', 'gestante', 'social', 'app']
  
  const filteredAchievements = selectedCategory === 'todas' 
    ? achievements 
    : achievements.filter(a => a.category === selectedCategory)

  const unlockedCount = achievements.filter(a => a.unlocked).length
  const totalAchievements = achievements.length

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header com Stats */}
      <div className="bg-gradient-to-br from-primary-500 to-primary-700 text-white px-4 pt-4 pb-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard" className="p-2 hover:bg-white/10 rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold">Conquistas & Desafios</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-yellow-300" />
              <span className="text-white/80 text-sm">Pontos</span>
            </div>
            <p className="text-2xl font-bold">{userStats.totalPoints.toLocaleString()}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-yellow-300" />
              <span className="text-white/80 text-sm">Nível</span>
            </div>
            <p className="text-2xl font-bold">{userStats.level}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
            <Flame className="w-5 h-5 mx-auto mb-1 text-orange-300" />
            <p className="text-lg font-bold">{userStats.streak}</p>
            <p className="text-xs text-white/60">Dias seguidos</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
            <Trophy className="w-5 h-5 mx-auto mb-1 text-yellow-300" />
            <p className="text-lg font-bold">{unlockedCount}/{totalAchievements}</p>
            <p className="text-xs text-white/60">Conquistas</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
            <Dumbbell className="w-5 h-5 mx-auto mb-1 text-blue-300" />
            <p className="text-lg font-bold">{userStats.workoutsCompleted}</p>
            <p className="text-xs text-white/60">Treinos</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 -mt-4">
        <div className="bg-white rounded-2xl shadow-sm p-1 flex">
          <button
            onClick={() => setSelectedTab('conquistas')}
            className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
              selectedTab === 'conquistas' 
                ? 'bg-primary-500 text-white' 
                : 'text-gray-600'
            }`}
          >
            🏆 Conquistas
          </button>
          <button
            onClick={() => setSelectedTab('desafios')}
            className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
              selectedTab === 'desafios' 
                ? 'bg-primary-500 text-white' 
                : 'text-gray-600'
            }`}
          >
            🎯 Desafios
          </button>
        </div>
      </div>

      <div className="p-4">
        <AnimatePresence mode="wait">
          {selectedTab === 'conquistas' ? (
            <motion.div
              key="conquistas"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {/* Filtro de categorias */}
              <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide mb-4">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
                      selectedCategory === cat 
                        ? 'bg-primary-500 text-white' 
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                ))}
              </div>

              {/* Lista de conquistas */}
              <div className="space-y-3">
                {filteredAchievements.map(achievement => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${RARITY_BG[achievement.rarity]} rounded-2xl p-4 ${
                      achievement.unlocked ? 'ring-2 ring-primary-500' : 'opacity-80'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${RARITY_COLORS[achievement.rarity]} flex items-center justify-center text-2xl ${
                        !achievement.unlocked && 'grayscale'
                      }`}>
                        {achievement.unlocked ? achievement.icon : '🔒'}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{achievement.name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            achievement.rarity === 'lendário' ? 'bg-yellow-200 text-yellow-800' :
                            achievement.rarity === 'épico' ? 'bg-purple-200 text-purple-800' :
                            achievement.rarity === 'raro' ? 'bg-blue-200 text-blue-800' :
                            'bg-gray-200 text-gray-700'
                          }`}>
                            {achievement.rarity}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{achievement.description}</p>
                        
                        {!achievement.unlocked && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full bg-gradient-to-r ${RARITY_COLORS[achievement.rarity]}`}
                                style={{ width: `${(achievement.progress / achievement.requirement) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">
                              {achievement.progress}/{achievement.requirement}
                            </span>
                          </div>
                        )}
                        
                        {achievement.unlocked && (
                          <div className="flex items-center gap-1 text-green-600 text-sm">
                            <Check className="w-4 h-4" />
                            <span>Desbloqueado!</span>
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-1 text-yellow-600">
                          <Star className="w-4 h-4" />
                          <span className="font-semibold">{achievement.points}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="desafios"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Desafios Diários */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary-500" />
                  Desafios Diários
                </h3>
                <div className="space-y-3">
                  {dailyChallenges.map(challenge => {
                    const progress = Math.min((challenge.progress / challenge.target) * 100, 100)
                    const completed = challenge.progress >= challenge.target
                    
                    return (
                      <div 
                        key={challenge.id}
                        className={`bg-white rounded-xl p-4 shadow-sm ${completed ? 'ring-2 ring-green-500' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                            completed ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                            {completed ? '✅' : challenge.icon}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{challenge.name}</h4>
                            <p className="text-sm text-gray-500">{challenge.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${completed ? 'bg-green-500' : 'bg-primary-500'}`}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">
                                {challenge.progress}/{challenge.target}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-yellow-600">
                              <Star className="w-4 h-4" />
                              <span className="font-semibold">+{challenge.points}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Desafios Semanais */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary-500" />
                  Desafios Semanais
                </h3>
                <div className="space-y-3">
                  {weeklyChallenges.map(challenge => {
                    const progress = Math.min((challenge.progress / challenge.target) * 100, 100)
                    const completed = challenge.progress >= challenge.target
                    
                    return (
                      <div 
                        key={challenge.id}
                        className={`bg-white rounded-xl p-4 shadow-sm ${completed ? 'ring-2 ring-green-500' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                            completed ? 'bg-green-100' : 'bg-primary-100'
                          }`}>
                            {completed ? '✅' : challenge.icon}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{challenge.name}</h4>
                            <p className="text-sm text-gray-500">{challenge.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${completed ? 'bg-green-500' : 'bg-primary-500'}`}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">
                                {challenge.progress}/{challenge.target}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-yellow-600">
                              <Star className="w-4 h-4" />
                              <span className="font-semibold">+{challenge.points}</span>
                            </div>
                            <p className="text-xs text-gray-400">até {challenge.deadline}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
