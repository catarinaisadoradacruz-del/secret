'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, LoadingSpinner } from '@/components/ui'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ProgressPage() {
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week')
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [progressData, setProgressData] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    avgCalories: 0,
    weightChange: 0,
    streak: 0,
    latestWeight: 0
  })

  const loadProgress = useCallback(async (selectedPeriod: string) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      const now = new Date()
      let startDate = new Date()
      if (selectedPeriod === 'week') {
        startDate.setDate(now.getDate() - 7)
      } else if (selectedPeriod === 'month') {
        startDate.setMonth(now.getMonth() - 1)
      } else {
        startDate.setFullYear(now.getFullYear() - 10)
      }

      const { data: progress } = await supabase
        .from('progress')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true })

      const { data: workouts } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .eq('status', 'COMPLETED')

      const { data: meals } = await supabase
        .from('meals')
        .select('total_calories, date')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])

      const totalWorkouts = workouts?.length || 0
      const avgCalories = meals && meals.length > 0
        ? Math.round(meals.reduce((sum, m) => sum + (m.total_calories || 0), 0) / meals.length)
        : 0

      const sortedProgress = progress?.sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      ) || []

      const latestWeight = sortedProgress.length > 0 ? sortedProgress[sortedProgress.length - 1].weight || 0 : 0
      const firstWeight = sortedProgress.length > 0 ? sortedProgress[0].weight || 0 : 0
      const weightChange = latestWeight && firstWeight ? Number((latestWeight - firstWeight).toFixed(1)) : 0

      setProgressData(sortedProgress)
      setStats({
        totalWorkouts,
        avgCalories,
        weightChange,
        streak: 0,
        latestWeight
      })
    } catch (error) {
      console.error('Erro ao carregar progresso:', error)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      await loadProgress(period)
      setIsInitialLoading(false)
    }
    init()
  }, [])

  // Quando muda período, atualiza sem mostrar loading
  useEffect(() => {
    if (!isInitialLoading) {
      loadProgress(period)
    }
  }, [period, isInitialLoading, loadProgress])

  const periods = [
    { value: 'week', label: 'Semana' },
    { value: 'month', label: 'Mês' },
    { value: 'all', label: 'Total' }
  ]

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Seu Progresso</h1>
        <p className="text-gray-600 mt-1">
          Acompanhe sua evolução ao longo do tempo
        </p>
      </div>

      {/* Period Selector - Mudança instantânea sem recarregar página */}
      <div className="flex gap-2 mb-6">
        {periods.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value as typeof period)}
            className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all duration-200 ${
              period === p.value
                ? 'bg-primary text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Stats Grid com animação suave */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={period}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-2 gap-4 mb-6"
        >
          <Card className="text-center">
            <div className="text-3xl font-bold text-primary-600">{stats.totalWorkouts}</div>
            <div className="text-sm text-gray-600">Treinos</div>
          </Card>

          <Card className="text-center">
            <div className="text-3xl font-bold text-secondary-600">{stats.avgCalories || '—'}</div>
            <div className="text-sm text-gray-600">Cal/dia média</div>
          </Card>

          <Card className="text-center">
            <div className={`text-3xl font-bold flex items-center justify-center gap-1 ${
              stats.weightChange < 0 ? 'text-green-500' : stats.weightChange > 0 ? 'text-orange-500' : 'text-gray-500'
            }`}>
              {stats.weightChange === 0 ? <Minus className="w-6 h-6" /> : stats.weightChange < 0 ? (
                <><TrendingDown className="w-6 h-6" />{Math.abs(stats.weightChange)} kg</>
              ) : (
                <><TrendingUp className="w-6 h-6" />+{stats.weightChange} kg</>
              )}
            </div>
            <div className="text-sm text-gray-600">Variação peso</div>
          </Card>

          <Card className="text-center">
            <div className="text-3xl font-bold text-accent-500">{stats.streak}</div>
            <div className="text-sm text-gray-600">Dias seguidos</div>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Latest Weight */}
      {stats.latestWeight > 0 && (
        <Card className="mb-6 bg-gradient-to-br from-primary-50 to-secondary-50">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">Peso Atual</p>
            <p className="text-4xl font-bold text-primary-600">{stats.latestWeight} kg</p>
          </div>
        </Card>
      )}

      {/* Weight Chart */}
      <AnimatePresence mode="wait">
        <motion.div
          key={period + '-chart'}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {progressData.length > 0 ? (
            <Card className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Evolução do Peso</h2>
              <div className="space-y-2">
                {progressData.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-600">
                      {new Date(entry.date).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="font-semibold text-gray-900">{entry.weight} kg</span>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Evolução do Peso</h2>
              <div className="h-48 bg-gradient-to-br from-primary-50 to-secondary-50 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-400 mb-2">Nenhum registro ainda</p>
                  <p className="text-sm text-gray-500">Registre seu peso para ver a evolução</p>
                </div>
              </div>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Empty State */}
      {progressData.length === 0 && stats.totalWorkouts === 0 && (
        <Card className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-primary-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Comece sua jornada!</h3>
          <p className="text-gray-600 text-sm">Registre treinos e medidas para acompanhar seu progresso</p>
        </Card>
      )}
    </div>
  )
}
