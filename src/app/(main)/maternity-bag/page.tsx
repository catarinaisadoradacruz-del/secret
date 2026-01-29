'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Briefcase, Plus, Check, X } from 'lucide-react'
import { Card, LoadingSpinner } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'

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

const DEFAULT_ITEMS = {
  MOM: [
    { item: 'Camisolas ou pijamas (3-4)', essential: true },
    { item: 'Chinelo', essential: true },
    { item: 'Sutiãs de amamentação (2-3)', essential: true },
    { item: 'Calcinhas pós-parto (5-6)', essential: true },
    { item: 'Absorventes pós-parto', essential: true },
    { item: 'Itens de higiene pessoal', essential: true },
    { item: 'Roupa para sair do hospital', essential: true },
    { item: 'Pomada para mamilos', essential: true },
  ],
  BABY: [
    { item: 'Bodies (6-8)', essential: true },
    { item: 'Mijões/Culotes (4-5)', essential: true },
    { item: 'Macacões (3-4)', essential: true },
    { item: 'Meias e luvinhas (3 pares)', essential: true },
    { item: 'Touca (2)', essential: true },
    { item: 'Manta', essential: true },
    { item: 'Fraldas RN', essential: true },
    { item: 'Lenços umedecidos', essential: true },
  ],
  DOCUMENTS: [
    { item: 'RG e CPF', essential: true },
    { item: 'Carteira do plano de saúde', essential: true },
    { item: 'Cartão pré-natal', essential: true },
    { item: 'Exames do pré-natal', essential: true },
  ],
  COMPANION: [
    { item: 'Roupa confortável', essential: true },
    { item: 'Itens de higiene', essential: true },
    { item: 'Carregador de celular', essential: true },
    { item: 'Documento de identificação', essential: true },
  ],
}

export default function MaternityBagPage() {
  const [items, setItems] = useState<BagItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [newItem, setNewItem] = useState('')

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setIsLoading(false)
        return
      }

      const { data: existingItems } = await supabase
        .from('maternity_bag_items')
        .select('*')
        .eq('user_id', user.id)
        .order('category')

      if (existingItems && existingItems.length > 0) {
        setItems(existingItems)
      } else {
        // Inicializar com itens padrão
        const allItems: any[] = []
        for (const [cat, catItems] of Object.entries(DEFAULT_ITEMS)) {
          for (const i of catItems) {
            allItems.push({
              user_id: user.id,
              category: cat,
              item: i.item,
              essential: i.essential,
              checked: false,
            })
          }
        }

        const { data: inserted } = await supabase
          .from('maternity_bag_items')
          .insert(allItems)
          .select()

        if (inserted) {
          setItems(inserted)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar itens:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleItem = async (itemId: string, checked: boolean) => {
    // Atualização otimista
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, checked } : item))
    )

    try {
      const supabase = createClient()
      await supabase
        .from('maternity_bag_items')
        .update({ checked })
        .eq('id', itemId)
    } catch (error) {
      console.error('Erro ao atualizar item:', error)
      // Reverter em caso de erro
      setItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, checked: !checked } : item))
      )
    }
  }

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCategory || !newItem.trim()) return

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from('maternity_bag_items')
        .insert({
          user_id: user.id,
          category: selectedCategory,
          item: newItem.trim(),
          essential: false,
          checked: false,
        })
        .select()
        .single()

      if (data) {
        setItems((prev) => [...prev, data])
      }
      setShowAddModal(false)
      setNewItem('')
      setSelectedCategory('')
    } catch (error) {
      console.error('Erro ao adicionar item:', error)
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
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-primary text-white rounded-xl font-medium flex items-center gap-1 hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Item
        </button>
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
                      <label className="flex items-center gap-3 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={(e) => toggleItem(item.id, e.target.checked)}
                          className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className={item.checked ? 'line-through text-gray-400' : 'text-gray-700'}>
                          {item.item}
                        </span>
                      </label>
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
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Adicionar Item</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do item
                </label>
                <input
                  type="text"
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  placeholder="Ex: Manta extra"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={!selectedCategory || !newItem.trim()}
                className="w-full py-3 bg-primary text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
              >
                Adicionar
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
