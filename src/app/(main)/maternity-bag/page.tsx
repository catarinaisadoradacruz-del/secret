'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ShoppingBag, Plus, Check, X, ArrowLeft, Sparkles,
  Baby, Heart, Shirt, Pill, Camera, FileText, Package,
  ChevronDown, ChevronUp, Trash2, Edit2, Info, Star
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface BagItem {
  id: string
  name: string
  category: string
  quantity: number
  packed: boolean
  notes?: string
  priority: 'alta' | 'média' | 'baixa'
}

interface Category {
  id: string
  name: string
  icon: any
  color: string
  items: { name: string; quantity: number; priority: 'alta' | 'média' | 'baixa'; notes?: string }[]
}

const CATEGORIES: Category[] = [
  {
    id: 'mae',
    name: 'Para a Mamãe',
    icon: Heart,
    color: 'bg-pink-100 text-pink-600',
    items: [
      { name: 'Camisolas de amamentação', quantity: 3, priority: 'alta', notes: 'Abertura frontal facilita' },
      { name: 'Sutiãs de amamentação', quantity: 3, priority: 'alta' },
      { name: 'Calcinhas confortáveis', quantity: 5, priority: 'alta', notes: 'Modelo pós-parto' },
      { name: 'Absorventes pós-parto', quantity: 2, priority: 'alta', notes: 'Pacotes grandes' },
      { name: 'Chinelo de borracha', quantity: 1, priority: 'alta' },
      { name: 'Meias', quantity: 3, priority: 'média' },
      { name: 'Roupão', quantity: 1, priority: 'média' },
      { name: 'Roupa para sair da maternidade', quantity: 1, priority: 'média', notes: 'Confortável e folgada' },
    ]
  },
  {
    id: 'bebe',
    name: 'Para o Bebê',
    icon: Baby,
    color: 'bg-blue-100 text-blue-600',
    items: [
      { name: 'Body manga curta', quantity: 6, priority: 'alta' },
      { name: 'Body manga longa', quantity: 4, priority: 'alta' },
      { name: 'Macacões', quantity: 4, priority: 'alta' },
      { name: 'Meias/sapatinhos', quantity: 4, priority: 'alta' },
      { name: 'Touca', quantity: 2, priority: 'alta' },
      { name: 'Luvas', quantity: 2, priority: 'média', notes: 'Evita arranhões' },
      { name: 'Manta leve', quantity: 2, priority: 'alta' },
      { name: 'Fraldas RN', quantity: 1, priority: 'alta', notes: 'Pacote pequeno' },
      { name: 'Roupa de saída', quantity: 1, priority: 'alta', notes: 'A mais especial!' },
    ]
  },
  {
    id: 'higiene',
    name: 'Higiene',
    icon: Package,
    color: 'bg-green-100 text-green-600',
    items: [
      { name: 'Escova de dentes', quantity: 1, priority: 'alta' },
      { name: 'Pasta de dentes', quantity: 1, priority: 'alta' },
      { name: 'Shampoo e condicionador', quantity: 1, priority: 'média' },
      { name: 'Sabonete', quantity: 1, priority: 'média' },
      { name: 'Desodorante', quantity: 1, priority: 'média' },
      { name: 'Escova de cabelo', quantity: 1, priority: 'baixa' },
      { name: 'Absorventes de seio', quantity: 1, priority: 'alta', notes: 'Pacote' },
      { name: 'Pomada para mamilos', quantity: 1, priority: 'alta', notes: 'Lanolina' },
      { name: 'Lenços umedecidos', quantity: 1, priority: 'média' },
    ]
  },
  {
    id: 'documentos',
    name: 'Documentos',
    icon: FileText,
    color: 'bg-yellow-100 text-yellow-600',
    items: [
      { name: 'RG e CPF', quantity: 1, priority: 'alta' },
      { name: 'Carteira do convênio', quantity: 1, priority: 'alta' },
      { name: 'Cartão do pré-natal', quantity: 1, priority: 'alta' },
      { name: 'Exames do pré-natal', quantity: 1, priority: 'alta' },
      { name: 'Plano de parto', quantity: 1, priority: 'média', notes: 'Se tiver' },
      { name: 'Certidão de casamento', quantity: 1, priority: 'baixa', notes: 'Para registro' },
    ]
  },
  {
    id: 'extras',
    name: 'Extras',
    icon: Star,
    color: 'bg-purple-100 text-purple-600',
    items: [
      { name: 'Carregador de celular', quantity: 1, priority: 'alta' },
      { name: 'Câmera/celular', quantity: 1, priority: 'média', notes: 'Para fotos!' },
      { name: 'Travesseiro de amamentação', quantity: 1, priority: 'média' },
      { name: 'Lanche leve', quantity: 1, priority: 'baixa', notes: 'Para acompanhante' },
      { name: 'Cadeirinha do carro', quantity: 1, priority: 'alta', notes: 'Obrigatório!' },
      { name: 'Livro ou revista', quantity: 1, priority: 'baixa' },
    ]
  }
]

