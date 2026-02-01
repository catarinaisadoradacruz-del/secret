'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { 
  Camera, X, RotateCcw, Check, AlertCircle, ArrowLeft, Search, Plus, Star,
  Info, ChevronRight, Loader2, Zap, ShieldCheck, ShieldAlert, Utensils, 
  ScanLine, ImageIcon
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface NutritionInfo {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
  sodium?: number
  sugar?: number
}

interface Product {
  barcode: string
  name: string
  brand?: string
  image?: string
  nutrition: NutritionInfo
  serving: string
  category: string
  isHealthy: boolean
  score?: string
  warnings?: string[]
  tips?: string[]
  ingredients?: string
}

// Extended local products database
const LOCAL_PRODUCTS: Record<string, Product> = {
  '7891000100103': {
    barcode: '7891000100103', name: 'Leite Integral', brand: 'Ninho',
    nutrition: { calories: 120, protein: 6, carbs: 9, fat: 6, sugar: 9 },
    serving: '200ml', category: 'Laticínios', isHealthy: true, score: 'B',
    tips: ['Boa fonte de cálcio', 'Importante para gestantes', 'Vitamina D natural']
  },
  '7891000053508': {
    barcode: '7891000053508', name: 'Iogurte Natural', brand: 'Nestlé',
    nutrition: { calories: 90, protein: 5, carbs: 8, fat: 4 },
    serving: '170g', category: 'Laticínios', isHealthy: true, score: 'A',
    tips: ['Rico em probióticos', 'Ótimo para a digestão']
  },
  '7891000315507': {
    barcode: '7891000315507', name: 'Aveia Flocos', brand: 'Quaker',
    nutrition: { calories: 140, protein: 5, carbs: 25, fat: 3, fiber: 4 },
    serving: '40g', category: 'Cereais', isHealthy: true, score: 'A',
    tips: ['Rica em fibras', 'Ajuda a controlar colesterol', 'Perfeita para o café da manhã']
  },
  '7894900011517': {
    barcode: '7894900011517', name: 'Coca-Cola', brand: 'Coca-Cola',
    nutrition: { calories: 139, protein: 0, carbs: 35, fat: 0, sugar: 35 },
    serving: '350ml', category: 'Bebidas', isHealthy: false, score: 'E',
    warnings: ['Alto teor de açúcar', 'Contém cafeína - cuidado na gestação', 'Sem valor nutricional'],
    tips: ['Prefira água ou sucos naturais']
  },
  '7891150027374': {
    barcode: '7891150027374', name: 'Granola Tradicional', brand: 'Mãe Terra',
    nutrition: { calories: 180, protein: 4, carbs: 28, fat: 6, fiber: 3 },
    serving: '40g', category: 'Cereais', isHealthy: true, score: 'B',
    tips: ['Boa fonte de energia', 'Rica em vitaminas do complexo B']
  },
  '7896004800011': {
    barcode: '7896004800011', name: 'Feijão Preto', brand: 'Camil',
    nutrition: { calories: 77, protein: 5, carbs: 14, fat: 0.5, fiber: 4, sodium: 1 },
    serving: '50g (seco)', category: 'Grãos', isHealthy: true, score: 'A',
    tips: ['Rico em ferro e ácido fólico', 'Essencial na gestação', 'Combinar com vitamina C para melhor absorção']
  },
  '7891962047584': {
    barcode: '7891962047584', name: 'Sardinha em Óleo', brand: 'Coqueiro',
    nutrition: { calories: 142, protein: 15, carbs: 0, fat: 9, sodium: 380 },
    serving: '84g', category: 'Proteínas', isHealthy: true, score: 'A',
    tips: ['Rica em ômega-3 (DHA)', 'Importante para desenvolvimento do bebê', 'Boa fonte de cálcio']
  },
  '7622300862664': {
    barcode: '7622300862664', name: 'Biscoito Recheado', brand: 'Oreo',
    nutrition: { calories: 160, protein: 1, carbs: 25, fat: 7, sugar: 14 },
    serving: '3 unidades (36g)', category: 'Snacks', isHealthy: false, score: 'E',
    warnings: ['Alto em açúcar e gordura', 'Baixo valor nutricional', 'Contém gordura trans'],
    tips: ['Consumir com moderação', 'Prefira frutas como lanche']
  },
}

