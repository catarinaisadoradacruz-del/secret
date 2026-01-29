'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ShoppingBag, Check, Plus, Trash2, ArrowLeft, 
  Baby, Heart, Sparkles, AlertCircle, ChevronDown,
  ChevronUp, Package, Star, Info, Edit2, X
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface BagItem {
  id: string
  name: string
  category: string
  quantity: number
  checked: boolean
  priority: 'alta' | 'media' | 'baixa'
  notes?: string
}

interface Category {
  id: string
  name: string
  icon: string
  color: string
  items: BagItem[]
  expanded: boolean
}

const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'mae',
    name: 'Para a Mamãe',
    icon: '👩',
    color: 'bg-pink-100 text-pink-600',
    expanded: true,
    items: [
      { id: '1', name: 'Camisolas ou pijamas (3-4)', category: 'mae', quantity: 4, checked: false, priority: 'alta' },
      { id: '2', name: 'Roupão', category: 'mae', quantity: 1, checked: false, priority: 'media' },
      { id: '3', name: 'Chinelo', category: 'mae', quantity: 1, checked: false, priority: 'alta' },
      { id: '4', name: 'Sutiã de amamentação (2-3)', category: 'mae', quantity: 3, checked: false, priority: 'alta' },
      { id: '5', name: 'Calcinhas confortáveis (5-6)', category: 'mae', quantity: 6, checked: false, priority: 'alta' },
      { id: '6', name: 'Absorventes pós-parto', category: 'mae', quantity: 2, checked: false, priority: 'alta', notes: 'Pacotes grandes' },
      { id: '7', name: 'Meias (2-3 pares)', category: 'mae', quantity: 3, checked: false, priority: 'media' },
      { id: '8', name: 'Roupa para saída', category: 'mae', quantity: 1, checked: false, priority: 'media' },
      { id: '9', name: 'Documentos (RG, carteirinha)', category: 'mae', quantity: 1, checked: false, priority: 'alta' },
      { id: '10', name: 'Cartão do pré-natal', category: 'mae', quantity: 1, checked: false, priority: 'alta' },
    ]
  },
  {
    id: 'bebe',
    name: 'Para o Bebê',
    icon: '👶',
    color: 'bg-blue-100 text-blue-600',
    expanded: true,
    items: [
      { id: '11', name: 'Bodies (6-8)', category: 'bebe', quantity: 8, checked: false, priority: 'alta' },
      { id: '12', name: 'Mijões/Calças (6-8)', category: 'bebe', quantity: 8, checked: false, priority: 'alta' },
      { id: '13', name: 'Macacões (3-4)', category: 'bebe', quantity: 4, checked: false, priority: 'alta' },
      { id: '14', name: 'Casaquinhos (2-3)', category: 'bebe', quantity: 3, checked: false, priority: 'alta' },
      { id: '15', name: 'Toucas (2-3)', category: 'bebe', quantity: 3, checked: false, priority: 'media' },
      { id: '16', name: 'Luvas (2-3 pares)', category: 'bebe', quantity: 3, checked: false, priority: 'media' },
      { id: '17', name: 'Meias (4-6 pares)', category: 'bebe', quantity: 6, checked: false, priority: 'media' },
      { id: '18', name: 'Fraldas RN (1 pacote)', category: 'bebe', quantity: 1, checked: false, priority: 'alta' },
      { id: '19', name: 'Lenços umedecidos', category: 'bebe', quantity: 1, checked: false, priority: 'alta' },
      { id: '20', name: 'Manta', category: 'bebe', quantity: 2, checked: false, priority: 'alta' },
      { id: '21', name: 'Roupa de saída especial', category: 'bebe', quantity: 1, checked: false, priority: 'media' },
    ]
  },
  {
    id: 'higiene',
    name: 'Higiene',
    icon: '🧴',
    color: 'bg-green-100 text-green-600',
    expanded: false,
    items: [
      { id: '22', name: 'Escova e pasta de dente', category: 'higiene', quantity: 1, checked: false, priority: 'alta' },
      { id: '23', name: 'Shampoo e condicionador', category: 'higiene', quantity: 1, checked: false, priority: 'media' },
      { id: '24', name: 'Sabonete', category: 'higiene', quantity: 1, checked: false, priority: 'media' },
      { id: '25', name: 'Desodorante', category: 'higiene', quantity: 1, checked: false, priority: 'media' },
      { id: '26', name: 'Pomada para seios', category: 'higiene', quantity: 1, checked: false, priority: 'alta', notes: 'Lanolina' },
      { id: '27', name: 'Absorventes de seio', category: 'higiene', quantity: 1, checked: false, priority: 'media' },
      { id: '28', name: 'Hidratante', category: 'higiene', quantity: 1, checked: false, priority: 'baixa' },
    ]
  },
  {
    id: 'extras',
    name: 'Extras',
    icon: '✨',
    color: 'bg-purple-100 text-purple-600',
    expanded: false,
    items: [
      { id: '29', name: 'Carregador de celular', category: 'extras', quantity: 1, checked: false, priority: 'alta' },
      { id: '30', name: 'Câmera/Celular', category: 'extras', quantity: 1, checked: false, priority: 'media' },
      { id: '31', name: 'Almofada de amamentação', category: 'extras', quantity: 1, checked: false, priority: 'media' },
      { id: '32', name: 'Cadeirinha do carro', category: 'extras', quantity: 1, checked: false, priority: 'alta', notes: 'Obrigatório!' },
      { id: '33', name: 'Snacks/lanchinhos', category: 'extras', quantity: 1, checked: false, priority: 'baixa' },
      { id: '34', name: 'Livro/revista', category: 'extras', quantity: 1, checked: false, priority: 'baixa' },
    ]
  }
]

