'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface NotificationSettings {
  enabled: boolean
  reminders: boolean
  achievements: boolean
  tips: boolean
  appointments: boolean
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: false,
    reminders: true,
    achievements: true,
    tips: true,
    appointments: true
  })

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
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
        .select('token, settings')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setToken(data.token)
        if (data.settings) {
          setSettings(data.settings)
        }
      }
    } catch (e) {
      console.error('Erro ao carregar configurações:', e)
    }
  }

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('Notificações não suportadas')
      return false
    }

    setLoading(true)
    try {
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result === 'granted') {
        await registerServiceWorker()
        return true
      }
      return false
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const registerServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) return null

    try {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
      console.log('Service Worker registrado:', registration)

      // Gerar token fictício para demonstração
      // Em produção, usaria Firebase Cloud Messaging
      const mockToken = 'fcm_' + Math.random().toString(36).substring(2, 15)
      setToken(mockToken)

      // Salvar token no banco
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        await supabase.from('push_tokens').upsert({
          user_id: user.id,
          token: mockToken,
          device_type: getDeviceType(),
          settings: settings
        })
      }

      return mockToken
    } catch (error) {
      console.error('Erro ao registrar SW:', error)
      return null
    }
  }

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    const updated = { ...settings, ...newSettings }
    setSettings(updated)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        await supabase
          .from('push_tokens')
          .update({ settings: updated })
          .eq('user_id', user.id)
      }
    } catch (e) {
      console.error('Erro ao atualizar configurações:', e)
    }
  }

  const sendLocalNotification = (title: string, options?: NotificationOptions) => {
    if (permission !== 'granted') return

    const notification = new Notification(title, {
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      ...options
    })

    notification.onclick = () => {
      window.focus()
      notification.close()
    }

    return notification
  }

  const scheduleReminder = async (type: string, time: Date, message: string) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('scheduled_notifications').insert({
        user_id: user.id,
        type,
        scheduled_for: time.toISOString(),
        title: 'VitaFit 💜',
        body: message,
        sent: false
      })
    } catch (e) {
      console.error('Erro ao agendar lembrete:', e)
    }
  }

  return {
    permission,
    token,
    loading,
    settings,
    requestPermission,
    updateSettings,
    sendLocalNotification,
    scheduleReminder
  }
}

function getDeviceType(): string {
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'web'
}
