// Versão: 01-02-2026-v2 - Chat Premium com System Prompt Especialista
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
  const l = message.toLowerCase()
  const map: Record<string, string[]> = {
    'nutrição': ['comer', 'comida', 'alimento', 'dieta', 'nutrição', 'refeição', 'vitamina', 'proteína', 'carboidrato', 'receita', 'café', 'almoço', 'jantar', 'lanche', 'fruta', 'verdura', 'legume', 'salmão', 'ferro', 'cálcio', 'ácido fólico', 'folato', 'ômega', 'suplemento', 'cardápio', 'alimentar'],
    'exercícios': ['exercício', 'treino', 'academia', 'yoga', 'pilates', 'caminhada', 'atividade física', 'malhar', 'alongamento', 'natação', 'musculação'],
    'gravidez': ['grávida', 'gravidez', 'gestação', 'gestante', 'bebê', 'parto', 'semanas', 'trimestre', 'ultrassom', 'pré-natal', 'prenatal', 'cesariana', 'natural', 'cesárea', 'contração', 'dilatação'],
    'sintomas': ['enjoo', 'náusea', 'dor', 'cólica', 'inchaço', 'cansaço', 'tontura', 'azia', 'constipação', 'prisão de ventre', 'câimbra', 'falta de ar', 'dor de cabeça', 'vômito'],
    'emocional': ['ansiedade', 'ansiosa', 'medo', 'triste', 'tristeza', 'feliz', 'preocupada', 'estresse', 'chorar', 'depressão', 'angústia', 'nervosa', 'insegura'],
    'amamentação': ['amamentar', 'amamentação', 'leite', 'mama', 'peito', 'mamadeira', 'pega'],
    'sono': ['dormir', 'sono', 'insônia', 'descanso', 'cansada', 'exausta'],
    'bebê': ['bebê', 'recém-nascido', 'nome', 'enxoval', 'bolsa maternidade', 'fralda', 'chupeta'],
  }
  for (const [topic, keywords] of Object.entries(map)) {
    if (keywords.some(kw => l.includes(kw))) topics.push(topic)
  }
  return topics
}

function detectMood(message: string): string {
  const l = message.toLowerCase()
  if (['triste', 'medo', 'ansiedade', 'ansiosa', 'dor', 'ruim', 'angústia', 'deprimida', 'chorar', 'nervosa', 'preocupada', 'exausta', 'sozinha', 'horrível', 'péssimo', 'sofrendo', 'desanimada'].some(w => l.includes(w))) return 'negative'
  if (['feliz', 'alegre', 'ótimo', 'maravilhosa', 'bem', 'animada', 'contente', 'amor', 'incrível', 'empolgada'].some(w => l.includes(w))) return 'positive'
  return 'neutral'
}

function getTrimestreInfo(week: number): { trimestre: number; nome: string; descricao: string; tamanho: string; dicas: string } {
  if (week <= 13) {
    return {
      trimestre: 1,
      nome: '1º trimestre',
      descricao: 'fase de formação dos órgãos do bebê',
      tamanho: week <= 4 ? 'uma semente de papoula' : week <= 8 ? 'uma framboesa' : week <= 10 ? 'uma azeitona' : 'um limão pequeno',
      dicas: 'Ácido fólico é essencial agora. Coma alimentos ricos em folato (espinafre, brócolis, feijão). Se sentir enjoo, coma pouco e com frequência. Evite cafeína em excesso (máx 200mg/dia).'
    }
  }
  if (week <= 27) {
    return {
      trimestre: 2,
      nome: '2º trimestre',
      descricao: 'fase de crescimento acelerado',
      tamanho: week <= 16 ? 'um abacate' : week <= 20 ? 'uma banana' : week <= 24 ? 'um milho' : 'uma couve-flor',
      dicas: 'Foque em ferro (carnes, feijão, espinafre) e cálcio (leite, queijo, iogurte). Seu bebê está crescendo rápido e precisa desses nutrientes. Ômega-3 (sardinha, salmão) ajuda no desenvolvimento cerebral.'
    }
  }
  return {
    trimestre: 3,
    nome: '3º trimestre',
    descricao: 'fase final de preparação para o parto',
    tamanho: week <= 32 ? 'uma jaca pequena' : week <= 36 ? 'um melão' : 'uma melancia pequena',
    dicas: 'Mantenha a hidratação (mín 2,5L/dia). Coma porções menores e mais frequentes. Alimentos ricos em fibras para evitar constipação. Prepare-se com exercícios de respiração e alongamento.'
  }
}

