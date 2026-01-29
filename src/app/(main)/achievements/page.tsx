'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Trophy, Star, Flame, Target, Award, Lock, 
  ChevronRight, Sparkles, TrendingUp, Calendar
} from 'lucide-react'
import { Card, LoadingSpinner } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'

interface Achievement {
  id: string
  code: string
  name: string
  description: string
  icon: string
  points: number
  category: string
  unlocked?: boolean
  unlocked_at?: string
}

interface UserPoints {
  total_points: number
  level: number
  current_streak: number
  longest_streak: number
}

const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500]
const LEVEL_NAMES = ['Iniciante', 'Dedicada', 'Comprometida', 'Focada', 'Persistente', 'Guerreira', 'Inspiradora', 'Mestre', 'Lenda', 'Deusa', 'Transcendente']

const CATEGORY_ICONS: Record<string, any> = {
  nutrition: '🍎',
  exercise: '💪',
  wellness: '🧘',
  social: '👥',
  streak: '🔥',
  milestone: '🏆'
}

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [userPoints, setUserPoints] = useState<UserPoints | null>(null)
  const [activeCategory, setActiveCategory] = useState('all')
  const [isLoading, setIsLoading] = useState(true)

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

      // Buscar pontos do usuário
      const { data: pointsData } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (pointsData) {
        setUserPoints(pointsData)
      } else {
        // Criar registro inicial
        setUserPoints({
          total_points: 0,
          level: 1,
          current_streak: 0,
          longest_streak: 0
        })
      }

      // Buscar todas as conquistas
      const { data: allAchievements } = await supabase
        .from('achievements')
        .select('*')
        .order('points', { ascending: true })

      // Buscar conquistas desbloqueadas pelo usuário
      const { data: unlockedData } = await supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', user.id)

      const unlockedIds = new Set(unlockedData?.map(u => u.achievement_id) || [])
      const unlockedMap = new Map(unlockedData?.map(u => [u.achievement_id, u.unlocked_at]) || [])

      const achievementsWithStatus = (allAchievements || getDefaultAchievements()).map(a => ({
        ...a,
        unlocked: unlockedIds.has(a.id),
        unlocked_at: unlockedMap.get(a.id)
      }))

      setAchievements(achievementsWithStatus)

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      setAchievements(getDefaultAchievements())
    } finally {
      setIsLoading(false)
    }
  }

  const categories = ['all', ...new Set(achievements.map(a => a.category))]
  const filteredAchievements = activeCategory === 'all' 
    ? achievements 
    : achievements.filter(a => a.category === activeCategory)

  const unlockedCount = achievements.filter(a => a.unlocked).length
  const totalPoints = userPoints?.total_points || 0
  const currentLevel = userPoints?.level || 1
  const nextLevelPoints = LEVEL_THRESHOLDS[currentLevel] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]
  const prevLevelPoints = LEVEL_THRESHOLDS[currentLevel - 1] || 0
  const levelProgress = ((totalPoints - prevLevelPoints) / (nextLevelPoints - prevLevelPoints)) * 100

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Conquistas</h1>
        <p className="text-gray-600 mt-1">Suas conquistas e progresso</p>
      </div>

      {/* User Stats Card */}
      <Card className="mb-6 bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {currentLevel}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 text-lg">{LEVEL_NAMES[currentLevel - 1] || 'Mestre'}</h3>
            <p className="text-sm text-gray-600">{totalPoints} pontos totais</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-orange-600">
              <Flame className="w-5 h-5" />
              <span className="font-bold">{userPoints?.current_streak || 0}</span>
            </div>
            <p className="text-xs text-gray-500">dias seguidos</p>
          </div>
        </div>

        {/* Level Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Nível {currentLevel}</span>
            <span className="text-gray-600">Nível {currentLevel + 1}</span>
          </div>
          <div className="h-3 bg-white rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(levelProgress, 100)}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="text-xs text-center text-gray-500">
            {nextLevelPoints - totalPoints} pontos para o próximo nível
          </p>
        </div>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="text-center py-3">
          <Trophy className="w-6 h-6 text-amber-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-gray-900">{unlockedCount}</p>
          <p className="text-xs text-gray-500">Conquistadas</p>
        </Card>
        <Card className="text-center py-3">
          <Target className="w-6 h-6 text-primary-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-gray-900">{achievements.length - unlockedCount}</p>
          <p className="text-xs text-gray-500">Restantes</p>
        </Card>
        <Card className="text-center py-3">
          <Flame className="w-6 h-6 text-orange-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-gray-900">{userPoints?.longest_streak || 0}</p>
          <p className="text-xs text-gray-500">Maior sequência</p>
        </Card>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
              activeCategory === cat
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat === 'all' ? '🏆 Todas' : `${CATEGORY_ICONS[cat] || '📌'} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`}
          </button>
        ))}
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-2 gap-3">
        <AnimatePresence mode="popLayout">
          {filteredAchievements.map((achievement, index) => (
            <motion.div
              key={achievement.id || index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card 
                className={`relative overflow-hidden ${
                  achievement.unlocked 
                    ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200' 
                    : 'bg-gray-50 opacity-75'
                }`}
              >
                {!achievement.unlocked && (
                  <div className="absolute top-2 right-2">
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                )}
                <div className="text-center py-2">
                  <div className={`text-3xl mb-2 ${!achievement.unlocked && 'grayscale'}`}>
                    {achievement.icon || '🏆'}
                  </div>
                  <h4 className="font-semibold text-sm text-gray-900 mb-1">{achievement.name}</h4>
                  <p className="text-xs text-gray-500 line-clamp-2">{achievement.description}</p>
                  <div className="mt-2 flex items-center justify-center gap-1">
                    <Star className="w-3 h-3 text-amber-500" />
                    <span className="text-xs font-medium text-amber-600">{achievement.points} pts</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

function getDefaultAchievements(): Achievement[] {
  return [
    { id: '1', code: 'first_meal', name: 'Primeira Refeição', description: 'Registre sua primeira refeição', icon: '🍽️', points: 10, category: 'nutrition' },
    { id: '2', code: 'water_hero', name: 'Hidratação', description: 'Beba 2L de água em um dia', icon: '💧', points: 15, category: 'wellness' },
    { id: '3', code: 'week_streak', name: 'Semana Perfeita', description: '7 dias seguidos usando o app', icon: '🔥', points: 50, category: 'streak' },
    { id: '4', code: 'first_workout', name: 'Primeiro Treino', description: 'Complete seu primeiro treino', icon: '💪', points: 20, category: 'exercise' },
    { id: '5', code: 'meal_planner', name: 'Planejadora', description: 'Gere seu primeiro plano alimentar', icon: '📋', points: 25, category: 'nutrition' },
    { id: '6', code: 'social_butterfly', name: 'Sociável', description: 'Faça seu primeiro post na comunidade', icon: '🦋', points: 15, category: 'social' },
    { id: '7', code: 'month_streak', name: 'Mês Dourado', description: '30 dias seguidos usando o app', icon: '⭐', points: 100, category: 'streak' },
    { id: '8', code: 'recipe_master', name: 'Chef', description: 'Salve 10 receitas favoritas', icon: '👨‍🍳', points: 30, category: 'nutrition' },
  ]
}
