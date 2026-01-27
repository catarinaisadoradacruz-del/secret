'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Dumbbell, Play, Calendar, TrendingUp, Clock,
  ChevronRight, Sparkles, Flame
} from 'lucide-react'

export default function WorkoutPage() {
  const [activeTab, setActiveTab] = useState('today')

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Treinos</h1>
          <p className="text-text-secondary">
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long'
            })}
          </p>
        </div>
        <button className="btn-secondary p-3 rounded-xl">
          <Sparkles className="w-5 h-5" />
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center py-4">
          <div className="text-2xl font-bold text-primary-600">0</div>
          <div className="text-xs text-text-secondary">Treinos</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-2xl font-bold text-accent-500">0</div>
          <div className="text-xs text-text-secondary">Calorias</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-2xl font-bold text-secondary-600">0</div>
          <div className="text-xs text-text-secondary">Minutos</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button className="card flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center mb-3">
            <Sparkles className="w-6 h-6 text-primary-600" />
          </div>
          <span className="font-medium">Gerar Treino</span>
          <span className="text-xs text-text-secondary">Personalizado com IA</span>
        </button>

        <button className="card flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-secondary-100 flex items-center justify-center mb-3">
            <Dumbbell className="w-6 h-6 text-secondary-600" />
          </div>
          <span className="font-medium">Treino Rapido</span>
          <span className="text-xs text-text-secondary">15-20 minutos</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'today', label: 'Hoje' },
          { id: 'week', label: 'Semana' },
          { id: 'saved', label: 'Salvos' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Today's Workout */}
      {activeTab === 'today' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="card text-center py-8 text-text-secondary">
            <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Nenhum treino para hoje</p>
            <p className="text-sm mb-4">Gere um treino personalizado com IA!</p>
            <button className="btn-primary px-6 py-3">
              <Sparkles className="w-5 h-5 mr-2" />
              Gerar Treino
            </button>
          </div>
        </motion.div>
      )}

      {/* Suggested Workouts */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-lg">Sugestoes para Voce</h3>
          <button className="text-primary-600 text-sm font-medium flex items-center gap-1">
            Ver mais <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {[
            {
              name: 'Treino Leve para Iniciantes',
              duration: 20,
              calories: 150,
              level: 'Facil',
              color: 'bg-green-100 text-green-700'
            },
            {
              name: 'Fortalecimento do Core',
              duration: 25,
              calories: 180,
              level: 'Medio',
              color: 'bg-yellow-100 text-yellow-700'
            },
            {
              name: 'Cardio Moderado',
              duration: 30,
              calories: 250,
              level: 'Medio',
              color: 'bg-orange-100 text-orange-700'
            },
          ].map((workout, index) => (
            <div key={index} className="card flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-secondary-400 to-secondary-500 flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">{workout.name}</h4>
                <div className="flex items-center gap-3 text-sm text-text-secondary">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {workout.duration} min
                  </span>
                  <span className="flex items-center gap-1">
                    <Flame className="w-3 h-3" /> {workout.calories} kcal
                  </span>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${workout.color}`}>
                {workout.level}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Weekly Goal */}
      <section>
        <h3 className="font-display font-semibold text-lg mb-4">Meta Semanal</h3>
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-text-secondary">0 de 4 treinos</span>
            <span className="text-primary-600 font-medium">0%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary-500 rounded-full w-0 transition-all duration-500" />
          </div>
        </div>
      </section>
    </div>
  )
}
