'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  User, Settings, LogOut, ChevronRight, Heart, Bell,
  Shield, HelpCircle, Star, Calendar, ShoppingCart, Baby, Briefcase, BookOpen
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { User as UserType } from '@/types'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    activeDays: 0,
    totalMeals: 0,
    totalWorkouts: 0
  })

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (authUser) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()

        setUser(data)

        // Buscar stats reais
        const { data: meals } = await supabase
          .from('meals')
          .select('id, date')
          .eq('user_id', authUser.id)

        const { data: workouts } = await supabase
          .from('workouts')
          .select('id, created_at')
          .eq('user_id', authUser.id)
          .eq('status', 'COMPLETED')

        // Calcular dias ativos (dias únicos com refeições ou treinos)
        const uniqueDates = new Set([
          ...(meals || []).map(m => m.date),
          ...(workouts || []).map(w => new Date(w.created_at).toISOString().split('T')[0])
        ])

        setStats({
          activeDays: uniqueDates.size,
          totalMeals: meals?.length || 0,
          totalWorkouts: workouts?.length || 0
        })
      }
      setLoading(false)
    }

    loadUser()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-primary-500">Carregando...</div>
      </div>
    )
  }

  const menuItems = [
    { icon: User, label: 'Dados Pessoais', href: '/profile/personal' },
    { icon: Heart, label: 'Saúde e Medidas', href: '/profile/health' },
    { icon: Bell, label: 'Notificações', href: '/profile/notifications' },
    { icon: Calendar, label: 'Minhas Consultas', href: '/appointments' },
    { icon: ShoppingCart, label: 'Lista de Compras', href: '/shopping' },
    { icon: Baby, label: 'Nomes de Bebê', href: '/baby-names' },
    { icon: Briefcase, label: 'Mala Maternidade', href: '/maternity-bag' },
    { icon: BookOpen, label: 'Conteúdos', href: '/content' },
  ]

  const getPhaseLabel = () => {
    switch (user?.phase) {
      case 'PREGNANT': return 'Gestante'
      case 'POSTPARTUM': return 'Pos-parto'
      default: return 'Mulher Ativa'
    }
  }

  const getPhaseEmoji = () => {
    switch (user?.phase) {
      case 'PREGNANT': return '🤰'
      case 'POSTPARTUM': return '🤱'
      default: return '💪'
    }
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Perfil</h1>
      </header>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
            <span className="text-3xl">{getPhaseEmoji()}</span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">{user?.name}</h2>
            <p className="text-text-secondary">{user?.email}</p>
            <span className="inline-block mt-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
              {getPhaseLabel()}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center py-4">
          <div className="text-2xl font-bold text-primary-600">{stats.activeDays}</div>
          <div className="text-xs text-text-secondary">Dias ativos</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-2xl font-bold text-secondary-600">{stats.totalMeals}</div>
          <div className="text-xs text-text-secondary">Refeições</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-2xl font-bold text-accent-500">{stats.totalWorkouts}</div>
          <div className="text-xs text-text-secondary">Treinos</div>
        </div>
      </div>

      {/* Menu */}
      <div className="card p-0 overflow-hidden">
        {menuItems.map((item, index) => (
          <Link
            key={index}
            href={item.href}
            className="w-full flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
          >
            <item.icon className="w-5 h-5 text-text-secondary" />
            <span className="flex-1 text-left">{item.label}</span>
            <ChevronRight className="w-5 h-5 text-text-secondary" />
          </Link>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full card flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 transition-colors"
      >
        <LogOut className="w-5 h-5" />
        <span className="font-medium">Sair da conta</span>
      </button>

      {/* Version */}
      <p className="text-center text-text-secondary text-sm">
        VitaFit AI v1.0.0
      </p>
    </div>
  )
}
