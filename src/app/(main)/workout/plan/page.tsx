'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Dumbbell, Sparkles, Play, CheckCircle, Calendar } from 'lucide-react'
import { Button, Card, LoadingSpinner } from '@/components/ui'
import Link from 'next/link'

interface Workout {
  id: string
  name: string
  description: string
  duration: number
  exercises: number
  completed: boolean
}

interface WorkoutPlan {
  name: string
  description: string
  sessions_per_week: number
  workouts: Workout[]
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function WorkoutPlanPage() {
  const [plan, setPlan] = useState<WorkoutPlan | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedDay, setSelectedDay] = useState(new Date().getDay())

  useEffect(() => {
    fetchPlan()
  }, [])

  const fetchPlan = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/workout/plan')
      const data = await response.json()
      if (data.plan) {
        setPlan(data.plan)
      }
    } catch (error) {
      console.error('Error fetching plan:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generatePlan = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/workout/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration: 30,
          focus: 'full_body',
          intensity: 'moderate',
        }),
      })
      const data = await response.json()
      if (data.workout) {
        setPlan({
          name: 'Meu Plano de Treino',
          description: 'Treinos personalizados para você',
          sessions_per_week: 3,
          workouts: [data.workout],
        })
      }
    } catch (error) {
      console.error('Error generating plan:', error)
    } finally {
      setIsGenerating(false)
    }
  }

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plano de Treino</h1>
          <p className="text-gray-600 mt-1">Seus exercícios da semana</p>
        </div>
        <Button onClick={generatePlan} size="sm" isLoading={isGenerating}>
          <Sparkles className="w-4 h-4 mr-1" />
          {plan ? 'Novo' : 'Gerar'}
        </Button>
      </div>

      {/* Week Days */}
      <Card className="mb-6">
        <div className="flex justify-between">
          {DAYS.map((day, index) => {
            const isSelected = selectedDay === index
            const hasWorkout = plan?.workouts?.some(
              (w) => !w.completed && index % 2 !== 0
            )

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(index)}
                className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                  isSelected
                    ? 'bg-primary text-white'
                    : hasWorkout
                    ? 'bg-secondary/10 text-secondary'
                    : 'hover:bg-gray-100'
                }`}
              >
                <span className="text-xs font-medium">{day}</span>
                {hasWorkout && !isSelected && (
                  <div className="w-2 h-2 rounded-full bg-secondary mt-1" />
                )}
              </button>
            )
          })}
        </div>
      </Card>

      {/* Plan Content */}
      {!plan ? (
        <Card className="text-center py-12">
          <Dumbbell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Sem plano de treino
          </h3>
          <p className="text-gray-500 mb-4">
            Gere um plano personalizado com IA
          </p>
          <Button onClick={generatePlan} isLoading={isGenerating}>
            <Sparkles className="w-4 h-4 mr-2" />
            Gerar Plano
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Plan Info */}
          <Card className="bg-gradient-to-br from-secondary/10 to-primary/10">
            <h3 className="font-semibold text-gray-900">{plan.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
            <div className="flex gap-4 mt-3">
              <span className="text-xs px-2 py-1 bg-white rounded-full">
                {plan.sessions_per_week}x por semana
              </span>
            </div>
          </Card>

          {/* Today's Workout */}
          <h3 className="font-semibold text-gray-900 mt-6 mb-3">
            Treino de {DAYS[selectedDay]}
          </h3>

          {selectedDay % 2 !== 0 && plan.workouts?.[0] ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-xl bg-secondary/10 flex items-center justify-center">
                    <Dumbbell className="w-7 h-7 text-secondary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {plan.workouts[0].name || 'Treino do Dia'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {plan.workouts[0].description || 'Treino completo'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 mb-4">
                  <span className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                    {plan.workouts[0].duration || 30} min
                  </span>
                  <span className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                    {plan.workouts[0].exercises || 8} exercícios
                  </span>
                </div>

                <div className="flex gap-3">
                  <Link href="/workout/timer" className="flex-1">
                    <Button fullWidth>
                      <Play className="w-4 h-4 mr-2" />
                      Iniciar Treino
                    </Button>
                  </Link>
                </div>
              </Card>
            </motion.div>
          ) : (
            <Card className="text-center py-8">
              <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Dia de descanso</p>
              <p className="text-sm text-gray-400 mt-1">
                Aproveite para relaxar e se recuperar
              </p>
            </Card>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <Card className="text-center">
              <div className="text-2xl font-bold text-secondary">0</div>
              <p className="text-sm text-gray-500">Treinos concluídos</p>
            </Card>
            <Card className="text-center">
              <div className="text-2xl font-bold text-primary">0</div>
              <p className="text-sm text-gray-500">Esta semana</p>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
