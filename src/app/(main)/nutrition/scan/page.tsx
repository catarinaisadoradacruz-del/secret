'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button, Card, LoadingOverlay } from '@/components/ui'

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
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    }
  }

  const handleAnalyze = async () => {
    if (!imageFile) return

    setIsAnalyzing(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('image', imageFile)
      formData.append('meal_type', 'LUNCH')

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

  const handleReset = () => {
    setImage(null)
    setImageFile(null)
    setResult(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="pb-20">
      <LoadingOverlay isVisible={isAnalyzing} message="Analisando sua refeição..." />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Escanear Refeição</h1>
        <p className="text-gray-600 mt-1">
          Tire uma foto do seu prato para análise nutricional
        </p>
      </div>

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
            className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary transition-colors"
          >
            <svg
              className="w-16 h-16 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <p className="mt-4 text-gray-600 font-medium">Toque para tirar foto</p>
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
              className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full"
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
          Analisar Refeição
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
                <div className="bg-primary/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{result.calories}</p>
                  <p className="text-sm text-gray-600">Calorias</p>
                </div>
                <div className="bg-secondary/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-secondary">{result.protein}g</p>
                  <p className="text-sm text-gray-600">Proteína</p>
                </div>
                <div className="bg-accent/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-accent">{result.carbs}g</p>
                  <p className="text-sm text-gray-600">Carboidratos</p>
                </div>
                <div className="bg-gray-100 rounded-xl p-3 text-center">
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
              <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl p-4">
                <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <span className="text-lg">✨</span>
                  Análise da Vita
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {result.analysis}
                </p>
              </div>
            </Card>

            <Button onClick={handleReset} variant="outline" fullWidth>
              Escanear outra refeição
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