function buildSystemPrompt(
  userName: string, userPhase: string, gestationWeek: number | undefined,
  searchContext: string, mood: string, topics: string[]
): string {
  let phaseBlock = ''
  let personalBlock = ''

  if (userPhase === 'PREGNANT' && gestationWeek) {
    const tri = getTrimestreInfo(gestationWeek)
    phaseBlock = `GRAVIDEZ DA USUÁRIA:
• Semana: ${gestationWeek} de 40 (${tri.nome} - ${tri.descricao})
• O bebê tem o tamanho de ${tri.tamanho}
• Prioridades nutricionais: ${tri.dicas}
• Faltam aproximadamente ${40 - gestationWeek} semanas para o parto`

    personalBlock = `COMO PERSONALIZAR:
• Sempre mencione "com ${gestationWeek} semanas" quando der conselhos sobre gravidez
• Compare o tamanho do bebê com frutas/objetos para criar conexão emocional
• Dê dicas específicas para o ${tri.nome}, não genéricas
• Se falar de exercícios, adapte para ${tri.trimestre === 3 ? 'o terceiro trimestre (mais leves)' : tri.trimestre === 2 ? 'o segundo trimestre (é a melhor fase!)' : 'o primeiro trimestre (com cuidado por causa de enjoos)'}
• Se falar de alimentação, foque nos nutrientes prioritários dessa fase`
  } else if (userPhase === 'PREGNANT') {
    phaseBlock = 'A usuária está grávida mas não informou a semana. Pergunte gentilmente em que semana ela está para personalizar as dicas.'
  } else if (userPhase === 'TRYING') {
    phaseBlock = `CONTEXTO: Tentando engravidar
• Foque em fertilidade, ácido fólico (400mcg/dia), alimentação balanceada
• Oriente sobre período fértil e hábitos saudáveis
• Seja otimista e encorajadora`
  } else if (userPhase === 'POSTPARTUM') {
    phaseBlock = `CONTEXTO: Pós-parto
• Foque em recuperação, amamentação, nutrição para lactante
• Alimentos galactogênicos se amamentando
• Cuidados com saúde mental (baby blues/depressão pós-parto)
• Retorno gradual a exercícios (após liberação médica)`
  } else {
    phaseBlock = 'Fase: bem-estar geral feminino. Foque em saúde, nutrição e exercícios.'
  }

  const moodBlock = mood === 'negative'
    ? `IMPORTANTE: A usuária parece emocionalmente vulnerável. Priorize acolhimento antes de informação. Use frases como "entendo como você se sente", "é normal sentir isso", "você não está sozinha". Só depois ofereça dicas práticas.`
    : mood === 'positive'
    ? 'A usuária está com humor positivo! Celebre com ela e mantenha a energia.'
    : ''

  return `Você é a VITA, assistente especialista em saúde materna e bem-estar feminino do app VitaFit. Você combina conhecimento de nutricionista, enfermeira obstétrica e psicóloga perinatal em uma personalidade calorosa e acessível.

PERSONALIDADE:
• Carinhosa mas profissional - como uma amiga enfermeira
• Usa linguagem simples, sem jargão médico desnecessário
• Empática e acolhedora, nunca julgadora
• Prática e direta - sempre dá dicas acionáveis
• Fala como brasileira natural, sem parecer robótica

INFORMAÇÕES DA USUÁRIA:
• Nome: ${userName}
${phaseBlock}
${personalBlock}
${moodBlock ? `\n${moodBlock}` : ''}
${topics.length > 0 ? `\nTópicos detectados: ${topics.join(', ')}` : ''}

REGRAS DE RESPOSTA:
1. PERSONALIZAÇÃO: Sempre use o nome "${userName}" e dados específicos da fase dela
2. ESTRUTURA: Use parágrafos curtos (2-3 linhas). Se listar, use • ou números
3. DICAS PRÁTICAS: Sempre inclua pelo menos 1 dica que ela possa aplicar HOJE
4. FOLLOW-UP: Termine com uma pergunta de acompanhamento natural para manter a conversa
5. EMOJIS: Use 2-4 emojis por resposta, distribuídos naturalmente (não no início de cada frase)
6. COMPRIMENTO: Entre 150-350 palavras. Nem muito curta nem um artigo
7. NÃO USE: asteriscos (*), markdown, hashtags (#), negrito ou itálico
8. SEGURANÇA: Para questões médicas sérias, recomende profissional MAS sempre dê informação útil antes
9. FONTES: Se usar dados de pesquisa, integre naturalmente na conversa (não cite URLs)
10. TOM: Imagine que está mandando áudio no WhatsApp para uma amiga grávida - natural e caloroso

EXEMPLOS DE TOM CORRETO:
Bom: "${userName}, com ${gestationWeek || 'X'} semanas seu bebê já está do tamanho de uma manga! 🥭 Nessa fase, o ferro é super importante..."
Ruim: "Olá! A alimentação na gestação é importante. Recomenda-se o consumo de proteínas..."

Bom: "Ah, essa azia do terceiro trimestre é bem chatinha mesmo 😅 Mas tenho umas dicas que funcionam super bem..."
Ruim: "A azia é um sintoma comum na gravidez. Recomenda-se evitar alimentos ácidos."
${searchContext ? `\nINFORMAÇÕES PESQUISADAS (integre naturalmente, não cite links):\n${searchContext}` : ''}`
}

