// Versão: 29-01-2026-2100 - Com Serper e Gemini corrigido
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SERPER_API_KEY = '2d09dbaf10aadee46c34bfa7bc41f507d75d707a'

export async function POST(request: Request) {
  try {
    const { message, history = [] } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 })
    }

    // Verificar todas as possíveis variáveis de ambiente para Gemini
    const apiKey = process.env.GEMINI_API_KEY 
      || process.env.GOOGLE_GENERATIVE_AI_API_KEY 
      || process.env.NEXT_PUBLIC_GEMINI_API_KEY
      || 'AIzaSyCW53fh-d-vLU1W1c1f31iDzxPoroPlLe8' // Fallback

    if (!apiKey) {
      console.error('❌ Nenhuma API key encontrada!')
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

    // Verificar se precisa fazer pesquisa na web
    const needsSearch = shouldSearchWeb(message)
    let searchContext = ''

    if (needsSearch) {
      try {
        const searchResults = await searchWithSerper(message)
        if (searchResults) {
          searchContext = `\n\nINFORMAÇÕES ATUALIZADAS DA PESQUISA:\n${searchResults}`
        }
      } catch (searchError) {
        console.warn('Erro na pesquisa web:', searchError)
      }
    }

    // Construir prompt
    const systemPrompt = buildPrompt(userName, userPhase, gestationWeek, searchContext)

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
            maxOutputTokens: 2048, // Aumentado para não truncar
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

function shouldSearchWeb(message: string): boolean {
  const searchKeywords = [
    'pesquise', 'pesquisar', 'busque', 'buscar', 'procure', 'procurar',
    'atual', 'atualizado', 'recente', 'novidade', 'notícia', 'notícias',
    'artigo', 'estudo', 'pesquisa', 'fonte', 'referência',
    'o que é', 'como funciona', 'benefícios', 'malefícios',
    'receita', 'receitas'
  ]
  
  const lowerMessage = message.toLowerCase()
  return searchKeywords.some(keyword => lowerMessage.includes(keyword))
}

async function searchWithSerper(query: string): Promise<string | null> {
  try {
    // Adicionar contexto brasileiro à busca
    const searchQuery = `${query} site:br OR ${query} brasil português`
    
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: searchQuery,
        gl: 'br',
        hl: 'pt-br',
        num: 5
      })
    })

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.status}`)
    }

    const data = await response.json()
    
    // Formatar resultados
    let results = ''
    
    if (data.organic && data.organic.length > 0) {
      results += 'RESULTADOS DA PESQUISA:\n'
      data.organic.slice(0, 5).forEach((item: any, index: number) => {
        results += `\n${index + 1}. ${item.title}\n`
        results += `   ${item.snippet}\n`
        results += `   Fonte: ${item.link}\n`
      })
    }

    if (data.knowledgeGraph) {
      results += `\nINFORMAÇÃO PRINCIPAL:\n${data.knowledgeGraph.description || ''}\n`
    }

    return results || null
  } catch (error) {
    console.error('Erro Serper:', error)
    return null
  }
}

function buildPrompt(name: string, phase: string, gestationWeek?: number, searchContext?: string): string {
  let prompt = `Você é a Vita, assistente virtual de nutrição e bem-estar do app VitaFit.

PERSONALIDADE:
- Carinhosa, acolhedora e empática
- Fala de forma natural, nunca robótica
- Usa emojis com moderação (1-2 por mensagem)
- Celebra conquistas da usuária

REGRAS IMPORTANTES:
- NUNCA truncar respostas - sempre complete seu raciocínio
- Responda de forma completa mas organizada
- Personalize usando o nome dela: ${name}
- Para questões médicas, sugira consultar profissional
- Seja prática com dicas úteis
- TODO conteúdo deve ser em PORTUGUÊS DO BRASIL
- Quando houver pesquisa, SEMPRE cite as fontes

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

  if (searchContext) {
    prompt += `\n${searchContext}\n
INSTRUÇÕES SOBRE A PESQUISA:
- Use essas informações para enriquecer sua resposta
- SEMPRE mencione as fontes quando usar informações da pesquisa
- Priorize informações de fontes brasileiras e confiáveis
`
  }

  prompt += `
EXPERTISE:
- Nutrição e alimentação
- Exercícios e bem-estar
- Receitas saudáveis
- Saúde materna
- Sono e autocuidado

Responda de forma acolhedora, completa e útil!`

  return prompt
}
