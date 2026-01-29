import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Configurar API Key
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || ''

export async function POST(request: Request) {
  try {
    const { message, history = [] } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: 'Mensagem é obrigatória' },
        { status: 400 }
      )
    }

    // Verificar se a API key existe
    if (!apiKey) {
      console.error('❌ GEMINI_API_KEY não configurada!')
      return NextResponse.json(
        { response: 'Desculpe, estou com problemas técnicos. Tente novamente mais tarde.' },
        { status: 200 }
      )
    }

    // Buscar contexto do usuário
    let userName = 'Usuária'
    let userPhase = 'ACTIVE'
    let gestationWeek: number | undefined
    let restrictions: string[] = []

    try {
      const supabase = await createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (authUser) {
        const { data: userData } = await supabase
          .from('users')
          .select('name, phase, last_menstrual_date, dietary_restrictions')
          .eq('id', authUser.id)
          .single()

        if (userData) {
          userName = userData.name || 'Usuária'
          userPhase = userData.phase || 'ACTIVE'
          restrictions = userData.dietary_restrictions || []
          
          if (userPhase === 'PREGNANT' && userData.last_menstrual_date) {
            const dum = new Date(userData.last_menstrual_date)
            const today = new Date()
            const diffDays = Math.ceil((today.getTime() - dum.getTime()) / (1000 * 60 * 60 * 24))
            gestationWeek = Math.floor(diffDays / 7)
          }
        }
      }
    } catch (dbError) {
      console.warn('Erro ao buscar usuário:', dbError)
    }

    // Construir system prompt
    const systemPrompt = buildSystemPrompt(userName, userPhase, gestationWeek, restrictions)

    // Inicializar Gemini
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    // Criar histórico de chat
    const chatHistory = [
      { role: 'user' as const, parts: [{ text: 'Sistema: ' + systemPrompt }] },
      { role: 'model' as const, parts: [{ text: 'Entendido! Estou pronta para ajudar! 💜' }] },
      ...history.map((msg: { role: string; content: string }) => ({
        role: msg.role === 'assistant' ? 'model' as const : 'user' as const,
        parts: [{ text: msg.content }]
      }))
    ]

    const chat = model.startChat({ history: chatHistory })
    const result = await chat.sendMessage(message)
    const response = result.response.text()

    return NextResponse.json({ response })

  } catch (error: any) {
    console.error('Erro no chat:', error)
    
    // Retornar mensagem amigável mesmo com erro
    return NextResponse.json({ 
      response: 'Desculpe, tive um problema ao processar sua mensagem. Pode tentar novamente? 💜' 
    })
  }
}

function buildSystemPrompt(
  name: string, 
  phase: string, 
  gestationWeek?: number,
  restrictions: string[] = []
): string {
  let prompt = `
Você é a Vita, assistente virtual de nutrição e bem-estar do app VitaFit.

# SUA PERSONALIDADE
- Carinhosa, acolhedora e empática como uma amiga próxima
- Fala de forma natural e descontraída, nunca robótica
- Usa emojis com moderação (1-2 por mensagem)
- Celebra conquistas e oferece apoio em dificuldades
- Explica termos técnicos de forma simples

# REGRAS
- Responda de forma concisa (máximo 3 parágrafos)
- Personalize SEMPRE usando o nome dela
- Para questões médicas específicas, sugira consultar profissional
- Seja prática e dê dicas úteis

# SOBRE A USUÁRIA
Nome: ${name}
`

  if (phase === 'PREGNANT' && gestationWeek) {
    const trimester = gestationWeek <= 13 ? '1º trimestre' : gestationWeek <= 26 ? '2º trimestre' : '3º trimestre'
    prompt += `
Fase: Gestante 🤰
Semana: ${gestationWeek}ª semana (${trimester})

DIRETRIZES PARA GESTANTES:
- Verifique se alimentos são seguros para gravidez
- Nutrientes importantes: ácido fólico, ferro, cálcio, ômega-3
- Alimentos proibidos: peixes crus, carnes mal passadas, queijos não pasteurizados, álcool
- Adapte exercícios ao trimestre
`
  } else if (phase === 'POSTPARTUM') {
    prompt += `
Fase: Pós-parto 🤱
- Se amamentando, considere ~500kcal extras
- Priorize recuperação e descanso
`
  } else {
    prompt += `
Fase: Ativa e saudável 💪
- Foque em alimentação equilibrada
- Incentive atividade física regular
`
  }

  if (restrictions.length > 0) {
    prompt += `\nRestrições alimentares: ${restrictions.join(', ')}\n`
  }

  prompt += `
# ÁREAS DE EXPERTISE
- Nutrição e alimentação saudável
- Exercícios e bem-estar
- Receitas e dicas culinárias
- Saúde materna (gestação e pós-parto)
- Sono e autocuidado

Agora responda a mensagem da ${name} de forma acolhedora e útil!
`

  return prompt
}
