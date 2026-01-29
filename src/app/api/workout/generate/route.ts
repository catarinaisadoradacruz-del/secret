import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWorkoutPlan } from '@/lib/ai/gemini'

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
    const { duration = 30 } = body

    // Generate workout with Gemini
    const workout = await generateWorkoutPlan({
      name: profile.name || 'Usuária',
      phase: profile.phase || 'ACTIVE',
      gestationWeek: profile.gestation_weeks,
      goals: profile.goals || [],
      exerciseLevel: profile.exercise_level || 'moderate'
    })

    // Save workout to database
    const { data: savedWorkout, error: saveError } = await supabase
      .from('workouts')
      .insert({
        user_id: user.id,
        title: workout.title,
        description: workout.description,
        duration_minutes: duration,
        exercises: workout.exercises,
        ai_generated: true
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving workout:', saveError)
      return NextResponse.json({
        workout,
        saved: false
      })
    }

    return NextResponse.json({
      workout: savedWorkout,
      plan: workout,
      saved: true
    })

  } catch (error) {
    console.error('Error generating workout:', error)
    return NextResponse.json(
      { error: 'Erro ao gerar treino' },
      { status: 500 }
    )
  }
}