export default function ScannerPage() {
  const [mode, setMode] = useState<'home' | 'camera' | 'manual' | 'result'>('home')
  const [product, setProduct] = useState<Product | null>(null)
  const [searching, setSearching] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [error, setError] = useState('')
  const [cameraError, setCameraError] = useState('')
  const [recentScans, setRecentScans] = useState<Product[]>([])
  const [savedToMeal, setSavedToMeal] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    // Load recent scans from localStorage
    try {
      const saved = localStorage.getItem('vitafit-recent-scans')
      if (saved) setRecentScans(JSON.parse(saved).slice(0, 10))
    } catch {}
    return () => stopCamera()
  }, [])

  const startCamera = async () => {
    setMode('camera')
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch (err: any) {
      setCameraError('Não foi possível acessar a câmera. Verifique as permissões do navegador.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return
    setSearching(true)

    const canvas = canvasRef.current
    const video = videoRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0)

    // Simulate barcode detection (in production use BarcodeDetector API or library)
    try {
      if ('BarcodeDetector' in window) {
        const detector = new (window as any).BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] })
        const barcodes = await detector.detect(canvas)
        if (barcodes.length > 0) {
          await lookupProduct(barcodes[0].rawValue)
          return
        }
      }
    } catch {}

    // Fallback - show manual entry
    setSearching(false)
    setError('Código de barras não detectado. Tente digitar manualmente.')
    setMode('manual')
    stopCamera()
  }

  const lookupProduct = async (barcode: string) => {
    setSearching(true)
    setError('')

    // Check local database first
    if (LOCAL_PRODUCTS[barcode]) {
      const p = LOCAL_PRODUCTS[barcode]
      setProduct(p)
      addToRecent(p)
      setMode('result')
      setSearching(false)
      stopCamera()
      return
    }

    // Try Open Food Facts API
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
      const data = await res.json()

      if (data.status === 1 && data.product) {
        const p = data.product
        const nut = p.nutriments || {}
        
        const product: Product = {
          barcode,
          name: p.product_name_pt || p.product_name || 'Produto desconhecido',
          brand: p.brands || '',
          image: p.image_front_small_url || p.image_url || '',
          nutrition: {
            calories: Math.round(nut['energy-kcal_100g'] || nut['energy-kcal'] || 0),
            protein: Math.round((nut.proteins_100g || nut.proteins || 0) * 10) / 10,
            carbs: Math.round((nut.carbohydrates_100g || nut.carbohydrates || 0) * 10) / 10,
            fat: Math.round((nut.fat_100g || nut.fat || 0) * 10) / 10,
            fiber: Math.round((nut.fiber_100g || 0) * 10) / 10,
            sugar: Math.round((nut.sugars_100g || 0) * 10) / 10,
            sodium: Math.round((nut.sodium_100g || 0) * 1000),
          },
          serving: p.serving_size || '100g',
          category: p.categories?.split(',')[0]?.trim() || 'Alimento',
          isHealthy: !['e', 'd'].includes((p.nutriscore_grade || 'c').toLowerCase()),
          score: (p.nutriscore_grade || '').toUpperCase() || undefined,
          ingredients: p.ingredients_text_pt || p.ingredients_text || '',
          warnings: getWarnings(p),
          tips: getTips(p)
        }

        setProduct(product)
        addToRecent(product)
        setMode('result')
        stopCamera()
        return
      }
    } catch (e) {
      console.error('Open Food Facts error:', e)
    }

    setError(`Produto com código ${barcode} não encontrado. Tente outro código.`)
    setSearching(false)
  }

  const getWarnings = (p: any): string[] => {
    const warnings: string[] = []
    const nut = p.nutriments || {}
    if ((nut.sugars_100g || 0) > 20) warnings.push('Alto teor de açúcar')
    if ((nut.sodium_100g || 0) > 0.6) warnings.push('Alto teor de sódio')
    if ((nut.fat_100g || 0) > 20) warnings.push('Alto teor de gordura')
    if ((nut['saturated-fat_100g'] || 0) > 5) warnings.push('Alto em gordura saturada')
    const allergens = p.allergens_tags || []
    if (allergens.length > 0) warnings.push('Contém alérgenos')
    return warnings
  }

  const getTips = (p: any): string[] => {
    const tips: string[] = []
    const nut = p.nutriments || {}
    if ((nut.fiber_100g || 0) > 3) tips.push('Boa fonte de fibras')
    if ((nut.proteins_100g || 0) > 10) tips.push('Rico em proteínas')
    if ((nut.calcium_100g || 0) > 0.1) tips.push('Fonte de cálcio')
    if ((nut.iron_100g || 0) > 0.002) tips.push('Contém ferro')
    const grade = (p.nutriscore_grade || '').toLowerCase()
    if (grade === 'a') tips.push('Excelente perfil nutricional')
    if (grade === 'b') tips.push('Bom perfil nutricional')
    return tips
  }

  const addToRecent = (p: Product) => {
    const updated = [p, ...recentScans.filter(s => s.barcode !== p.barcode)].slice(0, 10)
    setRecentScans(updated)
    try { localStorage.setItem('vitafit-recent-scans', JSON.stringify(updated)) } catch {}
  }

  const addToMeal = async () => {
    if (!product) return
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('meals').insert({
        user_id: user.id,
        name: product.name,
        calories: product.nutrition.calories,
        protein: product.nutrition.protein,
        carbs: product.nutrition.carbs,
        fat: product.nutrition.fat,
        meal_type: getMealType(),
        source: 'scanner'
      })

      // Award points for scanning
      await fetch('/api/gamification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, action: 'addPoints', points: 5, reason: 'Escaneou um produto', category: 'nutrition' })
      })

      setSavedToMeal(true)
      setTimeout(() => setSavedToMeal(false), 3000)
    } catch (e) { console.error(e) }
  }

  const getMealType = () => {
    const hour = new Date().getHours()
    if (hour < 10) return 'breakfast'
    if (hour < 14) return 'lunch'
    if (hour < 17) return 'snack'
    return 'dinner'
  }

  const scoreColor = (score?: string) => {
    switch (score?.toUpperCase()) {
      case 'A': return 'bg-green-500 text-white'
      case 'B': return 'bg-lime-500 text-white'
      case 'C': return 'bg-yellow-500 text-white'
      case 'D': return 'bg-orange-500 text-white'
      case 'E': return 'bg-red-500 text-white'
      default: return 'bg-gray-200 text-gray-600'
    }
  }

  // Camera Mode
  if (mode === 'camera') {
    return (
      <div className="min-h-screen bg-black relative">
        <video ref={videoRef} className="w-full h-screen object-cover" playsInline muted />
        <canvas ref={canvasRef} className="hidden" />

        {/* Overlay */}
        <div className="absolute inset-0 flex flex-col">
          <div className="flex items-center justify-between p-4">
            <button onClick={() => { stopCamera(); setMode('home') }} className="p-3 bg-black/50 rounded-full text-white">
              <X className="w-6 h-6" />
            </button>
            <span className="text-white font-medium bg-black/50 px-4 py-2 rounded-full text-sm">Aponte para o código de barras</span>
            <div className="w-12" />
          </div>

          <div className="flex-1 flex items-center justify-center">
            <div className="w-72 h-48 relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-xl" />
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500/80 animate-pulse" />
            </div>
          </div>

          {cameraError && (
            <div className="mx-4 mb-4 p-3 bg-red-500/90 rounded-xl text-white text-sm text-center">
              {cameraError}
            </div>
          )}

          <div className="p-6 flex justify-center gap-4">
            <button
              onClick={captureAndAnalyze}
              disabled={searching}
              className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-95"
            >
              {searching ? <Loader2 className="w-8 h-8 text-primary-600 animate-spin" /> : <ScanLine className="w-8 h-8 text-primary-600" />}
            </button>
            <button onClick={() => { stopCamera(); setMode('manual') }} className="p-4 bg-white/20 rounded-full text-white self-center">
              <Search className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Result Mode
  if (mode === 'result' && product) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <header className="bg-white border-b px-4 py-4 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => { setProduct(null); setMode('home') }} className="p-2 hover:bg-gray-100 rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold flex-1">Resultado da Análise</h1>
            <button onClick={() => { setProduct(null); setMode('home') }} className="text-sm text-primary-600 font-medium">
              Novo Scan
            </button>
          </div>
        </header>

        <div className="p-4 space-y-4">
          {/* Product Card */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className={`p-4 ${product.isHealthy ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center gap-4">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="w-16 h-16 rounded-xl object-cover bg-white" />
                ) : (
                  <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center">
                    <Utensils className="w-8 h-8 text-gray-300" />
                  </div>
                )}
                <div className="flex-1">
                  <h2 className="font-bold text-lg">{product.name}</h2>
                  {product.brand && <p className="text-sm text-gray-500">{product.brand}</p>}
                  <p className="text-xs text-gray-400">{product.category} • {product.serving}</p>
                </div>
                {product.score && (
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${scoreColor(product.score)}`}>
                    {product.score}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                {product.isHealthy ? (
                  <><ShieldCheck className="w-5 h-5 text-green-600" /><span className="font-semibold text-green-700">Boa escolha!</span></>
                ) : (
                  <><ShieldAlert className="w-5 h-5 text-red-500" /><span className="font-semibold text-red-600">Consumir com moderação</span></>
                )}
              </div>
            </div>
          </div>

          {/* Nutrition */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h3 className="font-bold mb-3">Informação Nutricional <span className="text-xs text-gray-400 font-normal">por {product.serving}</span></h3>
            
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { label: 'Calorias', value: `${product.nutrition.calories}`, unit: 'kcal', color: 'bg-orange-50 text-orange-700' },
                { label: 'Proteína', value: `${product.nutrition.protein}`, unit: 'g', color: 'bg-blue-50 text-blue-700' },
                { label: 'Carbos', value: `${product.nutrition.carbs}`, unit: 'g', color: 'bg-yellow-50 text-yellow-700' },
                { label: 'Gordura', value: `${product.nutrition.fat}`, unit: 'g', color: 'bg-red-50 text-red-700' },
              ].map(item => (
                <div key={item.label} className={`${item.color} rounded-xl p-2 text-center`}>
                  <p className="text-lg font-bold">{item.value}</p>
                  <p className="text-[10px]">{item.unit}</p>
                  <p className="text-[10px] opacity-70">{item.label}</p>
                </div>
              ))}
            </div>

            {(product.nutrition.fiber || product.nutrition.sugar || product.nutrition.sodium) && (
              <div className="grid grid-cols-3 gap-2">
                {product.nutrition.fiber !== undefined && product.nutrition.fiber > 0 && (
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-sm font-bold">{product.nutrition.fiber}g</p>
                    <p className="text-[10px] text-gray-500">Fibras</p>
                  </div>
                )}
                {product.nutrition.sugar !== undefined && product.nutrition.sugar > 0 && (
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-sm font-bold">{product.nutrition.sugar}g</p>
                    <p className="text-[10px] text-gray-500">Açúcar</p>
                  </div>
                )}
                {product.nutrition.sodium !== undefined && product.nutrition.sodium > 0 && (
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-sm font-bold">{product.nutrition.sodium}mg</p>
                    <p className="text-[10px] text-gray-500">Sódio</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Warnings */}
          {product.warnings && product.warnings.length > 0 && (
            <div className="bg-red-50 rounded-2xl p-4">
              <h3 className="font-bold text-red-700 mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" /> Atenção
              </h3>
              {product.warnings.map((w, i) => (
                <p key={i} className="text-sm text-red-600 ml-7">• {w}</p>
              ))}
            </div>
          )}

          {/* Tips */}
          {product.tips && product.tips.length > 0 && (
            <div className="bg-green-50 rounded-2xl p-4">
              <h3 className="font-bold text-green-700 mb-2 flex items-center gap-2">
                <Info className="w-5 h-5" /> Dicas
              </h3>
              {product.tips.map((t, i) => (
                <p key={i} className="text-sm text-green-600 ml-7">• {t}</p>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={addToMeal}
              disabled={savedToMeal}
              className={`flex-1 py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                savedToMeal ? 'bg-green-500 text-white' : 'btn-primary'
              }`}
            >
              {savedToMeal ? <><Check className="w-5 h-5" /> Adicionado!</> : <><Plus className="w-5 h-5" /> Adicionar à Refeição</>}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Home / Manual Mode
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Scanner Nutricional</h1>
            <p className="text-sm text-gray-500">Escaneie e descubra os nutrientes</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Scan Button */}
        <button
          onClick={startCamera}
          className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-2xl p-6 text-center shadow-lg active:scale-[0.98] transition-transform"
        >
          <Camera className="w-12 h-12 mx-auto mb-3" />
          <h2 className="text-lg font-bold mb-1">Escanear Código de Barras</h2>
          <p className="text-white/80 text-sm">Aponte a câmera para o código do produto</p>
        </button>

        {/* Manual Search */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-400" /> Busca Manual
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={e => { setManualCode(e.target.value); setError('') }}
              placeholder="Digite o código de barras"
              className="input flex-1"
              inputMode="numeric"
              onKeyDown={e => e.key === 'Enter' && manualCode.length >= 8 && lookupProduct(manualCode)}
            />
            <button
              onClick={() => manualCode.length >= 8 && lookupProduct(manualCode)}
              disabled={manualCode.length < 8 || searching}
              className="btn-primary px-5"
            >
              {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            </button>
          </div>
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </div>

        {/* Quick Scan - Popular Products */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" /> Produtos Populares
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(LOCAL_PRODUCTS).slice(0, 6).map(p => (
              <button
                key={p.barcode}
                onClick={() => lookupProduct(p.barcode)}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 hover:bg-primary-50 transition-all text-left"
              >
                <span className="text-lg">{p.isHealthy ? '✅' : '⚠️'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{p.name}</p>
                  <p className="text-[10px] text-gray-400">{p.brand}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Scans */}
        {recentScans.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-gray-400" /> Scans Recentes
            </h3>
            <div className="space-y-2">
              {recentScans.slice(0, 5).map(p => (
                <button
                  key={p.barcode}
                  onClick={() => { setProduct(p); setMode('result') }}
                  className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-all"
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${p.isHealthy ? 'bg-green-100' : 'bg-red-100'}`}>
                    {p.isHealthy ? <Check className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-[10px] text-gray-400">{p.nutrition.calories} kcal • {p.brand}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
