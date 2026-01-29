'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Utensils, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button, Card, LoadingSpinner } from '@/components/ui'
import { format, addDays, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface MealPlan {
  breakfast: { name: string; calories: number }
  morning_snack: { name: string; calories: number }
  lunch: { name: string; calories: number }
  afternoon_snack: { name: string; calories: number }
  dinner: { name: string; calories: number }
}

interface WeeklyPlan {
  [key: string]: MealPlan
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Café da manhã',
  morning_snack: 'Lanche manhã',
  lunch: 'Almoço',
  afternoon_snack: 'Lanche tarde',
  dinner: 'Jantar',
}

export default function NutritionPlanPage() {
  const [plan, setPlan] = useState<WeeklyPlan | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedDay, setSelectedDay] = useState(new Date().getDay())
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()))

  useEffect(() => {
    fetchPlan()
  }, [])

  const fetchPlan = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/nutrition/plan')
      const data = await response.json()
      if (data.plan?.weekly_plan) {
        setPlan(data.plan.weekly_plan)
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
      const response = await fetch('/api/nutrition/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 7 }),
      })
      const data = await response.json()
      if (data.plan) {
        setPlan(data.plan)
      }
    } catch (error) {
      console.error('Error generating plan:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const currentDayPlan = plan ? plan[DAYS[selectedDay].toLowerCase()] || plan[selectedDay.toString()] : null

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
          <h1 className="text-2xl font-bold text-gray-900">Plano Alimentar</h1>
          <p className="text-gray-600 mt-1">Sua alimentação organizada</p>
        </div>
        <Button onClick={generatePlan} size="sm" isLoading={isGenerating}>
          <Sparkles className="w-4 h-4 mr-1" />
          {plan ? 'Novo' : 'Gerar'}
        </Button>
      </div>

      {/* Week Navigation */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-medium">
            {format(weekStart, "dd 'de' MMMM", { locale: ptBR })} -{' '}
            {format(addDays(weekStart, 6), "dd 'de' MMMM", { locale: ptBR })}
          </span>
          <button
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day Selector */}
        <div className="flex justify-between">
          {DAYS.map((day, index) => {
            const dayDate = addDays(weekStart, index)
            const isSelected = selectedDay === index
            const isToday = format(dayDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(index)}
                className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                  isSelected
                    ? 'bg-primary text-white'
                    : isToday
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-gray-100'
                }`}
              >
                <span className="text-xs font-medium">{day}</span>
                <span className="text-lg font-bold">{format(dayDate, 'd')}</span>
              </button>
            )
          })}
        </div>
      </Card>

      {/* Daily Plan */}
      {!plan ? (
        <Card className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Sem plano alimentar
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
          {Object.entries(MEAL_LABELS).map(([key, label], index) => {
            const meal = currentDayPlan?.[key as keyof MealPlan]

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Utensils className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        {label}
                      </p>
                      <h3 className="font-semibold text-gray-900">
                        {meal?.name || 'Não planejado'}
                      </h3>
                    </div>
                    {meal?.calories && (
                      <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">
                        {meal.calories} kcal
                      </span>
                    )}
                  </div>
                </Card>
              </motion.div>
            )
          })}

          {/* Daily Summary */}
          {currentDayPlan && (
            <Card className="bg-gradient-to-br from-primary/10 to-secondary/10">
              <h3 className="font-semibold text-gray-900 mb-2">Resumo do Dia</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Total de calorias</p>
                  <p className="text-xl font-bold text-primary">
                    {Object.values(currentDayPlan).reduce(
                      (acc, meal) => acc + (meal?.calories || 0),
                      0
                    )}{' '}
                    kcal
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Refeições</p>
                  <p className="text-xl font-bold text-secondary">5</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
