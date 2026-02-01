'use client'

import { useState, useEffect } from 'react'
import { 
  Watch, ArrowLeft, Plus, Trash2, RefreshCw, Heart, Footprints,
  Moon, Flame, Activity, Bluetooth, Smartphone, ChevronRight,
  Check, X, AlertCircle, Loader2, TrendingUp, Droplets, Timer,
  Wifi, WifiOff, Zap, Baby, ThermometerSun
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

interface HealthSummary {
  steps: number
  heartRate: number
  calories: number
  sleep: number
  distance: number
  activeMinutes: number
  stressLevel: number
  bloodOxygen: number
}

interface DayData {
  date: string
  steps: number
  calories: number
  heartRate: number
  sleep: number
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

// Generate realistic simulated data
const generateWeekData = (): DayData[] => {
  const data: DayData[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    data.push({
      date: d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }),
      steps: Math.floor(4000 + Math.random() * 6000),
      calories: Math.floor(1200 + Math.random() * 800),
      heartRate: Math.floor(65 + Math.random() * 20),
      sleep: Math.round((6 + Math.random() * 2.5) * 10) / 10,
    })
  }
  return data
}

const generateSummary = (): HealthSummary => ({
  steps: Math.floor(5000 + Math.random() * 5000),
  heartRate: Math.floor(68 + Math.random() * 15),
  calories: Math.floor(1400 + Math.random() * 600),
  sleep: Math.round((6.5 + Math.random() * 2) * 10) / 10,
  distance: Math.round((3 + Math.random() * 4) * 100) / 100,
  activeMinutes: Math.floor(20 + Math.random() * 40),
  stressLevel: Math.floor(20 + Math.random() * 50),
  bloodOxygen: Math.floor(95 + Math.random() * 4),
})

