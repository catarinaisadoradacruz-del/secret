// Versão: 29-01-2026-v4 - Gemini 2.0 com X-goog-api-key header
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SERPER_API_KEY = '2d09dbaf10aadee46c34bfa7bc41f507d75d707a'

export async function POST(request: Request) {
  try {
    const { message, history = [] } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 })
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
          searchContext = `\n\nINFORMAÇÕES ATUALIZADAS DA PESQUISA (use essas informações para responder, SEMPRE cite as fontes):\n${searchResults}`
        }
      } catch (searchError) {
        console.warn('Erro na pesquisa web:', searchError)
      }
    }

    // Construir prompt
    const fullPrompt = buildPrompt(userName, userPhase, gestationWeek, searchContext, message)

    // Tentar Gemini 2.0 com novo formato
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
    
    if (geminiKey) {
      try {
        console.log('🤖 Tentando Gemini 2.0 Flash...')
        
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': geminiKey
          },
          body: JSON.stringify({
            contents: [
              ...history.map((msg: any) => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
              })),
              { role: 'user', parts: [{ text: fullPrompt }] }
            ],
            generationConfig: {
              temperature: 0.8,
              maxOutputTokens: 4096,
              topP: 0.95,
            },
            safetySettings: [
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            ],
          }),
        })

        if (response.ok) {
          const data = await response.json()
          const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text

          if (responseText) {
            console.log('✅ Gemini 2.0 respondeu com sucesso!')
            return NextResponse.json({ response: responseText })
          }
        } else {
          const errorText = await response.text()
          console.warn(`❌ Gemini erro ${response.status}:`, errorText.substring(0, 300))
        }
      } catch (geminiError) {
        console.warn('❌ Gemini falhou:', geminiError)
      }
    }

    // Tentar OpenRouter como fallback
    const openRouterKey = process.env.OPENROUTER_API_KEY
    if (openRouterKey) {
      try {
        console.log('🤖 Tentando OpenRouter Llama...')
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://vita-fit-nutricao.vercel.app',
            'X-Title': 'VitaFit'
          },
          body: JSON.stringify({
            model: 'meta-llama/llama-3.2-3b-instruct:free',
            messages: [
              { role: 'system', content: fullPrompt.split('\n\nMensagem')[0] },
              ...history.map((msg: any) => ({ role: msg.role, content: msg.content })),
              { role: 'user', content: message }
            ],
            max_tokens: 2048,
            temperature: 0.8,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          const responseText = data.choices?.[0]?.message?.content

          if (responseText) {
            console.log('✅ OpenRouter respondeu com sucesso!')
            return NextResponse.json({ response: responseText })
          }
        }
      } catch (openRouterError) {
        console.warn('❌ OpenRouter falhou:', openRouterError)
      }
    }

    // Fallback local
    console.log('⚠️ Usando resposta local')
    const localResponse = generateLocalResponse(message, userName, userPhase, gestationWeek, searchContext)
    return NextResponse.json({ response: localResponse })

  } catch (error) {
    console.error('Erro no chat:', error)
    return NextResponse.json({
      response: 'Desculpe, estou com dificuldades técnicas no momento. Mas você pode me perguntar novamente! 💜'
    })
  }
}

function shouldSearchWeb(message: string): boolean {
  const searchKeywords = [
    'pesquisa', 'pesquisar', 'busca', 'buscar', 'procura', 'procurar',
    'notícia', 'notícias', 'novidade', 'atualização', 'recente',
    'hoje', 'ontem', 'semana', 'mês', 'ano',
    'como fazer', 'receita de', 'o que é', 'qual', 'quais',
    'dicas', 'sugestões', 'recomendações', 'melhores',
    'gravidez', 'gestação', 'bebê', 'maternidade',
    'nutrição', 'alimentação', 'dieta', 'exercício',
    'sintoma', 'sintomas', 'pode', 'posso'
  ]
  
  const lowerMessage = message.toLowerCase()
  return searchKeywords.some(keyword => lowerMessage.includes(keyword)) || message.includes('?')
}

async function searchWithSerper(query: string): Promise<string | null> {
  try {
    const searchQuery = `${query} maternidade gestação gravidez Brasil`
    
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

    if (!response.ok) return null

    const data = await response.json()
    let results = ''
    
    if (data.knowledgeGraph) {
      results += `📚 ${data.knowledgeGraph.title || ''}: ${data.knowledgeGraph.description || ''}\n`
    }
    
    if (data.organic && data.organic.length > 0) {
      results += '\n📰 FONTES ENCONTRADAS:\n'
      data.organic.slice(0, 4).forEach((item: any, index: number) => {
        results += `\n${index + 1}. **${item.title}**\n`
        results += `   ${item.snippet}\n`
        results += `   🔗 Fonte: ${item.link}\n`
      })
    }
    
    return results || null
  } catch (error) {
    console.error('Erro no Serper:', error)
    return null
  }
}

