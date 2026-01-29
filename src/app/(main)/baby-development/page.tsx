'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Baby, Heart, Ruler, Scale, Calendar, 
  ChevronLeft, ChevronRight, Sparkles, Info
} from 'lucide-react'
import { Card, LoadingSpinner } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'

interface BabyDevelopment {
  week: number
  size_comparison: string
  weight_grams: number
  length_cm: number
  developments: string[]
  tips_for_mom: string[]
  symptoms: string[]
}

const BABY_DEVELOPMENT_DATA: Record<number, BabyDevelopment> = {
  4: { week: 4, size_comparison: '🌱 Semente de papoula', weight_grams: 0.4, length_cm: 0.2, developments: ['Embrião se implanta no útero', 'Formação do saco amniótico'], tips_for_mom: ['Comece a tomar ácido fólico', 'Evite álcool e cigarro'], symptoms: ['Possível atraso menstrual'] },
  8: { week: 8, size_comparison: '🫐 Framboesa', weight_grams: 1, length_cm: 1.6, developments: ['Coração batendo', 'Braços e pernas se formando', 'Rosto tomando forma'], tips_for_mom: ['Agende primeira consulta pré-natal', 'Mantenha-se hidratada'], symptoms: ['Náuseas matinais', 'Cansaço'] },
  12: { week: 12, size_comparison: '🍋 Limão', weight_grams: 14, length_cm: 5.4, developments: ['Órgãos vitais formados', 'Unhas começando a crescer', 'Reflexos aparecendo'], tips_for_mom: ['Ultrassom morfológico', 'Risco de aborto diminui'], symptoms: ['Enjoos diminuindo', 'Mais energia'] },
  16: { week: 16, size_comparison: '🥑 Abacate', weight_grams: 100, length_cm: 11.6, developments: ['Expressões faciais', 'Audição se desenvolvendo', 'Movimentos mais coordenados'], tips_for_mom: ['Pode começar a sentir movimentos', 'Vista roupas confortáveis'], symptoms: ['Barriga aparecendo', 'Possível dor nas costas'] },
  20: { week: 20, size_comparison: '🍌 Banana', weight_grams: 300, length_cm: 16.4, developments: ['Descobre o sexo do bebê', 'Cabelos crescendo', 'Papilas gustativas ativas'], tips_for_mom: ['Morfológica do 2º trimestre', 'Hidrate a pele da barriga'], symptoms: ['Movimentos mais fortes', 'Possível azia'] },
  24: { week: 24, size_comparison: '🌽 Espiga de milho', weight_grams: 600, length_cm: 30, developments: ['Pulmões se desenvolvendo', 'Rosto completamente formado', 'Ciclo de sono definido'], tips_for_mom: ['Teste de glicose', 'Comece a pensar no enxoval'], symptoms: ['Inchaço nas pernas', 'Cãibras'] },
  28: { week: 28, size_comparison: '🍆 Berinjela', weight_grams: 1000, length_cm: 37.6, developments: ['Olhos podem abrir', 'Cérebro crescendo rápido', 'Gordura se acumulando'], tips_for_mom: ['Início do 3º trimestre', 'Comece o curso de gestante'], symptoms: ['Falta de ar', 'Dificuldade para dormir'] },
  32: { week: 32, size_comparison: '🥥 Coco', weight_grams: 1700, length_cm: 42.4, developments: ['Unhas completas', 'Ossos fortalecendo', 'Posição cefálica'], tips_for_mom: ['Monte a mala maternidade', 'Visite a maternidade'], symptoms: ['Contrações de treinamento', 'Vontade frequente de urinar'] },
  36: { week: 36, size_comparison: '🍈 Melão', weight_grams: 2600, length_cm: 47.4, developments: ['Pulmões quase maduros', 'Sistema imunológico ativo', 'Cabeça encaixando'], tips_for_mom: ['Consultas semanais', 'Finalize preparativos'], symptoms: ['Barriga mais baixa', 'Pressão na pelve'] },
  40: { week: 40, size_comparison: '🍉 Melancia', weight_grams: 3400, length_cm: 51.2, developments: ['Bebê a termo', 'Pronto para nascer', 'Todos os órgãos maduros'], tips_for_mom: ['Fique atenta aos sinais de trabalho de parto', 'Descanse o máximo possível'], symptoms: ['Perda do tampão mucoso', 'Contrações regulares'] },
}

