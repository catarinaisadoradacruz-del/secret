'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Check } from 'lucide-react'
import { Card, LoadingSpinner } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'

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
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    height: '',
    current_weight: '',
    target_weight: '',
    activity_level: 'moderate',
    dietary_restrictions: [] as string[],
  })

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('height, current_weight, target_weight, activity_level, dietary_restrictions')
          .eq('id', user.id)
          .single()

        if (profile) {
          setFormData({
            height: profile.height?.toString() || '',
            current_weight: profile.current_weight?.toString() || '',
            target_weight: profile.target_weight?.toString() || '',
            activity_level: profile.activity_level || 'moderate',
            dietary_restrictions: profile.dietary_restrictions || [],
          })
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setIsLoading(false)
    }
  }

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
    setError('')
    setSaved(false)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('Usuário não autenticado')
        return
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({
          height: formData.height ? parseFloat(formData.height) : null,
          current_weight: formData.current_weight ? parseFloat(formData.current_weight) : null,
          target_weight: formData.target_weight ? parseFloat(formData.target_weight) : null,
          activity_level: formData.activity_level,
          dietary_restrictions: formData.dietary_restrictions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateError) {
        throw updateError
      }

      setSaved(true)
      setTimeout(() => {
        router.back()
      }, 1000)
    } catch (error) {
      console.error('Erro ao salvar:', error)
      setError('Erro ao salvar. Tente novamente.')
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
    <div className="pb-24">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Altura (cm)
              </label>
              <input
                type="number"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                placeholder="Ex: 165"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Peso atual (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.current_weight}
                  onChange={(e) => setFormData({ ...formData, current_weight: e.target.value })}
                  placeholder="Ex: 65.5"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Peso meta (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.target_weight}
                  onChange={(e) => setFormData({ ...formData, target_weight: e.target.value })}
                  placeholder="Ex: 60"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Nível de atividade</h3>
          <select
            value={formData.activity_level}
            onChange={(e) => setFormData({ ...formData, activity_level: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            {ACTIVITY_LEVELS.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </Card>

        <Card className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Restrições alimentares</h3>
          <div className="space-y-3">
            {DIETARY_RESTRICTIONS.map((restriction) => (
              <label
                key={restriction.value}
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={formData.dietary_restrictions.includes(restriction.value)}
                  onChange={() => toggleRestriction(restriction.value)}
                  className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-gray-700">{restriction.label}</span>
              </label>
            ))}
          </div>
        </Card>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">
            {error}
          </div>
        )}

        {saved && (
          <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-xl text-sm flex items-center gap-2">
            <Check className="w-4 h-4" />
            Dados salvos com sucesso!
          </div>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              <LoadingSpinner size="sm" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Salvar alterações
            </>
          )}
        </button>
      </form>
    </div>
  )
}
