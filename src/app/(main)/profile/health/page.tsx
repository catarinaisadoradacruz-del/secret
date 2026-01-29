'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import { Button, Card, Input, Select, Checkbox, LoadingSpinner } from '@/components/ui'
import { useUser } from '@/hooks'

const DIETARY_RESTRICTIONS = [
  { value: 'vegetarian', label: 'Vegetariana' },
  { value: 'vegan', label: 'Vegana' },
  { value: 'gluten_free', label: 'Sem glúten' },
  { value: 'lactose_free', label: 'Sem lactose' },
  { value: 'low_sodium', label: 'Baixo sódio' },
  { value: 'diabetic', label: 'Diabética' },
]

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentária' },
  { value: 'light', label: 'Leve (1-2x/semana)' },
  { value: 'moderate', label: 'Moderada (3-4x/semana)' },
  { value: 'active', label: 'Ativa (5+x/semana)' },
]

export default function HealthDataPage() {
  const router = useRouter()
  const { user, isLoading } = useUser()
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    height: '',
    current_weight: '',
    target_weight: '',
    activity_level: 'moderate',
    dietary_restrictions: [] as string[],
  })

  useEffect(() => {
    if (user) {
      setFormData({
        height: user.height?.toString() || '',
        current_weight: user.current_weight?.toString() || '',
        target_weight: user.target_weight?.toString() || '',
        activity_level: user.activity_level || 'moderate',
        dietary_restrictions: user.dietary_restrictions || [],
      })
    }
  }, [user])

  const toggleRestriction = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      dietary_restrictions: prev.dietary_restrictions.includes(value)
        ? prev.dietary_restrictions.filter((r) => r !== value)
        : [...prev.dietary_restrictions, value],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          height: formData.height ? parseFloat(formData.height) : null,
          current_weight: formData.current_weight ? parseFloat(formData.current_weight) : null,
          target_weight: formData.target_weight ? parseFloat(formData.target_weight) : null,
          activity_level: formData.activity_level,
          dietary_restrictions: formData.dietary_restrictions,
        }),
      })

      if (response.ok) {
        router.back()
      }
    } catch (error) {
      console.error('Error saving health data:', error)
    } finally {
      setIsSaving(false)
    }
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
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dados de Saúde</h1>
          <p className="text-gray-600 mt-1">Medidas e preferências</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Medidas</h3>
          <div className="space-y-4">
            <Input
              label="Altura (cm)"
              type="number"
              value={formData.height}
              onChange={(e) => setFormData({ ...formData, height: e.target.value })}
              placeholder="Ex: 165"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Peso atual (kg)"
                type="number"
                step="0.1"
                value={formData.current_weight}
                onChange={(e) =>
                  setFormData({ ...formData, current_weight: e.target.value })
                }
                placeholder="Ex: 65.5"
              />

              <Input
                label="Peso meta (kg)"
                type="number"
                step="0.1"
                value={formData.target_weight}
                onChange={(e) =>
                  setFormData({ ...formData, target_weight: e.target.value })
                }
                placeholder="Ex: 60"
              />
            </div>
          </div>
        </Card>

        <Card className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Nível de atividade</h3>
          <Select
            value={formData.activity_level}
            onValueChange={(value) =>
              setFormData({ ...formData, activity_level: value })
            }
            options={ACTIVITY_LEVELS}
          />
        </Card>

        <Card className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Restrições alimentares</h3>
          <div className="space-y-3">
            {DIETARY_RESTRICTIONS.map((restriction) => (
              <Checkbox
                key={restriction.value}
                checked={formData.dietary_restrictions.includes(restriction.value)}
                onCheckedChange={() => toggleRestriction(restriction.value)}
                label={restriction.label}
              />
            ))}
          </div>
        </Card>

        <Button type="submit" fullWidth isLoading={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          Salvar alterações
        </Button>
      </form>
    </div>
  )
}
