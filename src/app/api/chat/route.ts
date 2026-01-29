// Versão: 29-01-2026-v5 - Gemini 2.0 + Hugging Face + Formato limpo
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SERPER_API_KEY = '2d09dbaf10aadee46c34bfa7bc41f507d75d707a'

// Função para limpar markdown e formatar texto bonito
function cleanResponse(text: string): string {
  return text
    // Remove asteriscos de negrito/itálico
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    // Remove underscores de formatação
    .replace(/___(.+?)___/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    // Converte listas com * para emoji
    .replace(/^\* /gm, '• ')
    .replace(/^- /gm, '• ')
    // Remove # de headers
    .replace(/^#{1,6}\s*/gm, '')
    // Limpa múltiplas quebras de linha
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Analisar sentimento/contexto com Hugging Face
async function analyzeWithHuggingFace(message: string): Promise<{mood: string, topics: string[]}> {
  const hfToken = process.env.HUGGINGFACE_API_KEY
  if (!hfToken) return { mood: 'neutral', topics: [] }

  try {
    // Análise de sentimento
    const response = await fetch(
      'https://api-inference.huggingface.co/models/nlptown/bert-base-multilingual-uncased-sentiment',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hfToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inputs: message })
      }
    )

    if (response.ok) {
      const data = await response.json()
      // O modelo retorna scores de 1-5 estrelas
      const scores = data[0] || []
      const topScore = scores.reduce((a: any, b: any) => a.score > b.score ? a : b, {label: '3 stars'})
      
      let mood = 'neutral'
      if (topScore.label?.includes('5') || topScore.label?.includes('4')) mood = 'positive'
      else if (topScore.label?.includes('1') || topScore.label?.includes('2')) mood = 'negative'
      
      return { mood, topics: [] }
    }
  } catch (error) {
    console.warn('HuggingFace analysis failed:', error)
  }

  return { mood: 'neutral', topics: [] }
}

// Detectar tópicos importantes na mensagem
function detectTopics(message: string): string[] {
  const topics: string[] = []
  const lowerMsg = message.toLowerCase()

  const topicKeywords: Record<string, string[]> = {
    'nutrição': ['comer', 'comida', 'alimento', 'dieta', 'nutrição', 'refeição', 'vitamina', 'proteína', 'carboidrato'],
    'exercícios': ['exercício', 'treino', 'academia', 'yoga', 'pilates', 'caminhada', 'atividade física'],
    'gravidez': ['grávida', 'gravidez', 'gestação', 'bebê', 'parto', 'semanas', 'trimestre', 'ultrassom'],
    'sintomas': ['enjoo', 'náusea', 'dor', 'cólica', 'inchaço', 'cansaço', 'tontura', 'azia'],
    'emocional': ['ansiedade', 'medo', 'triste', 'feliz', 'preocupada', 'estresse', 'chorar'],
    'amamentação': ['amamentar', 'amamentação', 'leite', 'mama', 'peito'],
    'sono': ['dormir', 'sono', 'insônia', 'descanso', 'cansada'],
  }

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(kw => lowerMsg.includes(kw))) {
      topics.push(topic)
    }
  }

  return topics
}

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

    // Análise com Hugging Face (em paralelo)
    const [hfAnalysis, topics] = await Promise.all([
      analyzeWithHuggingFace(message),
      Promise.resolve(detectTopics(message))
    ])

    // Pesquisa web se necessário
    const needsSearch = shouldSearchWeb(message)
    let searchContext = ''

    if (needsSearch) {
      try {
        const searchResults = await searchWithSerper(message)
        if (searchResults) {
          searchContext = `\n\nINFORMAÇÕES DA PESQUISA (use para enriquecer sua resposta, cite fontes quando relevante):\n${searchResults}`
        }
      } catch (searchError) {
        console.warn('Erro na pesquisa web:', searchError)
      }
    }

    // Construir prompt com contexto enriquecido
    const fullPrompt = buildPrompt(userName, userPhase, gestationWeek, searchContext, message, hfAnalysis.mood, topics)

    // Tentar Gemini 2.0
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
              temperature: 0.85,
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
            console.log('✅ Gemini 2.0 respondeu!')
            const cleanedResponse = cleanResponse(responseText)
            return NextResponse.json({ response: cleanedResponse })
          }
        } else {
          const errorText = await response.text()
          console.warn(`❌ Gemini erro ${response.status}:`, errorText.substring(0, 300))
        }
      } catch (geminiError) {
        console.warn('❌ Gemini falhou:', geminiError)
      }
    }

    // Fallback: Hugging Face para geração de texto
    const hfToken = process.env.HUGGINGFACE_API_KEY
    if (hfToken) {
      try {
        console.log('🤖 Tentando Hugging Face text generation...')
        
        const response = await fetch(
          'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${hfToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              inputs: `<s>[INST] Você é Vita, assistente de bem-estar materno. Responda em português brasileiro de forma carinhosa e útil. Usuária: ${userName}. Pergunta: ${message} [/INST]`,
              parameters: {
                max_new_tokens: 500,
                temperature: 0.7,
                return_full_text: false
              }
            })
          }
        )

        if (response.ok) {
          const data = await response.json()
          const generatedText = data[0]?.generated_text
          
          if (generatedText) {
            console.log('✅ Hugging Face respondeu!')
            return NextResponse.json({ response: cleanResponse(generatedText) })
          }
        }
      } catch (hfError) {
        console.warn('❌ Hugging Face falhou:', hfError)
      }
    }

    // Fallback local inteligente
    console.log('⚠️ Usando resposta local')
    const localResponse = generateLocalResponse(message, userName, userPhase, gestationWeek, searchContext, hfAnalysis.mood)
    return NextResponse.json({ response: localResponse })

  } catch (error) {
    console.error('Erro no chat:', error)
    return NextResponse.json({
      response: 'Desculpe, estou com dificuldades técnicas no momento. Pode tentar novamente? 💜'
    })
  }
}

