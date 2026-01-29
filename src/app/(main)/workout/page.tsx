'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Play, Pause, X, Check, Dumbbell, Clock, Flame, Target,
  ArrowLeft, SkipForward, Info, Trophy
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
  difficulty: string
  category: string
  forPregnant: boolean
  color: string
  icon: string
  exercises: Exercise[]
}

const WORKOUTS: Workout[] = [
  {
    id: 'gestante-1', name: 'Gestante Iniciante', description: 'Treino leve e seguro',
    duration: 15, calories: 80, difficulty: 'Iniciante', category: 'Gestante', forPregnant: true,
    color: 'from-pink-400 to-rose-500', icon: '🤰',
    exercises: [
      { name: 'Respiração', duration: 120, description: 'Inspire pelo nariz, expire pela boca', tips: ['Relaxe os ombros'] },
      { name: 'Marcha Leve', duration: 90, description: 'Caminhe no lugar', tips: ['Postura ereta'] },
      { name: 'Agachamento', duration: 60, reps: 10, description: 'Com apoio na cadeira', tips: ['Joelhos alinhados'] },
      { name: 'Elevação de Braços', duration: 60, reps: 12, description: 'Lateralmente', tips: ['Controlado'] },
      { name: 'Alongamento', duration: 120, description: 'Pescoço, ombros e costas', tips: ['Respire fundo'] },
    ]
  },
  {
    id: 'yoga', name: 'Yoga Pré-Natal', description: 'Relaxamento',
    duration: 25, calories: 100, difficulty: 'Iniciante', category: 'Gestante', forPregnant: true,
    color: 'from-purple-400 to-violet-500', icon: '🧘',
    exercises: [
      { name: 'Postura da Montanha', duration: 60, description: 'Em pé, respire', tips: ['Peso distribuído'] },
      { name: 'Gato-Vaca', duration: 90, description: 'De quatro, alterne', tips: ['Siga a respiração'] },
      { name: 'Postura da Criança', duration: 90, description: 'Joelhos afastados', tips: ['Relaxe'] },
      { name: 'Guerreiro', duration: 60, description: 'Pernas afastadas', tips: ['Não force'] },
      { name: 'Borboleta', duration: 90, description: 'Sentada, pés juntos', tips: ['Coluna ereta'] },
      { name: 'Relaxamento', duration: 180, description: 'Lado esquerdo', tips: ['Use travesseiro'] },
    ]
  },
  {
    id: 'fullbody', name: 'Full Body', description: 'Treino completo',
    duration: 20, calories: 150, difficulty: 'Iniciante', category: 'Full Body', forPregnant: false,
    color: 'from-green-400 to-emerald-500', icon: '💪',
    exercises: [
      { name: 'Aquecimento', duration: 120, description: 'Rotações articulares', tips: ['Aqueça bem'] },
      { name: 'Polichinelos', duration: 45, reps: 20, description: 'Salte abrindo', tips: ['Core ativado'] },
      { name: 'Agachamento', duration: 45, reps: 15, description: 'Desça como sentar', tips: ['Peso nos calcanhares'] },
      { name: 'Flexão', duration: 45, reps: 10, description: 'Joelhos apoiados', tips: ['Corpo em linha'] },
      { name: 'Prancha', duration: 30, description: 'Corpo reto', tips: ['Core contraído'] },
      { name: 'Alongamento', duration: 120, description: 'Todos os músculos', tips: ['Respire'] },
    ]
  },
  {
    id: 'hiit', name: 'HIIT Queima', description: 'Alta intensidade',
    duration: 20, calories: 250, difficulty: 'Intermediário', category: 'Cardio', forPregnant: false,
    color: 'from-orange-400 to-red-500', icon: '🔥',
    exercises: [
      { name: 'Aquecimento', duration: 120, description: 'Corrida leve', tips: ['Gradual'] },
      { name: 'Burpees', duration: 30, reps: 10, description: 'Completo', tips: ['Máximo esforço'] },
      { name: 'Mountain Climbers', duration: 30, description: 'Rápido', tips: ['Quadril baixo'] },
      { name: 'Jump Squats', duration: 30, reps: 12, description: 'Com salto', tips: ['Aterrisse suave'] },
      { name: 'Prancha Toque', duration: 30, description: 'Toque ombros', tips: ['Core firme'] },
      { name: 'High Knees', duration: 30, description: 'Joelhos altos', tips: ['Ritmo'] },
    ]
  },
  {
    id: 'matinal', name: 'Energia Matinal', description: 'Desperte em 10min',
    duration: 10, calories: 50, difficulty: 'Iniciante', category: 'Especial', forPregnant: true,
    color: 'from-amber-400 to-yellow-500', icon: '☀️',
    exercises: [
      { name: 'Espreguiçar', duration: 60, description: 'Estique todo corpo', tips: ['Natural'] },
      { name: 'Rotações', duration: 45, description: 'Pescoço suave', tips: ['Lento'] },
      { name: 'Gato-Vaca', duration: 60, description: 'Mobilize coluna', tips: ['Respire'] },
      { name: 'Marcha', duration: 120, description: 'Aumente ritmo', tips: ['Energia'] },
      { name: 'Respiração', duration: 60, description: '10 profundas', tips: ['Energize'] },
    ]
  },
]

