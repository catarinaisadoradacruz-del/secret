'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, ShoppingCart, Trash2, Sparkles, Check, X, ChevronDown, Loader2, Edit2 } from 'lucide-react'
import { Card, LoadingSpinner } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'

interface ShoppingItem {
  id: string
  name: string
  quantity: string
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

      // Buscar listas do usuário
      const { data: listsData } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!listsData || listsData.length === 0) {
        setLists([])
        setIsLoading(false)
        return
      }

      // Buscar itens de todas as listas do usuário
      const listIds = listsData.map(list => list.id)
      const { data: itemsData } = await supabase
        .from('shopping_items')
        .select('*')
        .in('list_id', listIds)

      // Combinar listas com seus itens
      const combinedLists = listsData.map(list => ({
        ...list,
        items: (itemsData || []).filter(item => item.list_id === list.id)
      }))

      setLists(combinedLists)
      if (combinedLists.length > 0) {
        setExpandedLists([combinedLists[0].id])
      }
    } catch (error) {
      console.error('Erro ao carregar listas:', error)
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

      if (error) throw error

      if (data) {
        setLists(prev => [{ ...data, items: [] }, ...prev])
        setExpandedLists(prev => [data.id, ...prev])
      }
      setShowNewListModal(false)
      setNewListName('')
    } catch (error) {
      console.error('Erro ao criar lista:', error)
    }
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedListId || !newItem.name.trim()) return

    try {
      const supabase = createClient()

      // Inserir item SEM user_id (a tabela não tem essa coluna)
      const { data, error } = await supabase
        .from('shopping_items')
        .insert({
          list_id: selectedListId,
          name: newItem.name.trim(),
          quantity: newItem.quantity || '1',
          category: newItem.category,
          checked: false,
        })
        .select()
        .single()

      if (error) throw error

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
      console.error('Erro ao adicionar item:', error)
    }
  }

  const handleQuickAdd = async (suggestion: { name: string, category: string }) => {
    if (!selectedListId) return

    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('shopping_items')
        .insert({
          list_id: selectedListId,
          name: suggestion.name,
          quantity: '1',
          category: suggestion.category,
          checked: false,
        })
        .select()
        .single()

      if (error) throw error

      if (data) {
        setLists(prev => prev.map(list => 
          list.id === selectedListId 
            ? { ...list, items: [...list.items, data] }
            : list
        ))
      }
    } catch (error) {
      console.error('Erro ao adicionar item rápido:', error)
    }
  }

  const handleToggleItem = async (listId: string, itemId: string, checked: boolean) => {
    try {
      const supabase = createClient()

      await supabase
        .from('shopping_items')
        .update({ checked: !checked })
        .eq('id', itemId)

      setLists(prev => prev.map(list => 
        list.id === listId 
          ? {
              ...list,
              items: list.items.map(item =>
                item.id === itemId ? { ...item, checked: !checked } : item
              )
            }
          : list
      ))
    } catch (error) {
      console.error('Erro ao atualizar item:', error)
    }
  }

  const handleDeleteItem = async (listId: string, itemId: string) => {
    try {
      const supabase = createClient()

      await supabase
        .from('shopping_items')
        .delete()
        .eq('id', itemId)

      setLists(prev => prev.map(list => 
        list.id === listId 
          ? { ...list, items: list.items.filter(item => item.id !== itemId) }
          : list
      ))
    } catch (error) {
      console.error('Erro ao deletar item:', error)
    }
  }

  const handleDeleteList = async (listId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta lista?')) return

    try {
      const supabase = createClient()

      // Deletar itens da lista primeiro
      await supabase
        .from('shopping_items')
        .delete()
        .eq('list_id', listId)

      // Depois deletar a lista
      await supabase
        .from('shopping_lists')
        .delete()
        .eq('id', listId)

      setLists(prev => prev.filter(list => list.id !== listId))
    } catch (error) {
      console.error('Erro ao deletar lista:', error)
    }
  }

  const toggleListExpanded = (listId: string) => {
    setExpandedLists(prev => 
      prev.includes(listId)
        ? prev.filter(id => id !== listId)
        : [...prev, listId]
    )
  }

  const generateAIList = async () => {
    setIsGenerating(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      // Criar lista com IA
      const response = await fetch('/api/shopping/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })

      if (response.ok) {
        await loadLists()
      }
    } catch (error) {
      console.error('Erro ao gerar lista:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const getCategoryInfo = (categoryValue: string) => {
    return CATEGORIES.find(c => c.value === categoryValue) || CATEGORIES[6]
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Lista de Compras</h1>
          <p className="text-text-secondary">Organize suas compras</p>
        </div>
        <button 
          onClick={generateAIList}
          disabled={isGenerating}
          className="btn-secondary p-3 rounded-xl"
        >
          {isGenerating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
        </button>
      </header>

      {/* Ações Rápidas */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowNewListModal(true)}
          className="flex-1 btn-primary py-3 rounded-xl flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nova Lista
        </button>
        <button
          onClick={generateAIList}
          disabled={isGenerating}
          className="flex-1 btn-secondary py-3 rounded-xl flex items-center justify-center gap-2"
        >
          <Sparkles className="w-5 h-5" />
          Gerar com IA
        </button>
      </div>

      {/* Listas */}
      {lists.length === 0 ? (
        <div className="card text-center py-12">
          <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium mb-2">Nenhuma lista ainda</h3>
          <p className="text-text-secondary mb-4">Crie sua primeira lista de compras!</p>
          <button
            onClick={() => setShowNewListModal(true)}
            className="btn-primary px-6 py-3"
          >
            <Plus className="w-5 h-5 mr-2" />
            Criar Lista
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {lists.map(list => (
            <motion.div
              key={list.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card overflow-hidden"
            >
              {/* Header da Lista */}
              <div 
                className="flex items-center justify-between p-4 cursor-pointer"
                onClick={() => toggleListExpanded(list.id)}
              >
                <div className="flex items-center gap-3">
                  <ShoppingCart className="w-5 h-5 text-primary-500" />
                  <div>
                    <h3 className="font-semibold">{list.name}</h3>
                    <p className="text-sm text-text-secondary">
                      {list.items.filter(i => i.checked).length}/{list.items.length} itens
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteList(list.id)
                    }}
                    className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronDown 
                    className={`w-5 h-5 transition-transform ${
                      expandedLists.includes(list.id) ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Itens da Lista */}
              <AnimatePresence>
                {expandedLists.includes(list.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-100"
                  >
                    {/* Botão Adicionar Item */}
                    <button
                      onClick={() => {
                        setSelectedListId(list.id)
                        setShowAddItemModal(true)
                      }}
                      className="w-full p-3 flex items-center gap-2 text-primary-600 hover:bg-primary-50 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar item
                    </button>

                    {/* Lista de Itens */}
                    <div className="divide-y divide-gray-50">
                      {list.items.map(item => {
                        const category = getCategoryInfo(item.category)
                        return (
                          <div 
                            key={item.id}
                            className={`flex items-center gap-3 p-3 ${
                              item.checked ? 'bg-gray-50' : ''
                            }`}
                          >
                            <button
                              onClick={() => handleToggleItem(list.id, item.id, item.checked)}
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                item.checked 
                                  ? 'bg-primary-500 border-primary-500' 
                                  : 'border-gray-300 hover:border-primary-500'
                              }`}
                            >
                              {item.checked && <Check className="w-4 h-4 text-white" />}
                            </button>
                            <div className="flex-1">
                              <p className={`font-medium ${item.checked ? 'line-through text-gray-400' : ''}`}>
                                {item.name}
                              </p>
                              <div className="flex items-center gap-2 text-xs">
                                <span className={`px-2 py-0.5 rounded-full ${category.color}`}>
                                  {category.label}
                                </span>
                                {item.quantity && item.quantity !== '1' && (
                                  <span className="text-text-secondary">Qtd: {item.quantity}</span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteItem(list.id, item.id)}
                              className="p-2 hover:bg-red-50 rounded-lg text-red-400"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )
                      })}
                    </div>

                    {/* Sugestões Rápidas */}
                    {list.items.length === 0 && (
                      <div className="p-4">
                        <p className="text-sm text-text-secondary mb-3">Sugestões rápidas:</p>
                        <div className="flex flex-wrap gap-2">
                          {QUICK_SUGGESTIONS.slice(0, 6).map((suggestion, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                setSelectedListId(list.id)
                                handleQuickAdd(suggestion)
                              }}
                              className="px-3 py-1.5 bg-gray-100 hover:bg-primary-100 rounded-full text-sm transition-colors"
                            >
                              + {suggestion.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal Nova Lista */}
      <AnimatePresence>
        {showNewListModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
            onClick={() => setShowNewListModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={e => e.stopPropagation()}
              className="bg-white w-full max-w-lg rounded-t-3xl p-6"
            >
              <h2 className="text-xl font-bold mb-4">Nova Lista</h2>
              <form onSubmit={handleCreateList}>
                <input
                  type="text"
                  value={newListName}
                  onChange={e => setNewListName(e.target.value)}
                  placeholder="Nome da lista..."
                  className="w-full p-4 border border-gray-200 rounded-xl mb-4 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowNewListModal(false)}
                    className="flex-1 btn-secondary py-3"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn-primary py-3"
                  >
                    Criar
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Adicionar Item */}
      <AnimatePresence>
        {showAddItemModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
            onClick={() => setShowAddItemModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={e => e.stopPropagation()}
              className="bg-white w-full max-w-lg rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto"
            >
              <h2 className="text-xl font-bold mb-4">Adicionar Item</h2>
              <form onSubmit={handleAddItem} className="space-y-4">
                <input
                  type="text"
                  value={newItem.name}
                  onChange={e => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome do item..."
                  className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  autoFocus
                />
                
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newItem.quantity}
                    onChange={e => setNewItem(prev => ({ ...prev, quantity: e.target.value }))}
                    placeholder="Qtd"
                    className="w-24 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <select
                    value={newItem.category}
                    onChange={e => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                    className="flex-1 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                {/* Sugestões */}
                <div>
                  <p className="text-sm text-text-secondary mb-2">Sugestões:</p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_SUGGESTIONS.map((suggestion, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setNewItem(prev => ({ 
                          ...prev, 
                          name: suggestion.name, 
                          category: suggestion.category 
                        }))}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-primary-100 rounded-full text-sm transition-colors"
                      >
                        {suggestion.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddItemModal(false)}
                    className="flex-1 btn-secondary py-3"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn-primary py-3"
                  >
                    Adicionar
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
