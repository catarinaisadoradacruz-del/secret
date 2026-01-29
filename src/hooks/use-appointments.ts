'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from './use-user'

interface Appointment {
  id: string
  type: string
  title: string
  description?: string
  doctor?: string
  clinic?: string
  address?: string
  date: string
  time: string
  reminder_enabled: boolean
  completed: boolean
  results?: string
  notes?: string
}

export function useAppointments() {
  const { user } = useUser()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchAppointments = useCallback(async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      const response = await fetch('/api/appointments?upcoming=true')
      if (response.ok) {
        const data = await response.json()
        setAppointments(data)
      }
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  const createAppointment = async (appointment: Omit<Appointment, 'id'>) => {
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointment),
      })

      if (response.ok) {
        const newAppointment = await response.json()
        setAppointments((prev) =>
          [...prev, newAppointment].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          )
        )
        return newAppointment
      }
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }

  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const updated = await response.json()
        setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)))
        return updated
      }
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }

  const deleteAppointment = async (id: string) => {
    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setAppointments((prev) => prev.filter((a) => a.id !== id))
      }
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }

  const upcomingAppointments = appointments.filter(
    (a) => new Date(a.date) >= new Date() && !a.completed
  )

  const nextAppointment = upcomingAppointments[0] || null

  return {
    appointments,
    upcomingAppointments,
    nextAppointment,
    isLoading,
    error,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    refetch: fetchAppointments,
  }
}
