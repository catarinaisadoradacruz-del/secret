'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, Calendar, Clock, MapPin, Trash2, Check, X } from 'lucide-react'
import { Card, LoadingSpinner } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'

const APPOINTMENT_TYPES = [
  { value: 'prenatal', label: 'Pré-natal' },
  { value: 'ultrasound', label: 'Ultrassom' },
  { value: 'nutritionist', label: 'Nutricionista' },
  { value: 'obstetrician', label: 'Obstetra' },
  { value: 'pediatrician', label: 'Pediatra' },
  { value: 'psychologist', label: 'Psicóloga' },
  { value: 'dentist', label: 'Dentista' },
  { value: 'other', label: 'Outro' },
]

interface Appointment {
  id: string
  type: string
  title: string
  doctor?: string
  clinic?: string
  address?: string
  date: string
  time: string
  completed: boolean
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    type: 'prenatal',
    title: '',
    doctor: '',
    clinic: '',
    address: '',
    date: '',
    time: '',
  })

  useEffect(() => {
    loadAppointments()
  }, [])

  const loadAppointments = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      const { data } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true })

      setAppointments(data || [])
    } catch (error) {
      console.error('Erro ao carregar:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.date || !formData.time) return

    setIsSaving(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from('appointments')
        .insert({
          user_id: user.id,
          type: formData.type,
          title: formData.title,
          doctor: formData.doctor || null,
          clinic: formData.clinic || null,
          address: formData.address || null,
          date: formData.date,
          time: formData.time,
          reminder_enabled: true,
          completed: false,
        })
        .select()
        .single()

      if (error) throw error

      if (data) {
        setAppointments(prev => [...prev, data].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        ))
      }

      setShowModal(false)
      setFormData({ type: 'prenatal', title: '', doctor: '', clinic: '', address: '', date: '', time: '' })
    } catch (error) {
      console.error('Erro ao salvar:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleComplete = async (id: string) => {
    try {
      const supabase = createClient()
      await supabase
        .from('appointments')
        .update({ completed: true })
        .eq('id', id)

      setAppointments(prev => prev.map(a => 
        a.id === id ? { ...a, completed: true } : a
      ))
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta consulta?')) return

    try {
      const supabase = createClient()
      await supabase
        .from('appointments')
        .delete()
        .eq('id', id)

      setAppointments(prev => prev.filter(a => a.id !== id))
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const getTypeLabel = (type: string) => {
    return APPOINTMENT_TYPES.find(t => t.value === type)?.label || type
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
          <h1 className="text-2xl font-bold text-gray-900">Consultas</h1>
          <p className="text-gray-600 mt-1">Gerencie suas consultas médicas</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-primary text-white rounded-xl font-medium flex items-center gap-1 hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova
        </button>
      </div>

      {/* Appointments List */}
      {appointments.length === 0 ? (
        <Card className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma consulta</h3>
          <p className="text-gray-500 mb-4">Adicione suas consultas para acompanhar</p>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-2 bg-primary text-white rounded-xl font-medium"
          >
            Adicionar consulta
          </button>
        </Card>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment, index) => (
            <motion.div
              key={appointment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={appointment.completed ? 'opacity-60' : ''}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">
                        {getTypeLabel(appointment.type)}
                      </span>
                      {appointment.completed && (
                        <span className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full">
                          Concluída
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900">{appointment.title}</h3>
                    {appointment.doctor && (
                      <p className="text-sm text-gray-600 mt-1">{appointment.doctor}</p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(parseISO(appointment.date), "dd 'de' MMM", { locale: ptBR })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {appointment.time}
                      </span>
                      {appointment.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {appointment.address}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {!appointment.completed && (
                      <button
                        onClick={() => handleComplete(appointment.id)}
                        className="p-2 rounded-full hover:bg-green-50 text-green-500 transition-colors"
                        title="Marcar como concluída"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(appointment.id)}
                      className="p-2 rounded-full hover:bg-red-50 text-red-500 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Nova Consulta</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de consulta
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                >
                  {APPOINTMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Consulta pré-natal 1º trimestre"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Médico(a)
                </label>
                <input
                  type="text"
                  value={formData.doctor}
                  onChange={(e) => setFormData({ ...formData, doctor: e.target.value })}
                  placeholder="Ex: Dra. Maria Silva"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hora *
                  </label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Endereço
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Ex: Rua das Flores, 123"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 bg-primary text-white rounded-xl font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Salvando...
                  </>
                ) : (
                  'Salvar consulta'
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
