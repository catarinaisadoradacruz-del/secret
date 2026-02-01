// Versão: 01-02-2026-v1 - Multi-provider (Gemini → HuggingFace → Groq → Local)
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SERPER_API_KEY = '2d09dbaf10aadee46c34bfa7bc41f507d75d707a'

// Limpar markdown e formatar texto
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
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Detectar tópicos
function detectTopics(message: string): string[] {
  const topics: string[] = []
  const lower = message.toLowerCase()

  const map: Record<string, string[]> = {
    'nutrição': ['comer', 'comida', 'alimento', 'dieta', 'nutrição', 'refeição', 'vitamina', 'proteína', 'carboidrato', 'receita', 'fruta', 'verdura', 'legume'],
    'exercícios': ['exercício', 'treino', 'academia', 'yoga', 'pilates', 'caminhada', 'atividade física', 'alongamento', 'musculação'],
    'gravidez': ['grávida', 'gravidez', 'gestação', 'bebê', 'parto', 'semanas', 'trimestre', 'ultrassom', 'pré-natal', 'gestante'],
    'sintomas': ['enjoo', 'náusea', 'dor', 'cólica', 'inchaço', 'cansaço', 'tontura', 'azia', 'dor de cabeça', 'febre'],
    'emocional': ['ansiedade', 'medo', 'triste', 'feliz', 'preocupada', 'estresse', 'chorar', 'humor', 'depressão'],
    'amamentação': ['amamentar', 'amamentação', 'leite', 'mama', 'peito', 'mamadeira'],
    'sono': ['dormir', 'sono', 'insônia', 'descanso', 'cansada', 'noite'],
    'suplementação': ['ácido fólico', 'ferro', 'cálcio', 'vitamina', 'suplemento', 'omega', 'ômega'],
    'hidratação': ['água', 'líquido', 'hidrat', 'beber'],
    'peso': ['peso', 'emagrecer', 'engordar', 'balança', 'ganho de peso', 'kilo', 'quilo'],
  }

  for (const [topic, keywords] of Object.entries(map)) {
    if (keywords.some(kw => lower.includes(kw))) topics.push(topic)
  }

  return topics
}

// Construir prompt do sistema
function buildSystemPrompt(
  userName: string,
  userPhase: string,
  gestationWeek: number | undefined,
  searchContext: string,
  mood: string,
  topics: string[]
): string {
  const phaseMap: Record<string, string> = {
    'TRYING': 'Ela está tentando engravidar. Foque em fertilidade, saúde reprodutiva e preparação.',
    'PREGNANT': gestationWeek
      ? `Ela está grávida de ${gestationWeek} semanas (${Math.floor(gestationWeek / 4)}º mês, ${gestationWeek <= 12 ? '1º trimestre' : gestationWeek <= 28 ? '2º trimestre' : '3º trimestre'}). Dê informações específicas para esse período.`
      : 'Ela está grávida.',
    'POSTPARTUM': 'Ela está no pós-parto. Foque em recuperação, amamentação e cuidados com o bebê.',
    'ACTIVE': 'Foque em saúde feminina e bem-estar geral.'
  }

  const moodNote = mood === 'negative'
    ? '\n• A usuária parece estar passando por um momento difícil. Seja especialmente acolhedora e empática.'
    : ''

  const topicsNote = topics.length > 0
    ? `\n• Tópicos detectados: ${topics.join(', ')}`
    : ''

  return `Você é a Vita, assistente virtual de bem-estar materno do app VitaFit. Você é carinhosa, acolhedora, informativa e prática.

CONTEXTO DA USUÁRIA:
• Nome: ${userName}
• Fase: ${phaseMap[userPhase] || phaseMap['ACTIVE']}${moodNote}${topicsNote}

REGRAS DE FORMATAÇÃO (MUITO IMPORTANTE):
1. NÃO use asteriscos (*) ou markdown
2. NÃO use ** ou __ para formatação  
3. Use emojis com moderação (máximo 3-4 por resposta)
4. Para listas, use • no início
5. Mantenha parágrafos curtos (2-3 linhas)
6. Seja direta e prática
7. Limite respostas a 200-300 palavras

DIRETRIZES:
• Sempre responda em português brasileiro
• Para questões médicas sérias, recomende consultar o médico/obstetra
• Dê respostas completas mas concisas
• Cite fontes naturalmente quando usar informações de pesquisa
• Trate a usuária pelo nome quando apropriado
${searchContext ? `\nINFORMAÇÕES DE PESQUISA:\n${searchContext}` : ''}`
}

