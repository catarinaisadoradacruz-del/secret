import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // Verificar se usuário já existe na tabela users
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', data.user.id)
        .single()
      
      if (!existingUser) {
        // Criar usuário na tabela users
        try {
          await supabase.from('users').insert({
            id: data.user.id,
            email: data.user.email || '',
            name: data.user.user_metadata?.name || data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Usuária',
            avatar_url: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || null,
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
        } catch (err) {
          console.error('Error creating user:', err)
        }

        // Criar pontos iniciais
        try {
          await supabase.from('user_points').insert({
            user_id: data.user.id,
            total_points: 0,
            current_streak: 0,
            longest_streak: 0,
            level: 1
          })
        } catch (err) {
          console.error('Error creating points:', err)
        }

        // Redirecionar para onboarding se é novo usuário
        return NextResponse.redirect(`${origin}/onboarding`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