export default function BabyDevelopmentPage() {
  const [currentWeek, setCurrentWeek] = useState(20)
  const [userWeek, setUserWeek] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('phase, last_menstrual_date')
          .eq('id', user.id)
          .single()

        if (userData?.phase === 'PREGNANT' && userData.last_menstrual_date) {
          const dum = new Date(userData.last_menstrual_date)
          const today = new Date()
          const diffDays = Math.ceil((today.getTime() - dum.getTime()) / (1000 * 60 * 60 * 24))
          const week = Math.floor(diffDays / 7)
          setUserWeek(week)
          setCurrentWeek(Math.min(Math.max(week, 4), 40))
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Encontrar dados da semana mais próxima
  const availableWeeks = Object.keys(BABY_DEVELOPMENT_DATA).map(Number).sort((a, b) => a - b)
  const closestWeek = availableWeeks.reduce((prev, curr) => 
    Math.abs(curr - currentWeek) < Math.abs(prev - currentWeek) ? curr : prev
  )
  const data = BABY_DEVELOPMENT_DATA[closestWeek]

  const goToPrevWeek = () => setCurrentWeek(w => Math.max(4, w - 1))
  const goToNextWeek = () => setCurrentWeek(w => Math.min(40, w + 1))

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
        <h1 className="text-2xl font-bold text-gray-900">Desenvolvimento do Bebê</h1>
        <p className="text-gray-600 mt-1">Acompanhe o crescimento semana a semana</p>
      </div>

      {/* Week Selector */}
      <Card className="mb-6 bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="flex items-center justify-between">
          <button 
            onClick={goToPrevWeek}
            disabled={currentWeek <= 4}
            className="p-2 rounded-full hover:bg-white/50 disabled:opacity-30"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div className="text-center">
            <p className="text-sm text-gray-500">Semana</p>
            <p className="text-4xl font-bold text-primary-600">{currentWeek}</p>
            {userWeek && currentWeek === userWeek && (
              <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full">
                Você está aqui!
              </span>
            )}
          </div>

          <button 
            onClick={goToNextWeek}
            disabled={currentWeek >= 40}
            className="p-2 rounded-full hover:bg-white/50 disabled:opacity-30"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="h-2 bg-white rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-pink-400 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${((currentWeek - 4) / 36) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>4 semanas</span>
            <span>40 semanas</span>
          </div>
        </div>
      </Card>

      {/* Baby Size */}
      <Card className="mb-4">
        <div className="text-center py-4">
          <p className="text-6xl mb-2">{data.size_comparison.split(' ')[0]}</p>
          <h3 className="font-semibold text-lg text-gray-900">
            Tamanho de {data.size_comparison.split(' ').slice(1).join(' ')}
          </h3>
          <div className="flex justify-center gap-6 mt-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-primary-600">
                <Ruler className="w-4 h-4" />
                <span className="font-bold">{data.length_cm} cm</span>
              </div>
              <p className="text-xs text-gray-500">Comprimento</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-primary-600">
                <Scale className="w-4 h-4" />
                <span className="font-bold">{data.weight_grams}g</span>
              </div>
              <p className="text-xs text-gray-500">Peso</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Developments */}
      <Card className="mb-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Baby className="w-5 h-5 text-pink-500" />
          O que está acontecendo
        </h3>
        <ul className="space-y-2">
          {data.developments.map((dev, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
              <Sparkles className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
              {dev}
            </li>
          ))}
        </ul>
      </Card>

      {/* Tips for Mom */}
      <Card className="mb-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-400" />
          Dicas para você
        </h3>
        <ul className="space-y-2">
          {data.tips_for_mom.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
              <span className="text-primary-500">✓</span>
              {tip}
            </li>
          ))}
        </ul>
      </Card>

      {/* Symptoms */}
      <Card>
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-400" />
          Sintomas comuns
        </h3>
        <div className="flex flex-wrap gap-2">
          {data.symptoms.map((symptom, i) => (
            <span 
              key={i}
              className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
            >
              {symptom}
            </span>
          ))}
        </div>
      </Card>

      {/* Quick Navigation */}
      <div className="mt-6">
        <p className="text-sm text-gray-500 mb-2">Ir para semana:</p>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {availableWeeks.map(week => (
            <button
              key={week}
              onClick={() => setCurrentWeek(week)}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
                closestWeek === week
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {week}ª
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
