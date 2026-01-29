import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: plan, error } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return NextResponse.json({ plan })
  } catch (error) {
    console.error('Error fetching workout plan:', error)
    return NextResponse.json({ error: 'Erro ao buscar plano' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()

    // Deactivate current plans
    await supabase
      .from('workout_plans')
      .update({ is_active: false })
      .eq('user_id', user.id)

    // Create new plan
    const { data: plan, error } = await supabase
      .from('workout_plans')
      .insert({
        user_id: user.id,
        name: body.name || 'Meu Plano de Treino',
        description: body.description || 'Plano personalizado',
        workouts: body.workouts || [],
        sessions_per_week: body.sessions_per_week || 3,
        is_active: true
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ plan })
  } catch (error) {
    console.error('Error creating workout plan:', error)
    return NextResponse.json({ error: 'Erro ao criar plano' }, { status: 500 })
  }
}
