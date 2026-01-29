'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, ShoppingCart, Trash2, Sparkles, Check, X, ChevronDown, Loader2 } from 'lucide-react'
import { Card, LoadingSpinner } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'

interface ShoppingItem {
  id: string
  name: string
  quantity: number
  category: string
  checked: boolean
  list_id: string
}

interface ShoppingList {
  id: string
  name: string
  items: ShoppingItem[]
}

const CATEGORIES = [
  { value: 'frutas', label: '🍎 Frutas', color: 'bg-red-100 text-red-700' },
  { value: 'verduras', label: '🥬 Verduras', color: 'bg-green-100 text-green-700' },
  { value: 'proteinas', label: '🥩 Proteínas', color: 'bg-orange-100 text-orange-700' },
  { value: 'laticinios', label: '🥛 Laticínios', color: 'bg-blue-100 text-blue-700' },
  { value: 'graos', label: '🌾 Grãos', color: 'bg-amber-100 text-amber-700' },
  { value: 'bebidas', label: '🥤 Bebidas', color: 'bg-purple-100 text-purple-700' },
  { value: 'outros', label: '📦 Outros', color: 'bg-gray-100 text-gray-700' },
]

const QUICK_SUGGESTIONS = [
  { name: 'Banana', category: 'frutas' },
  { name: 'Maçã', category: 'frutas' },
  { name: 'Leite', category: 'laticinios' },
  { name: 'Ovos', category: 'proteinas' },
  { name: 'Pão integral', category: 'graos' },
  { name: 'Frango', category: 'proteinas' },
  { name: 'Alface', category: 'verduras' },
  { name: 'Tomate', category: 'verduras' },
  { name: 'Arroz', category: 'graos' },
  { name: 'Feijão', category: 'graos' },
  { name: 'Iogurte natural', category: 'laticinios' },
  { name: 'Água de coco', category: 'bebidas' },
]

