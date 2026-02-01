// Versão: 01-02-2026-v1 - Groq (Llama 3.3 70B) + Gemini 2.0 + HuggingFace + Fallback
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SERPER_API_KEY = '2d09dbaf10aadee46c34bfa7bc41f507d75d707a'

function cleanResponse(text: string): string {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/___(.+?)___/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/^\* /gm, '• ')
    .replace(/^- /gm, '• ')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function detectTopics(message: string): string[] {
  const topics: string[] = []
  const lowerMsg = message.toLowerCase()
  const topicKeywords: Record<string, string[]> = {
    'nutrição': ['comer', 'comida', 'alimento', 'dieta', 'nutrição', 'refeição', 'vitamina', 'proteína', 'carboidrato', 'receita'],
    'exercícios': ['exercício', 'treino', 'academia', 'yoga', 'pilates', 'caminhada', 'atividade física'],
    'gravidez': ['grávida', 'gravidez', 'gestação', 'bebê', 'parto', 'semanas', 'trimestre', 'ultrassom'],
    'sintomas': ['enjoo', 'náusea', 'dor', 'cólica', 'inchaço', 'cansaço', 'tontura', 'azia'],
    'emocional': ['ansiedade', 'medo', 'triste', 'feliz', 'preocupada', 'estresse', 'chorar'],
    'amamentação': ['amamentar', 'amamentação', 'leite', 'mama', 'peito'],
    'sono': ['dormir', 'sono', 'insônia', 'descanso', 'cansada'],
  }
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(kw => lowerMsg.includes(kw))) topics.push(topic)
  }
  return topics
}

function buildSystemPrompt(
  userName: string, userPhase: string, gestationWeek: number | undefined,
  searchContext: string, mood: string, topics: string[]
): string {
  const phaseContext: Record<string, string> = {
    'TRYING': 'Ela está tentando engravidar. Foque em fertilidade e preparação.',
    'PREGNANT': gestationWeek 
      ? `Ela está grávida de ${gestationWeek} semanas. Dê informações específicas para esse período.`
      : 'Ela está grávida.',
    'POSTPARTUM': 'Ela está no pós-parto. Foque em recuperação e amamentação.',
    'ACTIVE': 'Foque em saúde feminina e bem-estar geral.'
  }
  const moodContext = mood === 'negative' 
    ? 'A usuária parece estar passando por um momento difícil. Seja especialmente acolhedora e empática.'
    : mood === 'positive' ? 'A usuária parece estar bem! Mantenha o tom positivo.' : ''
  const topicsContext = topics.length > 0 ? `Tópicos identificados: ${topics.join(', ')}.` : ''

  return `Você é a Vita, assistente de bem-estar materno do VitaFit. Seja carinhosa, acolhedora e profissional.

CONTEXTO:
• Nome da usuária: ${userName}
• Fase: ${phaseContext[userPhase] || phaseContext['ACTIVE']}
${moodContext ? `• ${moodContext}` : ''}
${topicsContext ? `• ${topicsContext}` : ''}

REGRAS DE FORMATAÇÃO:
1. NÃO use asteriscos (*) para formatação
2. NÃO use markdown como ** ou __
3. Use emojis com moderação (1-3 por resposta)
4. Para listas, use • ou números
5. Parágrafos curtos e fáceis de ler
6. Seja direta e prática

DIRETRIZES:
• Respostas completas e úteis, entre 100-300 palavras
• Para questões médicas sérias, recomende consultar um profissional
• Sempre em português brasileiro
• Se houver informações de pesquisa, cite fontes naturalmente
${searchContext ? `\nINFORMAÇÕES DA PESQUISA:\n${searchContext}` : ''}`
}

