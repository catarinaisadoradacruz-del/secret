'use client'

import Link from 'next/link'
import { Sparkles, Heart, Dumbbell, Apple, ArrowRight, Baby, Star, Shield } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-primary-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-primary-700">VitaFit</span>
          </div>
          <Link href="/login" className="bg-primary-500 text-white px-5 py-2 rounded-xl text-sm font-medium">
            Entrar
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-24 pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Powered by AI
          </span>

          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
            Sua jornada de<br />
            <span className="text-primary-600">saúde e bem-estar</span><br />
            começa aqui
          </h1>

          <p className="text-gray-600 mb-6 max-w-xl mx-auto">
            Nutrição e treinos personalizados com IA. Para gestantes, mamães e mulheres que buscam uma vida mais saudável.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register" className="bg-primary-500 text-white px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2">
              Começar Grátis <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/login" className="px-6 py-3 font-medium text-gray-700 hover:bg-gray-100 rounded-xl">
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-4">
          {[
            { icon: Apple, title: 'Nutrição Inteligente', desc: 'Planos alimentares personalizados com IA', color: 'bg-green-100 text-green-600' },
            { icon: Dumbbell, title: 'Treinos Adaptados', desc: 'Exercícios seguros para cada fase', color: 'bg-orange-100 text-orange-600' },
            { icon: Baby, title: 'Gestação Saudável', desc: 'Acompanhamento completo da gravidez', color: 'bg-pink-100 text-pink-600' },
          ].map((f, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm">
              <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-3`}>
                <f.icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-6">Por que escolher o VitaFit?</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Star, label: 'IA Avançada' },
              { icon: Shield, label: '100% Seguro' },
              { icon: Heart, label: 'Personalizado' },
              { icon: Sparkles, label: 'Resultados' },
            ].map((b, i) => (
              <div key={i} className="p-4">
                <b.icon className="w-8 h-8 mx-auto mb-2 text-primary-500" />
                <p className="text-sm font-medium">{b.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 px-4">
        <div className="max-w-xl mx-auto bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white text-center">
          <h2 className="text-xl font-bold mb-2">Comece sua transformação hoje!</h2>
          <p className="text-white/80 mb-4 text-sm">Mais de 10.000 mulheres já transformaram suas vidas</p>
          <Link href="/register" className="inline-block bg-white text-primary-600 px-6 py-3 rounded-xl font-semibold">
            Criar Conta Grátis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-4 text-center text-sm text-gray-500">
        <p>© 2026 VitaFit. Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}
