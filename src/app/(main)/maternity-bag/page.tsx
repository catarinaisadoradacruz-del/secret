'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Briefcase, Plus, Check } from 'lucide-react'
import { Button, Card, Input, Modal, Checkbox, LoadingSpinner } from '@/components/ui'

interface BagItem {
  id: string
  category: string
  item: string
  essential: boolean
  checked: boolean
}

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  MOM: { label: 'Para Mamãe', emoji: '👩' },
  BABY: { label: 'Para Bebê', emoji: '👶' },
  DOCUMENTS: { label: 'Documentos', emoji: '📄' },
  COMPANION: { label: 'Acompanhante', emoji: '👤' },
}

export default function MaternityBagPage() {
  const [items, setItems] = useState<BagItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [newItem, setNewItem] = useState('')

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/maternity-bag')
      const data = await response.json()

      if (data.items && data.items.length > 0) {
        setItems(data.items)
      } else {
        // Initialize with defaults
        await initializeDefaults()
      }
    } catch (error) {
      console.error('Error fetching items:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const initializeDefaults = async () => {
    try {
      const response = await fetch('/api/maternity-bag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initialize' }),
      })
      const data = await response.json()
      setItems(data)
    } catch (error) {
      console.error('Error initializing items:', error)
    }
  }

  const toggleItem = async (itemId: string, checked: boolean) => {
    try {
      await fetch('/api/maternity-bag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', itemId, checked }),
      })
      setItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, checked } : item))
      )
    } catch (error) {
      console.error('Error toggling item:', error)
    }
  }

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/maternity-bag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          category: selectedCategory,
          item: newItem,
        }),
      })
      const data = await response.json()
      setItems((prev) => [...prev, data])
      setShowAddModal(false)
      setNewItem('')
      setSelectedCategory('')
    } catch (error) {
      console.error('Error adding item:', error)
    }
  }

  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, BagItem[]>)

  const totalItems = items.length
  const checkedItems = items.filter((i) => i.checked).length
  const progress = totalItems > 0 ? (checkedItems / totalItems) * 100 : 0

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mala Maternidade</h1>
          <p className="text-gray-600 mt-1">Organize tudo para o grande dia</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Item
        </Button>
      </div>

      {/* Progress Card */}
      <Card className="mb-6 bg-gradient-to-br from-primary/10 to-secondary/10">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
            <Briefcase className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Progresso da Mala</h3>
            <p className="text-sm text-gray-600">
              {checkedItems} de {totalItems} itens prontos
            </p>
            <div className="h-2 bg-white rounded-full mt-2 overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
          <div className="text-2xl font-bold text-primary">{Math.round(progress)}%</div>
        </div>
      </Card>

      {/* Categories */}
      <div className="space-y-6">
        {Object.entries(groupedItems).map(([category, categoryItems]) => {
          const categoryInfo = CATEGORY_LABELS[category] || { label: category, emoji: '📦' }
          const categoryChecked = categoryItems.filter((i) => i.checked).length
          const categoryProgress = (categoryChecked / categoryItems.length) * 100

          return (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{categoryInfo.emoji}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{categoryInfo.label}</h3>
                      <p className="text-xs text-gray-500">
                        {categoryChecked}/{categoryItems.length} prontos
                      </p>
                    </div>
                  </div>
                  {categoryProgress === 100 && (
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="w-5 h-5 text-green-500" />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {categoryItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                    >
                      <Checkbox
                        checked={item.checked}
                        onCheckedChange={(checked) =>
                          toggleItem(item.id, checked as boolean)
                        }
                        label={item.item}
                      />
                      {item.essential && (
                        <span className="text-xs text-primary font-medium">
                          Essencial
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Add Item Modal */}
      <Modal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        title="Adicionar Item"
        description="Adicione um item personalizado à sua mala"
      >
        <form onSubmit={addItem} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoria
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(CATEGORY_LABELS).map(([key, info]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedCategory(key)}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    selectedCategory === key
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">{info.emoji}</span>
                  <p className="text-xs mt-1">{info.label}</p>
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Nome do item"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Ex: Manta extra"
            required
          />

          <Button type="submit" fullWidth disabled={!selectedCategory}>
            Adicionar
          </Button>
        </form>
      </Modal>
    </div>
  )
}