function shouldSearchWeb(message: string): boolean {
  const keywords = ['pesquisa', 'pesquisar', 'busca', 'buscar', 'como fazer', 'receita de', 'o que é', 'qual', 'quais', 'dicas', 'recomendações', 'melhores', 'é seguro', 'pode', 'faz mal', 'pode comer', 'posso', 'é normal']
  const l = message.toLowerCase()
  return keywords.some(k => l.includes(k)) || (message.includes('?') && message.length > 15)
}

async function searchWithSerper(query: string): Promise<string | null> {
  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: `${query} maternidade gestação saúde mulher`, gl: 'br', hl: 'pt-br', num: 5 })
    })
    if (!response.ok) return null
    const data = await response.json()
    let results = ''
    if (data.knowledgeGraph) results += `${data.knowledgeGraph.title || ''}: ${data.knowledgeGraph.description || ''}\n`
    if (data.organic?.length > 0) {
      data.organic.slice(0, 3).forEach((item: { title: string; snippet: string }, i: number) => {
        results += `${i + 1}. ${item.title}: ${item.snippet}\n`
      })
    }
    return results || null
  } catch { return null }
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
            messages: [
              { role: 'system', content: systemPrompt },
              ...chatHistory,
              { role: 'user', content: message }
            ],
            temperature: 0.75,
            max_tokens: 1200,
            top_p: 0.9,
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
        const geminiHistory = chatHistory.map((msg: { role: string; content: string }) => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }))

        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-goog-api-key': geminiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [
              ...geminiHistory,
              { role: 'user', parts: [{ text: message }] }
            ],
            generationConfig: { temperature: 0.8, maxOutputTokens: 2048, topP: 0.92 },
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
            inputs: `<s>[INST] ${systemPrompt}\n\nMensagem da usuária: ${message} [/INST]`,
            parameters: { max_new_tokens: 600, temperature: 0.7, return_full_text: false }
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