export async function POST(request: Request) {
  try {
    const { message, history = [] } = await request.json()
    if (!message) return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 })

    let userName = 'Querida'
    let userPhase = 'ACTIVE'
    let gestationWeek: number | undefined

    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: userData } = await supabase
          .from('users').select('name, phase, last_menstrual_date').eq('id', user.id).single()
        if (userData) {
          userName = userData.name || 'Querida'
          userPhase = userData.phase || 'ACTIVE'
          if (userPhase === 'PREGNANT' && userData.last_menstrual_date) {
            const dum = new Date(userData.last_menstrual_date)
            gestationWeek = Math.floor((new Date().getTime() - dum.getTime()) / (1000 * 60 * 60 * 24 * 7))
          }
        }
      }
    } catch (dbError) { console.warn('Erro ao buscar usuário:', dbError) }

    const topics = detectTopics(message)
    const mood = detectMood(message)

    let searchContext = ''
    if (shouldSearchWeb(message)) {
      try {
        const results = await searchWithSerper(message)
        if (results) searchContext = results
      } catch (e) { console.warn('Erro pesquisa:', e) }
    }

    const systemPrompt = buildSystemPrompt(userName, userPhase, gestationWeek, searchContext, mood, topics)
    const chatHistory = history.slice(-10).map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }))

    // ===== 1. GROQ (Llama 3.3 70B) =====
    const groqKey = process.env.GROQ_API_KEY
    if (groqKey) {
      try {
        console.log('🚀 Tentando Groq...')
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'system', content: systemPrompt }, ...chatHistory, { role: 'user', content: message }],
            temperature: 0.7, max_tokens: 1024, top_p: 0.9,
          })
        })
        if (response.ok) {
          const data = await response.json()
          const text = data.choices?.[0]?.message?.content
          if (text) {
            console.log('✅ Groq respondeu!')
            return NextResponse.json({ response: cleanResponse(text), provider: 'groq' })
          }
        } else { console.warn(`❌ Groq ${response.status}`) }
      } catch (e) { console.warn('❌ Groq falhou:', e) }
    }

    // ===== 2. GEMINI 2.0 =====
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (geminiKey) {
      try {
        console.log('🤖 Tentando Gemini...')
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-goog-api-key': geminiKey },
          body: JSON.stringify({
            contents: [
              ...chatHistory.map((msg: { role: string; content: string }) => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
              })),
              { role: 'user', parts: [{ text: `${systemPrompt}\n\nMensagem: ${message}` }] }
            ],
            generationConfig: { temperature: 0.85, maxOutputTokens: 4096, topP: 0.95 },
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
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text
          if (text) {
            console.log('✅ Gemini respondeu!')
            return NextResponse.json({ response: cleanResponse(text), provider: 'gemini' })
          }
        } else { console.warn(`❌ Gemini ${response.status}`) }
      } catch (e) { console.warn('❌ Gemini falhou:', e) }
    }

    // ===== 3. HUGGING FACE =====
    const hfToken = process.env.HUGGINGFACE_API_KEY
    if (hfToken) {
      try {
        console.log('🤗 Tentando HuggingFace...')
        const response = await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${hfToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inputs: `<s>[INST] ${systemPrompt}\n\nMensagem: ${message} [/INST]`,
            parameters: { max_new_tokens: 500, temperature: 0.7, return_full_text: false }
          })
        })
        if (response.ok) {
          const data = await response.json()
          const text = data[0]?.generated_text
          if (text) {
            console.log('✅ HuggingFace respondeu!')
            return NextResponse.json({ response: cleanResponse(text), provider: 'huggingface' })
          }
        }
      } catch (e) { console.warn('❌ HF falhou:', e) }
    }

    // ===== 4. FALLBACK LOCAL =====
    console.log('⚠️ Usando resposta local')
    return NextResponse.json({ 
      response: generateLocalResponse(message, userName, userPhase, gestationWeek, searchContext, mood),
      provider: 'local'
    })

  } catch (error) {
    console.error('Erro no chat:', error)
    return NextResponse.json({
      response: 'Desculpe, estou com dificuldades técnicas. Pode tentar novamente? 💜',
      provider: 'error'
    })
  }
}

function detectMood(message: string): string {
  const l = message.toLowerCase()
  if (['triste', 'medo', 'ansiedade', 'dor', 'ruim', 'angústia', 'deprimida', 'chorar', 'nervosa', 'preocupada', 'exausta', 'sozinha'].some(w => l.includes(w))) return 'negative'
  if (['feliz', 'alegre', 'ótimo', 'maravilhosa', 'bem', 'animada', 'contente', 'amor'].some(w => l.includes(w))) return 'positive'
  return 'neutral'
}

function shouldSearchWeb(message: string): boolean {
  const keywords = ['pesquisa', 'pesquisar', 'busca', 'buscar', 'como fazer', 'receita de', 'o que é', 'qual', 'quais', 'dicas', 'recomendações', 'melhores', 'é seguro', 'faz mal']
  const l = message.toLowerCase()
  return keywords.some(k => l.includes(k)) || (message.includes('?') && message.length > 15)
}

async function searchWithSerper(query: string): Promise<string | null> {
  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: `${query} maternidade gestação Brasil`, gl: 'br', hl: 'pt-br', num: 5 })
    })
    if (!response.ok) return null
    const data = await response.json()
    let results = ''
    if (data.knowledgeGraph) results += `${data.knowledgeGraph.title || ''}: ${data.knowledgeGraph.description || ''}\n`
    if (data.organic?.length > 0) {
      results += '\nFontes:\n'
      data.organic.slice(0, 3).forEach((item: { title: string; snippet: string; link: string }, i: number) => {
        results += `${i + 1}. ${item.title}: ${item.snippet} (${item.link})\n`
      })
    }
    return results || null
  } catch { return null }
}

