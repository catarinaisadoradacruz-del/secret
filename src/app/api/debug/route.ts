import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ 
        authenticated: false, 
        error: authError?.message || 'No user'
      })
    }

    // Verificar se existe na tabela users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, name, phase, onboarding_completed')
      .eq('id', user.id)
      .single()

    // Tentar inserir dados de teste
    const testInsert = await supabase
      .from('water_intake')
      .insert({ user_id: user.id, amount: 1 })
      .select()

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
      },
      profile: userData || null,
      profileError: userError?.message || null,
      testInsert: {
        success: !testInsert.error,
        error: testInsert.error?.message || null,
        data: testInsert.data
      }
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