export default function ShoppingPage() {
  const [lists, setLists] = useState<ShoppingList[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showNewListModal, setShowNewListModal] = useState(false)
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [newListName, setNewListName] = useState('')
  const [newItem, setNewItem] = useState({ name: '', quantity: '1', category: 'outros' })
  const [expandedLists, setExpandedLists] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    loadLists()
  }, [])

  const loadLists = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setIsLoading(false)
        return
      }

      // Buscar listas
      const { data: listsData } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      // Buscar itens
      const { data: itemsData } = await supabase
        .from('shopping_items')
        .select('*')
        .eq('user_id', user.id)

      // Combinar
      const combinedLists = (listsData || []).map(list => ({
        ...list,
        items: (itemsData || []).filter(item => item.list_id === list.id)
      }))

      setLists(combinedLists)
      if (combinedLists.length > 0) {
        setExpandedLists([combinedLists[0].id])
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newListName.trim()) return

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from('shopping_lists')
        .insert({ user_id: user.id, name: newListName.trim() })
        .select()
        .single()

      if (data) {
        setLists(prev => [{ ...data, items: [] }, ...prev])
        setExpandedLists(prev => [data.id, ...prev])
      }
      setShowNewListModal(false)
      setNewListName('')
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedListId || !newItem.name.trim()) return

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from('shopping_items')
        .insert({
          user_id: user.id,
          list_id: selectedListId,
          name: newItem.name.trim(),
          quantity: parseInt(newItem.quantity) || 1,
          category: newItem.category,
          checked: false,
        })
        .select()
        .single()

      if (data) {
        setLists(prev => prev.map(list => 
          list.id === selectedListId 
            ? { ...list, items: [...list.items, data] }
            : list
        ))
      }
      setShowAddItemModal(false)
      setNewItem({ name: '', quantity: '1', category: 'outros' })
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const handleQuickAdd = async (suggestion: { name: string, category: string }) => {
    if (!selectedListId) return

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      const { data } = await supabase
        .from('shopping_items')
        .insert({
          user_id: user.id,
          list_id: selectedListId,
          name: suggestion.name,
          quantity: 1,
          category: suggestion.category,
          checked: false,
        })
        .select()
        .single()

      if (data) {
        setLists(prev => prev.map(list => 
          list.id === selectedListId 
            ? { ...list, items: [...list.items, data] }
            : list
        ))
      }
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const toggleItem = async (itemId: string, listId: string, checked: boolean) => {
    // Atualização otimista
    setLists(prev => prev.map(list => 
      list.id === listId 
        ? { ...list, items: list.items.map(item => 
            item.id === itemId ? { ...item, checked } : item
          )}
        : list
    ))

    try {
      const supabase = createClient()
      await supabase
        .from('shopping_items')
        .update({ checked })
        .eq('id', itemId)
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const deleteItem = async (itemId: string, listId: string) => {
    setLists(prev => prev.map(list => 
      list.id === listId 
        ? { ...list, items: list.items.filter(item => item.id !== itemId) }
        : list
    ))

    try {
      const supabase = createClient()
      await supabase
        .from('shopping_items')
        .delete()
        .eq('id', itemId)
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const deleteList = async (listId: string) => {
    if (!confirm('Excluir esta lista e todos os itens?')) return

    setLists(prev => prev.filter(list => list.id !== listId))

    try {
      const supabase = createClient()
      await supabase.from('shopping_items').delete().eq('list_id', listId)
      await supabase.from('shopping_lists').delete().eq('id', listId)
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const generateWithAI = async (listId: string) => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Sugira uma lista de compras saudável para uma gestante com 10 itens essenciais. Responda APENAS com os nomes dos itens separados por vírgula, sem explicações.',
          history: []
        })
      })

      const data = await response.json()
      if (data.response) {
        const items = data.response.split(',').map((i: string) => i.trim()).filter(Boolean).slice(0, 10)
        
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          for (const itemName of items) {
            const { data: newItem } = await supabase
              .from('shopping_items')
              .insert({
                user_id: user.id,
                list_id: listId,
                name: itemName,
                quantity: 1,
                category: 'outros',
                checked: false,
              })
              .select()
              .single()

            if (newItem) {
              setLists(prev => prev.map(list => 
                list.id === listId 
                  ? { ...list, items: [...list.items, newItem] }
                  : list
              ))
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const toggleExpanded = (listId: string) => {
    setExpandedLists(prev => 
      prev.includes(listId) 
        ? prev.filter(id => id !== listId)
        : [...prev, listId]
    )
  }

  const getCategoryInfo = (category: string) => {
    return CATEGORIES.find(c => c.value === category) || CATEGORIES[CATEGORIES.length - 1]
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lista de Compras</h1>
          <p className="text-gray-600 mt-1">Organize suas compras com IA</p>
        </div>
        <button
          onClick={() => setShowNewListModal(true)}
          className="px-4 py-2 bg-primary text-white rounded-xl font-medium flex items-center gap-1 hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Lista
        </button>
      </div>

      {/* Lists */}
      {lists.length === 0 ? (
        <Card className="text-center py-12">
          <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma lista</h3>
          <p className="text-gray-500 mb-4">Crie sua primeira lista de compras</p>
          <button
            onClick={() => setShowNewListModal(true)}
            className="px-6 py-2 bg-primary text-white rounded-xl font-medium"
          >
            Criar lista
          </button>
        </Card>
      ) : (
        <div className="space-y-4">
          {lists.map((list) => {
            const isExpanded = expandedLists.includes(list.id)
            const checkedCount = list.items.filter(i => i.checked).length
            const totalCount = list.items.length
            const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0

            return (
              <motion.div
                key={list.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  {/* List Header */}
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleExpanded(list.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <ShoppingCart className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{list.name}</h3>
                        <p className="text-sm text-gray-500">{checkedCount}/{totalCount} itens</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {progress > 0 && (
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all" 
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}
                      <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {/* List Items */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          {/* Action Buttons */}
                          <div className="flex gap-2 mb-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedListId(list.id)
                                setShowAddItemModal(true)
                              }}
                              className="flex-1 py-2 bg-primary/10 text-primary rounded-xl font-medium text-sm flex items-center justify-center gap-1 hover:bg-primary/20 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                              Adicionar Item
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                generateWithAI(list.id)
                              }}
                              disabled={isGenerating}
                              className="flex-1 py-2 bg-secondary/10 text-secondary rounded-xl font-medium text-sm flex items-center justify-center gap-1 hover:bg-secondary/20 transition-colors disabled:opacity-50"
                            >
                              {isGenerating ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Sparkles className="w-4 h-4" />
                              )}
                              Sugerir com IA
                            </button>
                          </div>

                          {/* Items */}
                          {list.items.length === 0 ? (
                            <p className="text-center text-gray-400 py-4">Nenhum item ainda</p>
                          ) : (
                            <div className="space-y-2">
                              {list.items.map((item) => {
                                const catInfo = getCategoryInfo(item.category)
                                return (
                                  <div 
                                    key={item.id}
                                    className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl"
                                  >
                                    <label className="flex items-center gap-3 cursor-pointer flex-1">
                                      <input
                                        type="checkbox"
                                        checked={item.checked}
                                        onChange={(e) => {
                                          e.stopPropagation()
                                          toggleItem(item.id, list.id, e.target.checked)
                                        }}
                                        className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                                      />
                                      <span className={item.checked ? 'line-through text-gray-400' : 'text-gray-700'}>
                                        {item.name}
                                        {item.quantity > 1 && <span className="text-gray-400 ml-1">x{item.quantity}</span>}
                                      </span>
                                    </label>
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-0.5 rounded-full text-xs ${catInfo.color}`}>
                                        {catInfo.label.split(' ')[0]}
                                      </span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          deleteItem(item.id, list.id)
                                        }}
                                        className="p-1 hover:bg-red-50 rounded-full text-red-400"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {/* Delete List Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteList(list.id)
                            }}
                            className="w-full mt-4 py-2 text-red-500 text-sm font-medium hover:bg-red-50 rounded-xl transition-colors"
                          >
                            Excluir lista
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* New List Modal */}
      {showNewListModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Nova Lista</h2>
              <button onClick={() => setShowNewListModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateList}>
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Ex: Compras da semana"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary mb-4"
                autoFocus
              />
              <button
                type="submit"
                disabled={!newListName.trim()}
                className="w-full py-3 bg-primary text-white rounded-xl font-medium disabled:opacity-50"
              >
                Criar lista
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Adicionar Item</h2>
              <button onClick={() => setShowAddItemModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Suggestions */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Sugestões rápidas</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_SUGGESTIONS.slice(0, 8).map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickAdd(sug)}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
                  >
                    + {sug.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Ou adicione manualmente</p>
              <form onSubmit={handleAddItem} className="space-y-4">
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="Nome do item"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                    placeholder="Qtd"
                    min="1"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={!newItem.name.trim()}
                  className="w-full py-3 bg-primary text-white rounded-xl font-medium disabled:opacity-50"
                >
                  Adicionar
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
