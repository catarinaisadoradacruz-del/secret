'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, Pause, RotateCcw, X, Check, Dumbbell, Clock, Flame, Target,
  ArrowLeft, SkipForward, ChevronRight, Info, Heart, Zap, Trophy
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Exercise {
  name: string
  duration: number
  reps?: number
  description: string
  tips: string[]
}

interface Workout {
  id: string
  name: string
  description: string
  duration: number
  calories: number
  difficulty: 'Iniciante' | 'Intermediário' | 'Avançado'
  category: string
  forPregnant: boolean
  color: string
  icon: string
  exercises: Exercise[]
}

const WORKOUTS: Workout[] = [
  {
    id: 'gestante-1', name: 'Gestante Iniciante', description: 'Treino leve e seguro para gestantes',
    duration: 15, calories: 80, difficulty: 'Iniciante', category: 'Gestante', forPregnant: true,
    color: 'from-pink-400 to-rose-500', icon: '🤰',
    exercises: [
      { name: 'Respiração Diafragmática', duration: 120, description: 'Inspire pelo nariz, expire pela boca', tips: ['Relaxe os ombros', 'Expanda a barriga'] },
      { name: 'Marcha Leve', duration: 90, description: 'Caminhe no lugar elevando os joelhos', tips: ['Mantenha postura ereta', 'Ritmo confortável'] },
      { name: 'Agachamento com Apoio', duration: 60, reps: 10, description: 'Segure em uma cadeira e agache', tips: ['Joelhos alinhados', 'Desça até onde for confortável'] },
      { name: 'Elevação de Braços', duration: 60, reps: 12, description: 'Eleve os braços lateralmente', tips: ['Movimento controlado', 'Não passe dos ombros'] },
      { name: 'Alongamento Suave', duration: 120, description: 'Alongue pescoço, ombros e costas', tips: ['Sem movimentos bruscos', 'Respire profundamente'] },
    ]
  },
  {
    id: 'yoga-prenatal', name: 'Yoga Pré-Natal', description: 'Relaxamento e flexibilidade',
    duration: 25, calories: 100, difficulty: 'Iniciante', category: 'Gestante', forPregnant: true,
    color: 'from-purple-400 to-violet-500', icon: '🧘',
    exercises: [
      { name: 'Postura da Montanha', duration: 60, description: 'Fique em pé, pés paralelos, respire', tips: ['Peso distribuído', 'Ombros relaxados'] },
      { name: 'Gato-Vaca', duration: 90, description: 'De quatro, alterne arquear e arredondar costas', tips: ['Siga a respiração', 'Movimento fluido'] },
      { name: 'Postura da Criança', duration: 90, description: 'Joelhos afastados, estenda os braços', tips: ['Joelhos bem abertos', 'Relaxe completamente'] },
      { name: 'Guerreiro Modificado', duration: 60, description: 'Pernas afastadas, braços estendidos', tips: ['Não force', 'Mantenha equilíbrio'] },
      { name: 'Borboleta Sentada', duration: 90, description: 'Sente, junte os pés, relaxe joelhos', tips: ['Coluna ereta', 'Respire profundo'] },
      { name: 'Relaxamento', duration: 180, description: 'Deite de lado esquerdo, relaxe', tips: ['Use travesseiro', 'Feche os olhos'] },
    ]
  },
  {
    id: 'full-body', name: 'Full Body Iniciante', description: 'Treino completo para todo corpo',
    duration: 20, calories: 150, difficulty: 'Iniciante', category: 'Full Body', forPregnant: false,
    color: 'from-green-400 to-emerald-500', icon: '💪',
    exercises: [
      { name: 'Aquecimento', duration: 120, description: 'Rotações articulares completas', tips: ['10 rotações cada lado', 'Aqueça bem'] },
      { name: 'Polichinelos', duration: 45, reps: 20, description: 'Salte abrindo braços e pernas', tips: ['Core ativado', 'Aterrisse suave'] },
      { name: 'Agachamento', duration: 45, reps: 15, description: 'Desça como se fosse sentar', tips: ['Peso nos calcanhares', 'Joelhos alinhar pés'] },
      { name: 'Flexão no Joelho', duration: 45, reps: 10, description: 'Flexão com joelhos apoiados', tips: ['Corpo em linha', 'Desça controlado'] },
      { name: 'Prancha', duration: 30, description: 'Mantenha corpo reto em prancha', tips: ['Quadril alinhado', 'Core contraído'] },
      { name: 'Alongamento', duration: 120, description: 'Alongue todos os músculos', tips: ['30s cada posição', 'Respire fundo'] },
    ]
  },
  {
    id: 'hiit-20', name: 'HIIT Queima Total', description: 'Alta intensidade para queimar gordura',
    duration: 20, calories: 250, difficulty: 'Intermediário', category: 'Cardio', forPregnant: false,
    color: 'from-orange-400 to-red-500', icon: '🔥',
    exercises: [
      { name: 'Aquecimento Dinâmico', duration: 120, description: 'Corrida no lugar + rotações', tips: ['Aumente intensidade gradual'] },
      { name: 'Burpees', duration: 30, reps: 10, description: 'Agache, prancha, flexão, salte', tips: ['Máximo esforço', 'Forma correta'] },
      { name: 'Mountain Climbers', duration: 30, description: 'Em prancha, alterne joelhos rápido', tips: ['Quadril baixo', 'Ritmo intenso'] },
      { name: 'Jump Squats', duration: 30, reps: 12, description: 'Agachamento com salto', tips: ['Aterrisse suave', 'Explosão máxima'] },
      { name: 'Prancha com Toque', duration: 30, description: 'Prancha tocando ombros alternados', tips: ['Minimize rotação', 'Core firme'] },
      { name: 'High Knees', duration: 30, description: 'Corrida elevando joelhos alto', tips: ['Braços acompanham', 'Ritmo constante'] },
      { name: 'Descanso Ativo', duration: 60, description: 'Caminhada leve no lugar', tips: ['Recupere o fôlego'] },
    ]
  },
  {
    id: 'forca-avancado', name: 'Força Avançado', description: 'Treino intenso de força corporal',
    duration: 30, calories: 300, difficulty: 'Avançado', category: 'Força', forPregnant: false,
    color: 'from-red-500 to-rose-600', icon: '🏋️',
    exercises: [
      { name: 'Aquecimento Completo', duration: 180, description: 'Mobilidade e ativação', tips: ['Prepare articulações', 'Ative core'] },
      { name: 'Flexão Diamante', duration: 45, reps: 12, description: 'Flexão com mãos juntas', tips: ['Cotovelos junto ao corpo', 'Desça controlado'] },
      { name: 'Pistol Squat', duration: 60, reps: 6, description: 'Agachamento uma perna', tips: ['Use apoio se precisar', 'Controle total'] },
      { name: 'Flexão Pike', duration: 45, reps: 10, description: 'Flexão com quadril elevado', tips: ['Foco nos ombros', 'Cabeça para chão'] },
      { name: 'L-Sit Hold', duration: 20, description: 'Sentado, eleve corpo e pernas', tips: ['Core extremo', 'Comece com joelhos dobrados'] },
      { name: 'Alongamento Profundo', duration: 180, description: 'Alongue todos os músculos', tips: ['1 min cada grupo', 'Relaxe completamente'] },
    ]
  },
  {
    id: 'energia-matinal', name: 'Energia Matinal', description: 'Desperte o corpo em 10 minutos',
    duration: 10, calories: 50, difficulty: 'Iniciante', category: 'Especial', forPregnant: true,
    color: 'from-amber-400 to-yellow-500', icon: '☀️',
    exercises: [
      { name: 'Espreguiçar', duration: 60, description: 'Estique todo o corpo acordando', tips: ['Braços e pernas', 'Boceje'] },
      { name: 'Rotações de Pescoço', duration: 45, description: 'Gire a cabeça suavemente', tips: ['Movimentos lentos', '5 cada lado'] },
      { name: 'Gato-Vaca', duration: 60, description: 'Mobilize a coluna', tips: ['Inspire arqueando', 'Expire arredondando'] },
      { name: 'Marcha Energizante', duration: 120, description: 'Caminhe no lugar aumentando ritmo', tips: ['Comece devagar', 'Aumente energia'] },
      { name: 'Respiração Energética', duration: 60, description: '10 respirações profundas', tips: ['Inspire energia', 'Expire cansaço'] },
    ]
  },
]

