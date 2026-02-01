'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { 
  Camera, X, RotateCcw, Check, AlertCircle, ArrowLeft, Search, Plus, Star,
  Info, ChevronRight, Loader2, Zap, ShieldCheck, ShieldAlert, Utensils, 
  ScanLine, ImageIcon, Flashlight, FlashlightOff
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

// Extended local products database (Brazilian products)
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
    tips: ['Rica em fibras', 'Ajuda a controlar colesterol']
  },
  '7894900011517': {
    barcode: '7894900011517', name: 'Coca-Cola', brand: 'Coca-Cola',
    nutrition: { calories: 139, protein: 0, carbs: 35, fat: 0, sugar: 35 },
    serving: '350ml', category: 'Bebidas', isHealthy: false, score: 'E',
    warnings: ['Alto teor de açúcar', 'Contém cafeína - cuidado na gestação'],
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
    tips: ['Rico em ferro e ácido fólico', 'Essencial na gestação']
  },
  '7891962047584': {
    barcode: '7891962047584', name: 'Sardinha em Óleo', brand: 'Coqueiro',
    nutrition: { calories: 142, protein: 15, carbs: 0, fat: 9, sodium: 380 },
    serving: '84g', category: 'Proteínas', isHealthy: true, score: 'A',
    tips: ['Rica em ômega-3 (DHA)', 'Importante para o bebê']
  },
  '7622300862664': {
    barcode: '7622300862664', name: 'Biscoito Recheado', brand: 'Oreo',
    nutrition: { calories: 160, protein: 1, carbs: 25, fat: 7, sugar: 14 },
    serving: '3 unidades', category: 'Snacks', isHealthy: false, score: 'E',
    warnings: ['Alto em açúcar e gordura', 'Contém gordura trans'],
    tips: ['Consumir com moderação']
  },
  '7891024135204': {
    barcode: '7891024135204', name: 'Banana Passa', brand: 'Banana Brasil',
    nutrition: { calories: 280, protein: 3, carbs: 65, fat: 0.5, fiber: 6 },
    serving: '100g', category: 'Frutas Secas', isHealthy: true, score: 'B',
    tips: ['Rica em potássio', 'Boa para câimbras na gestação']
  },
  '7891000305102': {
    barcode: '7891000305102', name: 'Leite em Pó', brand: 'Ninho Fortificado',
    nutrition: { calories: 130, protein: 7, carbs: 10, fat: 7 },
    serving: '26g (2 colheres)', category: 'Laticínios', isHealthy: true, score: 'A',
    tips: ['Fortificado com ferro e vitaminas', 'Ideal para gestantes']
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
  const [scanning, setScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const detectorRef = useRef<any>(null)

  // Load recent scans from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('vitafit_recent_scans')
      if (saved) setRecentScans(JSON.parse(saved).slice(0, 10))
    } catch {}
  }, [])

  const saveRecentScan = (p: Product) => {
    const updated = [p, ...recentScans.filter(s => s.barcode !== p.barcode)].slice(0, 10)
    setRecentScans(updated)
    try { localStorage.setItem('vitafit_recent_scans', JSON.stringify(updated)) } catch {}
  }

  // Initialize BarcodeDetector or fallback
  const initBarcodeDetector = async () => {
    if ('BarcodeDetector' in window) {
      try {
        detectorRef.current = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39']
        })
        return true
      } catch { return false }
    }
    return false
  }

  const startCamera = async () => {
    setMode('camera')
    setCameraError('')
    setScanning(true)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      const hasDetector = await initBarcodeDetector()

      if (hasDetector) {
        // Use native BarcodeDetector API
        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || !detectorRef.current) return
          try {
            const barcodes = await detectorRef.current.detect(videoRef.current)
            if (barcodes.length > 0) {
              const code = barcodes[0].rawValue
              if (code) {
                stopCamera()
                await lookupProduct(code)
              }
            }
          } catch {}
        }, 300)
      } else {
        // Fallback: manual entry prompt
        setCameraError('Detecção automática não disponível neste navegador. Use a entrada manual abaixo ou aponte para o código de barras e toque em "Capturar".')
      }
    } catch (err: any) {
      console.error('Camera error:', err)
      setCameraError(
        err.name === 'NotAllowedError' 
          ? 'Acesso à câmera negado. Habilite nas configurações do navegador.'
          : 'Não foi possível acessar a câmera. Tente a entrada manual.'
      )
      setMode('home')
    }
  }

  const captureFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return
    const canvas = canvasRef.current
    const video = videoRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)

    // Try BarcodeDetector on the canvas
    if (detectorRef.current) {
      try {
        const barcodes = await detectorRef.current.detect(canvas)
        if (barcodes.length > 0) {
          stopCamera()
          await lookupProduct(barcodes[0].rawValue)
          return
        }
      } catch {}
    }
    
    setError('Código não detectado. Tente novamente ou use a entrada manual.')
  }

  const stopCamera = () => {
    setScanning(false)
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  const lookupProduct = async (barcode: string) => {
    setSearching(true)
    setError('')
    setSavedToMeal(false)

    try {
      // Check local database first
      if (LOCAL_PRODUCTS[barcode]) {
        setProduct(LOCAL_PRODUCTS[barcode])
        saveRecentScan(LOCAL_PRODUCTS[barcode])
        setMode('result')
        setSearching(false)
        return
      }

      // Try Open Food Facts API
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`)
      if (res.ok) {
        const data = await res.json()
        if (data.status === 1 && data.product) {
          const p = data.product
          const nutrition = p.nutriments || {}
          
          const product: Product = {
            barcode,
            name: p.product_name_pt || p.product_name || 'Produto desconhecido',
            brand: p.brands || undefined,
            image: p.image_front_small_url || p.image_url || undefined,
            nutrition: {
              calories: Math.round(nutrition['energy-kcal_100g'] || nutrition['energy-kcal'] || 0),
              protein: Math.round((nutrition.proteins_100g || nutrition.proteins || 0) * 10) / 10,
              carbs: Math.round((nutrition.carbohydrates_100g || nutrition.carbohydrates || 0) * 10) / 10,
              fat: Math.round((nutrition.fat_100g || nutrition.fat || 0) * 10) / 10,
              fiber: nutrition.fiber_100g ? Math.round(nutrition.fiber_100g * 10) / 10 : undefined,
              sodium: nutrition.sodium_100g ? Math.round(nutrition.sodium_100g * 1000) : undefined,
              sugar: nutrition.sugars_100g ? Math.round(nutrition.sugars_100g * 10) / 10 : undefined,
            },
            serving: p.serving_size || '100g',
            category: p.categories_tags?.[0]?.replace('en:', '') || 'Geral',
            isHealthy: (p.nutriscore_grade || 'c') <= 'b',
            score: (p.nutriscore_grade || '?').toUpperCase(),
            ingredients: p.ingredients_text_pt || p.ingredients_text || undefined,
            warnings: [],
            tips: [],
          }

          // Generate pregnancy-specific warnings
          if (product.nutrition.sugar && product.nutrition.sugar > 20) product.warnings?.push('Alto teor de açúcar')
          if (product.nutrition.sodium && product.nutrition.sodium > 500) product.warnings?.push('Alto teor de sódio')
          if (product.nutrition.fat > 15) product.warnings?.push('Alto teor de gordura')
          const rawCats = (p.categories || '').toLowerCase()
          if (rawCats.includes('caffein') || rawCats.includes('coffee') || rawCats.includes('energy')) {
            product.warnings?.push('Pode conter cafeína - cuidado na gestação')
          }
          if (rawCats.includes('alcohol')) product.warnings?.push('⚠️ Álcool é contraindicado na gestação')

          // Generate tips
          if (product.nutrition.protein > 10) product.tips?.push('Boa fonte de proteínas')
          if (product.nutrition.fiber && product.nutrition.fiber > 3) product.tips?.push('Rico em fibras')
          if (product.nutrition.calories < 100) product.tips?.push('Baixas calorias')
          if (product.isHealthy) product.tips?.push('Boa escolha nutricional!')

          setProduct(product)
          saveRecentScan(product)
          setMode('result')
          setSearching(false)
          return
        }
      }

      setError(`Produto não encontrado (código: ${barcode}). Tente outro código.`)
    } catch (err) {
      setError('Erro ao buscar produto. Verifique sua conexão.')
    }
    setSearching(false)
  }

  const addToMeal = async () => {
    if (!product) return
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('meals').insert({
        user_id: user.id,
        meal_type: 'snack',
        name: `${product.brand ? product.brand + ' ' : ''}${product.name}`,
        calories: product.nutrition.calories,
        protein: product.nutrition.protein,
        carbs: product.nutrition.carbs,
        fat: product.nutrition.fat,
        logged_at: new Date().toISOString()
      })

      // Award points for scanning
      await fetch('/api/gamification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, action: 'addPoints', points: 5, reason: `Escaneou: ${product.name}`, category: 'scan' })
      })

      setSavedToMeal(true)
    } catch (e) { console.error(e) }
  }

  const getScoreColor = (score?: string) => {
    const colors: Record<string, string> = {
      'A': 'bg-green-500', 'B': 'bg-lime-500', 'C': 'bg-yellow-500',
      'D': 'bg-orange-500', 'E': 'bg-red-500',
    }
    return colors[score || ''] || 'bg-gray-400'
  }

  useEffect(() => {
    return () => { stopCamera() }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      {/* === HOME VIEW === */}
      {mode === 'home' && (
        <>
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 pt-12 pb-6">
            <div className="flex items-center gap-3 mb-4">
              <Link href="/dashboard" className="p-2 rounded-full bg-white/20">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-bold">Scanner de Alimentos</h1>
            </div>
            <p className="text-sm opacity-80">Escaneie o código de barras para ver as informações nutricionais</p>
          </div>

          <div className="p-4 space-y-4">
            {/* Main actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={startCamera}
                className="bg-white rounded-2xl border border-gray-200 p-6 text-center hover:shadow-md transition-all active:scale-95"
              >
                <div className="w-14 h-14 mx-auto bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mb-3">
                  <Camera className="w-7 h-7 text-white" />
                </div>
                <p className="font-semibold text-sm text-gray-800">Escanear</p>
                <p className="text-xs text-gray-500 mt-1">Use a câmera</p>
              </button>

              <button
                onClick={() => { setMode('manual'); setManualCode(''); setError('') }}
                className="bg-white rounded-2xl border border-gray-200 p-6 text-center hover:shadow-md transition-all active:scale-95"
              >
                <div className="w-14 h-14 mx-auto bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center mb-3">
                  <Search className="w-7 h-7 text-white" />
                </div>
                <p className="font-semibold text-sm text-gray-800">Digitar Código</p>
                <p className="text-xs text-gray-500 mt-1">Entrada manual</p>
              </button>
            </div>

            {/* Quick test products */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">🧪 Testar com Produtos</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(LOCAL_PRODUCTS).slice(0, 6).map(p => (
                  <button
                    key={p.barcode}
                    onClick={() => lookupProduct(p.barcode)}
                    className="bg-white rounded-xl border border-gray-200 p-3 text-left hover:bg-gray-50 transition-all"
                  >
                    <p className="text-xs font-semibold text-gray-800 truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.brand}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className={`w-5 h-5 rounded text-white text-xs flex items-center justify-center font-bold ${getScoreColor(p.score)}`}>
                        {p.score}
                      </span>
                      <span className="text-xs text-gray-400">{p.nutrition.calories} kcal</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent scans */}
            {recentScans.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">🕐 Escaneados Recentemente</h3>
                <div className="space-y-2">
                  {recentScans.slice(0, 5).map(p => (
                    <button
                      key={p.barcode}
                      onClick={() => { setProduct(p); setMode('result') }}
                      className="w-full flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-3 hover:bg-gray-50"
                    >
                      <div className={`w-8 h-8 rounded-lg text-white text-xs flex items-center justify-center font-bold ${getScoreColor(p.score)}`}>
                        {p.score || '?'}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.brand} • {p.nutrition.calories} kcal</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* === CAMERA VIEW === */}
      {mode === 'camera' && (
        <div className="fixed inset-0 bg-black z-50">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline autoPlay muted />
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Overlay */}
          <div className="absolute inset-0 flex flex-col">
            {/* Top bar */}
            <div className="flex items-center justify-between p-4 pt-12">
              <button onClick={() => { stopCamera(); setMode('home') }} className="p-2 bg-black/40 rounded-full">
                <X className="w-6 h-6 text-white" />
              </button>
              <p className="text-white text-sm font-medium bg-black/40 px-3 py-1.5 rounded-full">
                {scanning ? '🔍 Escaneando...' : 'Posicione o código'}
              </p>
              <div className="w-10" />
            </div>

            {/* Scan area */}
            <div className="flex-1 flex items-center justify-center">
              <div className="w-64 h-40 relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-white rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-white rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-white rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-white rounded-br-lg" />
                {scanning && (
                  <div className="absolute inset-x-2 h-0.5 bg-emerald-400 animate-pulse" style={{
                    top: '50%', boxShadow: '0 0 8px rgba(16, 185, 129, 0.8)'
                  }} />
                )}
              </div>
            </div>

            {/* Bottom controls */}
            <div className="p-4 pb-8 space-y-3">
              {cameraError && (
                <div className="bg-yellow-500/20 text-yellow-100 text-xs rounded-lg p-3 text-center">
                  {cameraError}
                </div>
              )}
              <div className="flex items-center justify-center gap-4">
                <button onClick={captureFrame} className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-95">
                  <ScanLine className="w-7 h-7 text-emerald-600" />
                </button>
              </div>
              <button
                onClick={() => { stopCamera(); setMode('manual'); setManualCode(''); setError('') }}
                className="w-full bg-white/20 text-white py-2.5 rounded-xl text-sm font-medium"
              >
                Digitar código manualmente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === MANUAL ENTRY VIEW === */}
      {mode === 'manual' && (
        <>
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 pt-12 pb-6">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setMode('home')} className="p-2 rounded-full bg-white/20">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold">Digitar Código</h1>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Código de Barras (EAN)</label>
              <input
                type="text"
                inputMode="numeric"
                value={manualCode}
                onChange={e => setManualCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Ex: 7891000100103"
                maxLength={13}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-lg tracking-wider focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">Digite os números abaixo do código de barras</p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 rounded-xl p-3 flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={() => manualCode.length >= 8 && lookupProduct(manualCode)}
              disabled={manualCode.length < 8 || searching}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3.5 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              {searching ? 'Buscando...' : 'Buscar Produto'}
            </button>

            {/* Quick test */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Teste rápido:</p>
              <div className="flex flex-wrap gap-2">
                {['7891000100103', '7894900011517', '7896004800011'].map(code => (
                  <button
                    key={code}
                    onClick={() => { setManualCode(code); lookupProduct(code) }}
                    className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200"
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* === RESULT VIEW === */}
      {mode === 'result' && product && (
        <>
          <div className={`px-4 pt-12 pb-6 ${product.isHealthy ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-red-500 to-orange-500'} text-white`}>
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => { setProduct(null); setMode('home') }} className="p-2 rounded-full bg-white/20">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold">Resultado</h1>
            </div>
            <div className="flex items-center gap-4">
              {product.image ? (
                <img src={product.image} alt={product.name} className="w-16 h-16 rounded-xl bg-white object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center">
                  <Utensils className="w-8 h-8" />
                </div>
              )}
              <div>
                <h2 className="text-lg font-bold">{product.name}</h2>
                {product.brand && <p className="text-sm opacity-80">{product.brand}</p>}
                <p className="text-xs opacity-60">Porção: {product.serving}</p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Nutri-Score */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Nutri-Score:</span>
              <div className="flex gap-1">
                {['A','B','C','D','E'].map(grade => (
                  <span key={grade} className={`w-7 h-7 rounded-md text-white text-xs flex items-center justify-center font-bold ${
                    product.score === grade ? getScoreColor(grade) + ' ring-2 ring-offset-1 ring-gray-400 scale-110' : 'bg-gray-200 text-gray-400'
                  }`}>
                    {grade}
                  </span>
                ))}
              </div>
            </div>

            {/* Pregnancy Safety */}
            <div className={`rounded-xl p-3 flex items-center gap-3 ${product.isHealthy ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              {product.isHealthy ? (
                <ShieldCheck className="w-6 h-6 text-green-600 flex-shrink-0" />
              ) : (
                <ShieldAlert className="w-6 h-6 text-red-600 flex-shrink-0" />
              )}
              <div>
                <p className={`text-sm font-semibold ${product.isHealthy ? 'text-green-700' : 'text-red-700'}`}>
                  {product.isHealthy ? 'Boa escolha para gestantes! ✨' : 'Consumir com moderação ⚠️'}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {product.isHealthy ? 'Este produto tem bom perfil nutricional.' : 'Verifique as informações abaixo.'}
                </p>
              </div>
            </div>

            {/* Nutrition table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-2.5 border-b">
                <p className="text-sm font-semibold text-gray-700">Informação Nutricional</p>
                <p className="text-xs text-gray-500">Por porção ({product.serving})</p>
              </div>
              <div className="divide-y divide-gray-100">
                {[
                  { label: 'Calorias', value: product.nutrition.calories, unit: 'kcal', color: 'text-orange-600' },
                  { label: 'Proteínas', value: product.nutrition.protein, unit: 'g', color: 'text-red-600' },
                  { label: 'Carboidratos', value: product.nutrition.carbs, unit: 'g', color: 'text-blue-600' },
                  { label: 'Gorduras', value: product.nutrition.fat, unit: 'g', color: 'text-yellow-600' },
                  ...(product.nutrition.fiber ? [{ label: 'Fibras', value: product.nutrition.fiber, unit: 'g', color: 'text-green-600' }] : []),
                  ...(product.nutrition.sugar !== undefined ? [{ label: 'Açúcar', value: product.nutrition.sugar, unit: 'g', color: 'text-pink-600' }] : []),
                  ...(product.nutrition.sodium !== undefined ? [{ label: 'Sódio', value: product.nutrition.sodium, unit: 'mg', color: 'text-gray-600' }] : []),
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-gray-700">{item.label}</span>
                    <span className={`text-sm font-semibold ${item.color}`}>{item.value} {item.unit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Macros bar chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Distribuição de Macros</p>
              <div className="space-y-2">
                {[
                  { label: 'Proteínas', value: product.nutrition.protein, max: 50, color: 'bg-red-400' },
                  { label: 'Carboidratos', value: product.nutrition.carbs, max: 80, color: 'bg-blue-400' },
                  { label: 'Gorduras', value: product.nutrition.fat, max: 40, color: 'bg-yellow-400' },
                ].map(m => (
                  <div key={m.label} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-24">{m.label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3">
                      <div className={`${m.color} h-3 rounded-full transition-all`} style={{ width: `${Math.min(100, (m.value / m.max) * 100)}%` }} />
                    </div>
                    <span className="text-xs font-semibold w-10 text-right">{m.value}g</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Warnings */}
            {product.warnings && product.warnings.length > 0 && (
              <div className="bg-red-50 rounded-xl border border-red-200 p-4">
                <p className="text-sm font-semibold text-red-700 mb-2">⚠️ Atenção</p>
                {product.warnings.map((w, i) => (
                  <p key={i} className="text-sm text-red-600 flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {w}
                  </p>
                ))}
              </div>
            )}

            {/* Tips */}
            {product.tips && product.tips.length > 0 && (
              <div className="bg-green-50 rounded-xl border border-green-200 p-4">
                <p className="text-sm font-semibold text-green-700 mb-2">💡 Dicas</p>
                {product.tips.map((t, i) => (
                  <p key={i} className="text-sm text-green-600 flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 flex-shrink-0" /> {t}
                  </p>
                ))}
              </div>
            )}

            {/* Ingredients */}
            {product.ingredients && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-700 mb-1">📋 Ingredientes</p>
                <p className="text-xs text-gray-600 leading-relaxed">{product.ingredients}</p>
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={addToMeal}
                disabled={savedToMeal}
                className={`py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 ${
                  savedToMeal ? 'bg-green-100 text-green-700' : 'bg-emerald-500 text-white hover:bg-emerald-600'
                }`}
              >
                {savedToMeal ? <><Check className="w-4 h-4" /> Salvo!</> : <><Plus className="w-4 h-4" /> Adicionar à Refeição</>}
              </button>
              <button
                onClick={() => { setProduct(null); setMode('home') }}
                className="py-3 rounded-xl font-semibold text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Escanear Outro
              </button>
            </div>
          </div>
        </>
      )}

      {/* Loading overlay */}
      {searching && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-3" />
            <p className="font-semibold text-gray-800">Buscando produto...</p>
            <p className="text-xs text-gray-500 mt-1">Consultando banco de dados</p>
          </div>
        </div>
      )}
    </div>
  )
}
