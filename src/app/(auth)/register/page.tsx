'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Heart, Mail, Lock, User, Loader2, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      
      // 1. Criar usuário no auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: { 
          data: { name: name.trim() }
        }
      })

      if (authError) {
        console.error('Auth error:', authError)
        if (authError.message.includes('already registered') || 
            authError.message.includes('User already registered') ||
            authError.message.includes('already exists')) {
          setError('Este email já está cadastrado. Faça login.')
          setLoading(false)
          return
        }
        setError(authError.message)
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError('Erro ao criar conta. Tente novamente.')
        setLoading(false)
        return
      }

      // 2. Verificar se já existe na tabela users
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', authData.user.id)
        .single()

      if (existingUser) {
        // Usuário já existe, só redireciona
        router.push('/dashboard')
        router.refresh()
        return
      }

      // 3. Criar na tabela users
      const { error: insertError } = await supabase.from('users').insert({
        id: authData.user.id,
        email: email.toLowerCase().trim(),
        name: name.trim(),
        phase: 'TRYING',
        onboarding_completed: false,
        premium: false,
        notifications_enabled: true,
        notification_meals: true,
        notification_workout: true,
        notification_water: true,
        notification_appointments: true,
        language: 'pt-BR',
        theme: 'light',
        exercise_level: 'beginner',
        cycle_length: 28,
        workout_duration_preference: 30
      })

      if (insertError) {
        console.error('Insert error:', insertError)
      }

      // 4. Criar pontos iniciais
      try {
        await supabase.from('user_points').insert({
          user_id: authData.user.id,
          total_points: 0,
          current_streak: 0,
          longest_streak: 0,
          level: 1
        })
      } catch (e) {
        console.error('Points error:', e)
      }

      // 5. Redirecionar
      router.push('/onboarding')
      router.refresh()

    } catch (err: any) {
      console.error('Register error:', err)
      setError('Erro ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleRegister = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` }
      })
      if (error) setError('Erro ao conectar com Google')
    } catch {
      setError('Erro ao conectar com Google')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-primary-700">VitaFit</span>
        </div>

        <h1 className="text-xl font-bold text-center mb-1">Crie sua conta</h1>
        <p className="text-gray-500 text-center text-sm mb-6">Comece sua jornada de bem-estar</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-500 hover:bg-primary-600 text-white py-3 rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Criar Conta'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-sm text-gray-500">ou</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <button
          onClick={handleGoogleRegister}
          disabled={loading}
          className="w-full border border-gray-200 py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continuar com Google
        </button>

        <p className="text-center text-sm text-gray-500 mt-4">
          Já tem uma conta?{' '}
          <Link href="/login" className="text-primary-600 font-medium hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  )
}
