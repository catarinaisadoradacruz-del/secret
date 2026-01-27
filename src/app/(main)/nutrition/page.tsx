'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Apple, Camera, Plus, TrendingUp, Calendar,
  ChevronRight, Sparkles
} from 'lucide-react'
import Link from 'next/link'
import { MEAL_TYPES } from '@/lib/utils/constants'

export default function NutritionPage() {
  const [selectedDate] = useState(new Date())

  const todayCalories = 0
  const goalCalories = 2000

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Nutricao</h1>
          <p className="text-text-secondary">
            {selectedDate.toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long'
            })}
          </p>
        </div>
        <Link
          href="/nutrition/scan"
          className="btn-primary p-3 rounded-xl"
        >
          <Camera className="w-5 h-5" />
        </Link>
      </header>

      {/* Calories Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Calorias de Hoje</h3>
          <span className="text-sm text-text-secondary">Meta: {goalCalories} kcal</span>
        </div>

        <div className="flex items-end justify-center gap-8 mb-4">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary-600">{todayCalories}</div>
            <div className="text-sm text-text-secondary">consumidas</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-secondary-600">{goalCalories - todayCalories}</div>
            <div className="text-sm text-text-secondary">restantes</div>
          </div>
        </div>

        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min((todayCalories / goalCalories) * 100, 100)}%` }}
          />
        </div>
      </motion.div>

      {/* Macros */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center py-4">
          <div className="text-2xl font-bold text-red-500">0g</div>
          <div className="text-xs text-text-secondary">Proteinas</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-2xl font-bold text-yellow-500">0g</div>
          <div className="text-xs text-text-secondary">Carboidratos</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-2xl font-bold text-blue-500">0g</div>
          <div className="text-xs text-text-secondary">Gorduras</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/nutrition/scan" className="card flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center mb-3">
            <Camera className="w-6 h-6 text-primary-600" />
          </div>
          <span className="font-medium">Escanear Refeicao</span>
          <span className="text-xs text-text-secondary">Analise com IA</span>
        </Link>

        <button className="card flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-secondary-100 flex items-center justify-center mb-3">
            <Sparkles className="w-6 h-6 text-secondary-600" />
          </div>
          <span className="font-medium">Gerar Plano</span>
          <span className="text-xs text-text-secondary">Plano alimentar IA</span>
        </button>
      </div>

      {/* Meals */}
      <section>
        <h3 className="font-display font-semibold text-lg mb-4">Refeicoes do Dia</h3>

        <div className="space-y-3">
          {MEAL_TYPES.map((meal) => (
            <div
              key={meal.value}
              className="card flex items-center gap-4 py-4"
            >
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">
                {meal.emoji}
              </div>
              <div className="flex-1">
                <h4 className="font-medium">{meal.label}</h4>
                <p className="text-sm text-text-secondary">Nenhum alimento registrado</p>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded-xl">
                <Plus className="w-5 h-5 text-primary-600" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* History */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-lg">Historico</h3>
          <button className="text-primary-600 text-sm font-medium flex items-center gap-1">
            Ver tudo <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="card text-center py-8 text-text-secondary">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nenhum registro ainda</p>
          <p className="text-sm">Comece escaneando sua primeira refeicao!</p>
        </div>
      </section>
    </div>
  )
}
