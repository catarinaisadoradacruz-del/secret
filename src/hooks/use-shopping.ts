'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from './use-user'

interface ShoppingItem {
  id: string
  list_id: string
  name: string
  quantity?: number
  unit?: string
  category?: string
  checked: boolean
}

interface ShoppingList {
  id: string
  name: string
  created_at: string
  items: ShoppingItem[]
}

export function useShopping() {
  const { user } = useUser()
  const [lists, setLists] = useState<ShoppingList[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchLists = useCallback(async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      const response = await fetch('/api/shopping')
      if (response.ok) {
        const data = await response.json()
        setLists(data)
      }
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchLists()
  }, [fetchLists])

  const createList = async (name: string, items?: Partial<ShoppingItem>[]) => {
    try {
      const response = await fetch('/api/shopping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, items }),
      })

      if (response.ok) {
        await fetchLists()
      }
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }

  const addItem = async (listId: string, item: Partial<ShoppingItem>) => {
    try {
      const response = await fetch('/api/shopping/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, list_id: listId }),
      })

      if (response.ok) {
        await fetchLists()
      }
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }

  const toggleItem = async (itemId: string, checked: boolean) => {
    try {
      const response = await fetch('/api/shopping/items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, checked }),
      })

      if (response.ok) {
        setLists((prev) =>
          prev.map((list) => ({
            ...list,
            items: list.items.map((item) =>
              item.id === itemId ? { ...item, checked } : item
            ),
          }))
        )
      }
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }

  const deleteItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/shopping/items?id=${itemId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setLists((prev) =>
          prev.map((list) => ({
            ...list,
            items: list.items.filter((item) => item.id !== itemId),
          }))
        )
      }
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }

  return {
    lists,
    isLoading,
    error,
    createList,
    addItem,
    toggleItem,
    deleteItem,
    refetch: fetchLists,
  }
}
