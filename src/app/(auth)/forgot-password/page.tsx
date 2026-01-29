'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Heart, Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) {
        setError('Erro ao enviar email. Verifique o endereco e tente novamente.')
        return
      }

      setSuccess(true)
    } catch {
      setError('Erro ao enviar email. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="card text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-display font-bold mb-2">Email enviado!</h1>
          <p className="text-text-secondary mb-6">
            Enviamos um link de recuperacao para <strong>{email}</strong>.
            Verifique sua caixa de entrada e spam.
          </p>
          <Link href="/login" className="btn-primary w-full py-3">
            Voltar para o login
          </Link>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md"
    >
      <div className="card">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <span className="font-display text-2xl font-bold text-primary-700">VitaFit</span>
        </div>

        <h1 className="text-2xl font-display font-bold text-center mb-2">
          Esqueceu sua senha?
        </h1>
        <p className="text-text-secondary text-center mb-8">
          Digite seu email e enviaremos um link para redefinir sua senha
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input pl-12"
                placeholder="seu@email.com"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-4 text-lg"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Enviar link de recuperacao'
            )}
          </button>
        </form>

        <Link
          href="/login"
          className="flex items-center justify-center gap-2 mt-6 text-text-secondary hover:text-primary-600"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para o login
        </Link>
      </div>
    </motion.div>
  )
}
