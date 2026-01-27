import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateMealPlan } from '@/lib/ai/gemini'
import type { User } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Perfil não encontrado. Complete seu cadastro.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { days = 7, preferences = [] } = body

    // Generate meal plan with Gemini
    const plan = await generateMealPlan(profile as User, {
      days,
      preferences,
      restrictions: profile.dietary_restrictions || []
    })

    return NextResponse.json({
      plan,
      generated_at: new Date().toISOString(),
      days
    })

  } catch (error) {
    console.error('Error generating meal plan:', error)
    return NextResponse.json(
      { error: 'Erro ao gerar plano alimentar' },
      { status: 500 }
    )
  }
}
