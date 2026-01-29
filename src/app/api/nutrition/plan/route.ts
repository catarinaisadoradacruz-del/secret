import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateMealPlan } from '@/lib/ai/gemini'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: plan } = await supabase
      .from('nutrition_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    return NextResponse.json({ plan })
  } catch (error) {
    console.error('Error fetching nutrition plan:', error)
    return NextResponse.json({ error: 'Erro ao buscar plano' }, { status: 500 })
  }
}

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
    const { days = 7 } = body

    // Generate meal plan with Gemini
    const plan = await generateMealPlan({
      name: profile.name || 'Usuária',
      phase: profile.phase || 'ACTIVE',
      gestationWeek: profile.gestation_weeks,
      goals: profile.goals || [],
      restrictions: profile.dietary_restrictions || [],
      isBreastfeeding: profile.is_breastfeeding
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
