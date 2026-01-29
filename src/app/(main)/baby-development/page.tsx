'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, Baby, Calendar, Heart, Scale, Ruler, 
  Info, ChevronRight, ChevronLeft, Apple, AlertCircle,
  CheckCircle, Sparkles, BookOpen, Camera
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface WeekInfo {
  week: number
  size: string
  sizeComparison: string
  weight: string
  length: string
  babyDevelopment: string[]
  momSymptoms: string[]
  tips: string[]
  exams?: string[]
  trimester: number
}

const WEEK_DATA: WeekInfo[] = [
  { week: 4, size: '1mm', sizeComparison: '🌱 Semente de papoula', weight: '<1g', length: '1mm', trimester: 1,
    babyDevelopment: ['Implantação no útero', 'Formação do saco gestacional', 'Início da placenta'],
    momSymptoms: ['Possível atraso menstrual', 'Cansaço leve', 'Sensibilidade nos seios'],
    tips: ['Comece a tomar ácido fólico', 'Evite álcool e cigarro', 'Agende consulta pré-natal'] },
  { week: 5, size: '2mm', sizeComparison: '🫘 Semente de gergelim', weight: '<1g', length: '2mm', trimester: 1,
    babyDevelopment: ['Coração começa a bater', 'Formação do tubo neural', 'Sistema nervoso se desenvolve'],
    momSymptoms: ['Náuseas matinais', 'Fadiga intensa', 'Mudanças de humor'],
    tips: ['Descanse bastante', 'Coma pequenas porções', 'Hidrate-se bem'] },
  { week: 8, size: '1.6cm', sizeComparison: '🫐 Framboesa', weight: '1g', length: '1.6cm', trimester: 1,
    babyDevelopment: ['Braços e pernas se formam', 'Dedos começam a aparecer', 'Rosto ganha forma'],
    momSymptoms: ['Náuseas frequentes', 'Aumento do fluxo sanguíneo', 'Idas frequentes ao banheiro'],
    tips: ['Evite alimentos crus', 'Use roupas confortáveis', 'Faça primeiro ultrassom'],
    exams: ['Ultrassom transvaginal', 'Exames de sangue iniciais'] },
  { week: 12, size: '5.4cm', sizeComparison: '🍋 Limão', weight: '14g', length: '5.4cm', trimester: 1,
    babyDevelopment: ['Órgãos estão formados', 'Reflexos começam', 'Unhas se desenvolvem'],
    momSymptoms: ['Náuseas diminuem', 'Mais energia', 'Barriga começa a aparecer'],
    tips: ['Pode contar para todos!', 'Comece exercícios leves', 'Planeje o enxoval'],
    exams: ['Ultrassom morfológico 1º tri', 'NIPT (opcional)', 'Translucência nucal'] },
  { week: 16, size: '11.6cm', sizeComparison: '🥑 Abacate', weight: '100g', length: '11.6cm', trimester: 2,
    babyDevelopment: ['Movimentos mais coordenados', 'Audição se desenvolve', 'Pele transparente'],
    momSymptoms: ['Energia renovada', 'Possível congestão nasal', 'Crescimento da barriga'],
    tips: ['Converse com o bebê', 'Durma de lado', 'Faça alongamentos'] },
  { week: 20, size: '25cm', sizeComparison: '🍌 Banana', weight: '300g', length: '25cm', trimester: 2,
    babyDevelopment: ['Metade da gestação!', 'Bebê engole líquido amniótico', 'Cabelos crescem'],
    momSymptoms: ['Sente os primeiros chutes!', 'Pele mais oleosa', 'Possível azia'],
    tips: ['Aproveite os movimentos', 'Faça o morfológico', 'Pense no nome'],
    exams: ['Ultrassom morfológico 2º tri'] },
  { week: 24, size: '30cm', sizeComparison: '🌽 Espiga de milho', weight: '600g', length: '30cm', trimester: 2,
    babyDevelopment: ['Pulmões se desenvolvem', 'Padrão de sono', 'Viabilidade fetal'],
    momSymptoms: ['Barriga bem visível', 'Dores nas costas', 'Inchaço nos pés'],
    tips: ['Eleve as pernas', 'Use meias de compressão', 'Hidrate a pele'],
    exams: ['Teste de glicose'] },
  { week: 28, size: '37cm', sizeComparison: '🍆 Berinjela', weight: '1kg', length: '37cm', trimester: 3,
    babyDevelopment: ['Olhos se abrem', 'Cérebro cresce rápido', 'Pode soluçar'],
    momSymptoms: ['Falta de ar', 'Contrações de treinamento', 'Insônia'],
    tips: ['Comece o curso de gestantes', 'Prepare o quartinho', 'Defina hospital'],
    exams: ['Vacina dTpa', 'Hemograma'] },
  { week: 32, size: '42cm', sizeComparison: '🥬 Repolho', weight: '1.7kg', length: '42cm', trimester: 3,
    babyDevelopment: ['Unhas completas', 'Acumula gordura', 'Posição cefálica'],
    momSymptoms: ['Azia frequente', 'Cansaço aumenta', 'Ansiedade'],
    tips: ['Monte a mala da maternidade', 'Finalize o enxoval', 'Organize documentos'],
    exams: ['Ultrassom de crescimento', 'Cardiotocografia'] },
  { week: 36, size: '47cm', sizeComparison: '🥬 Alface americana', weight: '2.6kg', length: '47cm', trimester: 3,
    babyDevelopment: ['Quase pronto!', 'Pulmões maduros', 'Cabeça encaixada'],
    momSymptoms: ['Pressão na pelve', 'Idas constantes ao banheiro', 'Dificuldade para dormir'],
    tips: ['Consultas semanais', 'Descanse muito', 'Revise o plano de parto'],
    exams: ['Estreptococo B', 'CTG semanal'] },
  { week: 40, size: '51cm', sizeComparison: '🍉 Melancia pequena', weight: '3.4kg', length: '51cm', trimester: 3,
    babyDevelopment: ['Pronto para nascer!', 'Vérnix protetor', 'Reflexos completos'],
    momSymptoms: ['Ansiedade máxima', 'Tampa mucosa pode sair', 'Contrações reais'],
    tips: ['Fique atenta aos sinais', 'Contrações regulares = hospital', 'Respire e confie!'] },
]

