'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar, Clock, MapPin, User, Plus, X, Edit2, Trash2,
  ArrowLeft, Bell, Check, AlertCircle, ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Appointment {
  id: string
  title: string
  doctor: string
  specialty: string
  date: string
  time: string
  location: string
  notes: string
  reminder: boolean
  completed: boolean
}

const SPECIALTIES = [
  'Obstetra',
  'Ginecologista',
  'Pediatra',
  'Nutricionista',
  'Psicóloga',
  'Dentista',
  'Endocrinologista',
  'Cardiologista',
  'Ultrassonografia',
  'Exames Laboratoriais',
  'Outro'
]

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming')
  
  const [formData, setFormData] = useState({
    title: '',
    doctor: '',
    specialty: 'Obstetra',
    date: '',
    time: '',
    location: '',
    notes: '',
    reminder: true
  })

  useEffect(() => {
    loadAppointments()
  }, [])

  const loadAppointments = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true })

      if (error) throw error
      setAppointments(data || [])
    } catch (e) {
      console.error('Erro ao carregar consultas:', e)
    } finally {
      setLoading(false)
    }
  }

  const saveAppointment = async () => {
    if (!formData.title || !formData.date || !formData.time) {
      alert('Preencha os campos obrigatórios')
      return
    }

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (editingId) {
        // Atualizar
        const { error } = await supabase
          .from('appointments')
          .update({
            title: formData.title,
            doctor: formData.doctor,
            specialty: formData.specialty,
            date: formData.date,
            time: formData.time,
            location: formData.location,
            notes: formData.notes,
            reminder: formData.reminder,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId)

        if (error) throw error
      } else {
        // Criar nova
        const { error } = await supabase
          .from('appointments')
          .insert({
            user_id: user.id,
            title: formData.title,
            doctor: formData.doctor,
            specialty: formData.specialty,
            date: formData.date,
            time: formData.time,
            location: formData.location,
            notes: formData.notes,
            reminder: formData.reminder,
            completed: false
          })

        if (error) throw error
      }

      await loadAppointments()
      resetForm()
    } catch (e) {
      console.error('Erro ao salvar:', e)
      alert('Erro ao salvar consulta')
    }
  }

  const deleteAppointment = async (id: string) => {
    if (!confirm('Deseja excluir esta consulta?')) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadAppointments()
    } catch (e) {
      console.error('Erro ao excluir:', e)
    }
  }

  const toggleCompleted = async (id: string, completed: boolean) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('appointments')
        .update({ completed: !completed })
        .eq('id', id)

      if (error) throw error
      await loadAppointments()
    } catch (e) {
      console.error('Erro ao atualizar:', e)
    }
  }

  const editAppointment = (apt: Appointment) => {
    setFormData({
      title: apt.title,
      doctor: apt.doctor,
      specialty: apt.specialty,
      date: apt.date,
      time: apt.time,
      location: apt.location,
      notes: apt.notes,
      reminder: apt.reminder
    })
    setEditingId(apt.id)
    setShowForm(true)
  }

  const resetForm = () => {
    setFormData({
      title: '',
      doctor: '',
      specialty: 'Obstetra',
      date: '',
      time: '',
      location: '',
      notes: '',
      reminder: true
    })
    setEditingId(null)
    setShowForm(false)
  }

  const today = new Date().toISOString().split('T')[0]
  
  const filteredAppointments = appointments.filter(apt => {
    if (filter === 'upcoming') return apt.date >= today
    if (filter === 'past') return apt.date < today
    return true
  })

  const upcomingCount = appointments.filter(a => a.date >= today).length
  const nextAppointment = appointments.find(a => a.date >= today && !a.completed)

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
            <h1 className="text-xl font-bold">Consultas</h1>
            <p className="text-sm text-gray-500">{upcomingCount} consultas agendadas</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="p-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Próxima Consulta */}
        {nextAppointment && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-4 text-white"
          >
            <p className="text-sm text-white/80 mb-1">Próxima Consulta</p>
            <h3 className="font-bold text-lg mb-2">{nextAppointment.title}</h3>
            <div className="flex flex-wrap gap-4 text-sm text-white/90">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(nextAppointment.date).toLocaleDateString('pt-BR')}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {nextAppointment.time}
              </span>
              {nextAppointment.doctor && (
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {nextAppointment.doctor}
                </span>
              )}
            </div>
          </motion.div>
        )}

        {/* Filtros */}
        <div className="flex gap-2 bg-white rounded-xl p-1">
          {[
            { id: 'upcoming', label: 'Próximas' },
            { id: 'past', label: 'Anteriores' },
            { id: 'all', label: 'Todas' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f.id
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista */}
        {filteredAppointments.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhuma consulta encontrada</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-primary-600 font-medium"
            >
              Agendar consulta
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAppointments.map(apt => (
              <motion.div
                key={apt.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-2xl p-4 shadow-sm ${apt.completed ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleCompleted(apt.id, apt.completed)}
                    className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-1 ${
                      apt.completed
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300'
                    }`}
                  >
                    {apt.completed && <Check className="w-4 h-4" />}
                  </button>

                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className={`font-semibold ${apt.completed ? 'line-through' : ''}`}>
                          {apt.title}
                        </h4>
                        <span className="text-xs text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                          {apt.specialty}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => editAppointment(apt)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteAppointment(apt.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(apt.date).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {apt.time}
                      </span>
                      {apt.doctor && (
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {apt.doctor}
                        </span>
                      )}
                    </div>

                    {apt.location && (
                      <p className="mt-2 text-sm text-gray-500 flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {apt.location}
                      </p>
                    )}

                    {apt.notes && (
                      <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                        {apt.notes}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Formulário */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
            onClick={resetForm}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-bold">
                  {editingId ? 'Editar Consulta' : 'Nova Consulta'}
                </h3>
                <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Título *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Ultrassom morfológico"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Especialidade</label>
                  <select
                    value={formData.specialty}
                    onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500"
                  >
                    {SPECIALTIES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Médico/Profissional</label>
                  <input
                    type="text"
                    value={formData.doctor}
                    onChange={e => setFormData({ ...formData, doctor: e.target.value })}
                    placeholder="Nome do profissional"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Data *</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Horário *</label>
                    <input
                      type="time"
                      value={formData.time}
                      onChange={e => setFormData({ ...formData, time: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Local</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Endereço ou clínica"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Observações</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Anotações importantes..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 resize-none"
                  />
                </div>

                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.reminder}
                    onChange={e => setFormData({ ...formData, reminder: e.target.checked })}
                    className="w-5 h-5 text-primary-500 rounded"
                  />
                  <div>
                    <p className="font-medium">Lembrete</p>
                    <p className="text-sm text-gray-500">Receber notificação antes da consulta</p>
                  </div>
                </label>

                <button
                  onClick={saveAppointment}
                  className="w-full btn-primary py-3 rounded-xl font-semibold"
                >
                  {editingId ? 'Salvar Alterações' : 'Agendar Consulta'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
