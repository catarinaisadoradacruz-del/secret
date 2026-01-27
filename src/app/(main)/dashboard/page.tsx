'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Heart, Apple, Dumbbell, MessageCircle, TrendingUp,
  ChevronRight, Sparkles, Calendar, Bell
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types'

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

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
      }
      setLoading(false)
    }

    loadUser()
  }, [])

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
    <div className="p-4 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <p className="text-text-secondary">{greeting()},</p>
          <h1 className="text-2xl font-display font-bold">
            {user?.name?.split(' ')[0] || 'Usuaria'}
          </h1>
        </div>
        <button className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
          <Bell className="w-5 h-5 text-primary-600" />
        </button>
      </header>

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
              Estou aqui para guiar sua jornada de saude e bem-estar
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
        <h3 className="font-display font-semibold text-lg mb-4">Acoes Rapidas</h3>
        <div className="grid grid-cols-2 gap-4">
          <Link href="/nutrition/scan" className="card flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center mb-3">
              <Apple className="w-6 h-6 text-primary-600" />
            </div>
            <span className="font-medium">Escanear Refeicao</span>
            <span className="text-xs text-text-secondary">Analise nutricional com IA</span>
          </Link>

          <Link href="/workout" className="card flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-secondary-100 flex items-center justify-center mb-3">
              <Dumbbell className="w-6 h-6 text-secondary-600" />
            </div>
            <span className="font-medium">Treino do Dia</span>
            <span className="text-xs text-text-secondary">Exercicios personalizados</span>
          </Link>

          <Link href="/chat" className="card flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-accent-300/30 flex items-center justify-center mb-3">
              <MessageCircle className="w-6 h-6 text-accent-500" />
            </div>
            <span className="font-medium">Tirar Duvida</span>
            <span className="text-xs text-text-secondary">Chat com assistente IA</span>
          </Link>

          <Link href="/progress" className="card flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center mb-3">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <span className="font-medium">Meu Progresso</span>
            <span className="text-xs text-text-secondary">Acompanhe sua evolucao</span>
          </Link>
        </div>
      </section>

      {/* Today's Summary */}
      <section>
        <h3 className="font-display font-semibold text-lg mb-4">Resumo de Hoje</h3>
        <div className="card">
          <div className="flex items-center gap-4 mb-4">
            <Calendar className="w-5 h-5 text-primary-500" />
            <span className="text-text-secondary">
              {new Date().toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
              })}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary-600">0</div>
              <div className="text-xs text-text-secondary">Calorias</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-secondary-600">0</div>
              <div className="text-xs text-text-secondary">Refeicoes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-accent-500">0</div>
              <div className="text-xs text-text-secondary">Treinos</div>
            </div>
          </div>
        </div>
      </section>

      {/* Tips */}
      <section>
        <h3 className="font-display font-semibold text-lg mb-4">Dica do Dia</h3>
        <div className="card bg-gradient-to-r from-secondary-50 to-secondary-100 border border-secondary-200">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-secondary-200 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-secondary-600" />
            </div>
            <div>
              <p className="text-text-primary font-medium mb-1">
                Hidratacao e fundamental!
              </p>
              <p className="text-text-secondary text-sm">
                Tente beber pelo menos 2 litros de agua por dia. Mantenha uma garrafa sempre por perto.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
