'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Camera, X, Flashlight, FlashlightOff, RotateCcw, 
  Check, AlertCircle, ArrowLeft, Search, Plus, Star,
  Info, ChevronRight, Loader2
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
  warnings?: string[]
  tips?: string[]
}

// Banco de produtos local (fallback)
const LOCAL_PRODUCTS: Record<string, Product> = {
  '7891000100103': {
    barcode: '7891000100103',
    name: 'Leite Integral',
    brand: 'Ninho',
    nutrition: { calories: 120, protein: 6, carbs: 9, fat: 6, sugar: 9 },
    serving: '200ml',
    category: 'Laticínios',
    isHealthy: true,
    tips: ['Boa fonte de cálcio', 'Importante para gestantes']
  },
  '7891000053508': {
    barcode: '7891000053508',
    name: 'Iogurte Natural',
    brand: 'Nestlé',
    nutrition: { calories: 90, protein: 8, carbs: 12, fat: 2, sugar: 8 },
    serving: '170g',
    category: 'Laticínios',
    isHealthy: true,
    tips: ['Rico em probióticos', 'Ótimo para a digestão']
  },
  '7896004800011': {
    barcode: '7896004800011',
    name: 'Aveia em Flocos',
    brand: 'Quaker',
    nutrition: { calories: 140, protein: 5, carbs: 24, fat: 3, fiber: 4 },
    serving: '40g',
    category: 'Cereais',
    isHealthy: true,
    tips: ['Alta em fibras', 'Ajuda no controle glicêmico']
  },
  '7891910000197': {
    barcode: '7891910000197',
    name: 'Refrigerante Cola',
    brand: 'Coca-Cola',
    nutrition: { calories: 139, protein: 0, carbs: 35, fat: 0, sugar: 35 },
    serving: '350ml',
    category: 'Bebidas',
    isHealthy: false,
    warnings: ['Alto teor de açúcar', 'Evite durante a gravidez'],
    tips: ['Prefira água ou sucos naturais']
  },
  '7894900011517': {
    barcode: '7894900011517',
    name: 'Biscoito Recheado',
    brand: 'Oreo',
    nutrition: { calories: 160, protein: 2, carbs: 25, fat: 7, sugar: 14 },
    serving: '30g (3 unidades)',
    category: 'Biscoitos',
    isHealthy: false,
    warnings: ['Ultra-processado', 'Alto em açúcar'],
    tips: ['Consuma com moderação', 'Prefira frutas como lanche']
  },
  '7891000315507': {
    barcode: '7891000315507',
    name: 'Cereal Matinal Integral',
    brand: 'Nestlé Fitness',
    nutrition: { calories: 110, protein: 3, carbs: 23, fat: 1, fiber: 3 },
    serving: '30g',
    category: 'Cereais',
    isHealthy: true,
    tips: ['Rico em fibras', 'Bom para o café da manhã']
  },
}

