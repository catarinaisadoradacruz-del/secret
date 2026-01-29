'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, Pause, RotateCcw, Timer, Flame, Trophy, 
  ChevronRight, ArrowLeft, Check, X, Dumbbell,
  Heart, Sparkles, Clock, Target, Calendar
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Exercise {
  id: string
  name: string
  duration: number // segundos
  reps?: number
  sets?: number
  restTime: number // segundos
  description: string
  icon: string
  muscleGroup: string
}

interface Workout {
  id: string
  name: string
  description: string
  duration: number // minutos total
  difficulty: 'Iniciante' | 'Intermediário' | 'Avançado'
  calories: number
  exercises: Exercise[]
  color: string
  icon: string
  forPregnant: boolean
}

const WORKOUTS: Workout[] = [
  {
    id: 'beginner',
    name: 'Treino Iniciante',
    description: 'Perfeito para começar sua jornada fitness',
    duration: 20,
    difficulty: 'Iniciante',
    calories: 120,
    color: 'from-green-400 to-emerald-500',
    icon: '🌱',
    forPregnant: true,
    exercises: [
      { id: '1', name: 'Aquecimento', duration: 120, restTime: 30, description: 'Movimentos leves para aquecer o corpo', icon: '🔥', muscleGroup: 'Corpo todo' },
      { id: '2', name: 'Agachamento', duration: 45, reps: 12, sets: 3, restTime: 45, description: 'Pés na largura dos ombros, desça como se fosse sentar', icon: '🦵', muscleGroup: 'Pernas' },
      { id: '3', name: 'Flexão de braço (joelhos)', duration: 45, reps: 10, sets: 3, restTime: 45, description: 'Apoie os joelhos no chão para facilitar', icon: '💪', muscleGroup: 'Peito e braços' },
      { id: '4', name: 'Prancha', duration: 30, sets: 3, restTime: 30, description: 'Mantenha o corpo reto, contraindo o abdômen', icon: '🧘', muscleGroup: 'Core' },
      { id: '5', name: 'Alongamento', duration: 180, restTime: 0, description: 'Alongue todos os músculos trabalhados', icon: '🙆', muscleGroup: 'Corpo todo' },
    ]
  },
  {
    id: 'core',
    name: 'Fortalecimento Core',
    description: 'Fortaleça seu abdômen e lombar',
    duration: 25,
    difficulty: 'Intermediário',
    calories: 150,
    color: 'from-purple-400 to-violet-500',
    icon: '🎯',
    forPregnant: false,
    exercises: [
      { id: '1', name: 'Aquecimento Core', duration: 120, restTime: 30, description: 'Rotações de tronco e mobilidade de quadril', icon: '🔥', muscleGroup: 'Core' },
      { id: '2', name: 'Prancha frontal', duration: 45, sets: 4, restTime: 30, description: 'Mantenha o corpo alinhado', icon: '🧘', muscleGroup: 'Abdômen' },
      { id: '3', name: 'Prancha lateral', duration: 30, sets: 3, restTime: 30, description: 'Alterne os lados', icon: '🔄', muscleGroup: 'Oblíquos' },
      { id: '4', name: 'Bicicleta no ar', duration: 45, reps: 20, sets: 3, restTime: 30, description: 'Movimento de pedalar deitado', icon: '🚴', muscleGroup: 'Abdômen' },
      { id: '5', name: 'Superman', duration: 30, reps: 15, sets: 3, restTime: 30, description: 'Fortaleça a lombar', icon: '🦸', muscleGroup: 'Lombar' },
      { id: '6', name: 'Alongamento', duration: 180, restTime: 0, description: 'Alongue abdômen e lombar', icon: '🙆', muscleGroup: 'Core' },
    ]
  },
  {
    id: 'cardio',
    name: 'Cardio em Casa',
    description: 'Queime calorias sem sair de casa',
    duration: 30,
    difficulty: 'Intermediário',
    calories: 250,
    color: 'from-orange-400 to-red-500',
    icon: '❤️‍🔥',
    forPregnant: false,
    exercises: [
      { id: '1', name: 'Polichinelo', duration: 60, sets: 3, restTime: 30, description: 'Pule abrindo braços e pernas', icon: '⭐', muscleGroup: 'Corpo todo' },
      { id: '2', name: 'Corrida no lugar', duration: 60, sets: 3, restTime: 30, description: 'Eleve os joelhos alternadamente', icon: '🏃', muscleGroup: 'Pernas' },
      { id: '3', name: 'Burpee modificado', duration: 45, reps: 10, sets: 3, restTime: 45, description: 'Agache, estenda as pernas, volte', icon: '💥', muscleGroup: 'Corpo todo' },
      { id: '4', name: 'Mountain climber', duration: 45, sets: 3, restTime: 30, description: 'Posição de prancha, alterne joelhos', icon: '🏔️', muscleGroup: 'Core e pernas' },
      { id: '5', name: 'Skipping', duration: 45, sets: 3, restTime: 30, description: 'Corra elevando os joelhos', icon: '🦘', muscleGroup: 'Pernas' },
      { id: '6', name: 'Desaquecimento', duration: 180, restTime: 0, description: 'Caminhada leve e alongamento', icon: '🚶', muscleGroup: 'Corpo todo' },
    ]
  },
  {
    id: 'prenatal',
    name: 'Treino Pré-Natal',
    description: 'Seguro e eficaz para gestantes',
    duration: 20,
    difficulty: 'Iniciante',
    calories: 80,
    color: 'from-pink-400 to-rose-500',
    icon: '🤰',
    forPregnant: true,
    exercises: [
      { id: '1', name: 'Respiração diafragmática', duration: 120, restTime: 30, description: 'Inspire profundamente expandindo a barriga', icon: '🌬️', muscleGroup: 'Diafragma' },
      { id: '2', name: 'Agachamento com apoio', duration: 30, reps: 10, sets: 3, restTime: 45, description: 'Segure em uma cadeira para equilíbrio', icon: '🪑', muscleGroup: 'Pernas' },
      { id: '3', name: 'Elevação lateral de perna', duration: 30, reps: 12, sets: 2, restTime: 30, description: 'Deite de lado, eleve a perna', icon: '🦵', muscleGroup: 'Quadril' },
      { id: '4', name: 'Gato-vaca', duration: 60, sets: 3, restTime: 30, description: 'Alterne arqueando e curvando a coluna', icon: '🐱', muscleGroup: 'Coluna' },
      { id: '5', name: 'Kegel', duration: 60, sets: 3, restTime: 30, description: 'Contraia o assoalho pélvico', icon: '💎', muscleGroup: 'Assoalho pélvico' },
      { id: '6', name: 'Relaxamento', duration: 180, restTime: 0, description: 'Respiração e alongamento suave', icon: '🧘‍♀️', muscleGroup: 'Corpo todo' },
    ]
  },
]