const TIPS = [
  { icon: '📅', tip: 'Comece a preparar a mala por volta da 32ª semana' },
  { icon: '👕', tip: 'Lave todas as roupas do bebê com sabão neutro antes' },
  { icon: '📋', tip: 'Verifique a lista de itens exigidos pela maternidade' },
  { icon: '🏷️', tip: 'Identifique as roupas do bebê com nome completo' },
  { icon: '📱', tip: 'Mantenha a mala em local de fácil acesso' },
  { icon: '🚗', tip: 'Deixe a cadeirinha do carro já instalada' },
]

export default function MaternityBagPage() {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('mae')
  const [newItem, setNewItem] = useState({ name: '', quantity: 1, priority: 'media' as const, notes: '' })
  const [showTips, setShowTips] = useState(true)
  const [gestationWeek, setGestationWeek] = useState<number | null>(null)

  useEffect(() => {
    loadBagItems()
  }, [])

  const loadBagItems = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      // Carregar semana gestacional
      const { data: userData } = await supabase
        .from('users')
        .select('last_menstrual_date')
        .eq('id', user.id)
        .single()

      if (userData?.last_menstrual_date) {
        const dum = new Date(userData.last_menstrual_date)
        const diffDays = Math.floor((Date.now() - dum.getTime()) / (1000 * 60 * 60 * 24))
        setGestationWeek(Math.floor(diffDays / 7))
      }

      // Carregar itens salvos
      const { data: items } = await supabase
        .from('maternity_bag_items')
        .select('*')
        .eq('user_id', user.id)

      if (items && items.length > 0) {
        // Mesclar itens salvos com categorias padrão
        const updatedCategories = DEFAULT_CATEGORIES.map(cat => ({
          ...cat,
          items: cat.items.map(defaultItem => {
            const savedItem = items.find(i => i.name === defaultItem.name)
            return savedItem ? { ...defaultItem, ...savedItem, id: savedItem.id } : defaultItem
          })
        }))

        // Adicionar itens customizados
        items.filter(i => i.is_custom).forEach(customItem => {
          const catIndex = updatedCategories.findIndex(c => c.id === customItem.category)
          if (catIndex >= 0) {
            updatedCategories[catIndex].items.push({
              id: customItem.id,
              name: customItem.name,
              category: customItem.category,
              quantity: customItem.quantity,
              checked: customItem.checked,
              priority: customItem.priority,
              notes: customItem.notes
            })
          }
        })

        setCategories(updatedCategories)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const toggleItem = async (categoryId: string, itemId: string) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const category = categories.find(c => c.id === categoryId)
      const item = category?.items.find(i => i.id === itemId)
      if (!item) return

      const newChecked = !item.checked

      // Atualizar no banco
      await supabase.from('maternity_bag_items').upsert({
        user_id: user.id,
        name: item.name,
        category: categoryId,
        quantity: item.quantity,
        checked: newChecked,
        priority: item.priority,
        notes: item.notes
      }, { onConflict: 'user_id,name' })

      // Atualizar estado local
      setCategories(prev => prev.map(cat => 
        cat.id === categoryId
          ? { ...cat, items: cat.items.map(i => i.id === itemId ? { ...i, checked: newChecked } : i) }
          : cat
      ))
    } catch (e) {
      console.error(e)
    }
  }

  const addItem = async () => {
    if (!newItem.name.trim()) return

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('maternity_bag_items')
        .insert({
          user_id: user.id,
          name: newItem.name,
          category: selectedCategory,
          quantity: newItem.quantity,
          priority: newItem.priority,
          notes: newItem.notes,
          checked: false,
          is_custom: true
        })
        .select()
        .single()

      if (error) throw error

      setCategories(prev => prev.map(cat =>
        cat.id === selectedCategory
          ? { ...cat, items: [...cat.items, { ...data, id: data.id }] }
          : cat
      ))

      setNewItem({ name: '', quantity: 1, priority: 'media', notes: '' })
      setShowAddModal(false)
    } catch (e) {
      console.error(e)
    }
  }

  const deleteItem = async (categoryId: string, itemId: string, itemName: string) => {
    if (!confirm('Remover este item?')) return

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from('maternity_bag_items')
        .delete()
        .eq('user_id', user.id)
        .eq('name', itemName)

      setCategories(prev => prev.map(cat =>
        cat.id === categoryId
          ? { ...cat, items: cat.items.filter(i => i.id !== itemId) }
          : cat
      ))
    } catch (e) {
      console.error(e)
    }
  }

  const toggleCategory = (categoryId: string) => {
    setCategories(prev => prev.map(cat =>
      cat.id === categoryId ? { ...cat, expanded: !cat.expanded } : cat
    ))
  }

  const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0)
  const checkedItems = categories.reduce((sum, cat) => sum + cat.items.filter(i => i.checked).length, 0)
  const progress = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-gradient-to-br from-pink-500 to-rose-500 text-white px-4 pt-4 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/dashboard" className="p-2 hover:bg-white/10 rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Mala da Maternidade</h1>
            <p className="text-sm text-white/80">
              {gestationWeek && gestationWeek >= 32 
                ? '✅ Hora de preparar a mala!'
                : gestationWeek 
                  ? `Faltam ${32 - gestationWeek} semanas para começar`
                  : 'Organize seus itens'
              }
            </p>
          </div>
        </div>

        {/* Progresso */}
        <div className="bg-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Progresso</span>
            <span className="text-2xl font-bold">{progress}%</span>
          </div>
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="text-sm text-white/70 mt-2">
            {checkedItems} de {totalItems} itens prontos
          </p>
        </div>
      </header>

      <div className="px-4 -mt-4 space-y-4">
        {/* Dicas */}
        {showTips && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-2xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-amber-800 flex items-center gap-2">
                <Star className="w-5 h-5" />
                Dicas Importantes
              </h3>
              <button onClick={() => setShowTips(false)} className="text-amber-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {TIPS.slice(0, 4).map((tip, i) => (
                <div key={i} className="text-sm text-amber-700 flex items-start gap-2">
                  <span>{tip.icon}</span>
                  <span>{tip.tip}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Categorias */}
        {categories.map(category => {
          const catChecked = category.items.filter(i => i.checked).length
          const catTotal = category.items.length

          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
            >
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full p-4 flex items-center gap-3 text-left"
              >
                <div className={`w-10 h-10 rounded-xl ${category.color} flex items-center justify-center text-xl`}>
                  {category.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{category.name}</h3>
                  <p className="text-sm text-gray-500">{catChecked}/{catTotal} itens</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${catTotal > 0 ? (catChecked / catTotal) * 100 : 0}%` }}
                    />
                  </div>
                  {category.expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
              </button>

              <AnimatePresence>
                {category.expanded && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-2">
                      {category.items.map(item => (
                        <div
                          key={item.id}
                          className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                            item.checked ? 'bg-green-50' : 'bg-gray-50'
                          }`}
                        >
                          <button
                            onClick={() => toggleItem(category.id, item.id)}
                            className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                              item.checked
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'border-gray-300 hover:border-primary-500'
                            }`}
                          >
                            {item.checked && <Check className="w-4 h-4" />}
                          </button>
                          <div className="flex-1">
                            <p className={`font-medium ${item.checked ? 'line-through text-gray-400' : ''}`}>
                              {item.name}
                            </p>
                            {item.notes && (
                              <p className="text-xs text-gray-500">{item.notes}</p>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            item.priority === 'alta' ? 'bg-red-100 text-red-600' :
                            item.priority === 'media' ? 'bg-yellow-100 text-yellow-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {item.priority === 'alta' ? '!' : item.priority === 'media' ? '•' : '○'}
                          </span>
                          <button
                            onClick={() => deleteItem(category.id, item.id, item.name)}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}

        {/* Botão Adicionar */}
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center justify-center gap-2 text-primary-600 font-medium hover:bg-primary-50"
        >
          <Plus className="w-5 h-5" />
          Adicionar Item
        </button>
      </div>

      {/* Modal Adicionar Item */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold mb-4">Adicionar Item</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nome do Item</label>
                  <input
                    type="text"
                    value={newItem.name}
                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                    placeholder="Ex: Pomada para assaduras"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Categoria</label>
                  <select
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Quantidade</label>
                    <input
                      type="number"
                      value={newItem.quantity}
                      onChange={e => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                      min={1}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Prioridade</label>
                    <select
                      value={newItem.priority}
                      onChange={e => setNewItem({ ...newItem, priority: e.target.value as any })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                    >
                      <option value="alta">Alta</option>
                      <option value="media">Média</option>
                      <option value="baixa">Baixa</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Observação</label>
                  <input
                    type="text"
                    value={newItem.notes}
                    onChange={e => setNewItem({ ...newItem, notes: e.target.value })}
                    placeholder="Opcional"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-3 border border-gray-200 rounded-xl font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={addItem}
                    className="flex-1 py-3 bg-primary-500 text-white rounded-xl font-medium"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
