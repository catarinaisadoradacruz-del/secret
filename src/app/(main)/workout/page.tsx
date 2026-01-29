'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dumbbell, Play, Calendar, TrendingUp, Clock, Timer,
  ChevronRight, Sparkles, Flame, CheckCircle2, Pause,
  RotateCcw, X, Plus, Loader2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Exercise {
  id: string
  name: string
  duration: number // em segundos
  reps?: number
  sets?: number
  restTime: number // em segundos
  description?: string
  category: string
}

interface Workout {
  id: string
  name: string
  duration: number
  calories: number
  level: 'Fácil' | 'Médio' | 'Difícil'
  exercises: Exercise[]
  color: string
}

interface WorkoutSession {
  id: string
  workout_id: string
  started_at: string
  completed_at?: string
  calories_burned: number
  duration_minutes: number
}

const PRESET_WORKOUTS: Workout[] = [
  {
    id: 'beginner-1',
    name: 'Treino Leve para Iniciantes',
    duration: 20,
    calories: 150,
    level: 'Fácil',
    color: 'from-green-400 to-green-500',
    exercises: [
      { id: '1', name: 'Aquecimento - Marcha no lugar', duration: 60, restTime: 15, category: 'cardio', description: 'Marche no lugar levantando bem os joelhos' },
      { id: '2', name: 'Agachamento Assistido', duration: 45, reps: 10, sets: 2, restTime: 30, category: 'força', description: 'Use uma cadeira como apoio se necessário' },
      { id: '3', name: 'Elevação de Braços', duration: 45, reps: 12, sets: 2, restTime: 30, category: 'força', description: 'Eleve os braços acima da cabeça lentamente' },
      { id: '4', name: 'Caminhada Lateral', duration: 60, restTime: 20, category: 'cardio', description: 'Dê passos laterais alternando os lados' },
      { id: '5', name: 'Prancha Modificada', duration: 20, sets: 2, restTime: 30, category: 'core', description: 'Apoie os joelhos no chão' },
      { id: '6', name: 'Alongamento Final', duration: 120, restTime: 0, category: 'alongamento', description: 'Alongue pernas, braços e costas' },
    ]
  },
  {
    id: 'core-1',
    name: 'Fortalecimento do Core',
    duration: 25,
    calories: 180,
    level: 'Médio',
    color: 'from-yellow-400 to-orange-500',
    exercises: [
      { id: '1', name: 'Aquecimento - Rotação de Tronco', duration: 60, restTime: 15, category: 'aquecimento' },
      { id: '2', name: 'Prancha', duration: 30, sets: 3, restTime: 30, category: 'core', description: 'Mantenha o corpo reto' },
      { id: '3', name: 'Abdominal Bicicleta', duration: 45, reps: 20, sets: 2, restTime: 30, category: 'core' },
      { id: '4', name: 'Prancha Lateral', duration: 20, sets: 2, restTime: 20, category: 'core', description: 'Cada lado' },
      { id: '5', name: 'Dead Bug', duration: 45, reps: 10, sets: 2, restTime: 30, category: 'core' },
      { id: '6', name: 'Bird Dog', duration: 45, reps: 10, sets: 2, restTime: 30, category: 'core' },
      { id: '7', name: 'Alongamento - Cobra', duration: 60, restTime: 0, category: 'alongamento' },
    ]
  },
  {
    id: 'cardio-1',
    name: 'Cardio Moderado',
    duration: 30,
    calories: 250,
    level: 'Médio',
    color: 'from-orange-400 to-red-500',
    exercises: [
      { id: '1', name: 'Polichinelo', duration: 60, restTime: 20, category: 'cardio' },
      { id: '2', name: 'Corrida no Lugar', duration: 90, restTime: 30, category: 'cardio' },
      { id: '3', name: 'Mountain Climbers', duration: 45, restTime: 30, category: 'cardio' },
      { id: '4', name: 'Burpees Modificados', duration: 45, reps: 10, restTime: 45, category: 'cardio' },
      { id: '5', name: 'Pular Corda (imaginário)', duration: 90, restTime: 30, category: 'cardio' },
      { id: '6', name: 'High Knees', duration: 60, restTime: 30, category: 'cardio' },
      { id: '7', name: 'Cooldown - Caminhada', duration: 120, restTime: 0, category: 'cooldown' },
    ]
  },
  {
    id: 'prenatal-1',
    name: 'Treino Pré-Natal Seguro',
    duration: 20,
    calories: 120,
    level: 'Fácil',
    color: 'from-pink-400 to-purple-500',
    exercises: [
      { id: '1', name: 'Respiração Profunda', duration: 60, restTime: 10, category: 'respiração', description: 'Inspire pelo nariz, expire pela boca' },
      { id: '2', name: 'Caminhada Suave', duration: 120, restTime: 20, category: 'cardio' },
      { id: '3', name: 'Agachamento com Apoio', duration: 45, reps: 8, sets: 2, restTime: 30, category: 'força' },
      { id: '4', name: 'Elevação Lateral de Pernas', duration: 45, reps: 10, sets: 2, restTime: 30, category: 'força' },
      { id: '5', name: 'Cat-Cow Stretch', duration: 60, restTime: 15, category: 'alongamento' },
      { id: '6', name: 'Kegel', duration: 60, restTime: 15, category: 'assoalho pélvico', description: 'Contraia e relaxe os músculos pélvicos' },
      { id: '7', name: 'Alongamento Final', duration: 120, restTime: 0, category: 'alongamento' },
    ]
  },
]