function buildPrompt(
  userName: string, 
  userPhase: string, 
  gestationWeek: number | undefined,
  searchContext: string,
  userMessage: string
): string {
  const phaseContext = {
    'TRYING': 'Ela está tentando engravidar. Foque em fertilidade, ovulação, preparação para gravidez.',
    'PREGNANT': gestationWeek 
      ? `Ela está grávida de ${gestationWeek} semanas. Dê informações específicas para esse período gestacional.`
      : 'Ela está grávida. Pergunte de quantas semanas está para dar orientações mais específicas.',
    'POSTPARTUM': 'Ela está no pós-parto. Foque em recuperação, amamentação, cuidados com o bebê e autocuidado.',
    'ACTIVE': 'Foque em saúde feminina geral, bem-estar e estilo de vida saudável.'
  }

  return `Você é a Vita, assistente de bem-estar materno do app VitaFit. Você é carinhosa, acolhedora e MUITO conhecedora sobre saúde materna, nutrição e bem-estar.

CONTEXTO DA USUÁRIA:
- Nome: ${userName}
- Fase: ${phaseContext[userPhase as keyof typeof phaseContext] || phaseContext['ACTIVE']}

DIRETRIZES:
1. Seja calorosa e empática, use emojis moderadamente
2. Dê respostas COMPLETAS e ÚTEIS, nunca truncadas
3. Sempre baseie suas respostas em informações confiáveis
4. Para questões médicas sérias, recomende consultar um profissional de saúde
5. Use linguagem simples e acessível
6. Se houver informações da pesquisa web, USE-AS e CITE AS FONTES
7. Responda SEMPRE em português brasileiro
8. Não seja genérica - dê dicas práticas e específicas
${searchContext}

Mensagem da usuária: ${userMessage}`
}

function generateLocalResponse(
  message: string, 
  userName: string, 
  userPhase: string, 
  gestationWeek: number | undefined,
  searchContext: string
): string {
  const lowerMessage = message.toLowerCase()
  
  if (lowerMessage.match(/^(oi|olá|ola|hey|eai|e ai|bom dia|boa tarde|boa noite)/)) {
    return `Olá, ${userName}! 💜 Que bom te ver por aqui! Como posso te ajudar hoje? Posso falar sobre nutrição, exercícios, dicas de bem-estar ou qualquer dúvida que você tenha!`
  }
  
  if (lowerMessage.match(/(ácido fólico|folico|folato)/)) {
    return `${userName}, o ácido fólico é ESSENCIAL${userPhase === 'PREGNANT' ? ' na gravidez' : ''}! 💚

🥬 **Alimentos ricos em ácido fólico:**
- Vegetais verde-escuros: espinafre, brócolis, couve
- Leguminosas: feijão, lentilha, grão-de-bico
- Frutas cítricas: laranja, limão
- Abacate
- Ovos
- Fígado (com moderação)

📊 **Recomendação diária:** 400-600mcg
${userPhase === 'PREGNANT' ? '🤰 Na gravidez, muitos médicos recomendam suplementação além da alimentação.' : ''}

O ácido fólico ajuda na formação do tubo neural do bebê e previne malformações. Consulte seu médico sobre suplementação! 💜`
  }
  
  if (lowerMessage.match(/(comer|alimentação|comida|alimento|dieta|nutrição|refeição)/)) {
    if (userPhase === 'PREGNANT') {
      return `${userName}, durante a gestação${gestationWeek ? ` (você está com ${gestationWeek} semanas! 🤰)` : ''}, alguns alimentos são super importantes:

🥬 **Ácido fólico**: vegetais verde-escuros, feijão, lentilha
🥛 **Cálcio**: leite, iogurte, queijos, tofu
🥩 **Ferro**: carnes magras, feijão, folhas escuras
🐟 **Ômega-3**: peixes como sardinha e salmão (bem cozidos!)
💧 **Hidratação**: pelo menos 2 litros de água por dia

Evite: álcool, peixes crus, queijos não pasteurizados, cafeína em excesso.

Quer que eu monte um cardápio personalizado para você? 💜`
    }
    return `${userName}, para uma alimentação saudável, foque em:

🥗 **Variedade**: inclua todas as cores no prato
🥬 **Vegetais**: pelo menos 5 porções por dia
🍎 **Frutas**: 3 porções diárias
💧 **Água**: 2 litros por dia
🥩 **Proteínas**: varie entre carnes, ovos, leguminosas

Quer dicas específicas para alguma refeição? 💜`
  }
  
  if (lowerMessage.match(/(exercício|treino|academia|atividade física|yoga|pilates|caminhada)/)) {
    if (userPhase === 'PREGNANT') {
      return `${userName}, exercícios na gravidez são ótimos quando feitos com segurança! 🧘‍♀️

✅ **Recomendados**:
- Caminhada leve (20-30 min)
- Natação e hidroginástica
- Yoga pré-natal
- Pilates adaptado
- Alongamentos suaves

⚠️ **Evite**:
- Exercícios de alto impacto
- Esportes de contato
- Posições deitada de barriga pra cima após 16 semanas
- Exercícios extenuantes

Sempre com liberação médica! Quer uma rotina suave para começar? 💪`
    }
    return `Atividade física é essencial, ${userName}! 💪

Recomendo começar com:
- 🚶‍♀️ 30 min de caminhada diária
- 🧘‍♀️ Yoga ou pilates 2-3x por semana
- 💪 Musculação leve 2-3x por semana
- 🏊‍♀️ Natação se possível

O importante é encontrar algo que você goste! Posso sugerir um plano de treino? 💜`
  }
  
  if (searchContext) {
    return `${userName}, baseado nas informações que encontrei:\n\n${searchContext}\n\nPosso ajudar com mais alguma coisa? 💜`
  }
  
  return `Oi ${userName}! 💜 Estou aqui para ajudar!

Posso falar sobre:
🍎 Nutrição e alimentação
🏃‍♀️ Exercícios e bem-estar
🤰 Dúvidas sobre gravidez
👶 Cuidados pós-parto
📚 Dicas gerais de saúde

O que você gostaria de saber?`
}
