'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, LoadingSpinner } from '@/components/ui'

interface ProgressData {
  weight: number[]
  dates: string[]
  calories: { date: string; value: number }[]
  workouts: { date: string; completed: boolean }[]
}

export default function ProgressPage() {
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week')
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    avgCalories: 0,
    weightChange: 0,
    streak: 0
  })

  useEffect(() => {
    // Simulate loading data
    setTimeout(() => {
      setStats({
        totalWorkouts: 12,
        avgCalories: 1850,
        weightChange: -1.5,
        streak: 7
      })
      setIsLoading(false)
    }, 1000)
  }, [period])

  const periods = [
    { value: 'week', label: 'Semana' },
    { value: 'month', label: 'Mês' },
    { value: 'all', label: 'Total' }
  ]

  if (isLoading) {
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

      {/* Period Selector */}
      <div className="flex gap-2 mb-6">
        {periods.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value as typeof period)}
            className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all ${
              period === p.value
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="text-center">
            <div className="text-3xl font-bold text-primary">{stats.totalWorkouts}</div>
            <div className="text-sm text-gray-600">Treinos</div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="text-center">
            <div className="text-3xl font-bold text-secondary">{stats.avgCalories}</div>
            <div className="text-sm text-gray-600">Cal/dia média</div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="text-center">
            <div className={`text-3xl font-bold ${stats.weightChange < 0 ? 'text-green-500' : 'text-orange-500'}`}>
              {stats.weightChange > 0 ? '+' : ''}{stats.weightChange} kg
            </div>
            <div className="text-sm text-gray-600">Variação peso</div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="text-center">
            <div className="text-3xl font-bold text-accent">{stats.streak}</div>
            <div className="text-sm text-gray-600">Dias seguidos</div>
          </Card>
        </motion.div>
      </div>

      {/* Weight Chart Placeholder */}
      <Card className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Evolução do Peso</h2>
        <div className="h-48 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl flex items-center justify-center">
          <p className="text-gray-400">Gráfico de peso</p>
        </div>
      </Card>

      {/* Weekly Activity */}
      <Card className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Atividade Semanal</h2>
        <div className="flex justify-between">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => {
            const isCompleted = index < 5 // Mock data
            return (
              <div key={index} className="flex flex-col items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isCompleted
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isCompleted ? '✓' : day}
                </div>
                <span className="text-xs text-gray-500">{day}</span>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Achievements */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Conquistas</h2>
        <div className="grid grid-cols-4 gap-4">
          {[
            { emoji: '🔥', label: '7 dias', unlocked: true },
            { emoji: '💪', label: '10 treinos', unlocked: true },
            { emoji: '🥗', label: '50 refeições', unlocked: false },
            { emoji: '⭐', label: '1 mês', unlocked: false }
          ].map((achievement, index) => (
            <div
              key={index}
              className={`flex flex-col items-center p-2 rounded-xl ${
                achievement.unlocked ? 'opacity-100' : 'opacity-40'
              }`}
            >
              <span className="text-3xl mb-1">{achievement.emoji}</span>
              <span className="text-xs text-gray-600 text-center">{achievement.label}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