export default function WorkoutPage() {
  const [activeTab, setActiveTab] = useState('today')
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null)
  const [isWorkoutActive, setIsWorkoutActive] = useState(false)
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isResting, setIsResting] = useState(false)
  const [completedToday, setCompletedToday] = useState(0)
  const [totalCalories, setTotalCalories] = useState(0)
  const [totalMinutes, setTotalMinutes] = useState(0)
  const [weeklyGoal, setWeeklyGoal] = useState(4)
  const [weeklyCompleted, setWeeklyCompleted] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [savedWorkouts, setSavedWorkouts] = useState<Workout[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      setUserId(user.id)
      
      // Carregar estatísticas
      const today = new Date().toISOString().split('T')[0]
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      
      const { data: sessions } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', weekStart.toISOString())
      
      if (sessions) {
        const todaySessions = sessions.filter(s => s.created_at.startsWith(today))
        setCompletedToday(todaySessions.length)
        setTotalCalories(todaySessions.reduce((acc, s) => acc + (s.calories_burned || 0), 0))
        setTotalMinutes(todaySessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0))
        setWeeklyCompleted(sessions.length)
      }
    }
  }

  // Timer do treino
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isWorkoutActive && !isPaused && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)
    } else if (timeLeft === 0 && isWorkoutActive && selectedWorkout) {
      // Próximo exercício ou descanso
      if (isResting) {
        setIsResting(false)
        if (currentExerciseIndex < selectedWorkout.exercises.length - 1) {
          const nextIndex = currentExerciseIndex + 1
          setCurrentExerciseIndex(nextIndex)
          setTimeLeft(selectedWorkout.exercises[nextIndex].duration)
        } else {
          // Treino concluído
          completeWorkout()
        }
      } else {
        // Iniciar descanso
        const currentExercise = selectedWorkout.exercises[currentExerciseIndex]
        if (currentExercise.restTime > 0 && currentExerciseIndex < selectedWorkout.exercises.length - 1) {
          setIsResting(true)
          setTimeLeft(currentExercise.restTime)
        } else if (currentExerciseIndex < selectedWorkout.exercises.length - 1) {
          const nextIndex = currentExerciseIndex + 1
          setCurrentExerciseIndex(nextIndex)
          setTimeLeft(selectedWorkout.exercises[nextIndex].duration)
        } else {
          completeWorkout()
        }
      }
    }

    return () => clearInterval(interval)
  }, [isWorkoutActive, isPaused, timeLeft, isResting, currentExerciseIndex, selectedWorkout])

  const startWorkout = (workout: Workout) => {
    setSelectedWorkout(workout)
    setCurrentExerciseIndex(0)
    setTimeLeft(workout.exercises[0].duration)
    setIsWorkoutActive(true)
    setIsPaused(false)
    setIsResting(false)
  }

  const completeWorkout = async () => {
    if (!selectedWorkout || !userId) return

    setIsWorkoutActive(false)
    
    try {
      const supabase = createClient()
      await supabase.from('workouts').insert({
        user_id: userId,
        type: selectedWorkout.name,
        duration_minutes: selectedWorkout.duration,
        calories_burned: selectedWorkout.calories,
        exercises: selectedWorkout.exercises.map(e => e.name),
        completed: true
      })

      // Atualizar estatísticas locais
      setCompletedToday(prev => prev + 1)
      setTotalCalories(prev => prev + selectedWorkout.calories)
      setTotalMinutes(prev => prev + selectedWorkout.duration)
      setWeeklyCompleted(prev => prev + 1)
    } catch (error) {
      console.error('Erro ao salvar treino:', error)
    }

    // Reset
    setSelectedWorkout(null)
    setCurrentExerciseIndex(0)
    setTimeLeft(0)
  }

  const cancelWorkout = () => {
    if (confirm('Tem certeza que deseja cancelar o treino?')) {
      setIsWorkoutActive(false)
      setSelectedWorkout(null)
      setCurrentExerciseIndex(0)
      setTimeLeft(0)
    }
  }

  const generateAIWorkout = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/workout/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.workout) {
          setSavedWorkouts(prev => [data.workout, ...prev])
        }
      }
    } catch (error) {
      console.error('Erro ao gerar treino:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Fácil': return 'bg-green-100 text-green-700'
      case 'Médio': return 'bg-yellow-100 text-yellow-700'
      case 'Difícil': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  // Modal de treino ativo
  if (isWorkoutActive && selectedWorkout) {
    const currentExercise = selectedWorkout.exercises[currentExerciseIndex]
    const progress = ((currentExerciseIndex + 1) / selectedWorkout.exercises.length) * 100

    return (
      <div className="fixed inset-0 bg-gradient-to-b from-primary-600 to-primary-800 z-50 flex flex-col">
        {/* Header */}
        <div className="p-4 flex items-center justify-between text-white">
          <button onClick={cancelWorkout} className="p-2">
            <X className="w-6 h-6" />
          </button>
          <span className="font-medium">{selectedWorkout.name}</span>
          <span className="text-sm opacity-80">
            {currentExerciseIndex + 1}/{selectedWorkout.exercises.length}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="px-4">
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-white rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-white">
          {isResting ? (
            <>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center"
              >
                <p className="text-xl mb-2 opacity-80">Descanso</p>
                <p className="text-7xl font-bold mb-4">{formatTime(timeLeft)}</p>
                <p className="text-lg opacity-70">
                  Próximo: {selectedWorkout.exercises[currentExerciseIndex + 1]?.name}
                </p>
              </motion.div>
            </>
          ) : (
            <>
              <motion.div
                key={currentExercise.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-center"
              >
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/20 flex items-center justify-center">
                  <Dumbbell className="w-12 h-12" />
                </div>
                <h2 className="text-2xl font-bold mb-2">{currentExercise.name}</h2>
                {currentExercise.description && (
                  <p className="text-white/70 mb-4">{currentExercise.description}</p>
                )}
                <p className="text-7xl font-bold mb-4">{formatTime(timeLeft)}</p>
                {currentExercise.reps && (
                  <p className="text-lg opacity-80">{currentExercise.reps} repetições</p>
                )}
                {currentExercise.sets && (
                  <p className="text-sm opacity-60">{currentExercise.sets} séries</p>
                )}
              </motion.div>
            </>
          )}
        </div>

        {/* Controls */}
        <div className="p-6 flex items-center justify-center gap-6">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="w-20 h-20 rounded-full bg-white text-primary-600 flex items-center justify-center shadow-lg"
          >
            {isPaused ? (
              <Play className="w-10 h-10 ml-1" />
            ) : (
              <Pause className="w-10 h-10" />
            )}
          </button>
        </div>

        {/* Exercise List Preview */}
        <div className="px-4 pb-6">
          <div className="bg-white/10 rounded-xl p-3 max-h-32 overflow-y-auto">
            {selectedWorkout.exercises.map((exercise, index) => (
              <div 
                key={exercise.id}
                className={`flex items-center gap-3 py-2 ${
                  index < currentExerciseIndex ? 'opacity-50' : ''
                } ${index === currentExerciseIndex ? 'text-white' : 'text-white/60'}`}
              >
                {index < currentExerciseIndex ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                ) : index === currentExerciseIndex ? (
                  <div className="w-5 h-5 rounded-full border-2 border-white animate-pulse" />
                ) : (
                  <div className="w-5 h-5 rounded-full border border-white/40" />
                )}
                <span className="text-sm">{exercise.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6 pb-24">
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
        <button 
          onClick={generateAIWorkout}
          disabled={isGenerating}
          className="btn-secondary p-3 rounded-xl"
        >
          {isGenerating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center py-4">
          <div className="text-2xl font-bold text-primary-600">{completedToday}</div>
          <div className="text-xs text-text-secondary">Treinos Hoje</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-2xl font-bold text-accent-500">{totalCalories}</div>
          <div className="text-xs text-text-secondary">Calorias</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-2xl font-bold text-secondary-600">{totalMinutes}</div>
          <div className="text-xs text-text-secondary">Minutos</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={generateAIWorkout}
          disabled={isGenerating}
          className="card flex flex-col items-center text-center hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center mb-3">
            {isGenerating ? (
              <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
            ) : (
              <Sparkles className="w-6 h-6 text-primary-600" />
            )}
          </div>
          <span className="font-medium">Gerar Treino</span>
          <span className="text-xs text-text-secondary">Personalizado com IA</span>
        </button>

        <button 
          onClick={() => startWorkout(PRESET_WORKOUTS[0])}
          className="card flex flex-col items-center text-center hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 rounded-2xl bg-secondary-100 flex items-center justify-center mb-3">
            <Play className="w-6 h-6 text-secondary-600" />
          </div>
          <span className="font-medium">Treino Rápido</span>
          <span className="text-xs text-text-secondary">15-20 minutos</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'today', label: 'Treinos' },
          { id: 'saved', label: 'Salvos' },
          { id: 'history', label: 'Histórico' },
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

      {/* Workout List */}
      {activeTab === 'today' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <h3 className="font-display font-semibold text-lg">Sugestões para Você</h3>
          
          {PRESET_WORKOUTS.map((workout) => (
            <motion.div
              key={workout.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => startWorkout(workout)}
              className="card flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${workout.color} flex items-center justify-center`}>
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
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(workout.level)}`}>
                {workout.level}
              </span>
            </motion.div>
          ))}
        </motion.div>
      )}

      {activeTab === 'saved' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {savedWorkouts.length === 0 ? (
            <div className="card text-center py-8 text-text-secondary">
              <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum treino salvo ainda</p>
              <p className="text-sm">Gere um treino com IA para salvar!</p>
            </div>
          ) : (
            savedWorkouts.map(workout => (
              <div 
                key={workout.id}
                onClick={() => startWorkout(workout)}
                className="card flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${workout.color} flex items-center justify-center`}>
                  <Dumbbell className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{workout.name}</h4>
                  <div className="flex items-center gap-3 text-sm text-text-secondary">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {workout.duration} min
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </motion.div>
      )}

      {activeTab === 'history' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card text-center py-8 text-text-secondary"
        >
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Histórico de treinos aparecerá aqui</p>
        </motion.div>
      )}

      {/* Weekly Goal */}
      <section>
        <h3 className="font-display font-semibold text-lg mb-4">Meta Semanal</h3>
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-text-secondary">{weeklyCompleted} de {weeklyGoal} treinos</span>
            <span className="text-primary-600 font-medium">
              {Math.round((weeklyCompleted / weeklyGoal) * 100)}%
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-primary-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((weeklyCompleted / weeklyGoal) * 100, 100)}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
