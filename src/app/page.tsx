'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Sparkles, Heart, Dumbbell, Apple, ArrowRight } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-xl font-semibold text-primary-700">VitaFit</span>
          </div>
          <Link
            href="/login"
            className="btn-primary px-6 py-2.5 text-sm"
          >
            Entrar
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Powered by AI
            </span>

            <h1 className="font-display text-4xl md:text-6xl font-bold text-text-primary mb-6 leading-tight">
              Sua jornada de<br />
              <span className="text-gradient">saúde e bem-estar</span><br />
              começa aqui
            </h1>

            <p className="text-lg md:text-xl text-text-secondary mb-8 max-w-2xl mx-auto">
              Nutrição e treinos personalizados com inteligência artificial.
              Para gestantes, mamães e mulheres que buscam uma vida mais saudável.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="btn-primary px-8 py-4 text-lg gap-2"
              >
                Começar Grátis
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/login"
                className="px-8 py-4 text-lg font-medium text-text-primary hover:bg-white/50 rounded-xl transition-all"
              >
                Já tenho conta
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="card text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-4">
                <Apple className="w-7 h-7 text-primary-600" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">Nutrição Inteligente</h3>
              <p className="text-text-secondary">
                Escaneie suas refeições e receba análise nutricional instantânea com IA
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="card text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-secondary-100 flex items-center justify-center mx-auto mb-4">
                <Dumbbell className="w-7 h-7 text-secondary-600" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">Treinos Personalizados</h3>
              <p className="text-text-secondary">
                Planos de exercícios adaptados à sua fase de vida e objetivos
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="card text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-accent-300/30 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-7 h-7 text-accent-500" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">Assistente 24h</h3>
              <p className="text-text-secondary">
                Chat com IA que lembra de você e oferece suporte personalizado
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl p-8 md:p-12 text-center text-white"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Pronta para transformar sua vida?
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
              Junte-se a milhares de mulheres que já estão cuidando da saúde de forma inteligente.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-white text-primary-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/90 transition-all"
            >
              Criar Conta Grátis
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-200">
        <div className="max-w-6xl mx-auto text-center text-text-secondary text-sm">
          <p>&copy; 2026 VitaFit AI. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
