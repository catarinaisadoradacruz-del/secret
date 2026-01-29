'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Bell, BellOff, ArrowLeft, Clock, Trophy, Lightbulb,
  Calendar, Droplets, Dumbbell, Apple, Moon, Sun, Check,
  ChevronRight, Smartphone, Info, AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface ReminderSchedule {
  id: string
  type: string
  time: string
  enabled: boolean
  days: number[]
  label: string
  icon: any
}

export default function NotificationsPage() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState({
    enabled: false,
    reminders: true,
    achievements: true,
    tips: true,
    appointments: true,
    water: true,
    meals: true,
    workout: true
  })
  
  const [reminders, setReminders] = useState<ReminderSchedule[]>([
    { id: 'water-morning', type: 'water', time: '08:00', enabled: true, days: [1,2,3,4,5,6,0], label: 'Lembrete de Água (Manhã)', icon: Droplets },
    { id: 'water-afternoon', type: 'water', time: '14:00', enabled: true, days: [1,2,3,4,5,6,0], label: 'Lembrete de Água (Tarde)', icon: Droplets },
    { id: 'workout', type: 'workout', time: '07:00', enabled: true, days: [1,2,3,4,5], label: 'Hora do Treino', icon: Dumbbell },
    { id: 'breakfast', type: 'meal', time: '07:30', enabled: true, days: [1,2,3,4,5,6,0], label: 'Café da Manhã', icon: Apple },
    { id: 'lunch', type: 'meal', time: '12:00', enabled: true, days: [1,2,3,4,5,6,0], label: 'Almoço', icon: Apple },
    { id: 'dinner', type: 'meal', time: '19:00', enabled: true, days: [1,2,3,4,5,6,0], label: 'Jantar', icon: Apple },
    { id: 'sleep', type: 'sleep', time: '22:00', enabled: false, days: [1,2,3,4,5,6,0], label: 'Hora de Dormir', icon: Moon },
  ])

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
      if (Notification.permission === 'granted') {
        setSettings(prev => ({ ...prev, enabled: true }))
      }
    }
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('push_tokens')
        .select('settings')
        .eq('user_id', user.id)
        .single()

      if (data?.settings) {
        setSettings(prev => ({ ...prev, ...data.settings }))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('Seu navegador não suporta notificações')
      return
    }

    setLoading(true)
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      
      if (result === 'granted') {
        setSettings(prev => ({ ...prev, enabled: true }))
        
        // Registrar service worker
        if ('serviceWorker' in navigator) {
          await navigator.serviceWorker.register('/firebase-messaging-sw.js')
        }

        // Salvar no banco
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('push_tokens').upsert({
            user_id: user.id,
            token: 'web_' + Date.now(),
            device_type: 'web',
            settings: { ...settings, enabled: true }
          })
        }

        // Mostrar notificação de teste
        new Notification('VitaFit 💜', {
          body: 'Notificações ativadas com sucesso!',
          icon: '/icons/icon-192.png'
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = async (key: string, value: boolean) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('push_tokens')
          .update({ settings: newSettings })
          .eq('user_id', user.id)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const toggleReminder = (id: string) => {
    setReminders(prev => prev.map(r => 
      r.id === id ? { ...r, enabled: !r.enabled } : r
    ))
  }

  const updateReminderTime = (id: string, time: string) => {
    setReminders(prev => prev.map(r => 
      r.id === id ? { ...r, time } : r
    ))
  }

  const ToggleSwitch = ({ enabled, onToggle }: { enabled: boolean, onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className={`relative w-12 h-7 rounded-full transition-colors ${
        enabled ? 'bg-primary-500' : 'bg-gray-300'
      }`}
    >
      <motion.div
        className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow"
        animate={{ x: enabled ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  )

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="p-2 hover:bg-gray-100 rounded-xl">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Notificações</h1>
            <p className="text-sm text-gray-500">Gerencie seus lembretes</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Status das notificações */}
        {permission !== 'granted' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <BellOff className="w-6 h-6 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-800">Notificações Desativadas</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Ative as notificações para receber lembretes importantes sobre sua saúde.
                </p>
                <button
                  onClick={requestPermission}
                  disabled={loading}
                  className="mt-3 bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-700 disabled:opacity-50"
                >
                  {loading ? 'Ativando...' : 'Ativar Notificações'}
                </button>
              </div>
            </div>
          </div>
        )}

        {permission === 'granted' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <h3 className="font-semibold text-green-800">Notificações Ativas</h3>
                <p className="text-sm text-green-700">Você receberá lembretes importantes</p>
              </div>
              <Check className="w-6 h-6 text-green-600 ml-auto" />
            </div>
          </div>
        )}

        {/* Categorias de notificação */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold">Tipos de Notificação</h3>
          </div>
          
          <div className="divide-y divide-gray-100">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Droplets className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Hidratação</p>
                  <p className="text-sm text-gray-500">Lembretes para beber água</p>
                </div>
              </div>
              <ToggleSwitch 
                enabled={settings.water} 
                onToggle={() => updateSetting('water', !settings.water)} 
              />
            </div>

            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Dumbbell className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium">Treinos</p>
                  <p className="text-sm text-gray-500">Lembretes de exercícios</p>
                </div>
              </div>
              <ToggleSwitch 
                enabled={settings.workout} 
                onToggle={() => updateSetting('workout', !settings.workout)} 
              />
            </div>

            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <Apple className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Refeições</p>
                  <p className="text-sm text-gray-500">Horários das refeições</p>
                </div>
              </div>
              <ToggleSwitch 
                enabled={settings.meals} 
                onToggle={() => updateSetting('meals', !settings.meals)} 
              />
            </div>

            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium">Conquistas</p>
                  <p className="text-sm text-gray-500">Novos badges e pontos</p>
                </div>
              </div>
              <ToggleSwitch 
                enabled={settings.achievements} 
                onToggle={() => updateSetting('achievements', !settings.achievements)} 
              />
            </div>

            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">Consultas</p>
                  <p className="text-sm text-gray-500">Lembretes de compromissos</p>
                </div>
              </div>
              <ToggleSwitch 
                enabled={settings.appointments} 
                onToggle={() => updateSetting('appointments', !settings.appointments)} 
              />
            </div>

            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <p className="font-medium">Dicas</p>
                  <p className="text-sm text-gray-500">Dicas diárias de saúde</p>
                </div>
              </div>
              <ToggleSwitch 
                enabled={settings.tips} 
                onToggle={() => updateSetting('tips', !settings.tips)} 
              />
            </div>
          </div>
        </div>

        {/* Horários dos lembretes */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold">Horários dos Lembretes</h3>
            <p className="text-sm text-gray-500">Personalize quando receber cada lembrete</p>
          </div>
          
          <div className="divide-y divide-gray-100">
            {reminders.map(reminder => {
              const Icon = reminder.icon
              return (
                <div key={reminder.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium">{reminder.label}</p>
                      <input
                        type="time"
                        value={reminder.time}
                        onChange={(e) => updateReminderTime(reminder.id, e.target.value)}
                        className="text-sm text-primary-600 bg-transparent border-none p-0 focus:ring-0"
                        disabled={!reminder.enabled}
                      />
                    </div>
                  </div>
                  <ToggleSwitch 
                    enabled={reminder.enabled} 
                    onToggle={() => toggleReminder(reminder.id)} 
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Informação sobre notificações */}
        <div className="bg-blue-50 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800">Sobre as notificações</h4>
              <p className="text-sm text-blue-700 mt-1">
                Os lembretes ajudam você a manter hábitos saudáveis. Você pode 
                desativar notificações específicas a qualquer momento.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
