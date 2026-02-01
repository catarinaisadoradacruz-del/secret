'use client'

import { useState, useEffect } from 'react'
import { 
  Bell, BellRing, Check, CheckCheck, Trash2, ArrowLeft, 
  Clock, Trophy, Heart, Apple, Dumbbell, Calendar, 
  MessageCircle, Baby, Droplets, Settings, Plus, X,
  ChevronRight
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

type Tab = 'todas' | 'lembretes'

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
  { title: '💧 Hora de beber água', body: 'Mantenha-se hidratada! Beba um copo de água agora.', type: 'water', repeat: 'daily' },
  { title: '🏋️ Hora do treino', body: 'Não esqueça da sua atividade física de hoje!', type: 'workout', repeat: 'daily' },
  { title: '🍎 Registrar refeição', body: 'Registre o que comeu para acompanhar sua nutrição.', type: 'nutrition', repeat: 'daily' },
  { title: '💊 Tomar vitaminas', body: 'Hora de tomar suas vitaminas e suplementos.', type: 'health', repeat: 'daily' },
  { title: '📅 Consulta médica', body: 'Lembrete da sua consulta.', type: 'appointment', repeat: 'once' },
  { title: '😴 Hora de dormir', body: 'Prepare-se para uma boa noite de sono.', type: 'health', repeat: 'daily' },
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

  useEffect(() => { init() }, [])

  const init = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    setUserId(user.id)
    await loadNotifications(user.id)
    setLoading(false)
  }

  const loadNotifications = async (uid: string) => {
    try {
      const [notifRes, schedRes] = await Promise.all([
        fetch(`/api/notifications?userId=${uid}&action=list`),
        fetch(`/api/notifications?userId=${uid}&action=scheduled`)
      ])
      const notifData = await notifRes.json()
      const schedData = await schedRes.json()
      setNotifications(notifData.notifications || [])
      setUnreadCount(notifData.unreadCount || 0)
      setScheduled(schedData.scheduled || [])
    } catch (e) { console.error(e) }
  }

  const markAllRead = async () => {
    if (!userId) return
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action: 'markRead' })
    })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const markRead = async (id: string) => {
    if (!userId) return
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action: 'markRead', notificationId: id })
    })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const addReminder = async (reminder: typeof QUICK_REMINDERS[0]) => {
    if (!userId) return
    const today = new Date()
    const [h, m] = reminderTime.split(':')
    today.setHours(parseInt(h), parseInt(m), 0, 0)
    if (today < new Date()) today.setDate(today.getDate() + 1)

    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        action: 'schedule',
        title: reminder.title,
        body: reminder.body,
        type: reminder.type,
        scheduledTime: today.toISOString(),
        repeatType: reminder.repeat
      })
    })

    if (userId) await loadNotifications(userId)
    setShowNewReminder(false)
  }

  const deleteScheduled = async (id: string) => {
    if (!userId) return
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action: 'deleteScheduled', scheduleId: id })
    })
    setScheduled(prev => prev.filter(s => s.id !== id))
  }

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Agora'
    if (mins < 60) return `${mins}min`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d`
    return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
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
      {/* Header */}
      <header className="bg-white border-b px-4 py-4 sticky top-0 z-20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">Notificações</h1>
              {unreadCount > 0 && (
                <p className="text-xs text-primary-600">{unreadCount} não lida{unreadCount > 1 ? 's' : ''}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="p-2 hover:bg-gray-100 rounded-xl text-primary-600" title="Marcar tudo como lido">
                <CheckCheck className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-1">
          <button
            onClick={() => setTab('todas')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === 'todas' ? 'bg-primary-50 text-primary-700' : 'text-gray-500'
            }`}
          >
            <Bell className="w-4 h-4 inline mr-1" /> Todas
          </button>
          <button
            onClick={() => setTab('lembretes')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === 'lembretes' ? 'bg-primary-50 text-primary-700' : 'text-gray-500'
            }`}
          >
            <Clock className="w-4 h-4 inline mr-1" /> Lembretes
          </button>
        </div>
      </header>

      <div className="p-4">
        {tab === 'todas' && (
          <div className="space-y-2">
            {notifications.length === 0 ? (
              <div className="text-center py-16">
                <BellRing className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                <h3 className="font-semibold text-gray-600 mb-1">Tudo em dia!</h3>
                <p className="text-sm text-gray-400">Suas notificações vão aparecer aqui</p>
              </div>
            ) : (
              notifications.map(notif => {
                const config = typeConfig[notif.type] || typeConfig.general
                const Icon = config.icon
                return (
                  <div
                    key={notif.id}
                    onClick={() => !notif.read && markRead(notif.id)}
                    className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
                      notif.read ? 'bg-white' : 'bg-primary-50/50 cursor-pointer'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`text-sm ${notif.read ? 'font-medium' : 'font-bold'}`}>{notif.title}</h4>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">{timeAgo(notif.created_at)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{notif.body}</p>
                    </div>
                    {!notif.read && <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-2" />}
                  </div>
                )
              })
            )}
          </div>
        )}

        {tab === 'lembretes' && (
          <div className="space-y-4">
            <button
              onClick={() => setShowNewReminder(true)}
              className="w-full flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border-2 border-dashed border-gray-200 hover:border-primary-300 transition-all"
            >
              <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                <Plus className="w-5 h-5 text-primary-600" />
              </div>
              <span className="font-medium text-gray-600">Novo Lembrete</span>
            </button>

            {scheduled.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                <p className="text-gray-500 mb-1">Nenhum lembrete ativo</p>
                <p className="text-xs text-gray-400">Configure lembretes para não esquecer de nada</p>
              </div>
            ) : (
              scheduled.map(sched => {
                const config = typeConfig[sched.type] || typeConfig.reminder
                const Icon = config.icon
                return (
                  <div key={sched.id} className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm">
                    <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{sched.title}</h4>
                      <p className="text-xs text-gray-500">
                        {sched.repeat_type === 'daily' ? 'Diário' : 
                         sched.repeat_type === 'weekly' ? 'Semanal' : 'Uma vez'} •{' '}
                        {new Date(sched.scheduled_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <button onClick={() => deleteScheduled(sched.id)} className="p-2 text-gray-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* New Reminder Modal */}
      {showNewReminder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setShowNewReminder(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-lg">Novo Lembrete</h3>
              <button onClick={() => setShowNewReminder(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Horário</label>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={e => setReminderTime(e.target.value)}
                  className="input"
                />
              </div>

              <p className="text-sm font-medium text-gray-700 mb-3">Escolha um tipo:</p>
              <div className="space-y-2">
                {QUICK_REMINDERS.map((reminder, idx) => (
                  <button
                    key={idx}
                    onClick={() => addReminder(reminder)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-primary-50 transition-all text-left"
                  >
                    <span className="text-2xl">{reminder.title.split(' ')[0]}</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{reminder.title.slice(reminder.title.indexOf(' ') + 1)}</p>
                      <p className="text-xs text-gray-500">{reminder.repeat === 'daily' ? 'Repete diariamente' : 'Uma vez'}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
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
