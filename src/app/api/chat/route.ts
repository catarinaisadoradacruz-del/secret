import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chatWithAssistant } from '@/lib/ai/gemini'
import { buildSystemPrompt, type UserContext } from '@/lib/ai/system-prompts'

export async function POST(request: Request) {
  try {
    const { message, history = [] } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: 'Mensagem e obrigatoria' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    let userContext: UserContext = {
      id: 'anonymous',
      name: 'Usuaria',
      phase: 'ACTIVE',
      goals: [],
      restrictions: []
    }

    if (authUser) {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (userData) {
        let gestationWeek: number | undefined
        if (userData.phase === 'PREGNANT' && userData.last_menstrual_date) {
          const dum = new Date(userData.last_menstrual_date)
          const today = new Date()
          const diffDays = Math.ceil((today.getTime() - dum.getTime()) / (1000 * 60 * 60 * 24))
          gestationWeek = Math.floor(diffDays / 7)
        }

        userContext = {
          id: userData.id,
          name: userData.name,
          phase: userData.phase,
          gestationWeek,
          goals: userData.goals || [],
          restrictions: userData.dietary_restrictions || [],
          isBreastfeeding: userData.is_breastfeeding
        }
      }
    }

    const systemPrompt = buildSystemPrompt(userContext)
    const response = await chatWithAssistant(message, systemPrompt, history)

    return NextResponse.json({ response })
  } catch (error) {
    console.error('Erro no chat:', error)
    return NextResponse.json(
      { error: 'Erro ao processar mensagem' },
      { status: 500 }
    )
  }
}