const CATEGORIES = ['Todos', 'Gestante', 'Full Body', 'Cardio', 'Especial']

export default function WorkoutPage() {
  const [category, setCategory] = useState('Todos')
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [training, setTraining] = useState(false)
  const [exerciseIdx, setExerciseIdx] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [paused, setPaused] = useState(false)
  const [resting, setResting] = useState(false)
  const [done, setDone] = useState<number[]>([])
  const [burned, setBurned] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (training && !paused && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    } else if (timeLeft === 0 && training && !paused) {
      handleDone()
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [timeLeft, training, paused])

  const filtered = WORKOUTS.filter(w => category === 'Todos' || w.category === category)

  const start = (w: Workout) => {
    setWorkout(w)
    setExerciseIdx(0)
    setDone([])
    setBurned(0)
    setTraining(true)
    setResting(false)
    setPaused(false)
    setTimeLeft(w.exercises[0].duration)
  }

  const handleDone = () => {
    if (!workout) return
    if (resting) {
      setResting(false)
      if (exerciseIdx < workout.exercises.length - 1) {
        const next = exerciseIdx + 1
        setExerciseIdx(next)
        setTimeLeft(workout.exercises[next].duration)
      } else { finish() }
    } else {
      setDone(p => [...p, exerciseIdx])
      setBurned(p => p + workout.calories / workout.exercises.length)
      if (exerciseIdx < workout.exercises.length - 1) {
        setResting(true)
        setTimeLeft(30)
      } else { finish() }
    }
  }

  const finish = async () => {
    setTraining(false)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user && workout) {
        await supabase.from('workouts').insert({
          user_id: user.id, name: workout.name, duration: workout.duration,
          calories_burned: Math.round(burned), exercises_completed: done.length + 1, completed: true
        })
      }
    } catch (e) { console.error(e) }
  }

  const skip = () => {
    if (!workout) return
    setResting(false)
    if (exerciseIdx < workout.exercises.length - 1) {
      const next = exerciseIdx + 1
      setExerciseIdx(next)
      setTimeLeft(workout.exercises[next].duration)
    } else { finish() }
  }

  const fmt = (s: number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`

  // Treino ativo
  if (training && workout) {
    const ex = workout.exercises[exerciseIdx]
    const pct = ((exerciseIdx + (resting ? 0.5 : 0)) / workout.exercises.length) * 100

    return (
      <div className={`min-h-screen bg-gradient-to-br ${workout.color} text-white p-4`}>
        <div className="max-w-md mx-auto">
          <div className="flex justify-between mb-4">
            <button onClick={() => { setTraining(false); setWorkout(null) }} className="p-2"><X className="w-6 h-6" /></button>
            <span className="font-semibold">{workout.name}</span>
            <div className="w-10" />
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span>{exerciseIdx + 1}/{workout.exercises.length}</span>
              <span>{Math.round(burned)} kcal</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="text-center py-8">
            <div className="text-7xl mb-4">{resting ? '😮‍💨' : workout.icon}</div>
            <h2 className="text-2xl font-bold mb-2">{resting ? 'Descanse' : ex.name}</h2>
            <p className="text-white/80 mb-4">{resting ? 'Próximo em breve' : ex.description}</p>
            {ex.reps && !resting && <div className="bg-white/20 px-4 py-2 rounded-xl inline-block mb-4">{ex.reps} reps</div>}
          </div>

          <div className="text-center text-7xl font-bold mb-8">{fmt(timeLeft)}</div>

          <div className="flex justify-center gap-4 mb-8">
            <button onClick={() => setPaused(!paused)} className="w-16 h-16 rounded-full bg-white text-gray-800 flex items-center justify-center">
              {paused ? <Play className="w-8 h-8 ml-1" /> : <Pause className="w-8 h-8" />}
            </button>
            <button onClick={skip} className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <SkipForward className="w-6 h-6" />
            </button>
          </div>

          {exerciseIdx < workout.exercises.length - 1 && (
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-white/60 text-sm">Próximo:</p>
              <p className="font-semibold">{workout.exercises[exerciseIdx + 1].name}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Conclusão
  if (workout && !training && done.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-7xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold mb-2">Parabéns!</h1>
          <p className="text-xl mb-6 text-white/80">Treino concluído!</p>
          
          <div className="bg-white/10 rounded-2xl p-4 mb-6 grid grid-cols-2 gap-4">
            <div><Flame className="w-6 h-6 mx-auto mb-1" /><p className="text-xl font-bold">{Math.round(burned)}</p><p className="text-xs text-white/60">kcal</p></div>
            <div><Clock className="w-6 h-6 mx-auto mb-1" /><p className="text-xl font-bold">{workout.duration}</p><p className="text-xs text-white/60">min</p></div>
            <div><Target className="w-6 h-6 mx-auto mb-1" /><p className="text-xl font-bold">{done.length + 1}</p><p className="text-xs text-white/60">exercícios</p></div>
            <div><Trophy className="w-6 h-6 mx-auto mb-1" /><p className="text-xl font-bold">+{workout.duration * 2}</p><p className="text-xs text-white/60">pts</p></div>
          </div>

          <button onClick={() => { setWorkout(null); setDone([]) }} className="bg-white text-green-600 px-6 py-3 rounded-full font-semibold">
            Voltar
          </button>
        </div>
      </div>
    )
  }

  // Lista
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-xl"><ArrowLeft className="w-5 h-5" /></Link>
          <div><h1 className="text-xl font-bold">Treinos</h1><p className="text-sm text-gray-500">{filtered.length} disponíveis</p></div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${category === c ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
              {c}
            </button>
          ))}
        </div>
      </header>

      <div className="p-4 grid gap-4 md:grid-cols-2">
        {filtered.map(w => (
          <div key={w.id} onClick={() => start(w)} className="bg-white rounded-2xl shadow-sm overflow-hidden cursor-pointer active:scale-[0.98] transition-transform">
            <div className={`bg-gradient-to-br ${w.color} p-4 text-white`}>
              <div className="flex items-start justify-between mb-2">
                <span className="text-3xl">{w.icon}</span>
                {w.forPregnant && <span className="bg-white/20 text-xs px-2 py-1 rounded-full">🤰 Seguro</span>}
              </div>
              <h3 className="font-bold">{w.name}</h3>
              <p className="text-white/80 text-sm">{w.description}</p>
            </div>
            <div className="p-4">
              <div className="flex gap-4 text-sm text-gray-500 mb-3">
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{w.duration}min</span>
                <span className="flex items-center gap-1"><Flame className="w-4 h-4" />{w.calories}kcal</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-xs px-2 py-1 rounded-full ${w.difficulty === 'Iniciante' ? 'bg-green-100 text-green-700' : w.difficulty === 'Intermediário' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                  {w.difficulty}
                </span>
                <span className="text-xs text-gray-500">{w.exercises.length} exercícios</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