export default function ScannerPage() {
  const [isScanning, setIsScanning] = useState(false)
  const [hasFlash, setHasFlash] = useState(false)
  const [flashOn, setFlashOn] = useState(false)
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [recentScans, setRecentScans] = useState<Product[]>([])
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt')
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    loadRecentScans()
    return () => stopCamera()
  }, [])

  const loadRecentScans = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Carregar scans recentes do localStorage (simplificado)
      const saved = localStorage.getItem('vitafit_recent_scans')
      if (saved) {
        setRecentScans(JSON.parse(saved).slice(0, 5))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const saveRecentScan = (product: Product) => {
    const updated = [product, ...recentScans.filter(p => p.barcode !== product.barcode)].slice(0, 10)
    setRecentScans(updated)
    localStorage.setItem('vitafit_recent_scans', JSON.stringify(updated))
  }

  const startCamera = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      
      setCameraPermission('granted')
      setIsScanning(true)

      // Verificar se tem flash
      const track = stream.getVideoTracks()[0]
      const capabilities = track.getCapabilities() as any
      setHasFlash(!!capabilities?.torch)

      // Iniciar detecção
      startBarcodeDetection()
    } catch (err: any) {
      console.error('Erro ao acessar câmera:', err)
      if (err.name === 'NotAllowedError') {
        setCameraPermission('denied')
        setError('Permissão de câmera negada. Habilite nas configurações do navegador.')
      } else {
        setError('Não foi possível acessar a câmera.')
      }
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsScanning(false)
    setFlashOn(false)
  }

  const toggleFlash = async () => {
    if (!streamRef.current) return
    
    try {
      const track = streamRef.current.getVideoTracks()[0]
      await track.applyConstraints({
        advanced: [{ torch: !flashOn } as any]
      })
      setFlashOn(!flashOn)
    } catch (e) {
      console.error('Erro ao alternar flash:', e)
    }
  }

  const startBarcodeDetection = () => {
    if (!('BarcodeDetector' in window)) {
      // Fallback para navegadores sem suporte
      console.log('BarcodeDetector não suportado, usando input manual')
      return
    }

    const detector = new (window as any).BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39']
    })

    const detect = async () => {
      if (!videoRef.current || !isScanning) return

      try {
        const barcodes = await detector.detect(videoRef.current)
        if (barcodes.length > 0) {
          const code = barcodes[0].rawValue
          handleBarcodeDetected(code)
          return
        }
      } catch (e) {
        // Continua tentando
      }

      if (isScanning) {
        requestAnimationFrame(detect)
      }
    }

    detect()
  }

  const handleBarcodeDetected = async (barcode: string) => {
    setLoading(true)
    stopCamera()

    try {
      // Primeiro tenta no banco local
      if (LOCAL_PRODUCTS[barcode]) {
        const product = LOCAL_PRODUCTS[barcode]
        setScannedProduct(product)
        saveRecentScan(product)
        return
      }

      // Tentar API externa (Open Food Facts)
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
      const data = await response.json()

      if (data.status === 1 && data.product) {
        const p = data.product
        const product: Product = {
          barcode,
          name: p.product_name || 'Produto desconhecido',
          brand: p.brands,
          image: p.image_url,
          nutrition: {
            calories: Math.round(p.nutriments?.['energy-kcal_100g'] || 0),
            protein: Math.round(p.nutriments?.proteins_100g || 0),
            carbs: Math.round(p.nutriments?.carbohydrates_100g || 0),
            fat: Math.round(p.nutriments?.fat_100g || 0),
            fiber: Math.round(p.nutriments?.fiber_100g || 0),
            sugar: Math.round(p.nutriments?.sugars_100g || 0),
            sodium: Math.round(p.nutriments?.sodium_100g * 1000 || 0),
          },
          serving: '100g',
          category: p.categories_tags?.[0]?.replace('en:', '') || 'Outros',
          isHealthy: (p.nutriscore_grade && ['a', 'b'].includes(p.nutriscore_grade)) || false,
          warnings: p.allergens_tags?.map((a: string) => a.replace('en:', '')),
        }
        
        setScannedProduct(product)
        saveRecentScan(product)
      } else {
        setError(`Produto não encontrado (código: ${barcode})`)
      }
    } catch (err) {
      console.error('Erro ao buscar produto:', err)
      setError('Erro ao buscar informações do produto')
    } finally {
      setLoading(false)
    }
  }

  const handleManualSearch = () => {
    if (manualCode.length >= 8) {
      handleBarcodeDetected(manualCode)
    }
  }

  const addToMeal = async () => {
    if (!scannedProduct) return
    
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('meals').insert({
        user_id: user.id,
        name: scannedProduct.name,
        meal_type: 'snack',
        calories: scannedProduct.nutrition.calories,
        protein: scannedProduct.nutrition.protein,
        carbs: scannedProduct.nutrition.carbs,
        fat: scannedProduct.nutrition.fat,
        notes: `Escaneado - ${scannedProduct.brand || ''}`
      })

      alert('Adicionado às suas refeições! 🎉')
    } catch (e) {
      console.error(e)
    }
  }

  // Tela de resultado do scan
  if (scannedProduct) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setScannedProduct(null)} 
              className="p-2 hover:bg-gray-100 rounded-xl"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold">Informação Nutricional</h1>
          </div>
        </header>

        <div className="p-4">
          {/* Card do Produto */}
          <div className={`rounded-2xl p-6 mb-4 ${scannedProduct.isHealthy ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
            <div className="flex items-start gap-4">
              {scannedProduct.image ? (
                <img src={scannedProduct.image} alt={scannedProduct.name} className="w-20 h-20 object-contain rounded-lg bg-white" />
              ) : (
                <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center text-3xl">
                  📦
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-1">{scannedProduct.name}</h2>
                {scannedProduct.brand && (
                  <p className="text-gray-600">{scannedProduct.brand}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    scannedProduct.isHealthy 
                      ? 'bg-green-200 text-green-800' 
                      : 'bg-orange-200 text-orange-800'
                  }`}>
                    {scannedProduct.isHealthy ? '✅ Saudável' : '⚠️ Moderação'}
                  </span>
                  <span className="text-sm text-gray-500">{scannedProduct.serving}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabela Nutricional */}
          <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <h3 className="font-semibold mb-3">Informação Nutricional</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-gray-600">Calorias</span>
                <span className="font-semibold">{scannedProduct.nutrition.calories} kcal</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-gray-600">Proteínas</span>
                <span className="font-semibold">{scannedProduct.nutrition.protein}g</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-gray-600">Carboidratos</span>
                <span className="font-semibold">{scannedProduct.nutrition.carbs}g</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-gray-600">Gorduras</span>
                <span className="font-semibold">{scannedProduct.nutrition.fat}g</span>
              </div>
              {scannedProduct.nutrition.fiber !== undefined && (
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                  <span className="text-gray-600">Fibras</span>
                  <span className="font-semibold">{scannedProduct.nutrition.fiber}g</span>
                </div>
              )}
              {scannedProduct.nutrition.sugar !== undefined && (
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                  <span className="text-gray-600">Açúcares</span>
                  <span className={`font-semibold ${(scannedProduct.nutrition.sugar || 0) > 10 ? 'text-orange-600' : ''}`}>
                    {scannedProduct.nutrition.sugar}g
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Avisos */}
          {scannedProduct.warnings && scannedProduct.warnings.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
              <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Atenção
              </h3>
              <ul className="space-y-1">
                {scannedProduct.warnings.map((warning, i) => (
                  <li key={i} className="text-red-700 text-sm">• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Dicas */}
          {scannedProduct.tips && scannedProduct.tips.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4">
              <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <Info className="w-5 h-5" />
                Dicas
              </h3>
              <ul className="space-y-1">
                {scannedProduct.tips.map((tip, i) => (
                  <li key={i} className="text-blue-700 text-sm">• {tip}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex gap-3">
            <button
              onClick={addToMeal}
              className="flex-1 btn-primary py-3 rounded-xl flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Adicionar à Refeição
            </button>
            <button
              onClick={() => { setScannedProduct(null); startCamera() }}
              className="btn-secondary py-3 px-4 rounded-xl"
            >
              <Camera className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="flex items-center gap-3">
          <Link href="/nutrition" className="p-2 hover:bg-gray-100 rounded-xl">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Scanner de Alimentos</h1>
            <p className="text-sm text-gray-500">Escaneie o código de barras</p>
          </div>
        </div>
      </header>

      <div className="p-4">
        {/* Área da câmera */}
        {isScanning ? (
          <div className="relative rounded-2xl overflow-hidden mb-4 bg-black aspect-[4/3]">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Overlay com guia */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-32 border-2 border-white/80 rounded-lg relative">
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary-500 rounded-tl" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary-500 rounded-tr" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary-500 rounded-bl" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary-500 rounded-br" />
                
                {/* Linha de scan animada */}
                <motion.div
                  className="absolute left-2 right-2 h-0.5 bg-primary-500"
                  animate={{ top: ['10%', '90%', '10%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            </div>

            {/* Controles */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
              {hasFlash && (
                <button
                  onClick={toggleFlash}
                  className="p-3 bg-black/50 rounded-full text-white"
                >
                  {flashOn ? <FlashlightOff className="w-6 h-6" /> : <Flashlight className="w-6 h-6" />}
                </button>
              )}
              <button
                onClick={stopCamera}
                className="p-3 bg-red-500 rounded-full text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {loading && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <div className="text-center text-white">
                  <Loader2 className="w-10 h-10 animate-spin mx-auto mb-2" />
                  <p>Buscando informações...</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl bg-gray-100 aspect-[4/3] flex flex-col items-center justify-center mb-4">
            <Camera className="w-16 h-16 text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4 text-center px-4">
              Aponte a câmera para o código de barras do produto
            </p>
            <button
              onClick={startCamera}
              className="btn-primary px-8 py-3 rounded-xl flex items-center gap-2"
            >
              <Camera className="w-5 h-5" />
              Abrir Câmera
            </button>
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Busca manual */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <h3 className="font-semibold mb-3">Digitar código manualmente</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.replace(/\D/g, ''))}
              placeholder="Digite o código de barras"
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              maxLength={13}
            />
            <button
              onClick={handleManualSearch}
              disabled={manualCode.length < 8 || loading}
              className="btn-primary px-4 rounded-xl disabled:opacity-50"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Códigos de teste */}
        <div className="bg-blue-50 rounded-2xl p-4 mb-4">
          <h3 className="font-semibold text-blue-800 mb-2">🧪 Códigos para teste:</h3>
          <div className="flex flex-wrap gap-2">
            {Object.keys(LOCAL_PRODUCTS).slice(0, 4).map(code => (
              <button
                key={code}
                onClick={() => handleBarcodeDetected(code)}
                className="px-3 py-1 bg-blue-200 text-blue-800 rounded-full text-sm hover:bg-blue-300"
              >
                {code}
              </button>
            ))}
          </div>
        </div>

        {/* Histórico */}
        {recentScans.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold mb-3">Escaneados recentemente</h3>
            <div className="space-y-2">
              {recentScans.map(product => (
                <button
                  key={product.barcode}
                  onClick={() => setScannedProduct(product)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    📦
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.brand}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