// PROVIDER 1: Gemini 2.0
async function tryGemini(systemPrompt: string, userMessage: string, history: any[]): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!key) return null

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-goog-api-key': key },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: systemPrompt }] },
          { role: 'model', parts: [{ text: 'Entendido! Sou a Vita, assistente de bem-estar materno. Vou seguir todas as regras de formatação.' }] },
          ...history.slice(-6).map((msg: any) => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
          })),
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        generationConfig: { temperature: 0.8, maxOutputTokens: 2048, topP: 0.9 },
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
        console.log('✅ Gemini respondeu')
        return cleanResponse(text)
      }
    } else {
      console.warn(`❌ Gemini ${response.status}`)
    }
  } catch (e) {
    console.warn('❌ Gemini falhou:', e)
  }
  return null
}

// PROVIDER 2: HuggingFace (novo endpoint router)
async function tryHuggingFace(systemPrompt: string, userMessage: string): Promise<string | null> {
  const token = process.env.HUGGINGFACE_API_KEY
  if (!token) return null

  // Tentar múltiplos modelos
  const models = [
    'mistralai/Mistral-7B-Instruct-v0.3',
    'mistralai/Mistral-7B-Instruct-v0.2',
    'HuggingFaceH4/zephyr-7b-beta',
  ]

  for (const model of models) {
    try {
      const response = await fetch(`https://router.huggingface.co/hf-inference/models/${model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: `<s>[INST] ${systemPrompt}\n\nPergunta: ${userMessage} [/INST]`,
          parameters: {
            max_new_tokens: 600,
            temperature: 0.7,
            return_full_text: false
          }
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const text = data[0]?.generated_text
        if (text && text.length > 20) {
          console.log(`✅ HuggingFace (${model}) respondeu`)
          return cleanResponse(text)
        }
      }
    } catch (e) {
      console.warn(`❌ HF ${model} falhou`)
    }
  }

  return null
}

// PROVIDER 3: Groq (gratuito, rápido)
async function tryGroq(systemPrompt: string, userMessage: string, history: any[]): Promise<string | null> {
  const key = process.env.GROQ_API_KEY
  if (!key) return null

  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6).map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: userMessage }
    ]

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      const text = data.choices?.[0]?.message?.content
      if (text) {
        console.log('✅ Groq respondeu')
        return cleanResponse(text)
      }
    }
  } catch (e) {
    console.warn('❌ Groq falhou:', e)
  }
  return null
}

// Pesquisa Serper
async function searchWithSerper(query: string): Promise<string | null> {
  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: `${query} maternidade gestação saúde mulher Brasil`,
        gl: 'br', hl: 'pt-br', num: 5
      })
    })

    if (!response.ok) return null

    const data = await response.json()
    let results = ''
    
    if (data.knowledgeGraph) {
      results += `${data.knowledgeGraph.title || ''}: ${data.knowledgeGraph.description || ''}\n`
    }
    
    if (data.organic?.length > 0) {
      results += '\nFontes:\n'
      data.organic.slice(0, 3).forEach((item: any, i: number) => {
        results += `${i + 1}. ${item.title}: ${item.snippet} (${item.link})\n`
      })
    }
    
    return results || null
  } catch { return null }
}

function shouldSearchWeb(message: string): boolean {
  const keywords = [
    'pesquisa', 'pesquisar', 'busca', 'buscar', 'procura',
    'notícia', 'novidade', 'atualização', 'recente',
    'como fazer', 'receita de', 'o que é', 'qual', 'quais',
    'dicas', 'sugestões', 'recomendações', 'melhores',
    'pode', 'posso', 'é seguro', 'faz mal', 'quanto'
  ]
  
  const lower = message.toLowerCase()
  return keywords.some(kw => lower.includes(kw)) || (message.includes('?') && message.length > 15)
}

// FALLBACK LOCAL INTELIGENTE - Respostas muito mais completas
function generateLocalResponse(
  message: string, 
  userName: string, 
  userPhase: string, 
  gestationWeek: number | undefined,
  searchContext: string,
): string {
  const lower = message.toLowerCase()
  const name = userName || 'Querida'
  const isPregnant = userPhase === 'PREGNANT'
  const isPostpartum = userPhase === 'POSTPARTUM'
  const isTrying = userPhase === 'TRYING'

  // Saudações
  if (lower.match(/^(oi|olá|ola|hey|eai|e ai|bom dia|boa tarde|boa noite|hello|hi)\b/)) {
    if (isPregnant && gestationWeek) {
      return `Olá, ${name}! 💜 Que bom te ver por aqui! Você está com ${gestationWeek} semanas, ${gestationWeek <= 12 ? 'no comecinho dessa jornada linda' : gestationWeek <= 28 ? 'no segundo trimestre - fase maravilhosa!' : 'na reta final! Quase lá!'}. Como posso te ajudar hoje?\n\nPosso falar sobre:\n• Nutrição e alimentação para sua fase\n• Exercícios seguros\n• Desenvolvimento do bebê\n• Sintomas e desconfortos\n• Bem-estar emocional\n\nO que você gostaria de saber? 😊`
    }
    return `Olá, ${name}! 💜 Que bom te ver por aqui! Sou a Vita, sua assistente de bem-estar. Como posso te ajudar hoje?\n\nPosso falar sobre:\n• Nutrição e alimentação saudável\n• Exercícios e bem-estar físico\n• Dúvidas sobre gravidez e maternidade\n• Cuidados com saúde e autocuidado\n\nO que você gostaria de saber? 😊`
  }

  // Funções da Vita
  if (lower.match(/(o que você faz|o que vc faz|o que consegue|pode fazer|suas funções|me ajud|como funciona)/)) {
    return `Sou a Vita, sua assistente de bem-estar materno do VitaFit! 💜\n\nPosso te ajudar com:\n\n🍎 Nutrição\nDicas de alimentação para cada fase, alimentos recomendados, o que evitar e receitas saudáveis.\n\n🏃‍♀️ Exercícios\nAtividades seguras, treinos adaptados e dicas de bem-estar físico.\n\n🤰 Gravidez\nInformações sobre cada trimestre, desenvolvimento do bebê e preparação para o parto.\n\n👶 Pós-parto\nCuidados com o bebê, amamentação e recuperação.\n\n💭 Apoio emocional\nEstou aqui para ouvir e oferecer suporte.\n\nÉ só me perguntar, ${name}! 😊`
  }

  // Ácido fólico
  if (lower.match(/(ácido fólico|folico|folato)/)) {
    return `${name}, o ácido fólico é essencial${isPregnant ? ' na gravidez' : isTrying ? ' para quem está tentando engravidar' : ''}! 💚\n\nAlimentos ricos em ácido fólico:\n\n🥬 Vegetais verde-escuros: espinafre, couve, brócolis, rúcula, agrião\n🫘 Leguminosas: feijão, lentilha, grão-de-bico, ervilha\n🍊 Frutas: laranja, abacate, mamão, morango, banana\n🥚 Outros: ovos, fígado (com moderação), gérmen de trigo\n\nA recomendação diária é de 400-600mcg. ${isPregnant ? 'Na gravidez, a suplementação é muito importante para prevenir defeitos no tubo neural do bebê.' : isTrying ? 'Comece a tomar pelo menos 3 meses antes de engravidar.' : ''}\n\nConverse com seu médico sobre a quantidade ideal! 💜`
  }

  // Alimentação/Nutrição
  if (lower.match(/(comer|alimentação|comida|alimento|dieta|nutrição|refeição|cardápio|café da manhã|almoço|jantar|lanche)/)) {
    if (isPregnant) {
      return `${name}, durante a gestação${gestationWeek ? ` (${gestationWeek} semanas)` : ''} a alimentação faz toda a diferença! 🍎\n\nNutrientes essenciais:\n\n🥬 Ácido fólico → vegetais verde-escuros, feijão, lentilha\n🥛 Cálcio → leite, iogurte, queijos, tofu\n🥩 Ferro → carnes magras, feijão, folhas escuras\n🐟 Ômega-3 → sardinha, salmão (bem cozidos)\n🍊 Vitamina C → laranja, acerola, kiwi (ajuda absorver ferro)\n💧 Água → mínimo 2 litros por dia\n\nEvite:\n• Álcool e cigarro\n• Peixes crus (sushi, sashimi)\n• Queijos não pasteurizados\n• Cafeína em excesso (máximo 200mg/dia)\n• Carnes cruas ou mal passadas\n\nDica: faça 5-6 pequenas refeições ao dia para manter energia e evitar enjoos! 💜`
    }
    if (isPostpartum) {
      return `${name}, no pós-parto a alimentação é fundamental para sua recuperação e para a amamentação! 🍎\n\nPriorize:\n\n💧 Hidratação → pelo menos 3 litros de água por dia (amamentação desidrata)\n🥩 Proteínas → carnes magras, ovos, feijão (recuperação muscular)\n🥬 Ferro → folhas escuras, beterraba (repor perdas do parto)\n🥛 Cálcio → leite, iogurte, queijos (saúde óssea)\n🐟 Ômega-3 → peixes, linhaça (bom para o leite materno)\n🍎 Fibras → frutas, verduras, grãos integrais\n\nEvite dietas restritivas agora. Seu corpo precisa de energia para se recuperar e produzir leite de qualidade. Converse com nutricionista se precisar! 💜`
    }
    return `${name}, para uma alimentação equilibrada:\n\n🍎 Frutas → 3-5 porções por dia\n🥬 Verduras e legumes → metade do prato\n🥩 Proteínas → carnes, ovos, leguminosas\n🍚 Carboidratos → integrais de preferência\n💧 Água → 2 litros por dia\n🥛 Laticínios → leite, iogurte, queijos\n\nDicas práticas:\n• Monte pratos coloridos\n• Coma de 3 em 3 horas\n• Evite ultraprocessados\n• Cozinhe mais em casa\n\nQuer que eu sugira receitas ou um cardápio? 💜`
  }

  // Exercícios
  if (lower.match(/(exercício|exercicio|treino|academia|yoga|pilates|caminhada|atividade física|malhar|correr|nadar|alongamento)/)) {
    if (isPregnant) {
      return `${name}, exercícios na gravidez são ótimos quando bem orientados! 🏃‍♀️\n\nExercícios recomendados:\n\n🚶‍♀️ Caminhada → 30 min, 3-5x/semana\n🧘 Yoga prenatal → flexibilidade e relaxamento\n🏊 Natação/Hidroginástica → baixo impacto, ótimo no 3º tri\n💪 Pilates adaptado → fortalece core e assoalho pélvico\n🧘‍♀️ Alongamentos → diariamente, alivia dores\n\nEvite:\n• Esportes de contato\n• Abdominais tradicionais\n• Exercícios deitada de barriga para cima (após 20 semanas)\n• Exercícios em temperaturas muito altas\n\nSinais para parar: sangramento, tontura, dor no peito, contrações\n\nSempre com liberação do seu obstetra! 💜`
    }
    return `${name}, atividade física é essencial para o bem-estar! 🏃‍♀️\n\nSugestões:\n\n🚶‍♀️ Caminhada → 30-40 min, 5x/semana\n🧘 Yoga → flexibilidade, equilíbrio e relaxamento\n💪 Musculação → fortalecimento, 3x/semana\n🏊 Natação → exercício completo, baixo impacto\n🚴 Bicicleta → condicionamento cardiovascular\n🧘‍♀️ Alongamento → diariamente pela manhã\n\nDicas:\n• Comece devagar e aumente gradualmente\n• Hidrate-se bem antes, durante e depois\n• Use roupas confortáveis\n• Respeite seus limites\n\nNo app VitaFit você encontra treinos completos na aba Workout! 💜`
  }

  // Sintomas gestacionais
  if (lower.match(/(enjoo|náusea|nausea|vômito|vomito|azia|mal estar|mal-estar)/)) {
    return `${name}, ${isPregnant ? 'enjoos na gravidez são muito comuns, especialmente no 1º trimestre' : 'sinto muito que esteja passando por isso'}! 🤗\n\nDicas que podem ajudar:\n\n🍪 Coma biscoito salgado antes de levantar\n🍋 Cheiro de limão ou gengibre alivia náusea\n🥤 Beba líquidos entre as refeições (não durante)\n🍌 Faça refeições pequenas e frequentes\n🧊 Picolé de frutas pode ajudar\n❄️ Alimentos frios costumam ser melhor tolerados\n\nEvite:\n• Frituras e comidas gordurosas\n• Cheiros fortes\n• Ficar muito tempo sem comer\n• Deitar logo após comer\n\n${isPregnant ? 'Se os vômitos forem muito intensos (mais de 3x/dia) ou não conseguir se hidratar, procure seu médico. Pode ser hiperêmese gravídica.' : 'Se persistir, consulte um médico.'} 💜`
  }

  // Dores
  if (lower.match(/(dor|dores|cólica|colica|câimbra|caimbra|lombar|costas|cabeça)/)) {
    if (isPregnant) {
      return `${name}, dores podem acontecer durante a gestação, mas sempre merecem atenção! 🤗\n\nDores comuns:\n\n🔹 Dor lombar → postura, peso extra, relaxina. Tente pilates e alongamentos\n🔹 Câimbras → falta de magnésio/cálcio. Coma banana, leite, água de coco\n🔹 Dor de cabeça → pode ser tensão ou pressão. Descanse e hidrate-se\n🔹 Dor pélvica → ligamentos se expandindo. Normal, mas avise o médico\n🔹 Dor abdominal leve → pode ser crescimento do útero\n\nAlívios:\n• Compressas mornas (não quentes)\n• Alongamentos suaves\n• Massagem leve\n• Descanso\n• Travesseiro entre as pernas ao dormir\n\n⚠️ Procure o médico se: dor forte, sangramento, febre, dor ao urinar 💜`
    }
    return `${name}, sinto muito que esteja com dor! 🤗\n\nAlgumas dicas gerais:\n\n• Descanse e hidrate-se bem\n• Compressas mornas podem ajudar\n• Alongamentos suaves\n• Identifique se há algum gatilho\n\nSe a dor for persistente, intensa ou acompanhada de outros sintomas, procure um profissional de saúde. Não se automedique! 💜`
  }

  // Sono
  if (lower.match(/(dormir|sono|insônia|insonia|noite|cansada|cansaço|descanso|energia)/)) {
    return `${name}, o sono é fundamental para o bem-estar! 😴\n\n${isPregnant ? 'Na gravidez, dormir bem pode ser um desafio:' : 'Dicas para melhorar o sono:'}\n\n🌙 Mantenha horários regulares para dormir e acordar\n📱 Evite telas 1h antes de dormir\n☕ Nada de cafeína após 14h\n🛁 Banho morno relaxante antes de dormir\n🧘 Técnicas de respiração ou meditação\n🛏️ Quarto escuro, fresco e silencioso\n${isPregnant ? '🤰 Durma de lado (esquerdo é ideal), com travesseiro entre as pernas\n🍌 Lanche leve antes de dormir (banana com aveia)' : '🚶 Exercício regular (mas não perto da hora de dormir)\n📖 Leitura leve antes de dormir'}\n\n${isPregnant ? 'É normal ter mais dificuldade no 3º trimestre. Se a insônia for muito forte, converse com seu médico.' : 'Se a insônia persistir por mais de 2 semanas, procure um profissional.'} 💜`
  }

  // Amamentação
  if (lower.match(/(amamentar|amamentação|leite materno|mama|peito|mamadeira|lactação)/)) {
    return `${name}, a amamentação é um momento especial! 🤱\n\nDicas importantes:\n\n🍼 Posição: bebê de frente, barriga com barriga, boca aberta pegando aréola\n⏰ Livre demanda: ofereça sempre que o bebê quiser\n💧 Hidrate-se muito (3+ litros de água por dia)\n🍎 Alimentação nutritiva e variada\n😌 Descanse quando possível\n\nProblemas comuns:\n• Rachaduras: corrija a pega, use leite materno no mamilo\n• Ingurgitamento: amamente com frequência, compressas frias entre mamadas\n• Pouco leite: amamente mais vezes, descanse, hidrate-se\n• Mastite: procure médico urgente se tiver febre e vermelhidão\n\nProcure um banco de leite ou consultora de amamentação se precisar de apoio! 💜`
  }

  // Emocional
  if (lower.match(/(triste|ansiedade|ansiosa|medo|preocupada|chorar|chorando|depressão|deprimida|estresse|estressada)/)) {
    return `${name}, obrigada por compartilhar isso comigo. 💜 Seus sentimentos são completamente válidos.\n\n${isPregnant ? 'Na gravidez, as oscilações emocionais são comuns por causa das mudanças hormonais.' : isPostpartum ? 'No pós-parto, é muito comum sentir emoções intensas. Seu corpo passou por uma grande transformação.' : ''}\n\nAlgumas coisas que podem ajudar:\n\n🌸 Converse com alguém de confiança sobre como se sente\n🚶‍♀️ Caminhe ao ar livre, mesmo que por 15 minutos\n🧘 Pratique respiração profunda: inspire 4s, segure 4s, expire 6s\n😴 Priorize o descanso\n📝 Escreva sobre seus sentimentos\n🎵 Ouça músicas que te acalmem\n\n${isPostpartum ? '⚠️ Se a tristeza durar mais de 2 semanas, se sentir incapaz de cuidar do bebê, ou tiver pensamentos ruins, procure ajuda profissional. A depressão pós-parto é tratável e pedir ajuda é um ato de força!' : '⚠️ Se a ansiedade ou tristeza estiver muito forte, converse com seu médico. Não precisa passar por isso sozinha!'}\n\nEstou aqui sempre que precisar conversar. 💜`
  }

  // Peso
  if (lower.match(/(peso|emagrecer|engordar|ganho de peso|quantos quilos|kilo|quilo|balança|imc)/)) {
    if (isPregnant) {
      return `${name}, o ganho de peso na gravidez é natural e necessário! ⚖️\n\nReferência de ganho total (depende do IMC pré-gestacional):\n\n• IMC baixo (<18.5): 12,5 a 18kg\n• IMC normal (18.5-24.9): 11,5 a 16kg\n• IMC sobrepeso (25-29.9): 7 a 11,5kg\n• IMC obesidade (>30): 5 a 9kg\n\nNo 1º trimestre: ganho mínimo (0-2kg)\nNo 2º e 3º trimestre: cerca de 0,4-0,5kg por semana\n\nDicas:\n• Foque na qualidade da alimentação, não na quantidade\n• Não faça dietas restritivas\n• Exercícios leves ajudam no controle\n• Cada corpo é diferente!\n\nSeu obstetra acompanha seu ganho de peso no pré-natal. 💜`
    }
    return `${name}, posso te ajudar com informações sobre peso! ⚖️\n\nPara um controle saudável:\n\n• Foque em hábitos, não no número da balança\n• Alimentação equilibrada (não restritiva)\n• Exercícios regulares (30min, 5x/semana)\n• Hidratação adequada\n• Sono de qualidade\n• Paciência e consistência\n\nEvite dietas muito restritivas, pois podem causar efeito sanfona. Mudanças graduais são mais sustentáveis.\n\nUm nutricionista pode criar um plano personalizado para você! 💜`
  }

  // Bebê/Desenvolvimento
  if (lower.match(/(bebê|bebe|desenvolvimento|feto|semana|ultrassom|ultra)/)) {
    if (isPregnant && gestationWeek) {
      const trimester = gestationWeek <= 12 ? 1 : gestationWeek <= 28 ? 2 : 3
      const devInfo: Record<number, string> = {
        1: `No 1º trimestre (até 12 semanas), os órgãos principais estão se formando. O coração já bate! É a fase mais delicada, por isso o ácido fólico é tão importante.`,
        2: `No 2º trimestre (13-28 semanas), o bebê está crescendo rápido! Você pode começar a sentir os movimentos. É a fase mais confortável para muitas mamães.`,
        3: `No 3º trimestre (29-40 semanas), o bebê está ganhando peso e se preparando para nascer! Os pulmões estão amadurecendo e o bebê já reage a sons e luz.`
      }
      return `${name}, com ${gestationWeek} semanas você está no ${trimester}º trimestre! 🤰\n\n${devInfo[trimester]}\n\nDicas para essa fase:\n• Mantenha o pré-natal em dia\n• Alimentação nutritiva\n• Exercícios leves\n• Converse com seu bebê!\n\nQuer saber mais sobre algum aspecto específico? 💜`
    }
    return `${name}, posso te ajudar com informações sobre o desenvolvimento do bebê! 👶\n\nPara informações mais específicas, me diga em qual semana de gestação você está e posso te contar tudo sobre o que está acontecendo com seu bebê nesse momento. 💜`
  }

  // Se tem contexto de busca
  if (searchContext) {
    return `${name}, encontrei informações relevantes para você:\n\n${searchContext.substring(0, 500)}\n\nSe precisar de mais detalhes ou tiver outras dúvidas, estou aqui! 💜`
  }
  
  // Obrigada/Agradecimento
  if (lower.match(/(obrigad|valeu|thanks|brigadão|brigadu|muito obrigad)/)) {
    return `De nada, ${name}! 💜 Fico feliz em ajudar! Se tiver mais alguma dúvida, é só perguntar. Estou sempre aqui para você! 😊`
  }

  // Tchau/Despedida
  if (lower.match(/(tchau|adeus|até logo|ate logo|até mais|fui|bye|vou nessa)/)) {
    return `Tchau, ${name}! 💜 Foi ótimo conversar com você. Cuide-se bem e volte sempre que precisar! 😊✨`
  }

  // Resposta genérica melhorada
  return `${name}, essa é uma ótima pergunta! 💜\n\nPosso te ajudar melhor com alguns tópicos específicos:\n\n🍎 Nutrição e alimentação\n🏃‍♀️ Exercícios e atividade física\n🤰 Informações sobre gravidez\n👶 Cuidados com o bebê e pós-parto\n💊 Suplementação e vitaminas\n😴 Sono e descanso\n💭 Bem-estar emocional\n\nPode reformular sua pergunta ou escolher um desses temas? Quanto mais detalhes você me der, melhor posso te ajudar! 😊`
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
      console.warn('Erro ao buscar usuário:', dbError)
    }

    // Detectar tópicos e fazer pesquisa
    const topics = detectTopics(message)
    const needsSearch = shouldSearchWeb(message)
    let searchContext = ''

    if (needsSearch) {
      try {
        const results = await searchWithSerper(message)
        if (results) searchContext = `\n\nINFORMAÇÕES DE PESQUISA:\n${results}`
      } catch {}
    }

    // Construir prompt do sistema
    const systemPrompt = buildSystemPrompt(userName, userPhase, gestationWeek, searchContext, 'neutral', topics)

    // Tentar providers em cascata
    console.log('🔄 Tentando providers de IA...')

    // 1. Gemini
    const geminiResponse = await tryGemini(systemPrompt, message, history)
    if (geminiResponse) return NextResponse.json({ response: geminiResponse, provider: 'gemini' })

    // 2. Groq (mais rápido que HF)
    const groqResponse = await tryGroq(systemPrompt, message, history)
    if (groqResponse) return NextResponse.json({ response: groqResponse, provider: 'groq' })

    // 3. HuggingFace
    const hfResponse = await tryHuggingFace(systemPrompt, message)
    if (hfResponse) return NextResponse.json({ response: hfResponse, provider: 'huggingface' })

    // 4. Fallback local
    console.log('⚠️ Usando fallback local')
    const localResponse = generateLocalResponse(message, userName, userPhase, gestationWeek, searchContext)
    return NextResponse.json({ response: localResponse, provider: 'local' })

  } catch (error) {
    console.error('Erro no chat:', error)
    return NextResponse.json({
      response: 'Desculpe, estou com dificuldades técnicas no momento. Pode tentar novamente? 💜',
      provider: 'error'
    })
  }
}
