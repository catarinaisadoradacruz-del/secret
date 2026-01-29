'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, Pause, Clock, Activity, AlertTriangle,
  Trash2, History, Phone
} from 'lucide-react'
import { Card, LoadingSpinner } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'

interface Contraction {
  id: string
  start_time: string
  end_time: string | null
  duration_seconds: number | null
  interval_seconds: number | null
}

export default function ContractionsPage() {
  const [contractions, setContractions] = useState<Contraction[]>([])
  const [isTracking, setIsTracking] = useState(false)
  const [currentDuration, setCurrentDuration] = useState(0)
  const [currentStartTime, setCurrentStartTime] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadContractions()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const loadContractions = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const { data } = await supabase
          .from('contractions')
          .select('*')
          .eq('user_id', user.id)
          .gte('start_time', today.toISOString())
          .order('start_time', { ascending: false })

        if (data) {
          setContractions(data)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const startContraction = async () => {
    const startTime = new Date()
    setCurrentStartTime(startTime)
    setIsTracking(true)
    setCurrentDuration(0)

    intervalRef.current = setInterval(() => {
      setCurrentDuration(prev => prev + 1)
    }, 1000)

    // Salvar início no banco
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data } = await supabase
          .from('contractions')
          .insert({
            user_id: user.id,
            start_time: startTime.toISOString()
          })
          .select()
          .single()

        if (data) {
          setContractions(prev => [data, ...prev])
        }
      }
    } catch (error) {
      console.error('Erro ao salvar início:', error)
    }
  }

  const stopContraction = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    const endTime = new Date()
    const duration = currentDuration

    setIsTracking(false)
    setCurrentStartTime(null)
    setCurrentDuration(0)

    // Calcular intervalo desde a última contração
    let interval: number | null = null
    if (contractions.length > 1) {
      const lastContraction = contractions[1] // A atual está em [0]
      if (lastContraction?.start_time) {
        interval = Math.round(
          (new Date(contractions[0].start_time).getTime() - new Date(lastContraction.start_time).getTime()) / 1000
        )
      }
    }

    // Atualizar no banco
    try {
      const supabase = createClient()

      if (contractions[0]?.id) {
        await supabase
          .from('contractions')
          .update({
            end_time: endTime.toISOString(),
            duration_seconds: duration,
            interval_seconds: interval
          })
          .eq('id', contractions[0].id)

        setContractions(prev => {
          const updated = [...prev]
          if (updated[0]) {
            updated[0] = {
              ...updated[0],
              end_time: endTime.toISOString(),
              duration_seconds: duration,
              interval_seconds: interval
            }
          }
          return updated
        })
      }
    } catch (error) {
      console.error('Erro ao salvar fim:', error)
    }
  }

  const clearHistory = async () => {
    if (!confirm('Limpar todo o histórico de hoje?')) return

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        await supabase
          .from('contractions')
          .delete()
          .eq('user_id', user.id)
          .gte('start_time', today.toISOString())

        setContractions([])
      }
    } catch (error) {
      console.error('Erro ao limpar:', error)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  // Estatísticas
  const completedContractions = contractions.filter(c => c.duration_seconds)
  const avgDuration = completedContractions.length > 0
    ? Math.round(completedContractions.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / completedContractions.length)
    : 0
  const avgInterval = completedContractions.filter(c => c.interval_seconds).length > 0
    ? Math.round(completedContractions.filter(c => c.interval_seconds).reduce((sum, c) => sum + (c.interval_seconds || 0), 0) / completedContractions.filter(c => c.interval_seconds).length)
    : 0

  // Verificar se deve ir ao hospital (5-1-1: contrações a cada 5 min, durando 1 min, por 1 hora)
  const shouldGoToHospital = avgInterval > 0 && avgInterval <= 300 && avgDuration >= 45

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Contador de Contrações</h1>
        <p className="text-gray-600 mt-1">Monitore o trabalho de parto</p>
      </div>

      {/* Alert Banner */}
      {shouldGoToHospital && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <Card className="bg-red-50 border-red-200">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-red-700">Hora de ir ao hospital!</h4>
                <p className="text-sm text-red-600">
                  Suas contrações estão regulares e frequentes.
                </p>
              </div>
              <a href="tel:192" className="p-2 bg-red-500 text-white rounded-full">
                <Phone className="w-5 h-5" />
              </a>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Main Timer */}
      <Card className={`mb-6 ${isTracking ? 'bg-gradient-to-br from-red-50 to-pink-50' : 'bg-gradient-to-br from-primary-50 to-secondary-50'}`}>
        <div className="text-center py-8">
          <motion.div
            animate={isTracking ? { scale: [1, 1.05, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1 }}
            className="text-6xl font-bold text-gray-900 mb-4"
          >
            {formatDuration(currentDuration)}
          </motion.div>

          <button
            onClick={isTracking ? stopContraction : startContraction}
            className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all ${
              isTracking 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-primary hover:bg-primary/90'
            }`}
          >
            {isTracking ? (
              <Pause className="w-10 h-10 text-white" />
            ) : (
              <Play className="w-10 h-10 text-white ml-1" />
            )}
          </button>

          <p className="mt-4 text-gray-600">
            {isTracking ? 'Toque para parar' : 'Toque para iniciar'}
          </p>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="text-center py-3">
          <Activity className="w-5 h-5 text-primary-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-gray-900">{completedContractions.length}</p>
          <p className="text-xs text-gray-500">Contrações</p>
        </Card>
        <Card className="text-center py-3">
          <Clock className="w-5 h-5 text-amber-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-gray-900">{formatDuration(avgDuration)}</p>
          <p className="text-xs text-gray-500">Duração média</p>
        </Card>
        <Card className="text-center py-3">
          <Clock className="w-5 h-5 text-green-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-gray-900">
            {avgInterval > 0 ? Math.round(avgInterval / 60) + 'min' : '--'}
          </p>
          <p className="text-xs text-gray-500">Intervalo médio</p>
        </Card>
      </div>

      {/* History */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <History className="w-5 h-5" />
          Histórico de Hoje
        </h3>
        {contractions.length > 0 && (
          <button 
            onClick={clearHistory}
            className="text-red-500 text-sm flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" />
            Limpar
          </button>
        )}
      </div>

      {contractions.length === 0 ? (
        <Card className="text-center py-8">
          <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhuma contração registrada hoje</p>
        </Card>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {contractions.map((contraction, index) => (
              <motion.div
                key={contraction.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <Card>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        contraction.duration_seconds 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-yellow-100 text-yellow-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {formatTime(contraction.start_time)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {contraction.duration_seconds 
                            ? `Duração: ${formatDuration(contraction.duration_seconds)}`
                            : 'Em andamento...'
                          }
                        </p>
                      </div>
                    </div>
                    {contraction.interval_seconds && (
                      <div className="text-right">
                        <p className="text-sm font-medium text-primary-600">
                          {Math.round(contraction.interval_seconds / 60)} min
                        </p>
                        <p className="text-xs text-gray-500">intervalo</p>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Info Card */}
      <Card className="mt-6 bg-blue-50">
        <h4 className="font-semibold text-blue-800 mb-2">💡 Regra 5-1-1</h4>
        <p className="text-sm text-blue-700">
          Vá ao hospital quando suas contrações estiverem a cada <strong>5 minutos</strong>,
          durando <strong>1 minuto</strong>, por pelo menos <strong>1 hora</strong>.
        </p>
      </Card>
    </div>
  )
}
