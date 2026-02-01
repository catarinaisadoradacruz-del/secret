'use client'

import { useState, useEffect } from 'react'
import { 
  Bell, BellRing, Check, CheckCheck, Trash2, ArrowLeft, 
  Clock, Trophy, Heart, Apple, Dumbbell, Calendar, 
  MessageCircle, Baby, Droplets, Settings, Plus, X,
  ChevronRight, Smartphone, Volume2, VolumeX, ToggleLeft, ToggleRight
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Notification {
  id: string
  title: string
  body: string
  type: string
  read: boolean
  data: any
  created_at: string
}

interface ScheduledNotif {
  id: string
  title: string
  body: string
  type: string
  scheduled_time: string
  repeat_type: string
  is_active: boolean
}

type Tab = 'todas' | 'lembretes' | 'config'

const typeConfig: Record<string, { icon: any; bg: string; color: string }> = {
  achievement: { icon: Trophy, bg: 'bg-yellow-100', color: 'text-yellow-600' },
  workout: { icon: Dumbbell, bg: 'bg-blue-100', color: 'text-blue-600' },
  nutrition: { icon: Apple, bg: 'bg-green-100', color: 'text-green-600' },
  water: { icon: Droplets, bg: 'bg-cyan-100', color: 'text-cyan-600' },
  appointment: { icon: Calendar, bg: 'bg-purple-100', color: 'text-purple-600' },
  baby: { icon: Baby, bg: 'bg-pink-100', color: 'text-pink-600' },
  chat: { icon: MessageCircle, bg: 'bg-indigo-100', color: 'text-indigo-600' },
  health: { icon: Heart, bg: 'bg-red-100', color: 'text-red-600' },
  general: { icon: Bell, bg: 'bg-gray-100', color: 'text-gray-600' },
  reminder: { icon: Clock, bg: 'bg-orange-100', color: 'text-orange-600' },
}

const QUICK_REMINDERS = [
  { title: '💧 Hora de beber água', body: 'Mantenha-se hidratada! Beba um copo de água agora.', type: 'water', repeat: 'daily', time: '08:00' },
  { title: '🏋️ Hora do treino', body: 'Não esqueça da sua atividade física de hoje!', type: 'workout', repeat: 'daily', time: '10:00' },
  { title: '🍎 Registrar refeição', body: 'Registre o que comeu para acompanhar sua nutrição.', type: 'nutrition', repeat: 'daily', time: '12:30' },
  { title: '💊 Tomar vitaminas', body: 'Hora de tomar suas vitaminas e suplementos.', type: 'health', repeat: 'daily', time: '07:00' },
  { title: '📅 Consulta médica', body: 'Lembrete da sua consulta.', type: 'appointment', repeat: 'once', time: '14:00' },
  { title: '😴 Hora de dormir', body: 'Prepare-se para uma boa noite de sono.', type: 'health', repeat: 'daily', time: '22:00' },
  { title: '🧘 Momento de relaxar', body: 'Faça uma pausa e pratique respiração.', type: 'health', repeat: 'daily', time: '15:00' },
  { title: '📝 Registrar humor', body: 'Como você está se sentindo hoje?', type: 'general', repeat: 'daily', time: '20:00' },
]

export default function NotificationsPage() {
  const [tab, setTab] = useState<Tab>('todas')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [scheduled, setScheduled] = useState<ScheduledNotif[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNewReminder, setShowNewReminder] = useState(false)
  const [reminderTime, setReminderTime] = useState('08:00')
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushSupported, setPushSupported] = useState(false)
  const [notifPrefs, setNotifPrefs] = useState({
    water: true, workout: true, nutrition: true, health: true, 
    achievement: true, appointment: true, baby: true, chat: true
  })

  useEffect(() => { init() }, [])

  const init = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    setUserId(user.id)
    await loadNotifications(user.id)
    checkPushSupport()
    loadPreferences()
    setLoading(false)
  }

  const checkPushSupport = () => {
    const supported = 'Notification' in window
    setPushSupported(supported)
    if (supported) {
      setPushEnabled(Notification.permission === 'granted')
    }
  }

  const loadPreferences = () => {
    try {
      const saved = localStorage.getItem('vitafit_notif_prefs')
      if (saved) setNotifPrefs(JSON.parse(saved))
    } catch {}
  }

  const savePreferences = (prefs: typeof notifPrefs) => {
    setNotifPrefs(prefs)
    try { localStorage.setItem('vitafit_notif_prefs', JSON.stringify(prefs)) } catch {}
  }

  const enablePush = async () => {
    if (!pushSupported) return
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        setPushEnabled(true)
        // Show a test notification
        new Notification('VitaFit 🌸', {
          body: 'Notificações ativadas com sucesso!',
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png'
        })

        // Register push token in database
        if (userId) {
          const supabase = createClient()
          await supabase.from('push_tokens').upsert({
            user_id: userId,
            token: 'browser-' + Date.now(),
            platform: 'web',
            device_info: { userAgent: navigator.userAgent },
            is_active: true,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,platform' })
        }
      }
    } catch (e) {
      console.error('Push permission error:', e)
    }
  }

  const sendLocalNotification = (title: string, body: string) => {
    if (pushEnabled && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: 'vitafit-' + Date.now(),
      })
    }
  }

  const loadNotifications = async (uid: string) => {
    try {
      const supabase = createClient()
      const { data: notifs } = await supabase
        .from('notification_history')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(50)

      setNotifications(notifs || [])
      setUnreadCount((notifs || []).filter(n => !n.read).length)

      const { data: scheds } = await supabase
        .from('scheduled_notifications')
        .select('*')
        .eq('user_id', uid)
        .eq('is_active', true)
        .order('scheduled_time')

      setScheduled(scheds || [])
    } catch (e) { console.error(e) }
  }

  const markAllRead = async () => {
    if (!userId) return
    const supabase = createClient()
    await supabase
      .from('notification_history')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const markRead = async (id: string) => {
    const supabase = createClient()
    await supabase.from('notification_history').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const deleteNotification = async (id: string) => {
    const supabase = createClient()
    await supabase.from('notification_history').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const addReminder = async (reminder: typeof QUICK_REMINDERS[0]) => {
    if (!userId) return
    try {
      const supabase = createClient()
      
      // Schedule the notification
      const today = new Date()
      const [hours, minutes] = (reminder.time || reminderTime).split(':').map(Number)
      today.setHours(hours, minutes, 0, 0)
      if (today < new Date()) today.setDate(today.getDate() + 1)

      await supabase.from('scheduled_notifications').insert({
        user_id: userId,
        title: reminder.title,
        body: reminder.body,
        type: reminder.type,
        scheduled_time: today.toISOString(),
        repeat_type: reminder.repeat,
        is_active: true
      })

      // Also create an immediate in-app notification
      await supabase.from('notification_history').insert({
        user_id: userId,
        title: `✅ Lembrete configurado`,
        body: `${reminder.title} - ${reminder.repeat === 'daily' ? 'Todo dia' : 'Uma vez'} às ${reminder.time || reminderTime}`,
        type: 'reminder',
        read: false,
        data: {}
      })

      // Send browser notification
      sendLocalNotification('Lembrete ativado! ✅', `${reminder.title} configurado para ${reminder.time || reminderTime}`)

      await loadNotifications(userId)
      setShowNewReminder(false)
    } catch (e) { console.error(e) }
  }

  const toggleScheduled = async (id: string, currentState: boolean) => {
    const supabase = createClient()
    await supabase.from('scheduled_notifications').update({ is_active: !currentState }).eq('id', id)
    setScheduled(prev => prev.map(s => s.id === id ? { ...s, is_active: !currentState } : s))
  }

  const deleteScheduled = async (id: string) => {
    const supabase = createClient()
    await supabase.from('scheduled_notifications').delete().eq('id', id)
    setScheduled(prev => prev.filter(s => s.id !== id))
  }

  const formatDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 60000) return 'Agora'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 pt-12 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 rounded-full bg-white/20">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold">Notificações</h1>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-1.5 bg-white/20 text-sm px-3 py-1.5 rounded-full">
              <CheckCheck className="w-4 h-4" /> Ler todas
            </button>
          )}
        </div>

        {/* Push status */}
        {!pushEnabled && pushSupported && (
          <button
            onClick={enablePush}
            className="w-full bg-white/15 rounded-xl p-3 flex items-center gap-3 hover:bg-white/25 transition-all"
          >
            <BellRing className="w-5 h-5 text-yellow-200" />
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold">Ativar notificações push</p>
              <p className="text-xs opacity-70">Receba lembretes mesmo com o app fechado</p>
            </div>
            <ChevronRight className="w-4 h-4 opacity-60" />
          </button>
        )}

        {pushEnabled && (
          <div className="bg-white/15 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-green-400/30 rounded-full flex items-center justify-center">
              <Check className="w-4 h-4 text-green-200" />
            </div>
            <div>
              <p className="text-sm font-semibold">Push ativado ✅</p>
              <p className="text-xs opacity-70">Você receberá notificações no navegador</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white sticky top-0 z-10">
        {([
          { id: 'todas' as Tab, label: `Todas${unreadCount > 0 ? ` (${unreadCount})` : ''}`, icon: '🔔' },
          { id: 'lembretes' as Tab, label: `Lembretes (${scheduled.length})`, icon: '⏰' },
          { id: 'config' as Tab, label: 'Configurar', icon: '⚙️' },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-all ${
              tab === t.id ? 'text-indigo-600 border-indigo-500 bg-indigo-50/50' : 'text-gray-500 border-transparent'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {/* === TODAS TAB === */}
        {tab === 'todas' && (
          <>
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Bell className="w-16 h-16 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhuma notificação</p>
                <p className="text-sm mt-1">Suas notificações aparecerão aqui</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map(n => {
                  const config = typeConfig[n.type] || typeConfig.general
                  const Icon = config.icon
                  return (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                        n.read ? 'bg-white border-gray-100' : 'bg-indigo-50 border-indigo-200'
                      }`}
                      onClick={() => !n.read && markRead(n.id)}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                        <Icon className={`w-5 h-5 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${n.read ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatDate(n.created_at)}</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); deleteNotification(n.id) }} className="p-1.5 text-gray-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* === LEMBRETES TAB === */}
        {tab === 'lembretes' && (
          <>
            <button
              onClick={() => setShowNewReminder(true)}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" /> Novo Lembrete
            </button>

            {scheduled.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Sem lembretes ativos</p>
                <p className="text-sm mt-1">Configure lembretes para não esquecer de nada!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {scheduled.map(s => {
                  const config = typeConfig[s.type] || typeConfig.reminder
                  const Icon = config.icon
                  return (
                    <div key={s.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.bg}`}>
                        <Icon className={`w-5 h-5 ${config.color}`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{s.title}</p>
                        <p className="text-xs text-gray-500">
                          {s.repeat_type === 'daily' ? 'Todo dia' : 'Uma vez'} • {new Date(s.scheduled_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleScheduled(s.id, s.is_active)}
                        className={`p-1 ${s.is_active ? 'text-indigo-500' : 'text-gray-400'}`}
                      >
                        {s.is_active ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                      </button>
                      <button onClick={() => deleteScheduled(s.id)} className="p-1.5 text-gray-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* === CONFIG TAB === */}
        {tab === 'config' && (
          <div className="space-y-4">
            {/* Push notifications toggle */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">📱 Notificações Push</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-800">Notificações no navegador</p>
                  <p className="text-xs text-gray-500">{pushEnabled ? 'Ativadas' : pushSupported ? 'Desativadas' : 'Não suportadas'}</p>
                </div>
                <button
                  onClick={enablePush}
                  disabled={!pushSupported || pushEnabled}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    pushEnabled ? 'bg-green-100 text-green-700' : 'bg-indigo-500 text-white hover:bg-indigo-600'
                  } disabled:opacity-50`}
                >
                  {pushEnabled ? '✅ Ativo' : 'Ativar'}
                </button>
              </div>
            </div>

            {/* Category preferences */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">📋 Categorias de Notificação</h3>
              <div className="space-y-3">
                {[
                  { key: 'water', label: '💧 Água', desc: 'Lembretes de hidratação' },
                  { key: 'workout', label: '🏋️ Treino', desc: 'Lembretes de exercícios' },
                  { key: 'nutrition', label: '🍎 Nutrição', desc: 'Registro de refeições' },
                  { key: 'health', label: '❤️ Saúde', desc: 'Vitaminas e medicamentos' },
                  { key: 'achievement', label: '🏆 Conquistas', desc: 'Novas conquistas desbloqueadas' },
                  { key: 'appointment', label: '📅 Consultas', desc: 'Lembretes de consultas' },
                  { key: 'baby', label: '👶 Bebê', desc: 'Desenvolvimento do bebê' },
                  { key: 'chat', label: '💬 Chat', desc: 'Mensagens e dicas da IA' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-800">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => {
                        const updated = { ...notifPrefs, [item.key]: !notifPrefs[item.key as keyof typeof notifPrefs] }
                        savePreferences(updated)
                      }}
                      className={notifPrefs[item.key as keyof typeof notifPrefs] ? 'text-indigo-500' : 'text-gray-400'}
                    >
                      {notifPrefs[item.key as keyof typeof notifPrefs] ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Test notification */}
            <button
              onClick={() => {
                sendLocalNotification('Teste VitaFit 🌸', 'Esta é uma notificação de teste!')
                // Also create in-app
                if (userId) {
                  const supabase = createClient()
                  supabase.from('notification_history').insert({
                    user_id: userId, title: '🧪 Teste', body: 'Notificação de teste criada com sucesso!',
                    type: 'general', read: false, data: {}
                  }).then(() => loadNotifications(userId!))
                }
              }}
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200"
            >
              🧪 Enviar Notificação de Teste
            </button>
          </div>
        )}
      </div>

      {/* New Reminder Modal */}
      {showNewReminder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setShowNewReminder(false)}>
          <div className="bg-white rounded-t-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Adicionar Lembrete</h3>
              <button onClick={() => setShowNewReminder(false)} className="p-2"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 gap-2">
                {QUICK_REMINDERS.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => addReminder(r)}
                    className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 hover:bg-indigo-50 transition-all text-left"
                  >
                    <div className="text-2xl">{r.title.split(' ')[0]}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{r.title.split(' ').slice(1).join(' ')}</p>
                      <p className="text-xs text-gray-500">{r.body}</p>
                      <p className="text-xs text-indigo-600 mt-0.5">{r.repeat === 'daily' ? 'Todo dia' : 'Uma vez'} às {r.time}</p>
                    </div>
                    <Plus className="w-5 h-5 text-indigo-500" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
