'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Heart, Apple, Dumbbell, MessageCircle, TrendingUp,
  ChevronRight, Sparkles, Calendar, Bell, Trophy, Camera,
  ShoppingCart, BookOpen, Star, Flame, Target
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface UserData {
  id: string
  name: string
  phase: string
  streak?: number
  points?: number
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ streak: 0, points: 0, workouts: 0 })

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    try {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (authUser) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()

        setUser(data)

        // Carregar stats
        const { data: points } = await supabase
          .from('user_points')
          .select('total_points, current_streak')
          .eq('user_id', authUser.id)
          .single()

        const { count: workouts } = await supabase
          .from('workouts')
          .select('id', { count: 'exact' })
          .eq('user_id', authUser.id)
          .eq('completed', true)

        setStats({
          streak: points?.current_streak || 0,
          points: points?.total_points || 0,
          workouts: workouts || 0
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-primary-500">Carregando...</div>
      </div>
    )
  }

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bom dia'
    if (hour < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <p className="text-text-secondary">{greeting()},</p>
          <h1 className="text-2xl font-display font-bold">
            {user?.name?.split(' ')[0] || 'Usuária'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link 
            href="/achievements" 
            className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center"
          >
            <Trophy className="w-5 h-5 text-yellow-600" />
          </Link>
          <Link 
            href="/notifications" 
            className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center"
          >
            <Bell className="w-5 h-5 text-primary-600" />
          </Link>
        </div>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
          <Flame className="w-6 h-6 mx-auto mb-1 text-orange-500" />
          <p className="text-xl font-bold">{stats.streak}</p>
          <p className="text-xs text-gray-500">Sequência</p>
        </div>
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
          <Star className="w-6 h-6 mx-auto mb-1 text-yellow-500" />
          <p className="text-xl font-bold">{stats.points}</p>
          <p className="text-xs text-gray-500">Pontos</p>
        </div>
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
          <Dumbbell className="w-6 h-6 mx-auto mb-1 text-primary-500" />
          <p className="text-xl font-bold">{stats.workouts}</p>
          <p className="text-xs text-gray-500">Treinos</p>
        </div>
      </div>

      {/* Welcome Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl p-6 text-white"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">VitaFit AI</span>
            </div>
            <h2 className="text-xl font-display font-bold mb-2">
              Como posso te ajudar hoje?
            </h2>
            <p className="text-white/80 text-sm mb-4">
              Estou aqui para guiar sua jornada de saúde e bem-estar
            </p>
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            >
              Conversar com Vita
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
            <Heart className="w-8 h-8" />
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <section>
        <h3 className="font-display font-semibold text-lg mb-4">Ações Rápidas</h3>
        <div className="grid grid-cols-2 gap-4">
          <Link href="/scanner" className="card flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center mb-3">
              <Camera className="w-6 h-6 text-purple-600" />
            </div>
            <span className="font-medium">Scanner</span>
            <span className="text-xs text-text-secondary">Código de barras</span>
          </Link>

          <Link href="/workout" className="card flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-secondary-100 flex items-center justify-center mb-3">
              <Dumbbell className="w-6 h-6 text-secondary-600" />
            </div>
            <span className="font-medium">Treinos</span>
            <span className="text-xs text-text-secondary">14 treinos disponíveis</span>
          </Link>

          <Link href="/achievements" className="card flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-yellow-100 flex items-center justify-center mb-3">
              <Trophy className="w-6 h-6 text-yellow-600" />
            </div>
            <span className="font-medium">Conquistas</span>
            <span className="text-xs text-text-secondary">Desafios e prêmios</span>
          </Link>

          <Link href="/chat" className="card flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-accent-300/30 flex items-center justify-center mb-3">
              <MessageCircle className="w-6 h-6 text-accent-500" />
            </div>
            <span className="font-medium">Chat IA</span>
            <span className="text-xs text-text-secondary">Assistente virtual</span>
          </Link>
        </div>
      </section>

      {/* More Actions */}
      <section>
        <h3 className="font-display font-semibold text-lg mb-4">Mais Opções</h3>
        <div className="space-y-3">
          <Link href="/nutrition" className="card flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center">
              <Apple className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <span className="font-medium">Nutrição</span>
              <p className="text-xs text-text-secondary">Controle suas refeições</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>

          <Link href="/shopping" className="card flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-pink-600" />
            </div>
            <div className="flex-1">
              <span className="font-medium">Lista de Compras</span>
              <p className="text-xs text-text-secondary">Gere com IA</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>

          <Link href="/content" className="card flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <span className="font-medium">Conteúdo</span>
              <p className="text-xs text-text-secondary">Artigos e dicas</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>

          <Link href="/progress" className="card flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="flex-1">
              <span className="font-medium">Progresso</span>
              <p className="text-xs text-text-secondary">Acompanhe sua evolução</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>

          <Link href="/appointments" className="card flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-100 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-cyan-600" />
            </div>
            <div className="flex-1">
              <span className="font-medium">Consultas</span>
              <p className="text-xs text-text-secondary">Seus compromissos</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
        </div>
      </section>

      {/* Daily Tip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-100"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-200 flex items-center justify-center">
            💡
          </div>
          <div>
            <h4 className="font-semibold text-purple-900">Dica do Dia</h4>
            <p className="text-sm text-purple-700 mt-1">
              Beba água regularmente ao longo do dia. A hidratação adequada 
              ajuda na digestão, energia e saúde da pele!
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
