'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import { Button, Card, Input, Select, LoadingSpinner } from '@/components/ui'
import { useUser } from '@/hooks'

export default function PersonalDataPage() {
  const router = useRouter()
  const { user, isLoading } = useUser()
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    birth_date: '',
    phase: '',
    gestation_week: '',
    expected_date: '',
  })

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        birth_date: user.birth_date || '',
        phase: user.phase || 'ACTIVE',
        gestation_week: user.gestation_week?.toString() || '',
        expected_date: user.expected_date || '',
      })
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          gestation_week: formData.gestation_week ? parseInt(formData.gestation_week) : null,
        }),
      })

      if (response.ok) {
        router.back()
      }
    } catch (error) {
      console.error('Error saving profile:', error)
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
          <h1 className="text-2xl font-bold text-gray-900">Dados Pessoais</h1>
          <p className="text-gray-600 mt-1">Atualize suas informações</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <div className="space-y-4">
            <Input
              label="Nome completo"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Seu nome"
            />

            <Input
              label="E-mail"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="seu@email.com"
              disabled
            />

            <Input
              label="Telefone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(00) 00000-0000"
            />

            <Input
              label="Data de nascimento"
              type="date"
              value={formData.birth_date}
              onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
            />
          </div>
        </Card>

        <Card className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Fase atual</h3>
          <div className="space-y-4">
            <Select
              label="Sua fase"
              value={formData.phase}
              onValueChange={(value) => setFormData({ ...formData, phase: value })}
              options={[
                { value: 'PREGNANT', label: 'Gestante' },
                { value: 'POSTPARTUM', label: 'Pós-parto' },
                { value: 'ACTIVE', label: 'Mulher ativa' },
              ]}
            />

            {formData.phase === 'PREGNANT' && (
              <>
                <Input
                  label="Semana de gestação"
                  type="number"
                  min="1"
                  max="42"
                  value={formData.gestation_week}
                  onChange={(e) =>
                    setFormData({ ...formData, gestation_week: e.target.value })
                  }
                  placeholder="Ex: 20"
                />

                <Input
                  label="Data prevista do parto"
                  type="date"
                  value={formData.expected_date}
                  onChange={(e) =>
                    setFormData({ ...formData, expected_date: e.target.value })
                  }
                />
              </>
            )}
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