function generateLocalResponse(message: string, userName: string, userPhase: string, gestationWeek: number | undefined, searchContext: string, mood: string): string {
  const l = message.toLowerCase()
  const g = mood === 'negative' ? `Oi ${userName}! 💜 Estou aqui com você.` : `Olá, ${userName}! 💜`

  if (l.match(/^(oi|olá|ola|hey|eai|e ai|bom dia|boa tarde|boa noite|opa|tudo bem)/)) {
    return `${g} Que bom te ver! Como posso te ajudar hoje?\n\n• Nutrição e alimentação\n• Exercícios seguros\n• Dúvidas sobre gravidez\n• Bem-estar e autocuidado\n\nO que você gostaria de saber?`
  }
  
  if (l.match(/(o que você faz|o que vc faz|pode fazer|suas funções|quem é você)/)) {
    return `${g} Sou a Vita, sua assistente de bem-estar materno! 😊\n\n🍎 Nutrição → alimentação para cada fase\n🏃‍♀️ Exercícios → atividades seguras\n🤰 Gravidez → informações por trimestre\n👶 Pós-parto → cuidados e amamentação\n💭 Apoio → estou aqui para ouvir\n\nÉ só perguntar! 💜`
  }

  if (l.match(/(ácido fólico|folico|folato)/)) {
    return `${userName}, o ácido fólico é super importante! 💚\n\n🥬 Vegetais → espinafre, couve, brócolis\n🫘 Leguminosas → feijão, lentilha, grão-de-bico\n🍊 Frutas → laranja, abacate, morango\n🥚 Outros → ovos, gérmen de trigo\n\nRecomendação: 400-600mcg/dia.${userPhase === 'PREGNANT' ? ' Seu médico pode indicar suplementação.' : ''} 💜`
  }

  if (l.match(/(comer|alimentação|comida|alimento|dieta|nutrição|café|almoço|jantar|lanche)/)) {
    if (userPhase === 'PREGNANT') {
      return `${userName}, na gestação${gestationWeek ? ` (${gestationWeek} semanas! 🤰)` : ''} a alimentação é fundamental!\n\n🥬 Ácido fólico → vegetais verde-escuros\n🥛 Cálcio → leite, iogurte, queijos\n🥩 Ferro → carnes magras, feijão\n🐟 Ômega-3 → sardinha, salmão (cozidos)\n💧 Água → mínimo 2L/dia\n\n⚠️ Evite: álcool, peixes crus, cafeína em excesso\n\nQuer um cardápio específico? 💜`
    }
    return `${userName}, para alimentação saudável:\n\n🥗 Variedade de cores no prato\n🥬 5+ porções de vegetais/dia\n🍎 3 frutas diárias\n💧 2L de água/dia\n🥩 Proteínas variadas\n🌾 Fibras e integrais\n\nPosso dar dicas específicas! 💜`
  }

  if (l.match(/(exercício|treino|academia|yoga|pilates|caminhada|atividade física|malhar)/)) {
    if (userPhase === 'PREGNANT') {
      return `${userName}, exercícios na gestação são ótimos! 🏃‍♀️\n\n✅ Recomendados:\n• Caminhada → 30 min/dia\n• Yoga prenatal\n• Pilates adaptado\n• Natação\n• Alongamentos\n\n⚠️ Evite: esportes de contato, risco de queda\n\nPare se sentir: tontura, sangramento, contrações.\nConsulte seu médico! 💜`
    }
    return `${userName}, que ótimo se exercitar! 🏃‍♀️\n\n• Caminhada → 30-40 min, 5x/semana\n• Yoga → flexibilidade e relaxamento\n• Pilates → fortalecimento\n• Musculação → com orientação\n• Natação → condicionamento\n\nComece devagar e aumente gradualmente! 💜`
  }

  if (l.match(/(dormir|sono|insônia|descanso|cansada|exausta)/)) {
    return `${userName}, o sono é fundamental! 😴\n\n• Horários regulares\n• Sem telas 1h antes\n• Ambiente escuro e fresco\n• Chá de camomila ou maracujá\n${userPhase === 'PREGNANT' ? '• Durma de lado (esquerdo)\n• Almofada entre as pernas' : '• Atividade física regular\n• Sem cafeína após 14h'}\n\nSe persistir, converse com seu médico! 💜`
  }

  if (l.match(/(ansiedade|ansiosa|medo|triste|deprimida|chorar|estresse|nervosa|preocupada)/)) {
    return `${userName}, seus sentimentos são válidos. 💜\n\n🧘 Respiração → inspire 4s, segure 4s, expire 6s\n🚶 Caminhada ao ar livre\n✍️ Anote seus sentimentos\n🫂 Converse com alguém de confiança\n🎵 Sons relaxantes\n🛁 Tempo para você\n\nSe persistir, considere um psicólogo. Pedir ajuda é força! 💜`
  }

  if (l.match(/(enjoo|enjoada|náusea|vômito|azia)/)) {
    return `${userName}, vamos aliviar isso! 🍋\n\n• Coma pouco e frequente (2 em 2h)\n• Biscoito de água e sal ao acordar\n• Gengibre: chá, bala ou cristalizado\n• Limão: cheirar ou água com gotas\n• Evite cheiros fortes e frituras\n• Picolé de frutas ajuda\n\nSe muito intenso com perda de peso, procure o médico! 💜`
  }

  if (searchContext) return `${g} Encontrei informações:\n\n${searchContext}\n\nPosso ajudar mais? 💜`
  
  return `${g}\n\nPosso te ajudar com:\n• Nutrição e alimentação\n• Exercícios e bem-estar\n• Dúvidas sobre gravidez\n• Cuidados pós-parto\n• Apoio emocional\n\nPergunte algo específico! 😊`
}