function generateLocalResponse(message: string, userName: string, userPhase: string, gestationWeek: number | undefined, searchContext: string, mood: string): string {
  const l = message.toLowerCase()
  const isPregnant = userPhase === 'PREGNANT'
  const weekText = gestationWeek ? `com ${gestationWeek} semanas` : ''
  const tri = gestationWeek ? getTrimestreInfo(gestationWeek) : null

  // Saudação
  if (l.match(/^(oi|olá|ola|hey|eai|e ai|bom dia|boa tarde|boa noite|opa|tudo bem|oi vita)/)) {
    if (isPregnant && tri) {
      return `Oi, ${userName}! 😊 Que bom te ver por aqui!\n\n${weekText} seu bebê já está do tamanho de ${tri.tamanho}! Que emoção, né? 🤰\n\nPosso te ajudar com várias coisas:\n\n🍎 Alimentação ideal pro ${tri.nome}\n🏃‍♀️ Exercícios seguros pra essa fase\n💊 Vitaminas e suplementos\n😴 Dicas de sono e conforto\n💭 Apoio emocional\n\nSobre o que quer conversar hoje?`
    }
    return `Oi, ${userName}! 😊 Que bom te ver!\n\nSou a Vita, sua companheira de bem-estar aqui no VitaFit. Posso te ajudar com:\n\n🍎 Nutrição e receitas saudáveis\n🏃‍♀️ Exercícios e atividade física\n🤰 Tudo sobre gravidez\n💭 Bem-estar emocional\n\nMe conta, como posso te ajudar hoje?`
  }

  // Alimentação
  if (l.match(/(comer|alimentação|comida|alimento|dieta|nutrição|café|almoço|jantar|lanche|cardápio|o que posso comer)/)) {
    if (isPregnant && tri) {
      const nutrientes: Record<number, string> = {
        1: `No ${tri.nome}, o ácido fólico é o protagonista! 💚 Ele protege o tubo neural do bebê.\n\nAlimentos campeões agora:\n• Espinafre e brócolis (folato natural)\n• Feijão e lentilha (ferro + proteína)\n• Ovos (colina, ótimo pro cérebro do bebê)\n• Frutas cítricas (vitamina C ajuda absorver ferro)\n\nDica pra hoje: que tal um omelete de espinafre no jantar? Simples, rápido e super nutritivo! 🍳`,
        2: `No ${tri.nome}, ${weekText}, o bebê está crescendo rápido e precisa de bastante nutriente! 💪\n\nFoque em:\n• Ferro: carnes vermelhas magras, feijão preto, espinafre\n• Cálcio: leite, iogurte natural, queijo branco\n• Ômega-3: sardinha, salmão (sempre bem cozidos!)\n• Proteínas: frango, peixe, ovo, tofu\n\nDica prática: intercale proteína animal e vegetal durante a semana. Segunda sem carne com lentilha, por exemplo! 🥗`,
        3: `No ${tri.nome}, ${weekText}, o bebê está ganhando peso e se preparando pra chegar! 🎉\n\nPriorize agora:\n• Porções menores e mais frequentes (o estômago fica apertado)\n• Fibras: aveia, chia, frutas com casca (evita constipação)\n• Proteína: essencial pro ganho de peso saudável do bebê\n• Água: mínimo 2,5L por dia\n• Tâmaras: estudos mostram que ajudam no trabalho de parto!\n\nDica pra hoje: um iogurte com granola e banana no lanche da tarde é perfeito pra essa fase 🍌`
      }
      return `${userName}, ótima pergunta! ${weekText} a alimentação faz toda diferença pro seu bebê (que já está do tamanho de ${tri.tamanho}! 🥰)\n\n${nutrientes[tri.trimestre]}\n\nQuer que eu monte um cardápio completo pro seu dia?`
    }

    return `${userName}, vamos montar uma alimentação mais saudável! 🥗\n\nRegra de ouro: prato colorido = prato nutritivo!\n\n• Metade do prato: salada e legumes variados\n• 1/4 do prato: proteína (frango, peixe, ovo, tofu)\n• 1/4 do prato: carboidrato integral (arroz integral, batata doce)\n• Uma fruta de sobremesa\n\nLanches inteligentes:\n• Iogurte com frutas\n• Mix de castanhas (30g)\n• Banana com pasta de amendoim\n\nDica rápida pra hoje: troque o arroz branco pelo integral e adicione uma cor nova no prato que você não costuma comer 🌈\n\nQuer dicas mais específicas pra alguma refeição?`
  }

  // Exercícios
  if (l.match(/(exercício|treino|academia|yoga|pilates|caminhada|atividade|malhar|alongamento)/)) {
    if (isPregnant && tri) {
      const exPorTri: Record<number, string> = {
        1: `No ${tri.nome}, pode rolar enjoo, então exercícios leves são os melhores:\n\n• Caminhada de 20-30 min (o melhor exercício!)\n• Yoga suave (evite posições invertidas)\n• Alongamento matinal de 10 min\n• Natação (alivia enjoo pra muitas mamães!)\n\nDica: se sentir enjoo, coma um biscoitinho 30 min antes de se exercitar`,
        2: `O ${tri.nome} é a MELHOR fase pra exercícios! 🎉 Mais energia e menos enjoo:\n\n• Caminhada de 30-40 min, 5x/semana\n• Yoga prenatal (ótimo pra flexibilidade)\n• Pilates com bola (fortalece o assoalho pélvico)\n• Musculação leve (com orientação profissional)\n• Natação e hidroginástica\n\nDica: esse é o momento de fortalecer pernas e assoalho pélvico pro parto!`,
        3: `No ${tri.nome}, ${weekText}, o foco é conforto e preparação:\n\n• Caminhada leve de 20 min\n• Exercícios de respiração (4-7-8: inspira 4s, segura 7s, expira 8s)\n• Bola suíça (alivia dor lombar!)\n• Yoga restaurativa\n• Agachamento na parede (prepara pro parto)\n\nDica: a bola suíça é sua melhor amiga agora! Sente nela pra ver TV 😄`
      }
      return `${userName}, que ótimo que quer se movimentar ${weekText}! 🏃‍♀️\n\n${exPorTri[tri.trimestre]}\n\n⚠️ Pare imediatamente se: tontura, sangramento, contrações antes da hora, dor forte.\n\nJá conversa com seu obstetra sobre exercícios?`
    }

    return `${userName}, bora se movimentar! 💪\n\nPra começar ou manter uma rotina:\n\n• Caminhada: 30 min/dia, o básico que funciona\n• Yoga: flexibilidade + calma mental\n• Pilates: core forte e postura\n• Musculação: com orientação profissional\n• Dança: divertido e queima caloria\n\nDica pra começar: 15 min por dia já faz diferença! Melhor pouco todo dia do que muito de vez em quando 😊\n\nQual tipo de exercício te interessa mais?`
  }

  // Enjoo/náusea
  if (l.match(/(enjoo|enjoada|náusea|vômito|azia)/)) {
    return `${userName}, eu sei que isso é bem desconfortável 😔\n\nDicas que realmente funcionam:\n\n🍋 Gengibre: chá, bala ou cristalizado (o mais eficaz!)\n🍪 Biscoito de água e sal antes de levantar da cama\n🧊 Picolé de frutas ácidas (limão, maracujá)\n🍌 Banana e torrada seca ao acordar\n🫗 Beba líquidos entre as refeições, não durante\n⏰ Coma de 2 em 2 horas, pouca quantidade\n\nO que NÃO fazer:\n• Ficar muito tempo sem comer\n• Cheiros fortes (cozinha, perfumes)\n• Deitar logo após comer\n\nSe estiver vomitando mais de 3x por dia ou perdendo peso, avise seu médico, tá? Pode ser hiperêmese e precisa de tratamento 💜\n\nComo está sendo o enjoo? É mais de manhã ou o dia todo?`
  }

  // Emocional
  if (l.match(/(ansiedade|ansiosa|medo|triste|deprimida|chorar|estresse|nervosa|preocupada|insegura|sozinha)/)) {
    return `${userName}, primeiro: obrigada por confiar em mim pra falar sobre isso 💜\n\nO que você está sentindo é completamente válido. ${isPregnant ? 'A gravidez traz uma montanha-russa de hormônios e emoções, e tudo bem não estar bem o tempo todo.' : 'Todas nós passamos por momentos difíceis, e reconhecer isso já é um passo lindo.'}\n\nAlgumas coisas que podem ajudar agora:\n\n🧘 Respire comigo: inspire em 4 segundos, segure 4, expire em 6\n🚶 Uma caminhada curta ao ar livre (sol faz maravilhas!)\n✍️ Escreva o que sente, sem filtro\n🫂 Ligue pra alguém que te faz bem\n🎵 Uma playlist que te acalme\n🛁 Um banho morno com calma\n\nSe isso for persistente ou muito intenso, conversar com um psicólogo pode ser transformador. Pedir ajuda é um ato de coragem, não de fraqueza 💪\n\nQuer me contar mais sobre o que está sentindo?`
  }

  // Sono
  if (l.match(/(dormir|sono|insônia|descanso|cansada|exausta)/)) {
    return `${userName}, o sono é fundamental e eu entendo a frustração 😴\n\n${isPregnant ? `Com ${gestationWeek || 'algumas'} semanas, dormir bem fica mais difícil. Algumas dicas:\n\n• Durma de lado esquerdo (melhor circulação pro bebê)\n• Almofada entre as pernas e atrás das costas\n• Travesseiro de gestante faz MUITA diferença` : 'Vamos melhorar essa qualidade de sono:'}\n\n🌙 Rotina noturna:\n• Desligue telas 1h antes de dormir\n• Chá de camomila ou maracujá\n• Ambiente escuro e fresco (18-22°C)\n• Horários regulares de dormir e acordar\n\n• Evite cafeína após 14h\n• Exercício leve de manhã ajuda a dormir à noite\n• Se não dormir em 20 min, levante e faça algo calmo\n\nEstá tendo dificuldade pra pegar no sono ou acorda muito durante a noite?`
  }

  // Default com contexto de pesquisa
  if (searchContext) {
    return `${userName}, pesquisei sobre isso pra você! 😊\n\n${searchContext}\n\nEssas informações te ajudaram? Quer que eu aprofunde em algum ponto específico?`
  }

  // Default genérico - mas com personalidade
  if (isPregnant && tri) {
    return `${userName}, boa pergunta! 😊\n\n${weekText} você está no ${tri.nome} e seu bebê tem o tamanho de ${tri.tamanho}! 🤰\n\nPosso te ajudar com muitas coisas:\n\n🍎 Alimentação ideal pra essa fase\n🏃‍♀️ Exercícios seguros ${weekText}\n💊 Vitaminas e suplementos\n😴 Dicas de sono e conforto\n🤢 Lidar com sintomas\n💭 Apoio emocional\n\nMe conta com mais detalhes o que quer saber e eu te dou uma resposta bem completa!`
  }

  return `${userName}, estou aqui pra te ajudar! 😊\n\nPosso conversar sobre:\n\n🍎 Alimentação e nutrição\n🏃‍♀️ Exercícios e bem-estar\n🤰 Gravidez e maternidade\n👶 Cuidados com o bebê\n💭 Saúde emocional\n\nMe conta com mais detalhes o que quer saber!`
}