function shouldSearchWeb(message: string): boolean {
  const searchKeywords = [
    'pesquisa', 'pesquisar', 'busca', 'buscar', 'procura',
    'notícia', 'novidade', 'atualização', 'recente',
    'como fazer', 'receita de', 'o que é', 'qual', 'quais',
    'dicas', 'sugestões', 'recomendações', 'melhores',
    'pode', 'posso', 'é seguro', 'faz mal'
  ]
  
  const lowerMessage = message.toLowerCase()
  return searchKeywords.some(keyword => lowerMessage.includes(keyword)) || 
         (message.includes('?') && message.length > 15)
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
      results += `${data.knowledgeGraph.title || ''}: ${data.knowledgeGraph.description || ''}\n`
    }
    
    if (data.organic && data.organic.length > 0) {
      results += '\nFontes encontradas:\n'
      data.organic.slice(0, 3).forEach((item: any, index: number) => {
        results += `${index + 1}. ${item.title}: ${item.snippet} (${item.link})\n`
      })
    }
    
    return results || null
  } catch (error) {
    return null
  }
}

function buildPrompt(
  userName: string, 
  userPhase: string, 
  gestationWeek: number | undefined,
  searchContext: string,
  userMessage: string,
  mood: string,
  topics: string[]
): string {
  const phaseContext = {
    'TRYING': 'Ela está tentando engravidar. Foque em fertilidade e preparação.',
    'PREGNANT': gestationWeek 
      ? `Ela está grávida de ${gestationWeek} semanas. Dê informações específicas para esse período.`
      : 'Ela está grávida.',
    'POSTPARTUM': 'Ela está no pós-parto. Foque em recuperação e amamentação.',
    'ACTIVE': 'Foque em saúde feminina e bem-estar geral.'
  }

  const moodContext = mood === 'negative' 
    ? 'A usuária parece estar passando por um momento difícil. Seja especialmente acolhedora e empática.'
    : mood === 'positive'
    ? 'A usuária parece estar bem! Mantenha o tom positivo.'
    : ''

  const topicsContext = topics.length > 0 
    ? `Tópicos identificados: ${topics.join(', ')}.`
    : ''

  return `Você é a Vita, assistente de bem-estar materno do VitaFit. Seja carinhosa e acolhedora.

CONTEXTO:
• Nome da usuária: ${userName}
• Fase: ${phaseContext[userPhase as keyof typeof phaseContext] || phaseContext['ACTIVE']}
${moodContext ? `• ${moodContext}` : ''}
${topicsContext ? `• ${topicsContext}` : ''}

REGRAS IMPORTANTES DE FORMATAÇÃO:
1. NÃO use asteriscos (*) para formatação
2. NÃO use markdown como ** ou __
3. Use emojis com moderação para destacar pontos importantes
4. Para listas, use bullets simples como • ou números
5. Mantenha parágrafos curtos e fáceis de ler
6. Seja direta e prática nas respostas

DIRETRIZES:
• Dê respostas completas e úteis
• Para questões médicas sérias, recomende consultar um profissional
• Responda sempre em português brasileiro
• Se houver informações de pesquisa, cite as fontes naturalmente
${searchContext}

Mensagem da usuária: ${userMessage}`
}