const CATEGORIES = ['Todos', 'Gestante', 'Full Body', 'Cardio', 'Força', 'Especial']

export default function WorkoutPage() {
  const [category, setCategory] = useState('Todos')
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null)
  const [isTraining, setIsTraining] = useState(false)
  const [currentExercise, setCurrentExercise] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isResting, setIsResting] = useState(false)
  const [completed, setCompleted] = useState<number[]>([])
  const [totalBurned, setTotalBurned] = useState(0)
  const [showInfo, setShowInfo] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isTraining && !isPaused && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    } else if (timeLeft === 0 && isTraining && !isPaused) {
      handleComplete()
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [timeLeft, isTraining, isPaused])

  const filteredWorkouts = WORKOUTS.filter(w => category === 'Todos' || w.category === category)

  const startWorkout = (workout: Workout) => {
    setSelectedWorkout(workout)
    setCurrentExercise(0)
    setCompleted([])
    setTotalBurned(0)
    setIsTraining(true)
    setIsResting(false)
    setIsPaused(false)
    setTimeLeft(workout.exercises[0].duration)
  }

  const handleComplete = () => {
    if (!selectedWorkout) return
    
    if (isResting) {
      setIsResting(false)
      if (currentExercise < selectedWorkout.exercises.length - 1) {
        const next = currentExercise + 1
        setCurrentExercise(next)
        setTimeLeft(selectedWorkout.exercises[next].duration)
      } else {
        finishWorkout()
      }
    } else {
      setCompleted(prev => [...prev, currentExercise])
      setTotalBurned(prev => prev + selectedWorkout.calories / selectedWorkout.exercises.length)
      
      if (currentExercise < selectedWorkout.exercises.length - 1) {
        setIsResting(true)
        setTimeLeft(30) // 30s de descanso
      } else {
        finishWorkout()
      }
    }
  }

  const finishWorkout = async () => {
    setIsTraining(false)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user && selectedWorkout) {
        await supabase.from('workouts').insert({
          user_id: user.id,
          name: selectedWorkout.name,
          duration: selectedWorkout.duration,
          calories_burned: Math.round(totalBurned),
          exercises_completed: completed.length + 1,
          completed: true
        })
      }
    } catch (e) {
      console.error(e)
    }
  }

  const skip = () => {
    if (!selectedWorkout) return
    setIsResting(false)
    if (currentExercise < selectedWorkout.exercises.length - 1) {
      const next = currentExercise + 1
      setCurrentExercise(next)
      setTimeLeft(selectedWorkout.exercises[next].duration)
    } else {
      finishWorkout()
    }
  }

  const formatTime = (s: number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`

  // TELA DE TREINO ATIVO
  if (isTraining && selectedWorkout) {
    const exercise = selectedWorkout.exercises[currentExercise]
    const progress = ((currentExercise + (isResting ? 0.5 : 0)) / selectedWorkout.exercises.length) * 100

    return (
      <div className={`min-h-screen bg-gradient-to-br ${selectedWorkout.color} text-white`}>
        <div className="max-w-2xl mx-auto p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => { setIsTraining(false); setSelectedWorkout(null) }} className="p-2 hover:bg-white/10 rounded-full">
              <X className="w-6 h-6" />
            </button>
            <span className="font-semibold">{selectedWorkout.name}</span>
            <button onClick={() => setShowInfo(!showInfo)} className="p-2 hover:bg-white/10 rounded-full">
              <Info className="w-6 h-6" />
            </button>
          </div>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span>{currentExercise + 1}/{selectedWorkout.exercises.length}</span>
              <span>{Math.round(totalBurned)} kcal</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div className="h-full bg-white" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Exercise Display */}
          <motion.div
            key={`${currentExercise}-${isResting}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <div className="text-8xl mb-6">{isResting ? '😮‍💨' : selectedWorkout.icon}</div>
            <h2 className="text-2xl font-bold mb-2">
              {isResting ? 'Descanse' : exercise.name}
            </h2>
            <p className="text-white/80 mb-4 max-w-md mx-auto">
              {isResting ? 'Respire fundo, próximo exercício em breve' : exercise.description}
            </p>
            {exercise.reps && !isResting && (
              <div className="inline-block bg-white/20 px-4 py-2 rounded-xl mb-4">
                {exercise.reps} repetições
              </div>
            )}
          </motion.div>

          {/* Timer */}
          <div className="text-center mb-8">
            <div className="text-8xl font-bold tabular-nums">{formatTime(timeLeft)}</div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="w-20 h-20 rounded-full bg-white text-gray-800 flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
            >
              {isPaused ? <Play className="w-10 h-10 ml-1" /> : <Pause className="w-10 h-10" />}
            </button>
            <button onClick={skip} className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
              <SkipForward className="w-7 h-7" />
            </button>
          </div>

          {/* Next Exercise */}
          {currentExercise < selectedWorkout.exercises.length - 1 && (
            <div className="bg-white/10 rounded-2xl p-4 text-center">
              <p className="text-white/60 text-sm">Próximo:</p>
              <p className="font-semibold">{selectedWorkout.exercises[currentExercise + 1].name}</p>
            </div>
          )}

          {/* Info Modal */}
          <AnimatePresence>
            {showInfo && !isResting && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-50 flex items-end"
                onClick={() => setShowInfo(false)}
              >
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  onClick={e => e.stopPropagation()}
                  className="bg-white text-gray-900 rounded-t-3xl w-full p-6"
                >
                  <h3 className="text-xl font-bold mb-3">{exercise.name}</h3>
                  <p className="text-gray-600 mb-4">{exercise.description}</p>
                  <h4 className="font-semibold mb-2">💡 Dicas:</h4>
                  <ul className="space-y-2">
                    {exercise.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-gray-600">
                        <Check className="w-4 h-4 text-green-500 mt-0.5" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    )
  }

  // TELA DE CONCLUSÃO
  if (selectedWorkout && !isTraining && completed.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="text-8xl mb-6">🎉</div>
          <h1 className="text-3xl font-bold mb-2">Parabéns!</h1>
          <p className="text-xl mb-8 text-white/80">Treino concluído com sucesso!</p>
          
          <div className="bg-white/10 rounded-2xl p-6 mb-8 grid grid-cols-2 gap-4">
            <div className="text-center">
              <Flame className="w-8 h-8 mx-auto mb-2" />
              <p className="text-2xl font-bold">{Math.round(totalBurned)}</p>
              <p className="text-sm text-white/60">calorias</p>
            </div>
            <div className="text-center">
              <Clock className="w-8 h-8 mx-auto mb-2" />
              <p className="text-2xl font-bold">{selectedWorkout.duration}</p>
              <p className="text-sm text-white/60">minutos</p>
            </div>
            <div className="text-center">
              <Target className="w-8 h-8 mx-auto mb-2" />
              <p className="text-2xl font-bold">{completed.length + 1}</p>
              <p className="text-sm text-white/60">exercícios</p>
            </div>
            <div className="text-center">
              <Trophy className="w-8 h-8 mx-auto mb-2" />
              <p className="text-2xl font-bold">+{selectedWorkout.duration * 2}</p>
              <p className="text-sm text-white/60">pontos</p>
            </div>
          </div>

          <button 
            onClick={() => { setSelectedWorkout(null); setCompleted([]) }}
            className="bg-white text-green-600 px-8 py-3 rounded-full font-semibold hover:bg-white/90"
          >
            Voltar aos Treinos
          </button>
        </motion.div>
      </div>
    )
  }

  // LISTA DE TREINOS
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-xl">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">Treinos</h1>
              <p className="text-sm text-gray-500">{filteredWorkouts.length} treinos disponíveis</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  category === cat
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Grid de Treinos */}
      <div className="max-w-4xl mx-auto p-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredWorkouts.map(workout => (
            <motion.div
              key={workout.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4 }}
              className="bg-white rounded-2xl shadow-sm overflow-hidden cursor-pointer"
              onClick={() => startWorkout(workout)}
            >
              <div className={`bg-gradient-to-br ${workout.color} p-5 text-white`}>
                <div className="flex items-start justify-between mb-3">
                  <span className="text-4xl">{workout.icon}</span>
                  {workout.forPregnant && (
                    <span className="bg-white/20 text-xs px-2 py-1 rounded-full">🤰 Seguro</span>
                  )}
                </div>
                <h3 className="text-lg font-bold">{workout.name}</h3>
                <p className="text-white/80 text-sm">{workout.description}</p>
              </div>
              
              <div className="p-4">
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" /> {workout.duration} min
                  </span>
                  <span className="flex items-center gap-1">
                    <Flame className="w-4 h-4" /> {workout.calories} kcal
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    workout.difficulty === 'Iniciante' ? 'bg-green-100 text-green-700' :
                    workout.difficulty === 'Intermediário' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {workout.difficulty}
                  </span>
                  <span className="text-xs text-gray-500">{workout.exercises.length} exercícios</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
