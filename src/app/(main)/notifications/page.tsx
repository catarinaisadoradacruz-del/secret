'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Bell, BellOff, ArrowLeft, Clock, Droplets, Dumbbell, 
  Apple, Trophy, Calendar, Sparkles, Check, Moon, Sun,
  Smartphone, AlertCircle, Settings
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface NotificationSettings {
  water_reminder: boolean
  workout_reminder: boolean
  meal_reminder: boolean
  achievement_alerts: boolean
  appointment_reminder: boolean
  tips_daily: boolean
}

interface Reminder {
  id: string
  type: string
  label: string
  time: string
  enabled: boolean
  days: number[]
}

const DEFAULT_REMINDERS: Reminder[] = [
  { id: 'water-morning', type: 'water', label: 'Lembrete de água (manhã)', time: '08:00', enabled: true, days: [1,2,3,4,5,6,0] },
  { id: 'water-afternoon', type: 'water', label: 'Lembrete de água (tarde)', time: '14:00', enabled: true, days: [1,2,3,4,5,6,0] },
  { id: 'workout', type: 'workout', label: 'Hora do treino', time: '07:00', enabled: true, days: [1,2,3,4,5] },
  { id: 'breakfast', type: 'meal', label: 'Café da manhã', time: '07:30', enabled: true, days: [1,2,3,4,5,6,0] },
  { id: 'lunch', type: 'meal', label: 'Almoço', time: '12:00', enabled: true, days: [1,2,3,4,5,6,0] },
  { id: 'dinner', type: 'meal', label: 'Jantar', time: '19:00', enabled: true, days: [1,2,3,4,5,6,0] },
  { id: 'sleep', type: 'sleep', label: 'Hora de dormir', time: '22:00', enabled: false, days: [1,2,3,4,5,6,0] },
]

