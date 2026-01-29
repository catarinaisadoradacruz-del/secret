'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button, Card, LoadingOverlay } from '@/components/ui'
import { Camera, Info, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface AnalysisResult {
  description: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  foods: string[]
  analysis: string
}

export default function ScanPage() {
  const [image, setImage] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [mealType, setMealType] = useState<string>('LUNCH')
  const [showInstructions, setShowInstructions] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const mealTypes = [
    { value: 'BREAKFAST', label: 'Café da Manhã' },
    { value: 'MORNING_SNACK', label: 'Lanche da Manhã' },
    { value: 'LUNCH', label: 'Almoço' },
    { value: 'AFTERNOON_SNACK', label: 'Lanche da Tarde' },
    { value: 'DINNER', label: 'Jantar' },
    { value: 'EVENING_SNACK', label: 'Ceia' }
  ]

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImage(reader.result as string)
      }
      reader.readAsDataURL(file)
      setResult(null)
      setError(null)
      setSaved(false)
    }
  }

  const handleAnalyze = async () => {
    if (!imageFile) return

    setIsAnalyzing(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('image', imageFile)
      formData.append('meal_type', mealType)

      const response = await fetch('/api/nutrition/analyze', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao analisar')
      }

      setResult(data.analysis)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSave = async () => {
    if (!result) return

    setIsSaving(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      const { error: saveError } = await supabase.from('meals').insert({
        user_id: user.id,
        type: mealType,
        name: result.description,
        foods: result.foods.map(food => ({ name: food, quantity: '1 porção' })),
        total_calories: result.calories,
        total_protein: result.protein,
        total_carbs: result.carbs,
        total_fat: result.fat,
        total_fiber: result.fiber,
        image_url: image,
        ai_analysis: { analysis: result.analysis },
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().split(' ')[0]
      })

      if (saveError) throw saveError

      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setImage(null)
    setImageFile(null)
    setResult(null)
    setError(null)
    setSaved(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="pb-20">
      <LoadingOverlay isVisible={isAnalyzing} message="Analisando sua refeição com IA..." />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Escanear Refeição</h1>
        <p className="text-gray-600 mt-1">
          Análise nutricional instantânea com IA
        </p>
      </div>

      {/* Instructions */}
      {showInstructions && (
        <Card className="mb-6 bg-gradient-to-br from-primary-50 to-secondary-50 border-primary-200">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">Como funciona:</h3>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>Tire uma foto do seu prato ou selecione da galeria</li>
                <li>Escolha o tipo de refeição (café, almoço, jantar...)</li>
                <li>Clique em "Analisar" e aguarde a IA processar</li>
                <li>Revise os valores nutricionais calculados</li>
                <li>Salve a refeição no seu diário alimentar</li>
              </ol>
              <button
                onClick={() => setShowInstructions(false)}
                className="mt-2 text-sm text-primary-600 font-medium hover:underline"
              >
                Entendi, não mostrar novamente
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Meal Type Selector */}
      <Card className="mb-6">
        <h3 className="font-medium text-gray-900 mb-3">Tipo de Refeição:</h3>
        <div className="grid grid-cols-2 gap-2">
          {mealTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setMealType(type.value)}
              className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                mealType === type.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Camera/Upload Area */}
      <Card className="mb-6">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageSelect}
          ref={fileInputRef}
          className="hidden"
          id="camera-input"
        />

        {!image ? (
          <label
            htmlFor="camera-input"
            className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary-500 transition-colors"
          >
            <Camera className="w-16 h-16 text-gray-400 mb-4" />
            <p className="text-gray-600 font-medium">Toque para tirar foto</p>
            <p className="text-sm text-gray-400">ou selecione da galeria</p>
          </label>
        ) : (
          <div className="relative">
            <img
              src={image}
              alt="Refeição"
              className="w-full h-64 object-cover rounded-xl"
            />
            <button
              onClick={handleReset}
              className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </Card>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
          {error}
        </div>
      )}

      {/* Analyze Button */}
      {image && !result && (
        <Button
          onClick={handleAnalyze}
          fullWidth
          size="lg"
          isLoading={isAnalyzing}
          className="mb-6"
        >
          Analisar Refeição com IA
        </Button>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Card className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Análise Nutricional
              </h2>

              {/* Macros Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-primary-50 rounded-xl p-3 text-center border border-primary-200">
                  <p className="text-2xl font-bold text-primary-600">{result.calories}</p>
                  <p className="text-sm text-gray-600">Calorias</p>
                </div>
                <div className="bg-secondary-50 rounded-xl p-3 text-center border border-secondary-200">
                  <p className="text-2xl font-bold text-secondary-600">{result.protein}g</p>
                  <p className="text-sm text-gray-600">Proteína</p>
                </div>
                <div className="bg-accent-50 rounded-xl p-3 text-center border border-accent-200">
                  <p className="text-2xl font-bold text-accent-600">{result.carbs}g</p>
                  <p className="text-sm text-gray-600">Carboidratos</p>
                </div>
                <div className="bg-gray-100 rounded-xl p-3 text-center border border-gray-300">
                  <p className="text-2xl font-bold text-gray-700">{result.fat}g</p>
                  <p className="text-sm text-gray-600">Gordura</p>
                </div>
              </div>

              {/* Foods List */}
              <div className="mb-4">
                <h3 className="font-medium text-gray-900 mb-2">Alimentos identificados:</h3>
                <div className="flex flex-wrap gap-2">
                  {result.foods.map((food, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700"
                    >
                      {food}
                    </span>
                  ))}
                </div>
              </div>

              {/* AI Analysis */}
              <div className="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-xl p-4 border border-primary-200">
                <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <span className="text-lg">✨</span>
                  Análise da Vita
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {result.analysis}
                </p>
              </div>
            </Card>

            {/* Save Success */}
            {saved && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-700"
              >
                <Check className="w-5 h-5" />
                <span className="font-medium">Refeição salva no seu diário!</span>
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleSave}
                fullWidth
                size="lg"
                isLoading={isSaving}
                disabled={saved}
                className="flex-1"
              >
                {saved ? 'Salvo ✓' : 'Salvar no Diário'}
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
                size="lg"
                className="flex-1"
              >
                Nova Foto
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