export default function BabyDevelopmentPage() {
  const [currentWeek, setCurrentWeek] = useState(20)
  const [userWeek, setUserWeek] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('users')
        .select('last_menstrual_date')
        .eq('id', user.id)
        .single()

      if (data?.last_menstrual_date) {
        const dum = new Date(data.last_menstrual_date)
        const diffDays = Math.floor((Date.now() - dum.getTime()) / (1000 * 60 * 60 * 24))
        const week = Math.floor(diffDays / 7)
        setUserWeek(week)
        setCurrentWeek(week)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const weekInfo = WEEK_DATA.find(w => w.week === currentWeek) || 
                   WEEK_DATA.reduce((prev, curr) => 
                     Math.abs(curr.week - currentWeek) < Math.abs(prev.week - currentWeek) ? curr : prev
                   )

  const goToWeek = (direction: 'prev' | 'next') => {
    const currentIndex = WEEK_DATA.findIndex(w => w.week === weekInfo.week)
    if (direction === 'prev' && currentIndex > 0) {
      setCurrentWeek(WEEK_DATA[currentIndex - 1].week)
    } else if (direction === 'next' && currentIndex < WEEK_DATA.length - 1) {
      setCurrentWeek(WEEK_DATA[currentIndex + 1].week)
    }
  }

  const trimesterColors = {
    1: 'from-pink-400 to-rose-500',
    2: 'from-purple-400 to-violet-500',
    3: 'from-blue-400 to-cyan-500',
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className={`bg-gradient-to-r ${trimesterColors[weekInfo.trimester as keyof typeof trimesterColors]} text-white px-4 pt-4 pb-8`}>
        <div className="flex items-center gap-3 mb-4">
          <Link href="/dashboard" className="p-2 hover:bg-white/10 rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Desenvolvimento do Bebê</h1>
            <p className="text-sm text-white/80">{weekInfo.trimester}º Trimestre</p>
          </div>
        </div>

        {/* Seletor de Semana */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => goToWeek('prev')}
            className="p-2 hover:bg-white/10 rounded-full"
            disabled={WEEK_DATA.findIndex(w => w.week === weekInfo.week) === 0}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div className="text-center">
            <motion.div
              key={currentWeek}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <p className="text-6xl font-bold">{currentWeek}</p>
              <p className="text-white/80">semanas</p>
              {userWeek === currentWeek && (
                <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-xs">
                  ✨ Sua semana atual
                </span>
              )}
            </motion.div>
          </div>
          
          <button 
            onClick={() => goToWeek('next')}
            className="p-2 hover:bg-white/10 rounded-full"
            disabled={WEEK_DATA.findIndex(w => w.week === weekInfo.week) === WEEK_DATA.length - 1}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </header>

      <div className="px-4 -mt-4 space-y-4">
        {/* Tamanho do Bebê */}
        <motion.div
          key={`size-${currentWeek}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-5 shadow-sm"
        >
          <div className="text-center mb-4">
            <p className="text-5xl mb-2">{weekInfo.sizeComparison.split(' ')[0]}</p>
            <p className="text-gray-600">{weekInfo.sizeComparison.split(' ').slice(1).join(' ')}</p>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-pink-50 rounded-xl p-3">
              <Ruler className="w-5 h-5 mx-auto mb-1 text-pink-500" />
              <p className="font-bold text-pink-700">{weekInfo.length}</p>
              <p className="text-xs text-pink-600">comprimento</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3">
              <Scale className="w-5 h-5 mx-auto mb-1 text-blue-500" />
              <p className="font-bold text-blue-700">{weekInfo.weight}</p>
              <p className="text-xs text-blue-600">peso</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3">
              <Calendar className="w-5 h-5 mx-auto mb-1 text-purple-500" />
              <p className="font-bold text-purple-700">{40 - currentWeek}</p>
              <p className="text-xs text-purple-600">semanas restam</p>
            </div>
          </div>
        </motion.div>

        {/* Desenvolvimento do Bebê */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Baby className="w-5 h-5 text-pink-500" />
            Desenvolvimento do Bebê
          </h3>
          <ul className="space-y-2">
            {weekInfo.babyDevelopment.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-gray-700">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Sintomas da Mamãe */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            O que Você Pode Sentir
          </h3>
          <ul className="space-y-2">
            {weekInfo.momSymptoms.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-gray-700">
                <span className="text-lg">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Dicas */}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
          <h3 className="font-bold mb-3 flex items-center gap-2 text-green-800">
            <Sparkles className="w-5 h-5" />
            Dicas para Esta Semana
          </h3>
          <ul className="space-y-2">
            {weekInfo.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-green-700">
                <span>💡</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* Exames */}
        {weekInfo.exams && weekInfo.exams.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5">
            <h3 className="font-bold mb-3 flex items-center gap-2 text-yellow-800">
              <AlertCircle className="w-5 h-5" />
              Exames Recomendados
            </h3>
            <ul className="space-y-2">
              {weekInfo.exams.map((exam, i) => (
                <li key={i} className="flex items-center gap-2 text-yellow-700">
                  <span>📋</span>
                  {exam}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Ações Rápidas */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/belly-photos" className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
            <Camera className="w-6 h-6 text-purple-500" />
            <span className="font-medium">Foto da Barriga</span>
          </Link>
          <Link href="/appointments" className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
            <Calendar className="w-6 h-6 text-blue-500" />
            <span className="font-medium">Consultas</span>
          </Link>
        </div>

        {/* Timeline de semanas */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold mb-3">Navegue pelas Semanas</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {WEEK_DATA.map(w => (
              <button
                key={w.week}
                onClick={() => setCurrentWeek(w.week)}
                className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-medium transition-colors ${
                  w.week === currentWeek
                    ? 'bg-primary-500 text-white'
                    : userWeek && w.week <= userWeek
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                }`}
              >
                {w.week}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