function generateLocalResponse(
  message: string, 
  userName: string, 
  userPhase: string, 
  gestationWeek: number | undefined,
  searchContext: string,
  mood: string
): string {
  const lowerMessage = message.toLowerCase()
  
  // Saudação empática baseada no humor
  const greeting = mood === 'negative' 
    ? `Oi ${userName}! 💜 Estou aqui com você.`
    : `Olá, ${userName}! 💜`

  if (lowerMessage.match(/^(oi|olá|ola|hey|eai|e ai|bom dia|boa tarde|boa noite)/)) {
    return `${greeting} Que bom te ver por aqui! Como posso te ajudar hoje? 

Posso falar sobre:
• Nutrição e alimentação saudável
• Exercícios seguros para sua fase
• Dúvidas sobre gravidez e maternidade
• Dicas de bem-estar e autocuidado

O que você gostaria de saber?`
  }
  
  if (lowerMessage.match(/(o que você faz|o que vc faz|o que consegue|pode fazer|suas funções|me ajudar)/)) {
    return `${greeting} Sou a Vita, sua assistente de bem-estar materno! 😊

Posso te ajudar com:

🍎 Nutrição
• Dicas de alimentação para cada fase
• Alimentos recomendados e o que evitar
• Receitas saudáveis

🏃‍♀️ Exercícios
• Atividades seguras para gestantes
• Treinos pós-parto
• Dicas de bem-estar físico

🤰 Gravidez
• Informações sobre cada trimestre
• Desenvolvimento do bebê
• Preparação para o parto

👶 Pós-parto
• Cuidados com o bebê
• Amamentação
• Recuperação da mamãe

💭 Apoio emocional
• Estou aqui para ouvir
• Dicas de autocuidado
• Momentos difíceis

É só me perguntar! Estou aqui para ajudar 💜`
  }

  if (lowerMessage.match(/(ácido fólico|folico|folato)/)) {
    return `${userName}, o ácido fólico é super importante${userPhase === 'PREGNANT' ? ' na gravidez' : ''}! 💚

Alimentos ricos em ácido fólico:

🥬 Vegetais verde-escuros
• Espinafre, couve, brócolis, rúcula

🫘 Leguminosas
• Feijão, lentilha, grão-de-bico, ervilha

🍊 Frutas
• Laranja, abacate, mamão, morango

🥚 Outros
• Ovos, fígado (com moderação), gérmen de trigo

A recomendação diária é de 400-600mcg.${userPhase === 'PREGNANT' ? ' Na gravidez, seu médico pode indicar suplementação adicional.' : ''}

O ácido fólico ajuda na formação do sistema nervoso do bebê e previne malformações. Converse com seu médico sobre a quantidade ideal para você! 💜`
  }

  if (lowerMessage.match(/(comer|alimentação|comida|alimento|dieta|nutrição)/)) {
    if (userPhase === 'PREGNANT') {
      return `${userName}, durante a gestação${gestationWeek ? ` (${gestationWeek} semanas! 🤰)` : ''}, a alimentação é fundamental!

Nutrientes essenciais:

🥬 Ácido fólico → vegetais verde-escuros, feijão
🥛 Cálcio → leite, iogurte, queijos
🥩 Ferro → carnes magras, feijão, folhas escuras
🐟 Ômega-3 → sardinha, salmão (bem cozidos)
💧 Água → mínimo 2 litros por dia

⚠️ Evite:
• Álcool
• Peixes crus (sushi, sashimi)
• Queijos não pasteurizados
• Cafeína em excesso

Quer que eu sugira um cardápio? 💜`
    }
    return `${userName}, para uma alimentação saudável:

🥗 Variedade → inclua todas as cores no prato
🥬 Vegetais → pelo menos 5 porções por dia
🍎 Frutas → 3 porções diárias
💧 Água → 2 litros por dia
🥩 Proteínas → varie entre carnes, ovos, leguminosas

Posso dar dicas específicas para alguma refeição! 💜`
  }

  if (searchContext) {
    return `${userName}, encontrei algumas informações para você:\n\n${searchContext}\n\nPosso ajudar com mais alguma coisa? 💜`
  }
  
  return `${greeting}

Posso te ajudar com:
• Nutrição e alimentação
• Exercícios e bem-estar  
• Dúvidas sobre gravidez
• Cuidados pós-parto

O que você gostaria de saber? 😊`
}
