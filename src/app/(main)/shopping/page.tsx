'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { Button, Card, Input, Modal, Checkbox, LoadingSpinner } from '@/components/ui'
import { useShopping } from '@/hooks'

export default function ShoppingPage() {
  const { lists, isLoading, createList, addItem, toggleItem, deleteItem } = useShopping()
  const [showNewListModal, setShowNewListModal] = useState(false)
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [newListName, setNewListName] = useState('')
  const [newItem, setNewItem] = useState({ name: '', quantity: '', category: '' })

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault()
    await createList(newListName)
    setShowNewListModal(false)
    setNewListName('')
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedListId) return
    await addItem(selectedListId, {
      name: newItem.name,
      quantity: parseInt(newItem.quantity) || 1,
      category: newItem.category,
      checked: false,
    })
    setShowAddItemModal(false)
    setNewItem({ name: '', quantity: '', category: '' })
  }

  const openAddItemModal = (listId: string) => {
    setSelectedListId(listId)
    setShowAddItemModal(true)
  }

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
          <h1 className="text-2xl font-bold text-gray-900">Lista de Compras</h1>
          <p className="text-gray-600 mt-1">Organize suas compras</p>
        </div>
        <Button onClick={() => setShowNewListModal(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Nova Lista
        </Button>
      </div>

      {/* Lists */}
      {lists.length === 0 ? (
        <Card className="text-center py-12">
          <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma lista</h3>
          <p className="text-gray-500 mb-4">Crie sua primeira lista de compras</p>
          <Button onClick={() => setShowNewListModal(true)}>Criar lista</Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {lists.map((list, listIndex) => {
            const checkedCount = list.items.filter(i => i.checked).length
            const progress = list.items.length > 0 ? (checkedCount / list.items.length) * 100 : 0

            return (
              <motion.div
                key={list.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: listIndex * 0.1 }}
              >
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{list.name}</h3>
                      <p className="text-sm text-gray-500">
                        {checkedCount} de {list.items.length} itens
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openAddItemModal(list.id)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 bg-gray-100 rounded-full mb-4 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {/* Items */}
                  <div className="space-y-2">
                    {list.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                      >
                        <Checkbox
                          checked={item.checked}
                          onCheckedChange={(checked) => toggleItem(item.id, checked as boolean)}
                          label={`${item.name}${item.quantity && item.quantity > 1 ? ` (${item.quantity})` : ''}`}
                        />
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {list.items.length === 0 && (
                    <p className="text-center text-gray-400 py-4">
                      Nenhum item na lista
                    </p>
                  )}
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* New List Modal */}
      <Modal
        open={showNewListModal}
        onOpenChange={setShowNewListModal}
        title="Nova Lista"
        description="Crie uma nova lista de compras"
      >
        <form onSubmit={handleCreateList} className="space-y-4">
          <Input
            label="Nome da lista"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="Ex: Compras da semana"
            required
          />
          <Button type="submit" fullWidth>
            Criar Lista
          </Button>
        </form>
      </Modal>

      {/* Add Item Modal */}
      <Modal
        open={showAddItemModal}
        onOpenChange={setShowAddItemModal}
        title="Adicionar Item"
        description="Adicione um item à lista"
      >
        <form onSubmit={handleAddItem} className="space-y-4">
          <Input
            label="Item"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            placeholder="Ex: Leite"
            required
          />
          <Input
            label="Quantidade"
            type="number"
            value={newItem.quantity}
            onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
            placeholder="1"
          />
          <Input
            label="Categoria"
            value={newItem.category}
            onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
            placeholder="Ex: Laticínios"
          />
          <Button type="submit" fullWidth>
            Adicionar
          </Button>
        </form>
      </Modal>
    </div>
  )
}
