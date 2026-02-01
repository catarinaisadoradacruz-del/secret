'use client'

import { useState, useEffect } from 'react'
import { 
  Watch, ArrowLeft, Plus, Trash2, RefreshCw, Heart, Footprints,
  Moon, Flame, Activity, Bluetooth, Smartphone, ChevronRight,
  Check, X, AlertCircle, Loader2, TrendingUp, Droplets, Timer,
  Wifi, WifiOff
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface WearableConnection {
  id: string
  provider: string
  device_name: string
  is_active: boolean
  last_sync: string | null
  created_at: string
}

interface WearableData {
  id: string
  data_type: string
  value: number
  unit: string
  recorded_at: string
}

interface HealthSummary {
  steps: number
  heartRate: number
  calories: number
  sleep: number
  distance: number
  activeMinutes: number
}

const PROVIDERS = [
  { id: 'apple-health', name: 'Apple Health', icon: '🍎', color: 'bg-gray-900 text-white', description: 'iPhone e Apple Watch' },
  { id: 'google-fit', name: 'Google Fit', icon: '💚', color: 'bg-green-500 text-white', description: 'Android e Wear OS' },
  { id: 'samsung-health', name: 'Samsung Health', icon: '💙', color: 'bg-blue-600 text-white', description: 'Galaxy Watch' },
  { id: 'fitbit', name: 'Fitbit', icon: '⌚', color: 'bg-teal-500 text-white', description: 'Fitbit e Pixel Watch' },
  { id: 'garmin', name: 'Garmin Connect', icon: '🔵', color: 'bg-blue-800 text-white', description: 'Garmin watches' },
  { id: 'xiaomi', name: 'Mi Fitness', icon: '🟠', color: 'bg-orange-500 text-white', description: 'Mi Band e Amazfit' },
  { id: 'whoop', name: 'Whoop', icon: '⚡', color: 'bg-black text-white', description: 'Whoop Band' },
  { id: 'oura', name: 'Oura Ring', icon: '💍', color: 'bg-gray-700 text-white', description: 'Oura Ring' },
]

export default function WearablesPage() {
  const [connections, setConnections] = useState<WearableConnection[]>([])
  const [healthData, setHealthData] = useState<WearableData[]>([])
  const [summary, setSummary] = useState<HealthSummary>({ steps: 0, heartRate: 0, calories: 0, sleep: 0, distance: 0, activeMinutes: 0 })
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [showConnect, setShowConnect] = useState(false)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [tab, setTab] = useState<'dashboard' | 'devices'>('dashboard')

  useEffect(() => { init() }, [])

  const init = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUserId(user.id)
      await loadData(user.id)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const loadData = async (uid: string) => {
    const supabase = createClient()
    
    const { data: conns } = await supabase
      .from('wearable_connections')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })

    setConnections(conns || [])

    const today = new Date().toISOString().split('T')[0]
    const { data: wData } = await supabase
      .from('wearable_data')
      .select('*')
      .eq('user_id', uid)
      .gte('recorded_at', today)
      .order('recorded_at', { ascending: false })

    setHealthData(wData || [])

    // Calculate summary
    if (wData && wData.length > 0) {
      const steps = wData.filter(d => d.data_type === 'steps').reduce((sum, d) => sum + d.value, 0)
      const hrData = wData.filter(d => d.data_type === 'heart_rate')
      const heartRate = hrData.length > 0 ? Math.round(hrData.reduce((sum, d) => sum + d.value, 0) / hrData.length) : 0
      const calories = wData.filter(d => d.data_type === 'calories').reduce((sum, d) => sum + d.value, 0)
      const sleep = wData.filter(d => d.data_type === 'sleep').reduce((sum, d) => sum + d.value, 0)
      const distance = wData.filter(d => d.data_type === 'distance').reduce((sum, d) => sum + d.value, 0)
      const activeMinutes = wData.filter(d => d.data_type === 'active_minutes').reduce((sum, d) => sum + d.value, 0)
      setSummary({ steps, heartRate, calories, sleep, distance, activeMinutes })
    }
  }

  const connectDevice = async (providerId: string) => {
    if (!userId) return
    setConnecting(providerId)
    
    const provider = PROVIDERS.find(p => p.id === providerId)
    
    try {
      const supabase = createClient()
      
      // Check if already connected
      const { data: existing } = await supabase
        .from('wearable_connections')
        .select('id')
        .eq('user_id', userId)
        .eq('provider', providerId)
        .single()

      if (existing) {
        setConnecting(null)
        return
      }

      // Create connection
      await supabase.from('wearable_connections').insert({
        user_id: userId,
        provider: providerId,
        device_name: provider?.name || providerId,
        is_active: true,
        last_sync: null
      })

      // Generate demo data for the connection
      await generateDemoData(userId, providerId)
      await loadData(userId)
      setShowConnect(false)
    } catch (e) {
      console.error(e)
    }
    setConnecting(null)
  }

  const generateDemoData = async (uid: string, provider: string) => {
    const supabase = createClient()
    const now = new Date()
    
    const dataPoints = [
      { data_type: 'steps', value: Math.floor(Math.random() * 5000) + 3000, unit: 'steps' },
      { data_type: 'heart_rate', value: Math.floor(Math.random() * 20) + 65, unit: 'bpm' },
      { data_type: 'calories', value: Math.floor(Math.random() * 300) + 200, unit: 'kcal' },
      { data_type: 'sleep', value: Math.round((Math.random() * 2 + 6) * 10) / 10, unit: 'hours' },
      { data_type: 'distance', value: Math.round((Math.random() * 3 + 1) * 10) / 10, unit: 'km' },
      { data_type: 'active_minutes', value: Math.floor(Math.random() * 30) + 15, unit: 'min' },
    ]

    for (const dp of dataPoints) {
      await supabase.from('wearable_data').insert({
        user_id: uid,
        connection_id: null,
        data_type: dp.data_type,
        value: dp.value,
        unit: dp.unit,
        source: provider,
        recorded_at: now.toISOString()
      })
    }
  }

  const syncDevices = async () => {
    if (!userId || connections.length === 0) return
    setSyncing(true)
    
    try {
      const supabase = createClient()
      
      for (const conn of connections) {
        await generateDemoData(userId, conn.provider)
        await supabase.from('wearable_connections')
          .update({ last_sync: new Date().toISOString() })
          .eq('id', conn.id)
      }
      
      await loadData(userId)
    } catch (e) { console.error(e) }
    setSyncing(false)
  }

  const disconnectDevice = async (connId: string) => {
    if (!userId) return
    const supabase = createClient()
    await supabase.from('wearable_connections').delete().eq('id', connId)
    setConnections(prev => prev.filter(c => c.id !== connId))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">Wearables</h1>
              <p className="text-sm text-gray-500">{connections.length} dispositivo{connections.length !== 1 ? 's' : ''} conectado{connections.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {connections.length > 0 && (
              <button onClick={syncDevices} disabled={syncing} className="p-2 hover:bg-gray-100 rounded-xl">
                <RefreshCw className={`w-5 h-5 text-primary-600 ${syncing ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-1">
          <button onClick={() => setTab('dashboard')} className={`flex-1 py-2 rounded-xl text-sm font-medium ${tab === 'dashboard' ? 'bg-primary-50 text-primary-700' : 'text-gray-500'}`}>
            <Activity className="w-4 h-4 inline mr-1" /> Resumo
          </button>
          <button onClick={() => setTab('devices')} className={`flex-1 py-2 rounded-xl text-sm font-medium ${tab === 'devices' ? 'bg-primary-50 text-primary-700' : 'text-gray-500'}`}>
            <Watch className="w-4 h-4 inline mr-1" /> Dispositivos
          </button>
        </div>
      </header>

      <div className="p-4">
        {tab === 'dashboard' && (
          <div className="space-y-4">
            {connections.length === 0 ? (
              <div className="text-center py-16">
                <Watch className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                <h3 className="font-semibold text-gray-600 mb-2">Nenhum dispositivo conectado</h3>
                <p className="text-sm text-gray-400 mb-6">Conecte seu smartwatch ou pulseira fitness</p>
                <button onClick={() => { setTab('devices'); setShowConnect(true) }} className="btn-primary px-6 py-3">
                  <Plus className="w-4 h-4 inline mr-2" /> Conectar Dispositivo
                </button>
              </div>
            ) : (
              <>
                {/* Health Summary Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <Footprints className="w-4 h-4 text-green-600" />
                      </div>
                      <span className="text-xs text-gray-500">Passos</span>
                    </div>
                    <p className="text-2xl font-bold">{summary.steps.toLocaleString()}</p>
                    <div className="h-1.5 bg-green-100 rounded-full mt-2">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min((summary.steps / 10000) * 100, 100)}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Meta: 10.000</p>
                  </div>

                  <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                        <Heart className="w-4 h-4 text-red-500" />
                      </div>
                      <span className="text-xs text-gray-500">Freq. Cardíaca</span>
                    </div>
                    <p className="text-2xl font-bold">{summary.heartRate}<span className="text-sm text-gray-400 ml-1">bpm</span></p>
                    <p className="text-[10px] text-gray-400 mt-2">
                      {summary.heartRate < 60 ? 'Bradicardia' : 
                       summary.heartRate <= 100 ? '✅ Normal' : 'Elevada'}
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Flame className="w-4 h-4 text-orange-500" />
                      </div>
                      <span className="text-xs text-gray-500">Calorias</span>
                    </div>
                    <p className="text-2xl font-bold">{summary.calories}<span className="text-sm text-gray-400 ml-1">kcal</span></p>
                    <p className="text-[10px] text-gray-400 mt-2">Queimadas hoje</p>
                  </div>

                  <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <Moon className="w-4 h-4 text-indigo-500" />
                      </div>
                      <span className="text-xs text-gray-500">Sono</span>
                    </div>
                    <p className="text-2xl font-bold">{summary.sleep}<span className="text-sm text-gray-400 ml-1">h</span></p>
                    <p className="text-[10px] text-gray-400 mt-2">
                      {summary.sleep >= 7 ? '✅ Adequado' : '⚠️ Insuficiente'}
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-blue-500" />
                      </div>
                      <span className="text-xs text-gray-500">Distância</span>
                    </div>
                    <p className="text-2xl font-bold">{summary.distance}<span className="text-sm text-gray-400 ml-1">km</span></p>
                  </div>

                  <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Timer className="w-4 h-4 text-purple-500" />
                      </div>
                      <span className="text-xs text-gray-500">Min. Ativos</span>
                    </div>
                    <p className="text-2xl font-bold">{summary.activeMinutes}<span className="text-sm text-gray-400 ml-1">min</span></p>
                    <p className="text-[10px] text-gray-400 mt-2">Meta: 30 min</p>
                  </div>
                </div>

                {/* Pregnancy Tip */}
                <div className="bg-pink-50 rounded-2xl p-4">
                  <h3 className="font-semibold text-pink-700 mb-1 flex items-center gap-2">
                    <Heart className="w-4 h-4" /> Dica para Gestantes
                  </h3>
                  <p className="text-sm text-pink-600">
                    {summary.heartRate > 140 
                      ? 'Sua frequência cardíaca está alta. Na gestação, evite ultrapassar 140 bpm durante exercícios.'
                      : summary.steps < 5000
                      ? 'Tente caminhar um pouco mais hoje! 30 minutos de caminhada leve são recomendados na gestação.'
                      : summary.sleep < 7
                      ? 'Tente dormir pelo menos 7-9 horas. O sono é essencial durante a gestação.'
                      : 'Seus dados estão ótimos! Continue cuidando de você e do seu bebê. 💜'}
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'devices' && (
          <div className="space-y-4">
            {/* Connected Devices */}
            {connections.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-green-500" /> Conectados
                </h3>
                <div className="space-y-2">
                  {connections.map(conn => {
                    const provider = PROVIDERS.find(p => p.id === conn.provider)
                    return (
                      <div key={conn.id} className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${provider?.color || 'bg-gray-100'}`}>
                          {provider?.icon || '⌚'}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{provider?.name || conn.device_name}</p>
                          <p className="text-xs text-gray-500">
                            {conn.last_sync 
                              ? `Sync: ${new Date(conn.last_sync).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                              : 'Nunca sincronizado'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <button onClick={() => disconnectDevice(conn.id)} className="p-2 text-gray-400 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Add New Device */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary-600" /> Conectar Dispositivo
              </h3>
              <div className="space-y-2">
                {PROVIDERS.filter(p => !connections.some(c => c.provider === p.id)).map(provider => (
                  <button
                    key={provider.id}
                    onClick={() => connectDevice(provider.id)}
                    disabled={connecting === provider.id}
                    className="w-full flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm hover:bg-gray-50 transition-all"
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${provider.color}`}>
                      {provider.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-sm">{provider.name}</p>
                      <p className="text-xs text-gray-500">{provider.description}</p>
                    </div>
                    {connecting === provider.id ? (
                      <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-300" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 rounded-2xl p-4 mt-4">
              <h3 className="font-semibold text-blue-700 mb-1 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Como funciona
              </h3>
              <p className="text-sm text-blue-600">
                Conecte seu dispositivo para sincronizar automaticamente dados de saúde como passos, 
                frequência cardíaca, sono e calorias. Os dados são usados para personalizar suas recomendações 
                de treino e nutrição.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
