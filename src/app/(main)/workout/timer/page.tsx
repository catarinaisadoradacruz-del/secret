'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, RotateCcw, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { Button, Card } from '@/components/ui'

interface Exercise {
  name: string
  duration: number
  rest: number
  sets: number
}

const DEFAULT_EXERCISES: Exercise[] = [
  { name: 'Aquecimento', duration: 60, rest: 0, sets: 1 },
  { name: 'Agachamento', duration: 30, rest: 15, sets: 3 },
  { name: 'Flexão de braços', duration: 30, rest: 15, sets: 3 },
  { name: 'Prancha', duration: 30, rest: 15, sets: 3 },
  { name: 'Alongamento', duration: 60, rest: 0, sets: 1 },
]

export default function WorkoutTimerPage() {
  const [exercises] = useState<Exercise[]>(DEFAULT_EXERCISES)
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [currentSet, setCurrentSet] = useState(1)
  const [isResting, setIsResting] = useState(false)
  const [timeLeft, setTimeLeft] = useState(exercises[0].duration)
  const [isRunning, setIsRunning] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)

  const currentExercise = exercises[currentExerciseIndex]
  const totalExercises = exercises.length

  const playSound = useCallback(() => {
    if (soundEnabled) {
      // Simple beep using Web Audio API
      try {
        const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        oscillator.frequency.value = 800
        oscillator.type = 'sine'
        gainNode.gain.value = 0.3

        oscillator.start()
        oscillator.stop(audioContext.currentTime + 0.2)
      } catch (e) {
        console.log('Audio not supported')
      }
    }
  }, [soundEnabled])

  const nextPhase = useCallback(() => {
    playSound()

    if (isResting) {
      // Fim do descanso
      if (currentSet < currentExercise.sets) {
        // Próxima série
        setCurrentSet((prev) => prev + 1)
        setIsResting(false)
        setTimeLeft(currentExercise.duration)
      } else {
        // Próximo exercício
        if (currentExerciseIndex < totalExercises - 1) {
          setCurrentExerciseIndex((prev) => prev + 1)
          setCurrentSet(1)
          setIsResting(false)
          setTimeLeft(exercises[currentExerciseIndex + 1].duration)
        } else {
          // Treino completo
          setIsRunning(false)
        }
      }
    } else {
      // Fim do exercício
      if (currentExercise.rest > 0 && currentSet <= currentExercise.sets) {
        setIsResting(true)
        setTimeLeft(currentExercise.rest)
      } else if (currentSet < currentExercise.sets) {
        setCurrentSet((prev) => prev + 1)
        setTimeLeft(currentExercise.duration)
      } else {
        // Próximo exercício
        if (currentExerciseIndex < totalExercises - 1) {
          setCurrentExerciseIndex((prev) => prev + 1)
          setCurrentSet(1)
          setTimeLeft(exercises[currentExerciseIndex + 1].duration)
        } else {
          setIsRunning(false)
        }
      }
    }
  }, [isResting, currentSet, currentExercise, currentExerciseIndex, totalExercises, exercises, playSound])

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1)
      }, 1000)
    } else if (isRunning && timeLeft === 0) {
      nextPhase()
    }

    return () => clearInterval(interval)
  }, [isRunning, timeLeft, nextPhase])

  const toggleTimer = () => {
    setIsRunning(!isRunning)
  }

  const reset = () => {
    setIsRunning(false)
    setCurrentExerciseIndex(0)
    setCurrentSet(1)
    setIsResting(false)
    setTimeLeft(exercises[0].duration)
  }

  const skip = () => {
    nextPhase()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const progress = (1 - timeLeft / (isResting ? currentExercise.rest : currentExercise.duration)) * 100
  const overallProgress = ((currentExerciseIndex + (currentSet - 1) / currentExercise.sets) / totalExercises) * 100

  const isComplete = currentExerciseIndex >= totalExercises - 1 && currentSet >= currentExercise.sets && timeLeft === 0

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timer de Treino</h1>
          <p className="text-gray-600 mt-1">
            Exercício {currentExerciseIndex + 1} de {totalExercises}
          </p>
        </div>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-2 rounded-full bg-gray-100"
        >
          {soundEnabled ? (
            <Volume2 className="w-5 h-5 text-gray-600" />
          ) : (
            <VolumeX className="w-5 h-5 text-gray-400" />
          )}
        </button>
      </div>

      {/* Overall Progress */}
      <div className="h-2 bg-gray-100 rounded-full mb-6 overflow-hidden">
        <motion.div
          className="h-full bg-primary"
          animate={{ width: `${overallProgress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {isComplete ? (
        /* Completion Screen */
        <Card className="text-center py-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-6xl mb-4"
          >
            🎉
          </motion.div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Treino Concluído!
          </h2>
          <p className="text-gray-600 mb-6">Parabéns pelo esforço!</p>
          <Button onClick={reset}>Reiniciar Treino</Button>
        </Card>
      ) : (
        <>
          {/* Timer Card */}
          <Card className="text-center mb-6">
            <div className="mb-4">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  isResting
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-primary/10 text-primary'
                }`}
              >
                {isResting ? 'Descanso' : `Série ${currentSet}/${currentExercise.sets}`}
              </span>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isResting ? 'Descanse' : currentExercise.name}
            </h2>

            {/* Circular Progress */}
            <div className="relative w-48 h-48 mx-auto my-8">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  fill="none"
                  stroke="#f3f4f6"
                  strokeWidth="12"
                />
                <motion.circle
                  cx="96"
                  cy="96"
                  r="88"
                  fill="none"
                  stroke={isResting ? '#3b82f6' : '#b87389'}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={553}
                  animate={{ strokeDashoffset: 553 - (553 * progress) / 100 }}
                  transition={{ duration: 0.3 }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-5xl font-bold text-gray-900">
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={reset}
                className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <RotateCcw className="w-6 h-6 text-gray-600" />
              </button>

              <button
                onClick={toggleTimer}
                className={`p-6 rounded-full transition-colors ${
                  isRunning
                    ? 'bg-orange-500 hover:bg-orange-600'
                    : 'bg-primary hover:bg-primary/90'
                }`}
              >
                {isRunning ? (
                  <Pause className="w-8 h-8 text-white" />
                ) : (
                  <Play className="w-8 h-8 text-white ml-1" />
                )}
              </button>

              <button
                onClick={skip}
                className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <SkipForward className="w-6 h-6 text-gray-600" />
              </button>
            </div>
          </Card>

          {/* Exercise List */}
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Próximos</h3>
            <div className="space-y-2">
              {exercises.slice(currentExerciseIndex).map((exercise, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between py-2 ${
                    index === 0 ? 'text-primary font-medium' : 'text-gray-500'
                  }`}
                >
                  <span>
                    {index === 0 && '▶ '}
                    {exercise.name}
                  </span>
                  <span className="text-sm">
                    {exercise.sets}x {exercise.duration}s
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
