'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, Calendar, Clock, MapPin, Trash2, Check } from 'lucide-react'
import { Button, Card, Input, Modal, Select, LoadingSpinner } from '@/components/ui'
import { useAppointments } from '@/hooks'

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

export default function AppointmentsPage() {
  const { appointments, isLoading, createAppointment, updateAppointment, deleteAppointment } = useAppointments()
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    type: '',
    title: '',
    doctor: '',
    clinic: '',
    address: '',
    date: '',
    time: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await createAppointment({
      ...formData,
      reminder_enabled: true,
      completed: false,
    })
    setShowModal(false)
    setFormData({ type: '', title: '', doctor: '', clinic: '', address: '', date: '', time: '' })
  }

  const handleComplete = async (id: string) => {
    await updateAppointment(id, { completed: true })
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
          <h1 className="text-2xl font-bold text-gray-900">Consultas</h1>
          <p className="text-gray-600 mt-1">Gerencie suas consultas médicas</p>
        </div>
        <Button onClick={() => setShowModal(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Nova
        </Button>
      </div>

      {/* Appointments List */}
      {appointments.length === 0 ? (
        <Card className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma consulta</h3>
          <p className="text-gray-500 mb-4">Adicione suas consultas para acompanhar</p>
          <Button onClick={() => setShowModal(true)}>Adicionar consulta</Button>
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
                      <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                        {APPOINTMENT_TYPES.find(t => t.value === appointment.type)?.label || appointment.type}
                      </span>
                      {appointment.completed && (
                        <span className="px-2 py-1 bg-green-100 text-green-600 text-xs font-medium rounded-full">
                          Concluída
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900">{appointment.title}</h3>
                    {appointment.doctor && (
                      <p className="text-sm text-gray-600">{appointment.doctor}</p>
                    )}

                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(parseISO(appointment.date), "dd 'de' MMMM", { locale: ptBR })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {appointment.time}
                      </div>
                      {appointment.clinic && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {appointment.clinic}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!appointment.completed && (
                      <button
                        onClick={() => handleComplete(appointment.id)}
                        className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteAppointment(appointment.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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

      {/* Add Modal */}
      <Modal
        open={showModal}
        onOpenChange={setShowModal}
        title="Nova Consulta"
        description="Adicione uma consulta médica"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Tipo"
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value })}
            options={APPOINTMENT_TYPES}
            placeholder="Selecione o tipo"
          />

          <Input
            label="Título"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ex: Consulta de rotina"
            required
          />

          <Input
            label="Médico(a)"
            value={formData.doctor}
            onChange={(e) => setFormData({ ...formData, doctor: e.target.value })}
            placeholder="Nome do médico"
          />

          <Input
            label="Clínica/Hospital"
            value={formData.clinic}
            onChange={(e) => setFormData({ ...formData, clinic: e.target.value })}
            placeholder="Nome do local"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Data"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
            <Input
              label="Horário"
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              required
            />
          </div>

          <Button type="submit" fullWidth>
            Salvar Consulta
          </Button>
        </form>
      </Modal>
    </div>
  )
}