export default function WearablesPage() {
  const [connections, setConnections] = useState<WearableConnection[]>([])
  const [summary, setSummary] = useState<HealthSummary>(generateSummary())
  const [weekData, setWeekData] = useState<DayData[]>(generateWeekData())
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [showConnect, setShowConnect] = useState(false)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [tab, setTab] = useState<'dashboard' | 'devices' | 'pregnancy'>('dashboard')

  useEffect(() => { init() }, [])

  const init = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUserId(user.id)
      await loadConnections(user.id)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const loadConnections = async (uid: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('wearable_connections')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
    setConnections(data || [])
  }

  const connectDevice = async (providerId: string) => {
    if (!userId) return
    setConnecting(providerId)
    const provider = PROVIDERS.find(p => p.id === providerId)
    if (!provider) return

    // Simulate connection process
    await new Promise(r => setTimeout(r, 2000))

    const supabase = createClient()
    await supabase.from('wearable_connections').insert({
      user_id: userId,
      provider: providerId,
      device_name: provider.name,
      is_active: true,
      last_sync: new Date().toISOString()
    })

    // Generate initial data
    const dataTypes = ['steps', 'heart_rate', 'calories', 'sleep_hours', 'blood_oxygen']
    const values = [summary.steps, summary.heartRate, summary.calories, summary.sleep, summary.bloodOxygen]
    const units = ['steps', 'bpm', 'kcal', 'hours', '%']

    for (let i = 0; i < dataTypes.length; i++) {
      await supabase.from('wearable_data').insert({
        user_id: userId,
        connection_id: null,
        data_type: dataTypes[i],
        value: values[i],
        unit: units[i],
        recorded_at: new Date().toISOString()
      })
    }

    await loadConnections(userId)
    setConnecting(null)
    setShowConnect(false)
  }

  const syncAll = async () => {
    setSyncing(true)
    await new Promise(r => setTimeout(r, 2000))
    setSummary(generateSummary())
    setWeekData(generateWeekData())

    if (userId) {
      const supabase = createClient()
      for (const conn of connections) {
        await supabase.from('wearable_connections')
          .update({ last_sync: new Date().toISOString() })
          .eq('id', conn.id)
      }
    }
    setSyncing(false)
  }

  const disconnectDevice = async (id: string) => {
    const supabase = createClient()
    await supabase.from('wearable_connections').delete().eq('id', id)
    setConnections(prev => prev.filter(c => c.id !== id))
  }

  const maxSteps = Math.max(...weekData.map(d => d.steps), 1)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-cyan-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 pt-12 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 rounded-full bg-white/20">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold">Wearables & Saúde</h1>
          </div>
          <button
            onClick={syncAll}
            disabled={syncing || connections.length === 0}
            className="p-2 rounded-full bg-white/20 disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {connections.length > 0 ? (
          <div className="flex items-center gap-2 bg-white/15 rounded-xl p-3">
            <Wifi className="w-5 h-5 text-green-200" />
            <div>
              <p className="text-sm font-semibold">{connections.length} dispositivo(s) conectado(s)</p>
              <p className="text-xs opacity-70">
                Última sincronização: {connections[0]?.last_sync 
                  ? new Date(connections[0].last_sync).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  : 'Nunca'}
              </p>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowConnect(true)}
            className="w-full bg-white/15 rounded-xl p-3 flex items-center gap-3 hover:bg-white/25"
          >
            <WifiOff className="w-5 h-5 text-yellow-200" />
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold">Nenhum dispositivo conectado</p>
              <p className="text-xs opacity-70">Toque para conectar seu wearable</p>
            </div>
            <Plus className="w-5 h-5 opacity-60" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white sticky top-0 z-10">
        {[
          { id: 'dashboard' as const, label: '📊 Dashboard' },
          { id: 'pregnancy' as const, label: '🤰 Gestante' },
          { id: 'devices' as const, label: '📱 Dispositivos' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-all ${
              tab === t.id ? 'text-cyan-600 border-cyan-500 bg-cyan-50/50' : 'text-gray-500 border-transparent'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {/* === DASHBOARD TAB === */}
        {tab === 'dashboard' && (
          <>
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Footprints, label: 'Passos', value: summary.steps.toLocaleString(), color: 'text-blue-600', bg: 'bg-blue-50', goal: '8.000' },
                { icon: Heart, label: 'Freq. Cardíaca', value: `${summary.heartRate} bpm`, color: 'text-red-600', bg: 'bg-red-50' },
                { icon: Flame, label: 'Calorias', value: `${summary.calories} kcal`, color: 'text-orange-600', bg: 'bg-orange-50' },
                { icon: Moon, label: 'Sono', value: `${summary.sleep}h`, color: 'text-purple-600', bg: 'bg-purple-50', goal: '8h' },
                { icon: Activity, label: 'Atividade', value: `${summary.activeMinutes} min`, color: 'text-green-600', bg: 'bg-green-50', goal: '30 min' },
                { icon: Droplets, label: 'SpO2', value: `${summary.bloodOxygen}%`, color: 'text-cyan-600', bg: 'bg-cyan-50' },
              ].map((stat, i) => {
                const Icon = stat.icon
                return (
                  <div key={i} className={`${stat.bg} rounded-xl p-3 border border-gray-100`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${stat.color}`} />
                      <span className="text-xs text-gray-600">{stat.label}</span>
                    </div>
                    <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                    {stat.goal && <p className="text-xs text-gray-400">Meta: {stat.goal}</p>}
                  </div>
                )
              })}
            </div>

            {/* Steps chart (last 7 days) */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">📈 Passos - Últimos 7 dias</h3>
              <div className="flex items-end gap-1 h-32">
                {weekData.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex flex-col items-center justify-end" style={{ height: '100px' }}>
                      <div
                        className={`w-full rounded-t-md transition-all ${
                          d.steps >= 8000 ? 'bg-gradient-to-t from-blue-500 to-cyan-400' : 'bg-gradient-to-t from-blue-300 to-blue-200'
                        }`}
                        style={{ height: `${(d.steps / maxSteps) * 100}%`, minHeight: '4px' }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{d.date.split(' ')[0]}</p>
                    <p className="text-xs font-medium text-gray-700">{(d.steps/1000).toFixed(1)}k</p>
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                <span>Média: {(weekData.reduce((s, d) => s + d.steps, 0) / 7 / 1000).toFixed(1)}k passos</span>
                <span>Meta: 8k/dia</span>
              </div>
            </div>

            {/* Sleep chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">😴 Sono - Últimos 7 dias</h3>
              <div className="flex items-end gap-1 h-24">
                {weekData.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex flex-col items-center justify-end" style={{ height: '70px' }}>
                      <div
                        className={`w-full rounded-t-md ${
                          d.sleep >= 7 ? 'bg-gradient-to-t from-purple-500 to-indigo-400' : 'bg-gradient-to-t from-purple-300 to-purple-200'
                        }`}
                        style={{ height: `${(d.sleep / 10) * 100}%`, minHeight: '4px' }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{d.date.split(' ')[0]}</p>
                    <p className="text-xs font-medium">{d.sleep}h</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Stress level */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">😌 Nível de Estresse</h3>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-100 rounded-full h-4">
                  <div
                    className={`h-4 rounded-full transition-all ${
                      summary.stressLevel < 30 ? 'bg-green-400' : summary.stressLevel < 60 ? 'bg-yellow-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${summary.stressLevel}%` }}
                  />
                </div>
                <span className={`text-sm font-bold ${
                  summary.stressLevel < 30 ? 'text-green-600' : summary.stressLevel < 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {summary.stressLevel < 30 ? 'Baixo' : summary.stressLevel < 60 ? 'Moderado' : 'Alto'}
                </span>
              </div>
              {summary.stressLevel >= 60 && (
                <p className="text-xs text-red-500 mt-2">💡 Dica: Tente respiração profunda ou uma caminhada leve.</p>
              )}
            </div>
          </>
        )}

        {/* === PREGNANCY TAB === */}
        {tab === 'pregnancy' && (
          <>
            <div className="bg-pink-50 rounded-xl border border-pink-200 p-4">
              <h3 className="text-sm font-semibold text-pink-700 mb-2">🤰 Métricas para Gestantes</h3>
              <p className="text-xs text-pink-600">Dados monitorados especificamente para sua saúde na gestação</p>
            </div>

            <div className="space-y-3">
              {[
                { 
                  icon: Heart, label: 'Freq. Cardíaca em Repouso', value: `${summary.heartRate} bpm`,
                  normal: '60-100 bpm', status: summary.heartRate >= 60 && summary.heartRate <= 100 ? 'ok' : 'attention',
                  tip: 'Na gestação, a frequência pode aumentar 10-20 bpm. Isso é normal!',
                  color: 'red'
                },
                {
                  icon: Droplets, label: 'Saturação de Oxigênio (SpO2)', value: `${summary.bloodOxygen}%`,
                  normal: '95-100%', status: summary.bloodOxygen >= 95 ? 'ok' : 'attention',
                  tip: 'Mantenha acima de 95%. Se cair abaixo, consulte seu médico.',
                  color: 'cyan'
                },
                {
                  icon: Moon, label: 'Qualidade do Sono', value: `${summary.sleep}h`,
                  normal: '7-9 horas', status: summary.sleep >= 7 ? 'ok' : 'attention',
                  tip: 'Durma de lado esquerdo para melhor circulação no 3º trimestre.',
                  color: 'purple'
                },
                {
                  icon: Activity, label: 'Atividade Física', value: `${summary.activeMinutes} min`,
                  normal: '≥30 min/dia', status: summary.activeMinutes >= 30 ? 'ok' : 'attention',
                  tip: 'Caminhadas leves e exercícios aquáticos são os mais recomendados.',
                  color: 'green'
                },
                {
                  icon: Footprints, label: 'Passos Diários', value: summary.steps.toLocaleString(),
                  normal: '6.000-8.000', status: summary.steps >= 6000 ? 'ok' : 'attention',
                  tip: 'Caminhar é uma das melhores atividades para gestantes!',
                  color: 'blue'
                },
                {
                  icon: ThermometerSun, label: 'Nível de Estresse', value: `${summary.stressLevel}/100`,
                  normal: 'Baixo (<30)', status: summary.stressLevel < 30 ? 'ok' : summary.stressLevel < 60 ? 'attention' : 'alert',
                  tip: 'Estresse elevado pode afetar o bebê. Pratique meditação e respiração.',
                  color: 'orange'
                },
              ].map((metric, i) => {
                const Icon = metric.icon
                const bgMap: Record<string, string> = { red: 'bg-red-50', cyan: 'bg-cyan-50', purple: 'bg-purple-50', green: 'bg-green-50', blue: 'bg-blue-50', orange: 'bg-orange-50' }
                const textMap: Record<string, string> = { red: 'text-red-600', cyan: 'text-cyan-600', purple: 'text-purple-600', green: 'text-green-600', blue: 'text-blue-600', orange: 'text-orange-600' }
                return (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 rounded-xl ${bgMap[metric.color]} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${textMap[metric.color]}`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{metric.label}</p>
                        <p className="text-xs text-gray-500">Normal: {metric.normal}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${textMap[metric.color]}`}>{metric.value}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          metric.status === 'ok' ? 'bg-green-100 text-green-700' : 
                          metric.status === 'attention' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {metric.status === 'ok' ? '✅ Normal' : metric.status === 'attention' ? '⚠️ Atenção' : '🚨 Alerta'}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2 mt-2">💡 {metric.tip}</p>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* === DEVICES TAB === */}
        {tab === 'devices' && (
          <>
            <button
              onClick={() => setShowConnect(true)}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" /> Conectar Dispositivo
            </button>

            {connections.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Watch className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhum dispositivo conectado</p>
                <p className="text-sm mt-1">Conecte seu smartwatch ou pulseira fitness</p>
              </div>
            ) : (
              <div className="space-y-2">
                {connections.map(conn => {
                  const provider = PROVIDERS.find(p => p.id === conn.provider)
                  return (
                    <div key={conn.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-4">
                      <div className="text-2xl">{provider?.icon || '⌚'}</div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800">{conn.device_name}</p>
                        <p className="text-xs text-gray-500">
                          {conn.is_active ? '🟢 Conectado' : '🔴 Desconectado'} • 
                          Sync: {conn.last_sync ? new Date(conn.last_sync).toLocaleString('pt-BR') : 'Nunca'}
                        </p>
                      </div>
                      <button onClick={() => disconnectDevice(conn.id)} className="p-2 text-gray-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Info */}
            <div className="bg-cyan-50 rounded-xl border border-cyan-200 p-4 mt-4">
              <p className="text-sm font-semibold text-cyan-700 mb-1">ℹ️ Como funciona</p>
              <p className="text-xs text-cyan-600">
                Conecte seu dispositivo para sincronizar dados de saúde automaticamente. 
                Os dados incluem passos, frequência cardíaca, sono e atividade física. 
                Na versão atual, dados são simulados para demonstração.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Connect Device Modal */}
      {showConnect && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setShowConnect(false)}>
          <div className="bg-white rounded-t-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Conectar Dispositivo</h3>
              <button onClick={() => setShowConnect(false)} className="p-2"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-2">
              {PROVIDERS.map(p => {
                const isConnected = connections.some(c => c.provider === p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => !isConnected && connectDevice(p.id)}
                    disabled={isConnected || connecting === p.id}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                      isConnected ? 'bg-green-50 border border-green-200' : 'bg-gray-50 hover:bg-cyan-50 border border-gray-200'
                    }`}
                  >
                    <span className="text-2xl">{p.icon}</span>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.description}</p>
                    </div>
                    {isConnected ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : connecting === p.id ? (
                      <Loader2 className="w-5 h-5 animate-spin text-cyan-500" />
                    ) : (
                      <Plus className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
