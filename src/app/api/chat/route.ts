import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { message, history = [] } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 })
    }

    // Verificar todas as possíveis variáveis de ambiente
    const apiKey = process.env.GEMINI_API_KEY 
      || process.env.GOOGLE_GENERATIVE_AI_API_KEY 
      || process.env.NEXT_PUBLIC_GEMINI_API_KEY
      || ''

    if (!apiKey) {
      console.error('❌ Nenhuma API key encontrada!')
      console.error('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'SET' : 'NOT SET')
      console.error('GOOGLE_GENERATIVE_AI_API_KEY:', process.env.GOOGLE_GENERATIVE_AI_API_KEY ? 'SET' : 'NOT SET')
      console.error('NEXT_PUBLIC_GEMINI_API_KEY:', process.env.NEXT_PUBLIC_GEMINI_API_KEY ? 'SET' : 'NOT SET')
      
      return NextResponse.json({ 
        response: 'Olá! Estou com um probleminha técnico no momento. Por favor, tente novamente em alguns minutos! 💜' 
      })
    }

    // Buscar contexto do usuário
    let userName = 'Querida'
    let userPhase = 'ACTIVE'
    let gestationWeek: number | undefined

    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('name, phase, last_menstrual_date')
          .eq('id', user.id)
          .single()

        if (userData) {
          userName = userData.name || 'Querida'
          userPhase = userData.phase || 'ACTIVE'
          
          if (userPhase === 'PREGNANT' && userData.last_menstrual_date) {
            const dum = new Date(userData.last_menstrual_date)
            const today = new Date()
            const diffDays = Math.ceil((today.getTime() - dum.getTime()) / (1000 * 60 * 60 * 24))
            gestationWeek = Math.floor(diffDays / 7)
          }
        }
      }
    } catch (dbError) {
      console.warn('Erro ao buscar usuário (continuando):', dbError)
    }

    // Construir prompt
    const systemPrompt = buildPrompt(userName, userPhase, gestationWeek)

    // Chamar API Gemini diretamente via fetch
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'model', parts: [{ text: 'Entendido! Sou a Vita, sua assistente de nutrição e bem-estar. Estou pronta para ajudar! 💜' }] },
            ...history.map((msg: { role: string; content: string }) => ({
              role: msg.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: msg.content }]
            })),
            { role: 'user', parts: [{ text: message }] }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ]
        })
      }
    )

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('Erro Gemini:', geminiResponse.status, errorText)
      throw new Error(`Gemini API error: ${geminiResponse.status}`)
    }

    const geminiData = await geminiResponse.json()
    
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text 
      || 'Desculpe, não consegui gerar uma resposta. Pode reformular sua pergunta? 💜'

    return NextResponse.json({ response: responseText })

  } catch (error: any) {
    console.error('Erro no chat:', error.message || error)
    
    return NextResponse.json({ 
      response: 'Desculpe, tive um probleminha. Pode tentar de novo? 💜' 
    })
  }
}

function buildPrompt(name: string, phase: string, gestationWeek?: number): string {
  let prompt = `Você é a Vita, assistente virtual de nutrição e bem-estar do app VitaFit.

PERSONALIDADE:
- Carinhosa, acolhedora e empática
- Fala de forma natural, nunca robótica
- Usa emojis com moderação (1-2 por mensagem)
- Celebra conquistas da usuária

REGRAS:
- Responda de forma concisa (máximo 3 parágrafos curtos)
- Personalize usando o nome dela: ${name}
- Para questões médicas, sugira consultar profissional
- Seja prática com dicas úteis

CONTEXTO:
Nome: ${name}
`

  if (phase === 'PREGNANT' && gestationWeek) {
    const trimester = gestationWeek <= 13 ? '1º trimestre' : gestationWeek <= 26 ? '2º trimestre' : '3º trimestre'
    prompt += `Fase: GESTANTE 🤰 (${gestationWeek}ª semana - ${trimester})

IMPORTANTE PARA GESTANTES:
- Alimentos seguros para gravidez
- Nutrientes: ácido fólico, ferro, cálcio
- EVITAR: peixes crus, carnes mal passadas, álcool
`
  } else if (phase === 'POSTPARTUM') {
    prompt += `Fase: PÓS-PARTO 🤱
- Priorize recuperação
- Se amamentando, +500kcal/dia
`
  } else {
    prompt += `Fase: Ativa e saudável 💪
`
  }

  prompt += `
EXPERTISE:
- Nutrição e alimentação
- Exercícios e bem-estar
- Receitas saudáveis
- Saúde materna
- Sono e autocuidado

Responda de forma acolhedora e útil!`

  return prompt
}