const TIPS = [
  '💡 Separe a mala com 2-3 semanas de antecedência',
  '💡 A roupa de saída do bebê deve ser especial - você vai se lembrar para sempre!',
  '💡 Leve roupas confortáveis, você ainda estará com a barriga',
  '💡 A cadeirinha do carro é OBRIGATÓRIA para sair da maternidade',
  '💡 Identifique as roupas do bebê com o nome',
  '💡 Evite roupas com muitos botões - prefira zíperes',
  '💡 Leve mais fraldas do que acha necessário',
  '💡 Tenha uma sacola separada só para documentos',
]

export default function MaternityBagPage() {
  const [items, setItems] = useState<BagItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCategory, setExpandedCategory] = useState<string | null>('mae')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [newItemName, setNewItemName] = useState('')
  const [currentTip, setCurrentTip] = useState(0)

  useEffect(() => {
    loadItems()
    const tipInterval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % TIPS.length)
    }, 5000)
    return () => clearInterval(tipInterval)
  }, [])

  const loadItems = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('maternity_bag_items')
        .select('*')
        .eq('user_id', user.id)

      if (error) throw error

      if (data && data.length > 0) {
        setItems(data)
      } else {
        // Inicializar com itens padrão
        const defaultItems: BagItem[] = []
        CATEGORIES.forEach(cat => {
          cat.items.forEach((item, index) => {
            defaultItems.push({
              id: `${cat.id}-${index}`,
              name: item.name,
              category: cat.id,
              quantity: item.quantity,
              packed: false,
              notes: item.notes,
              priority: item.priority
            })
          })
        })
        setItems(defaultItems)
        
        // Salvar no banco
        await supabase.from('maternity_bag_items').insert(
          defaultItems.map(item => ({
            user_id: user.id,
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            packed: false,
            notes: item.notes,
            priority: item.priority
          }))
        )
      }
    } catch (e) {
      console.error('Erro ao carregar:', e)
    } finally {
      setLoading(false)
    }
  }

  const togglePacked = async (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return

    try {
      const supabase = createClient()
      await supabase
        .from('maternity_bag_items')
        .update({ packed: !item.packed })
        .eq('id', itemId)

      setItems(prev => prev.map(i => 
        i.id === itemId ? { ...i, packed: !i.packed } : i
      ))
    } catch (e) {
      console.error(e)
    }
  }

  const addItem = async () => {
    if (!newItemName.trim() || !selectedCategory) return

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('maternity_bag_items')
        .insert({
          user_id: user.id,
          name: newItemName,
          category: selectedCategory,
          quantity: 1,
          packed: false,
          priority: 'média'
        })
        .select()
        .single()

      if (error) throw error

      setItems(prev => [...prev, data])
      setNewItemName('')
      setShowAddModal(false)
    } catch (e) {
      console.error(e)
    }
  }

  const deleteItem = async (itemId: string) => {
    try {
      const supabase = createClient()
      await supabase
        .from('maternity_bag_items')
        .delete()
        .eq('id', itemId)

      setItems(prev => prev.filter(i => i.id !== itemId))
    } catch (e) {
      console.error(e)
    }
  }

  const packedCount = items.filter(i => i.packed).length
  const totalCount = items.length
  const progress = totalCount > 0 ? (packedCount / totalCount) * 100 : 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-xl">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Mala da Maternidade</h1>
            <p className="text-sm text-gray-500">{packedCount} de {totalCount} itens prontos</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="p-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Progresso */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium">Progresso da Mala</span>
            <span className="text-primary-600 font-bold">{Math.round(progress)}%</span>
          </div>
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          {progress === 100 && (
            <p className="text-center text-green-600 font-medium mt-3">
              🎉 Parabéns! Sua mala está pronta!
            </p>
          )}
        </div>

        {/* Dica rotativa */}
        <motion.div
          key={currentTip}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 border border-yellow-200 rounded-xl p-4"
        >
          <p className="text-yellow-800 text-sm">{TIPS[currentTip]}</p>
        </motion.div>

        {/* Categorias */}
        <div className="space-y-3">
          {CATEGORIES.map(category => {
            const categoryItems = items.filter(i => i.category === category.id)
            const categoryPacked = categoryItems.filter(i => i.packed).length
            const isExpanded = expandedCategory === category.id
            const Icon = category.icon

            return (
              <div key={category.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                  className="w-full p-4 flex items-center gap-3"
                >
                  <div className={`w-10 h-10 rounded-xl ${category.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold">{category.name}</h3>
                    <p className="text-sm text-gray-500">
                      {categoryPacked} de {categoryItems.length} itens
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary-500 rounded-full"
                        style={{ width: `${categoryItems.length > 0 ? (categoryPacked / categoryItems.length) * 100 : 0}%` }}
                      />
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-2">
                        {categoryItems.map(item => (
                          <div
                            key={item.id}
                            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                              item.packed ? 'bg-green-50' : 'bg-gray-50'
                            }`}
                          >
                            <button
                              onClick={() => togglePacked(item.id)}
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                item.packed
                                  ? 'bg-green-500 border-green-500 text-white'
                                  : 'border-gray-300'
                              }`}
                            >
                              {item.packed && <Check className="w-4 h-4" />}
                            </button>
                            <div className="flex-1">
                              <p className={`font-medium ${item.packed ? 'line-through text-gray-400' : ''}`}>
                                {item.name}
                                {item.quantity > 1 && (
                                  <span className="text-gray-500 font-normal"> (x{item.quantity})</span>
                                )}
                              </p>
                              {item.notes && (
                                <p className="text-xs text-gray-500">{item.notes}</p>
                              )}
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              item.priority === 'alta' ? 'bg-red-100 text-red-700' :
                              item.priority === 'média' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {item.priority}
                            </span>
                            <button
                              onClick={() => deleteItem(item.id)}
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
              </div>
            )
          })}
        </div>

        {/* Informações extras */}
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
          <h3 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
            <Info className="w-5 h-5" />
            Dicas Importantes
          </h3>
          <ul className="space-y-2 text-sm text-purple-700">
            <li>• Lave todas as roupas do bebê com sabão neutro</li>
            <li>• Separe as roupas em saquinhos por dia</li>
            <li>• Deixe a mala no carro a partir da 36ª semana</li>
            <li>• Tenha os documentos sempre à mão</li>
          </ul>
        </div>
      </div>

      {/* Modal Adicionar Item */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold mb-4">Adicionar Item</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nome do item</label>
                  <input
                    type="text"
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                    placeholder="Ex: Fralda de pano"
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
                    <option value="">Selecione...</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
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
