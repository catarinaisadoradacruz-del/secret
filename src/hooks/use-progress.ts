'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from './use-user'

interface ProgressEntry {
  id: string
  date: string
  weight?: number
  bust?: number
  waist?: number
  hips?: number
  belly?: number
  photo_url?: string
  notes?: string
  mood?: string
  energy_level?: number
  symptoms: string[]
}

export function useProgress() {
  const { user } = useUser()
  const [entries, setEntries] = useState<ProgressEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchProgress = useCallback(async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      const response = await fetch('/api/progress?limit=30')
      if (response.ok) {
        const data = await response.json()
        setEntries(data)
      }
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchProgress()
  }, [fetchProgress])

  const addEntry = async (entry: Omit<ProgressEntry, 'id'>) => {
    try {
      const response = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })

      if (response.ok) {
        const newEntry = await response.json()
        setEntries((prev) => [newEntry, ...prev])
        return newEntry
      }
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }

  // Dados para gráficos
  const weightData = entries
    .filter((e) => e.weight)
    .map((e) => ({ date: e.date, value: e.weight }))
    .reverse()

  const measurementsData = entries
    .filter((e) => e.bust || e.waist || e.hips || e.belly)
    .map((e) => ({
      date: e.date,
      bust: e.bust,
      waist: e.waist,
      hips: e.hips,
      belly: e.belly,
    }))
    .reverse()

  return {
    entries,
    weightData,
    measurementsData,
    isLoading,
    error,
    addEntry,
    refetch: fetchProgress,
  }
}
