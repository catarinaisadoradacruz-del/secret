'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Bell, Calendar, Utensils, Dumbbell, MessageCircle } from 'lucide-react'
import { Button, Card, LoadingSpinner } from '@/components/ui'
import * as Switch from '@radix-ui/react-switch'
import { cn } from '@/lib/utils/cn'

interface NotificationSettings {
  push_enabled: boolean
  email_enabled: boolean
  meal_reminders: boolean
  workout_reminders: boolean
  appointment_reminders: boolean
  tips_enabled: boolean
}

const NOTIFICATION_OPTIONS = [
  {
    key: 'meal_reminders',
    label: 'Lembretes de refeição',
    description: 'Receba lembretes para registrar suas refeições',
    icon: Utensils,
  },
  {
    key: 'workout_reminders',
    label: 'Lembretes de treino',
    description: 'Seja lembrada dos seus treinos programados',
    icon: Dumbbell,
  },
  {
    key: 'appointment_reminders',
    label: 'Lembretes de consultas',
    description: 'Notificações sobre suas consultas médicas',
    icon: Calendar,
  },
  {
    key: 'tips_enabled',
    label: 'Dicas da Vita',
    description: 'Receba dicas personalizadas da IA',
    icon: MessageCircle,
  },
]

export default function NotificationsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState<NotificationSettings>({
    push_enabled: true,
    email_enabled: false,
    meal_reminders: true,
    workout_reminders: true,
    appointment_reminders: true,
    tips_enabled: true,
  })

  useEffect(() => {
    // Load settings from localStorage or API
    const saved = localStorage.getItem('notification_settings')
    if (saved) {
      setSettings(JSON.parse(saved))
    }
    setIsLoading(false)
  }, [])

  const toggleSetting = (key: keyof NotificationSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      // Save to localStorage (could be API in production)
      localStorage.setItem('notification_settings', JSON.stringify(settings))

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500))

      router.back()
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notificações</h1>
          <p className="text-gray-600 mt-1">Configure seus alertas</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Main toggles */}
        <Card className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Canais</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Notificações push</p>
                  <p className="text-sm text-gray-500">Receba alertas no celular</p>
                </div>
              </div>
              <Switch.Root
                checked={settings.push_enabled}
                onCheckedChange={() => toggleSetting('push_enabled')}
                className={cn(
                  'w-11 h-6 rounded-full transition-colors',
                  settings.push_enabled ? 'bg-primary' : 'bg-gray-200'
                )}
              >
                <Switch.Thumb
                  className={cn(
                    'block w-5 h-5 bg-white rounded-full shadow transition-transform',
                    settings.push_enabled ? 'translate-x-[22px]' : 'translate-x-[2px]'
                  )}
                />
              </Switch.Root>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                  <span className="text-secondary">@</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">E-mail</p>
                  <p className="text-sm text-gray-500">Receba resumos por e-mail</p>
                </div>
              </div>
              <Switch.Root
                checked={settings.email_enabled}
                onCheckedChange={() => toggleSetting('email_enabled')}
                className={cn(
                  'w-11 h-6 rounded-full transition-colors',
                  settings.email_enabled ? 'bg-primary' : 'bg-gray-200'
                )}
              >
                <Switch.Thumb
                  className={cn(
                    'block w-5 h-5 bg-white rounded-full shadow transition-transform',
                    settings.email_enabled ? 'translate-x-[22px]' : 'translate-x-[2px]'
                  )}
                />
              </Switch.Root>
            </div>
          </div>
        </Card>

        {/* Specific notifications */}
        <Card className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Tipos de notificação</h3>

          <div className="space-y-4">
            {NOTIFICATION_OPTIONS.map((option) => (
              <div key={option.key} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <option.icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{option.label}</p>
                    <p className="text-sm text-gray-500">{option.description}</p>
                  </div>
                </div>
                <Switch.Root
                  checked={settings[option.key as keyof NotificationSettings] as boolean}
                  onCheckedChange={() =>
                    toggleSetting(option.key as keyof NotificationSettings)
                  }
                  disabled={!settings.push_enabled && !settings.email_enabled}
                  className={cn(
                    'w-11 h-6 rounded-full transition-colors',
                    settings[option.key as keyof NotificationSettings]
                      ? 'bg-primary'
                      : 'bg-gray-200',
                    !settings.push_enabled && !settings.email_enabled && 'opacity-50'
                  )}
                >
                  <Switch.Thumb
                    className={cn(
                      'block w-5 h-5 bg-white rounded-full shadow transition-transform',
                      settings[option.key as keyof NotificationSettings]
                        ? 'translate-x-[22px]'
                        : 'translate-x-[2px]'
                    )}
                  />
                </Switch.Root>
              </div>
            ))}
          </div>
        </Card>

        <Button type="submit" fullWidth isLoading={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          Salvar preferências
        </Button>
      </form>
    </div>
  )
}
