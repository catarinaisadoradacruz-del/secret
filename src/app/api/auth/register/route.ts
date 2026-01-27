import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, senha e nome sao obrigatorios' },
        { status: 400 }
      )
    }

    const supabase = await createServiceClient()

    // Criar usuario no Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name }
    })

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    // Criar perfil na tabela users
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        name,
        phase: 'ACTIVE',
        onboarding_completed: false
      })

    if (profileError) {
      // Deletar usuario do Auth se falhar
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Erro ao criar perfil' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Usuario criado com sucesso',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name
      }
    })
  } catch (error) {
    console.error('Erro no registro:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