export default function WorkoutPage() {
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isResting, setIsResting] = useState(false)
  const [currentSet, setCurrentSet] = useState(1)
  const [completedWorkouts, setCompletedWorkouts] = useState(0)
  const [totalCalories, setTotalCalories] = useState(0)
  const [totalMinutes, setTotalMinutes] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    loadUserStats()
    // Criar elemento de áudio para notificações
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleF8Uh7teleF8Uf/g')
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const loadUserStats = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      setUserId(user.id)
      
      // Buscar treinos de hoje
      const today = new Date().toISOString().split('T')[0]
      const { data: todayWorkouts } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', today)
      
      if (todayWorkouts) {
        setCompletedWorkouts(todayWorkouts.length)
        setTotalCalories(todayWorkouts.reduce((sum, w) => sum + (w.calories_burned || 0), 0))
        setTotalMinutes(todayWorkouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0))
      }
    }
  }

  const playBeep = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
    }
  }

  const startWorkout = (workout: Workout) => {
    setSelectedWorkout(workout)
    setCurrentExerciseIndex(0)
    setCurrentSet(1)
    setIsResting(false)
    setTimeLeft(workout.exercises[0].duration)
    setIsRunning(false)
  }

  const toggleTimer = () => {
    setIsRunning(!isRunning)
  }

  const resetExercise = () => {
    if (selectedWorkout) {
      const exercise = selectedWorkout.exercises[currentExerciseIndex]
      setTimeLeft(isResting ? exercise.restTime : exercise.duration)
    }
  }

  const skipExercise = () => {
    if (!selectedWorkout) return
    
    const exercise = selectedWorkout.exercises[currentExerciseIndex]
    const totalSets = exercise.sets || 1
    
    if (isResting) {
      // Fim do descanso, próxima série ou exercício
      if (currentSet < totalSets) {
        setCurrentSet(currentSet + 1)
        setIsResting(false)
        setTimeLeft(exercise.duration)
      } else {
        nextExercise()
      }
    } else {
      // Fim do exercício
      if (exercise.restTime > 0 && currentSet < totalSets) {
        setIsResting(true)
        setTimeLeft(exercise.restTime)
        playBeep()
      } else if (currentSet < totalSets) {
        setCurrentSet(currentSet + 1)
        setTimeLeft(exercise.duration)
      } else {
        nextExercise()
      }
    }
  }

  const nextExercise = () => {
    if (!selectedWorkout) return
    
    if (currentExerciseIndex < selectedWorkout.exercises.length - 1) {
      const nextIndex = currentExerciseIndex + 1
      setCurrentExerciseIndex(nextIndex)
      setCurrentSet(1)
      setIsResting(false)
      setTimeLeft(selectedWorkout.exercises[nextIndex].duration)
      playBeep()
    } else {
      // Treino completo!
      completeWorkout()
    }
  }

  const completeWorkout = async () => {
    setIsRunning(false)
    setShowCompleteModal(true)
    
    if (selectedWorkout && userId) {
      try {
        const supabase = createClient()
        await supabase.from('workouts').insert({
          user_id: userId,
          name: selectedWorkout.name,
          type: selectedWorkout.id,
          duration_minutes: selectedWorkout.duration,
          calories_burned: selectedWorkout.calories,
          exercises_completed: selectedWorkout.exercises.length
        })
        
        // Atualizar estatísticas locais
        setCompletedWorkouts(prev => prev + 1)
        setTotalCalories(prev => prev + selectedWorkout.calories)
        setTotalMinutes(prev => prev + selectedWorkout.duration)
      } catch (error) {
        console.error('Erro ao salvar treino:', error)
      }
    }
  }

  const exitWorkout = () => {
    setSelectedWorkout(null)
    setIsRunning(false)
    setCurrentExerciseIndex(0)
    setCurrentSet(1)
    setShowCompleteModal(false)
  }

  // Timer effect
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            skipExercise()
            return 0
          }
          // Beep nos últimos 3 segundos
          if (prev <= 4) playBeep()
          return prev - 1
        })
      }, 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRunning, timeLeft, currentExerciseIndex, currentSet, isResting])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getCurrentProgress = () => {
    if (!selectedWorkout) return 0
    const totalExercises = selectedWorkout.exercises.length
    return ((currentExerciseIndex + (isResting ? 0.5 : 0)) / totalExercises) * 100
  }

  // Tela de treino ativo
  if (selectedWorkout) {
    const currentExercise = selectedWorkout.exercises[currentExerciseIndex]
    const totalSets = currentExercise.sets || 1
    
    return (
      <div className={`min-h-screen bg-gradient-to-br ${selectedWorkout.color} text-white`}>
        {/* Modal de conclusão */}
        <AnimatePresence>
          {showCompleteModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-3xl p-8 max-w-sm w-full text-center"
              >
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Parabéns!</h2>
                <p className="text-gray-600 mb-6">Você completou o {selectedWorkout.name}!</p>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <Flame className="w-6 h-6 text-orange-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-gray-800">{selectedWorkout.calories}</p>
                    <p className="text-xs text-gray-500">calorias</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <Clock className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-gray-800">{selectedWorkout.duration}</p>
                    <p className="text-xs text-gray-500">minutos</p>
                  </div>
                </div>
                
                <button
                  onClick={exitWorkout}
                  className="w-full bg-rose-500 text-white py-3 rounded-xl font-semibold hover:bg-rose-600 transition-colors"
                >
                  Voltar aos treinos
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="p-4 flex items-center justify-between">
          <button onClick={exitWorkout} className="p-2 bg-white/20 rounded-xl">
            <X className="w-6 h-6" />
          </button>
          <div className="text-center">
            <p className="text-sm opacity-80">Exercício {currentExerciseIndex + 1}/{selectedWorkout.exercises.length}</p>
            <p className="font-semibold">{selectedWorkout.name}</p>
          </div>
          <div className="w-10" />
        </div>

        {/* Barra de progresso */}
        <div className="px-4 mb-8">
          <div className="h-2 bg-white/30 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white"
              initial={{ width: 0 }}
              animate={{ width: `${getCurrentProgress()}%` }}
            />
          </div>
        </div>

        {/* Conteúdo principal */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-32">
          {/* Ícone do exercício */}
          <motion.div
            key={`${currentExerciseIndex}-${isResting}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-8xl mb-6"
          >
            {isResting ? '😮‍💨' : currentExercise.icon}
          </motion.div>

          {/* Nome do exercício */}
          <h2 className="text-3xl font-bold text-center mb-2">
            {isResting ? 'Descanse' : currentExercise.name}
          </h2>
          
          {/* Descrição */}
          <p className="text-white/80 text-center mb-8 max-w-xs">
            {isResting ? 'Respire fundo e prepare-se para a próxima série' : currentExercise.description}
          </p>

          {/* Timer circular */}
          <div className="relative mb-8">
            <svg className="w-48 h-48 transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                fill="none"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="8"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                fill="none"
                stroke="white"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={553}
                strokeDashoffset={553 - (553 * (timeLeft / (isResting ? currentExercise.restTime : currentExercise.duration)))}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-bold">{formatTime(timeLeft)}</span>
              {totalSets > 1 && (
                <span className="text-lg opacity-80">Série {currentSet}/{totalSets}</span>
              )}
            </div>
          </div>

          {/* Informações adicionais */}
          {!isResting && (currentExercise.reps || currentExercise.sets) && (
            <div className="flex gap-4 mb-8">
              {currentExercise.reps && (
                <div className="bg-white/20 px-4 py-2 rounded-xl">
                  <span className="font-semibold">{currentExercise.reps} repetições</span>
                </div>
              )}
              {currentExercise.sets && (
                <div className="bg-white/20 px-4 py-2 rounded-xl">
                  <span className="font-semibold">{currentExercise.sets} séries</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controles */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/30 to-transparent">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={resetExercise}
              className="p-4 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            >
              <RotateCcw className="w-6 h-6" />
            </button>
            
            <button
              onClick={toggleTimer}
              className="p-6 bg-white rounded-full text-gray-800 shadow-xl hover:scale-105 transition-transform"
            >
              {isRunning ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
            </button>
            
            <button
              onClick={skipExercise}
              className="p-4 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Tela de seleção de treino
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/50 to-white pb-24">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-xl">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="font-bold text-xl text-gray-800">Treinos</h1>
            <p className="text-sm text-gray-500">Escolha seu treino de hoje</p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Estatísticas do dia */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
            <Trophy className="w-6 h-6 text-amber-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">{completedWorkouts}</p>
            <p className="text-xs text-gray-500">treinos hoje</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
            <Flame className="w-6 h-6 text-orange-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">{totalCalories}</p>
            <p className="text-xs text-gray-500">calorias</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
            <Clock className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">{totalMinutes}</p>
            <p className="text-xs text-gray-500">minutos</p>
          </div>
        </div>

        {/* Meta semanal */}
        <div className="bg-gradient-to-r from-rose-500 to-pink-500 rounded-2xl p-5 text-white mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              <span className="font-semibold">Meta Semanal</span>
            </div>
            <span className="text-sm opacity-90">{completedWorkouts}/5 treinos</span>
          </div>
          <div className="h-3 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full transition-all"
              style={{ width: `${Math.min((completedWorkouts / 5) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Lista de treinos */}
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-rose-500" />
          Treinos Disponíveis
        </h2>

        <div className="space-y-4">
          {WORKOUTS.map((workout) => (
            <motion.button
              key={workout.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => startWorkout(workout)}
              className={`w-full bg-gradient-to-r ${workout.color} rounded-2xl p-5 text-white text-left shadow-lg`}
            >
              <div className="flex items-start gap-4">
                <div className="text-4xl">{workout.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg">{workout.name}</h3>
                    {workout.forPregnant && (
                      <span className="text-xs bg-white/30 px-2 py-0.5 rounded-full">Gestante</span>
                    )}
                  </div>
                  <p className="text-sm opacity-90 mb-3">{workout.description}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {workout.duration} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Flame className="w-4 h-4" />
                      {workout.calories} kcal
                    </span>
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                      {workout.difficulty}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 opacity-80" />
              </div>
            </motion.button>
          ))}
        </div>

        {/* Dica */}
        <div className="mt-8 bg-amber-50 rounded-2xl p-4 border border-amber-100">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-500 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Dica do dia</p>
              <p className="text-sm text-amber-700 mt-1">
                Comece com aquecimento e termine com alongamento para evitar lesões e melhorar seus resultados! 🌟
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