const DAY_NAMES = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export default function NotificationsPage() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [settings, setSettings] = useState<NotificationSettings>({
    water_reminder: true,
    workout_reminder: true,
    meal_reminder: true,
    achievement_alerts: true,
    appointment_reminder: true,
    tips_daily: true
  })
  const [reminders, setReminders] = useState<Reminder[]>(DEFAULT_REMINDERS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    checkPermission()
    loadSettings()
  }, [])

  const checkPermission = () => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission()
      setPermission(result)
      
      if (result === 'granted') {
        // Registrar service worker
        if ('serviceWorker' in navigator) {
          try {
            await navigator.serviceWorker.register('/firebase-messaging-sw.js')
            sendTestNotification()
          } catch (e) {
            console.error('Erro ao registrar SW:', e)
          }
        }
      }
    }
  }

  const sendTestNotification = () => {
    if (permission === 'granted') {
      new Notification('🎉 VitaFit', {
        body: 'Notificações ativadas com sucesso!',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png'
      })
    }
  }

  const loadSettings = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setSettings({
          water_reminder: data.water_reminder ?? true,
          workout_reminder: data.workout_reminder ?? true,
          meal_reminder: data.meal_reminder ?? true,
          achievement_alerts: data.achievement_alerts ?? true,
          appointment_reminder: data.appointment_reminder ?? true,
          tips_daily: data.tips_daily ?? true
        })
      }

      // Carregar lembretes personalizados
      const { data: remindersData } = await supabase
        .from('scheduled_notifications')
        .select('*')
        .eq('user_id', user.id)

      if (remindersData && remindersData.length > 0) {
        setReminders(remindersData.map(r => ({
          id: r.id,
          type: r.type,
          label: r.label,
          time: r.time,
          enabled: r.enabled,
          days: r.days || [1,2,3,4,5,6,0]
        })))
      }
    } catch (e) {
      console.error('Erro ao carregar configurações:', e)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async (newSettings: NotificationSettings) => {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from('notification_settings')
        .upsert({
          user_id: user.id,
          ...newSettings,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })

      setSettings(newSettings)
    } catch (e) {
      console.error('Erro ao salvar:', e)
    } finally {
      setSaving(false)
    }
  }

  const toggleSetting = (key: keyof NotificationSettings) => {
    const newSettings = { ...settings, [key]: !settings[key] }
    saveSettings(newSettings)
  }

  const updateReminder = async (id: string, updates: Partial<Reminder>) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const reminder = reminders.find(r => r.id === id)
      if (!reminder) return

      const updatedReminder = { ...reminder, ...updates }

      await supabase
        .from('scheduled_notifications')
        .upsert({
          id: reminder.id.includes('-') ? undefined : reminder.id,
          user_id: user.id,
          type: updatedReminder.type,
          label: updatedReminder.label,
          time: updatedReminder.time,
          enabled: updatedReminder.enabled,
          days: updatedReminder.days
        }, { onConflict: 'id' })

      setReminders(prev => prev.map(r => r.id === id ? updatedReminder : r))
    } catch (e) {
      console.error('Erro ao atualizar lembrete:', e)
    }
  }

  const toggleReminderDay = (reminderId: string, day: number) => {
    const reminder = reminders.find(r => r.id === reminderId)
    if (!reminder) return

    const newDays = reminder.days.includes(day)
      ? reminder.days.filter(d => d !== day)
      : [...reminder.days, day]

    updateReminder(reminderId, { days: newDays })
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'water': return Droplets
      case 'workout': return Dumbbell
      case 'meal': return Apple
      case 'sleep': return Moon
      default: return Bell
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'water': return 'text-blue-500 bg-blue-100'
      case 'workout': return 'text-orange-500 bg-orange-100'
      case 'meal': return 'text-green-500 bg-green-100'
      case 'sleep': return 'text-purple-500 bg-purple-100'
      default: return 'text-gray-500 bg-gray-100'
    }
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
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-xl">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Notificações</h1>
            <p className="text-sm text-gray-500">Gerencie seus lembretes</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Status da Permissão */}
        {permission !== 'granted' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-800">Ative as notificações</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Para receber lembretes, você precisa permitir notificações no navegador.
                </p>
                <button
                  onClick={requestPermission}
                  className="mt-3 bg-yellow-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-yellow-600"
                >
                  Permitir Notificações
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {permission === 'granted' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
            <Check className="w-6 h-6 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-800">Notificações ativas</h3>
              <p className="text-sm text-green-700">Você receberá lembretes conforme configurado.</p>
            </div>
          </div>
        )}

        {/* Tipos de Notificação */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-500" />
              Tipos de Notificação
            </h3>
          </div>

          <div className="divide-y divide-gray-100">
            {[
              { key: 'water_reminder', label: 'Lembretes de Água', icon: Droplets, color: 'text-blue-500' },
              { key: 'workout_reminder', label: 'Lembretes de Treino', icon: Dumbbell, color: 'text-orange-500' },
              { key: 'meal_reminder', label: 'Lembretes de Refeição', icon: Apple, color: 'text-green-500' },
              { key: 'achievement_alerts', label: 'Alertas de Conquistas', icon: Trophy, color: 'text-yellow-500' },
              { key: 'appointment_reminder', label: 'Lembretes de Consultas', icon: Calendar, color: 'text-purple-500' },
              { key: 'tips_daily', label: 'Dicas Diárias', icon: Sparkles, color: 'text-pink-500' },
            ].map(item => (
              <div key={item.key} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                  <span className="font-medium">{item.label}</span>
                </div>
                <button
                  onClick={() => toggleSetting(item.key as keyof NotificationSettings)}
                  disabled={saving}
                  className={`w-12 h-7 rounded-full transition-colors ${
                    settings[item.key as keyof NotificationSettings]
                      ? 'bg-primary-500'
                      : 'bg-gray-300'
                  }`}
                >
                  <motion.div
                    className="w-5 h-5 bg-white rounded-full shadow-sm"
                    animate={{ 
                      x: settings[item.key as keyof NotificationSettings] ? 24 : 4 
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Lembretes Personalizados */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-500" />
              Horários dos Lembretes
            </h3>
          </div>

          <div className="divide-y divide-gray-100">
            {reminders.map(reminder => {
              const Icon = getTypeIcon(reminder.type)
              const colorClass = getTypeColor(reminder.type)

              return (
                <div key={reminder.id} className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{reminder.label}</p>
                      <input
                        type="time"
                        value={reminder.time}
                        onChange={(e) => updateReminder(reminder.id, { time: e.target.value })}
                        className="text-sm text-gray-500 bg-transparent"
                      />
                    </div>
                    <button
                      onClick={() => updateReminder(reminder.id, { enabled: !reminder.enabled })}
                      className={`w-12 h-7 rounded-full transition-colors ${
                        reminder.enabled ? 'bg-primary-500' : 'bg-gray-300'
                      }`}
                    >
                      <motion.div
                        className="w-5 h-5 bg-white rounded-full shadow-sm"
                        animate={{ x: reminder.enabled ? 24 : 4 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </button>
                  </div>

                  {reminder.enabled && (
                    <div className="flex gap-1 ml-13">
                      {DAY_NAMES.map((day, index) => (
                        <button
                          key={index}
                          onClick={() => toggleReminderDay(reminder.id, index)}
                          className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                            reminder.days.includes(index)
                              ? 'bg-primary-500 text-white'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Testar Notificação */}
        {permission === 'granted' && (
          <button
            onClick={sendTestNotification}
            className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center justify-center gap-2 text-primary-600 font-medium hover:bg-primary-50"
          >
            <Bell className="w-5 h-5" />
            Enviar Notificação de Teste
          </button>
        )}
      </div>
    </div>
  )
}
