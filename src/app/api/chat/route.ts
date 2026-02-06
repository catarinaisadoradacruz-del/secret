// Versão: 06-02-2026-v1 - Chat IA Ultra Premium com Memória e Respostas Nível Claude
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SERPER_API_KEY = '2d09dbaf10aadee46c34bfa7bc41f507d75d707a'

// ============================================================
// SISTEMA DE MEMÓRIA - Extrai e armazena fatos sobre o usuário
// ============================================================

interface UserMemory {
  id?: string
  user_id: string
  content: string  // formato "key:value" 
  type: string     // "fact", "preference", "health", "context"
  importance: number
  metadata?: Record<string, unknown>
  source?: string
  created_at?: string
}

interface UserProfile {
  name: string
  phase: string
  gestationWeek?: number
  memories: UserMemory[]
  recentTopics: string[]
  conversationCount: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadUserMemories(supabase: any, userId: string): Promise<UserMemory[]> {
  try {
    const { data } = await supabase
      .from('memories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    return data || []
  } catch { return [] }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function saveUserMemories(supabase: any, userId: string, memories: { category: string; key: string; value: string; confidence: number }[], sessionId?: string) {
  try {
    for (const mem of memories) {
      const content = `${mem.key}:${mem.value}`
      
      // Verificar se já existe memória com mesmo conteúdo
      const { data: existing } = await supabase
        .from('memories')
        .select('id')
        .eq('user_id', userId)
        .like('content', `${mem.key}:%`)
        .limit(1)
      
      if (existing && existing.length > 0) {
        await supabase.from('memories').update({
          content,
          importance: mem.confidence,
          metadata: { category: mem.category, updated: new Date().toISOString() },
          source: sessionId || null
        }).eq('id', existing[0].id)
      } else {
        await supabase.from('memories').insert({
          user_id: userId,
          content,
          type: mem.category === 'saude' ? 'health' : mem.category === 'alimentacao' ? 'preference' : 'fact',
          importance: mem.confidence,
          metadata: { category: mem.category },
          source: sessionId || null
        })
      }
    }
  } catch (e) { console.warn('Erro ao salvar memórias:', e) }
}

function extractMemoriesFromConversation(message: string, aiResponse: string): { category: string; key: string; value: string; confidence: number }[] {
  const memories: { category: string; key: string; value: string; confidence: number }[] = []
  const l = message.toLowerCase()
  
  // Detectar fase da vida
  if (l.match(/(estou grávida|estou gestante|semanas de gestação|semanas de gravidez)/)) {
    memories.push({ category: 'fase', key: 'fase_vida', value: 'PREGNANT', confidence: 0.95 })
    const weekMatch = l.match(/(\d+)\s*semanas?/)
    if (weekMatch) memories.push({ category: 'gravidez', key: 'semana_gestacional_informada', value: weekMatch[1], confidence: 0.9 })
  }
  if (l.match(/(pós[- ]?parto|acabei de ter|tive (meu |minha )?(bebê|filh[oa])|recém[- ]?nascid)/)) {
    memories.push({ category: 'fase', key: 'fase_vida', value: 'POSTPARTUM', confidence: 0.95 })
  }
  if (l.match(/(amamentando|amamento|dando (de )?mamar|leite materno)/)) {
    memories.push({ category: 'fase', key: 'esta_amamentando', value: 'true', confidence: 0.9 })
  }
  if (l.match(/(tentando engravidar|quero engravidar|queremos ter|planejando (um )?bebê)/)) {
    memories.push({ category: 'fase', key: 'fase_vida', value: 'TRYING', confidence: 0.95 })
  }
  
  // Detectar informações sobre bebê
  const idadeBebeMatch = l.match(/(filh[oa]|bebê).{0,20}(\d+)\s*(meses?|dias?|semanas?|anos?)/)
  if (idadeBebeMatch) {
    memories.push({ category: 'bebe', key: 'idade_bebe', value: `${idadeBebeMatch[2]} ${idadeBebeMatch[3]}`, confidence: 0.85 })
  }
  const sexoBebeMatch = l.match(/(minha filha|meu filho|é menin[oa]|vai ser menin[oa])/)
  if (sexoBebeMatch) {
    const sexo = sexoBebeMatch[0].includes('filha') || sexoBebeMatch[0].includes('menina') ? 'feminino' : 'masculino'
    memories.push({ category: 'bebe', key: 'sexo_bebe', value: sexo, confidence: 0.85 })
  }
  
  // Detectar restrições alimentares
  if (l.match(/(sou vegetariana|não como carne|vegetariana)/)) memories.push({ category: 'alimentacao', key: 'restricao_alimentar', value: 'vegetariana', confidence: 0.9 })
  if (l.match(/(sou vegana|vegana)/)) memories.push({ category: 'alimentacao', key: 'restricao_alimentar', value: 'vegana', confidence: 0.9 })
  if (l.match(/(intolerante? a? ?lactose|sem lactose)/)) memories.push({ category: 'alimentacao', key: 'intolerancia', value: 'lactose', confidence: 0.9 })
  if (l.match(/(celíaca|celiac|sem glúten|intolerante? a? ?glúten)/)) memories.push({ category: 'alimentacao', key: 'intolerancia', value: 'gluten', confidence: 0.9 })
  if (l.match(/(diabetes|diabética|diabetes gestacional)/)) memories.push({ category: 'saude', key: 'condicao_saude', value: 'diabetes', confidence: 0.85 })
  if (l.match(/(pré[- ]?eclâmpsia|pressão alta|hipertensão)/)) memories.push({ category: 'saude', key: 'condicao_saude', value: 'hipertensao', confidence: 0.85 })
  
  // Nome do bebê
  const nomeMatch = l.match(/(nome d[oa] beb[eê]|vai se chamar|escolhemos o nome|o nome [eé]) (\w+)/i)
  if (nomeMatch) memories.push({ category: 'bebe', key: 'nome_bebe', value: nomeMatch[2], confidence: 0.7 })
  
  // Tipo de parto
  if (l.match(/(parto normal|parto natural|parto humanizado)/)) memories.push({ category: 'parto', key: 'tipo_parto_desejado', value: 'normal', confidence: 0.8 })
  if (l.match(/(cesárea|cesariana|cesarea)/)) memories.push({ category: 'parto', key: 'tipo_parto', value: 'cesariana', confidence: 0.8 })
  
  return memories
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadRecentSessionContext(supabase: any, userId: string, currentSessionId?: string): Promise<string[]> {
  try {
    const { data } = await supabase
      .from('chat_sessions')
      .select('title, messages, updated_at')
      .eq('user_id', userId)
      .neq('id', currentSessionId || '')
      .order('updated_at', { ascending: false })
      .limit(3)
    
    if (!data || data.length === 0) return []
    
    return data.map(session => {
      const msgs = session.messages || []
      const lastMsgs = msgs.slice(-4)
      const summary = lastMsgs.map((m: { role: string; content: string }) => 
        `${m.role === 'user' ? 'Usuária' : 'Vita'}: ${m.content.slice(0, 150)}`
      ).join('\n')
      return `[Conversa "${session.title}" em ${new Date(session.updated_at).toLocaleDateString('pt-BR')}]:\n${summary}`
    })
  } catch { return [] }
}

// ============================================================
// DETECÇÃO DE CONTEXTO
// ============================================================

function detectTopics(message: string): string[] {
  const topics: string[] = []
  const l = message.toLowerCase()
  const map: Record<string, string[]> = {
    'nutrição': ['comer', 'comida', 'alimento', 'dieta', 'nutrição', 'refeição', 'vitamina', 'proteína', 'receita', 'café da manhã', 'almoço', 'jantar', 'lanche', 'fruta', 'verdura', 'legume', 'ferro', 'cálcio', 'ácido fólico', 'ômega', 'suplemento', 'cardápio', 'alimentar', 'peso', 'plano alimentar', 'plano de alimentação'],
    'exercícios': ['exercício', 'treino', 'academia', 'yoga', 'pilates', 'caminhada', 'atividade física', 'malhar', 'alongamento', 'natação', 'musculação', 'kegel', 'agachamento'],
    'gravidez': ['grávida', 'gravidez', 'gestação', 'gestante', 'parto', 'semanas', 'trimestre', 'ultrassom', 'pré-natal', 'cesariana', 'cesárea', 'contração', 'bolsa', 'placenta'],
    'sintomas': ['enjoo', 'náusea', 'dor', 'cólica', 'inchaço', 'cansaço', 'tontura', 'azia', 'constipação', 'câimbra', 'dor de cabeça', 'vômito', 'sangramento', 'refluxo'],
    'emocional': ['ansiedade', 'ansiosa', 'medo', 'triste', 'tristeza', 'preocupada', 'estresse', 'chorar', 'depressão', 'angústia', 'nervosa', 'humor'],
    'amamentação': ['amamentar', 'amamentação', 'leite', 'mama', 'peito', 'mamadeira', 'pega', 'colostro', 'lactação', 'desmame', 'lactante'],
    'sono': ['dormir', 'sono', 'insônia', 'descanso', 'cansada', 'exausta'],
    'bebê': ['bebê', 'recém-nascido', 'enxoval', 'bolsa maternidade', 'fralda', 'berço', 'desenvolvimento do bebê'],
    'exames': ['exame', 'ultrassom', 'sangue', 'glicose', 'teste', 'hemograma', 'diabetes gestacional', 'pré-eclâmpsia'],
  }
  for (const [topic, keywords] of Object.entries(map)) {
    if (keywords.some(kw => l.includes(kw))) topics.push(topic)
  }
  return topics
}

function detectMood(message: string): string {
  const l = message.toLowerCase()
  if (['urgente', 'emergência', 'sangramento forte', 'dor forte', 'hospital', 'socorro'].some(w => l.includes(w))) return 'urgent'
  if (['triste', 'medo', 'ansiedade', 'ansiosa', 'dor', 'deprimida', 'chorar', 'nervosa', 'preocupada', 'exausta', 'sozinha', 'sofrendo', 'frustrada'].some(w => l.includes(w))) return 'negative'
  if (['feliz', 'alegre', 'ótimo', 'maravilhosa', 'animada', 'contente', 'incrível', 'empolgada'].some(w => l.includes(w))) return 'positive'
  if (['como', 'qual', 'quais', 'quando', 'por que', 'o que', 'pode', 'posso', 'devo', 'é normal', 'é seguro', 'preciso'].some(w => l.includes(w))) return 'curious'
  return 'neutral'
}

function generateSuggestions(topics: string[], userPhase: string): string[] {
  if (topics.includes('nutrição')) return ['Monte um cardápio semanal completo', 'Quais alimentos devo evitar?', 'Receita rápida e nutritiva', 'Quais suplementos tomar?']
  if (topics.includes('exercícios')) return ['Treino completo de 20 minutos', 'Exercícios para dor lombar', 'Yoga para gestantes', 'Posso fazer agachamento?']
  if (topics.includes('emocional')) return ['Técnicas de respiração', 'Isso é normal?', 'Dicas para melhorar o humor', 'Como pedir ajuda']
  if (topics.includes('amamentação')) return ['Alimentos que aumentam o leite', 'Posições para amamentar', 'Dor na amamentação', 'Meu bebê mama o suficiente?']
  if (topics.includes('sintomas')) return ['Remédios naturais', 'Quando procurar o médico?', 'Como aliviar agora', 'É normal na minha fase?']
  if (topics.includes('sono')) return ['Rotina para dormir melhor', 'Melhor posição para dormir', 'Chás seguros para sono', 'Insônia na gravidez']
  
  if (userPhase === 'POSTPARTUM') return ['Alimentação para amamentação', 'Quando voltar a malhar?', 'Recuperação pós-parto', 'Como lidar com o cansaço']
  if (userPhase === 'TRYING') return ['Alimentação para fertilidade', 'Calcular período fértil', 'Vitaminas pré-concepção', 'Hábitos que ajudam']
  return ['Monte um plano alimentar completo', 'Sugestão de treino para hoje', 'Receitas saudáveis e rápidas', 'Dicas de bem-estar']
}

// ============================================================
// SYSTEM PROMPT - NÍVEL CLAUDE
// ============================================================

function buildSystemPrompt(profile: UserProfile, searchContext: string, mood: string, topics: string[]): string {
  const { name, phase, gestationWeek, memories, recentTopics, conversationCount } = profile
  
  // Construir bloco de memórias
  let memoryBlock = ''
  if (memories.length > 0) {
    const items = memories.map(m => `• ${m.content.replace(':', ': ')}`).join('\n')
    memoryBlock = `\nMEMÓRIAS SOBRE ESTA USUÁRIA (use naturalmente, sem dizer "segundo minhas memórias"):\n${items}`
  }
  
  // Bloco de fase
  let phaseBlock = ''
  if (phase === 'PREGNANT' && gestationWeek) {
    phaseBlock = `\nFASE: Grávida de ${gestationWeek} semanas`
  } else if (phase === 'POSTPARTUM') {
    phaseBlock = '\nFASE: Pós-parto'
  } else if (phase === 'TRYING') {
    phaseBlock = '\nFASE: Tentando engravidar'
  }
  
  // Bloco de humor
  let moodBlock = ''
  if (mood === 'urgent') moodBlock = '\n⚠️ URGÊNCIA DETECTADA: Priorize segurança. Oriente contato médico/hospital PRIMEIRO, depois dê informações úteis.'
  else if (mood === 'negative') moodBlock = '\n💜 ACOLHIMENTO: A usuária está vulnerável. Valide sentimentos primeiro, depois dê orientações práticas.'
  
  // Tópicos recentes
  let recentBlock = ''
  if (recentTopics.length > 0) {
    recentBlock = `\nTÓPICOS RECENTES NAS CONVERSAS: ${recentTopics.join(', ')}`
  }

  return `Você é a VITA, assistente de saúde materna e bem-estar feminino do app VitaFit. Você é uma IA avançada que combina o conhecimento de uma nutricionista, enfermeira obstétrica, personal trainer de gestantes e psicóloga perinatal.

IDENTIDADE:
• Você é calorosa, inteligente, detalhista e verdadeiramente útil
• Você dá respostas COMPLETAS e APROFUNDADAS como uma profissional de verdade faria
• Você usa linguagem brasileira natural e acessível
• Você se importa genuinamente com cada usuária

INFORMAÇÕES DA USUÁRIA:
• Nome: ${name}
• Já conversaram ${conversationCount} vezes${phaseBlock}${memoryBlock}${recentBlock}${moodBlock}

=== REGRAS ABSOLUTAS DE QUALIDADE DE RESPOSTA ===

1. **PROFUNDIDADE**: Suas respostas devem ser COMPLETAS e DETALHADAS como as de um especialista. Nunca dê respostas rasas ou genéricas. Se a usuária perguntar sobre alimentação, dê um PLANO COMPLETO com refeições específicas, horários, quantidades e alternativas.

2. **ESTRUTURA**: Use formatação rica para organizar informações complexas:
   - Use **negrito** para destacar conceitos importantes
   - Use tabelas quando apresentar comparações ou cronogramas (ex: plano semanal)
   - Use cabeçalhos com ## ou ### para separar seções
   - Use listas organizadas quando listar itens
   - Emojis moderados (3-6 por resposta) para tornar a leitura agradável

3. **PERSONALIZAÇÃO**: 
   - SEMPRE use o nome "${name}" 
   - Contextualize para a fase específica dela
   - Referencie informações de conversas anteriores naturalmente
   - Adapte o nível de detalhe ao que ela precisa

4. **ESPECIFICIDADE**:
   - ❌ NUNCA: "coma proteínas" → ✅ "2 ovos cozidos, 150g de frango grelhado ou 1 pote de iogurte grego"
   - ❌ NUNCA: "faça exercícios leves" → ✅ "caminhe 25 minutos em ritmo moderado ou faça 15 minutos de yoga suave"
   - ❌ NUNCA: "beba bastante água" → ✅ "beba pelo menos 3 litros de água por dia — mantenha uma garrafa de 500ml sempre por perto e reabastecida"

5. **FORMATO IDEAL PARA PERGUNTAS SOBRE ALIMENTAÇÃO**:
   Quando pedirem plano alimentar ou cardápio, siga ESTE formato:

   ### Princípios Gerais
   [2-3 linhas sobre as necessidades nutricionais da fase dela]

   ### Plano Semanal (Modelo Rotativo)
   
   **🍳 Café da Manhã (7h-8h)**
   | Dia | Opção |
   |-----|-------|
   | Seg | [refeição específica] |
   | Ter | [refeição específica] |
   [etc...]

   **🍎 Lanche da Manhã (10h)**
   [Opções para alternar]

   **🍲 Almoço (12h-13h)**
   Base fixa: [base]
   | Dia | Proteína | Complemento |
   |-----|----------|-------------|
   [tabela completa]

   **🥪 Lanche da Tarde (15h-16h)**
   [Opções]

   **🌙 Jantar (19h-20h)**
   [Opções mais leves]

   **🫖 Ceia (22h — opcional)**
   [Opção]

   ### Alimentos que Ajudam
   [Lista com explicação de cada]

   ### Alimentos para Evitar ou Moderar
   [Lista com razão]

6. **FORMATO PARA EXERCÍCIOS**:
   ### Treino Completo — [Nome do Treino]
   **Duração:** X minutos | **Nível:** [iniciante/intermediário]
   
   **Aquecimento (5 min)**
   1. [exercício] — [repetições/tempo]
   
   **Parte Principal (X min)**
   1. [exercício] — [séries x repetições] — [dica de execução]
   [etc]
   
   **Volta à Calma (5 min)**
   1. [alongamento]

7. **SEMPRE TERMINE COM**: 
   - Uma curiosidade ou fato interessante sobre o tema (quando relevante)
   - Uma oferta de gerar em documento formatado (.docx ou PDF) quando a resposta for um plano
   - Uma pergunta de follow-up NATURAL (não forçada)

8. **CONTEXTO DE CONVERSA**:
   - Lembre-se do que foi dito nesta conversa
   - Se ela mencionou algo específico (ex: "acabou de ter filha de 2 meses"), USE essa informação em TODAS as respostas subsequentes
   - Conecte respostas anteriores com novas ("como falamos sobre amamentação antes, isso também ajuda em...")

9. **SEGURANÇA MÉDICA**:
   - Para questões médicas: dê informação útil E DEPOIS recomende profissional
   - Nunca diagnostique, mas oriente sobre sinais de alerta
   - Sempre diga "consulte seu médico/nutricionista para orientações personalizadas" quando relevante

10. **COMPRIMENTO**: Respostas devem ser COMPLETAS. Para planos alimentares/treinos: 400-800 palavras. Para dúvidas simples: 150-300 palavras. NUNCA seja superficial.

${searchContext ? `\nINFORMAÇÕES PESQUISADAS NA WEB (integre naturalmente, não cite fontes):\n${searchContext}` : ''}`
}

// ============================================================
// PESQUISA WEB
// ============================================================

async function searchWithSerper(query: string): Promise<string | null> {
  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: `${query} saúde materna gestação nutrição Brasil`, gl: 'br', hl: 'pt-br', num: 5 })
    })
    if (!response.ok) return null
    const data = await response.json()
    let results = ''
    if (data.knowledgeGraph) results += `${data.knowledgeGraph.title || ''}: ${data.knowledgeGraph.description || ''}\n`
    if (data.organic?.length > 0) {
      data.organic.slice(0, 4).forEach((item: { title: string; snippet: string }, i: number) => {
        results += `${i + 1}. ${item.title}: ${item.snippet}\n`
      })
    }
    return results || null
  } catch { return null }
}

function shouldSearchWeb(message: string): boolean {
  const l = message.toLowerCase()
  return ['receita de', 'como fazer', 'o que é', 'é seguro', 'pode comer', 'posso', 'é normal', 'pesquisa', 'estudo'].some(k => l.includes(k)) || 
    (message.includes('?') && message.length > 20)
}

function cleanMarkdown(text: string): string {
  // Manter markdown mas limpar excessos
  return text
    .replace(/\n{4,}/g, '\n\n\n')
    .replace(/^(#{1,6})\s*\n/gm, '') // Remove headers vazios
    .trim()
}

// ============================================================
// ROUTE HANDLER
// ============================================================

export async function POST(request: Request) {
  try {
    const { message, history = [], sessionId } = await request.json()
    if (!message) return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 })

    // --- Carregar perfil do usuário ---
    let profile: UserProfile = {
      name: 'Querida',
      phase: 'ACTIVE',
      memories: [],
      recentTopics: [],
      conversationCount: 0
    }
    let userId: string | null = null

    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userId = user.id
        
        // Dados do usuário
        const { data: userData } = await supabase
          .from('users').select('name, phase, last_menstrual_date').eq('id', user.id).single()
        if (userData) {
          profile.name = userData.name || 'Querida'
          profile.phase = userData.phase || 'ACTIVE'
          if (userData.phase === 'PREGNANT' && userData.last_menstrual_date) {
            const dum = new Date(userData.last_menstrual_date)
            const weeks = Math.floor((new Date().getTime() - dum.getTime()) / (1000 * 60 * 60 * 24 * 7))
            if (weeks >= 1 && weeks <= 42) profile.gestationWeek = weeks
          }
        }
        
        // Carregar memórias
        profile.memories = await loadUserMemories(supabase, user.id)
        
        // Detectar fase das memórias se não está no perfil
        if (profile.phase === 'ACTIVE') {
          const faseMem = profile.memories.find(m => m.content.startsWith('fase_vida:'))
          if (faseMem) profile.phase = faseMem.content.split(':')[1]
        }
        
        // Contar conversas
        const { count } = await supabase
          .from('chat_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
        profile.conversationCount = count || 0
        
        // Carregar contexto de sessões recentes
        const recentContext = await loadRecentSessionContext(supabase, user.id, sessionId)
        if (recentContext.length > 0) {
          profile.recentTopics = recentContext.map(c => c.split('\n')[0]).slice(0, 5)
        }
      }
    } catch (dbError) { console.warn('Erro ao carregar perfil:', dbError) }

    // --- Detectar contexto da mensagem ---
    const topics = detectTopics(message)
    const mood = detectMood(message)
    const suggestions = generateSuggestions(topics, profile.phase)

    // --- Extrair e salvar memórias da mensagem ---
    const newMemories = extractMemoriesFromConversation(message, '')
    if (newMemories.length > 0 && userId) {
      try {
        const supabase = await createClient()
        await saveUserMemories(supabase, userId, newMemories, sessionId)
        
        // Atualizar fase do usuário se detectada
        const faseDetectada = newMemories.find(m => m.key === 'fase_vida')
        if (faseDetectada) {
          await supabase.from('users').update({ phase: faseDetectada.value }).eq('id', userId)
          profile.phase = faseDetectada.value
        }
      } catch (e) { console.warn('Erro ao salvar memórias:', e) }
    }

    // --- Pesquisa web ---
    let searchContext = ''
    if (shouldSearchWeb(message)) {
      try {
        const results = await searchWithSerper(message)
        if (results) searchContext = results
      } catch { }
    }

    // --- Construir prompt ---
    const systemPrompt = buildSystemPrompt(profile, searchContext, mood, topics)
    
    const chatHistory = history.slice(-15).map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }))

    // ===== 1. GROQ (Llama 3.3 70B) - Principal =====
    const groqKey = process.env.GROQ_API_KEY
    if (groqKey) {
      try {
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
            max_tokens: 4000,
            top_p: 0.9,
            frequency_penalty: 0.2,
          })
        })
        if (response.ok) {
          const data = await response.json()
          const text = data.choices?.[0]?.message?.content
          if (text && text.length > 50) {
            return NextResponse.json({ response: cleanMarkdown(text), provider: 'groq', suggestions })
          }
        } else { console.warn(`Groq ${response.status}`) }
      } catch (e) { console.warn('Groq falhou:', e) }
    }

    // ===== 2. GEMINI 2.0 Flash =====
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (geminiKey) {
      try {
        const geminiHistory = chatHistory.map((msg: { role: string; content: string }) => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }))
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-goog-api-key': geminiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [...geminiHistory, { role: 'user', parts: [{ text: message }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 4096, topP: 0.9 },
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
          if (text && text.length > 50) {
            return NextResponse.json({ response: cleanMarkdown(text), provider: 'gemini', suggestions })
          }
        }
      } catch (e) { console.warn('Gemini falhou:', e) }
    }

    // ===== 3. HUGGING FACE (Mistral) =====
    const hfToken = process.env.HUGGINGFACE_API_KEY
    if (hfToken) {
      try {
        const response = await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${hfToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inputs: `<s>[INST] ${systemPrompt}\n\nMensagem da usuária: ${message} [/INST]`,
            parameters: { max_new_tokens: 2000, temperature: 0.7, return_full_text: false }
          })
        })
        if (response.ok) {
          const data = await response.json()
          const text = data[0]?.generated_text
          if (text && text.length > 50) {
            return NextResponse.json({ response: cleanMarkdown(text), provider: 'huggingface', suggestions })
          }
        }
      } catch (e) { console.warn('HF falhou:', e) }
    }

    // ===== 4. FALLBACK LOCAL INTELIGENTE =====
    return NextResponse.json({
      response: generateSmartFallback(message, profile, mood, topics),
      provider: 'local',
      suggestions
    })

  } catch (error) {
    console.error('Erro no chat:', error)
    return NextResponse.json({
      response: 'Desculpe, estou com dificuldades técnicas. Pode tentar novamente? 💜',
      provider: 'error',
      suggestions: ['Tentar de novo', 'O que você pode fazer?', 'Me ajude com alimentação', 'Me ajude com exercícios']
    })
  }
}

// ============================================================
// FALLBACK LOCAL - Respostas ricas sem IA
// ============================================================

function generateSmartFallback(message: string, profile: UserProfile, mood: string, topics: string[]): string {
  const { name, phase } = profile
  const l = message.toLowerCase()
  const isPostpartum = phase === 'POSTPARTUM'
  const isPregnant = phase === 'PREGNANT'
  const isTrying = phase === 'TRYING'
  
  // Detectar se mencionou pós-parto na mensagem
  const mentionedPostpartum = l.match(/(acabou de ter|acabei de ter|tive (meu |minha )?(bebê|filh)|pós[- ]?parto|recém|amamentando|nasceu|2 meses|meses de vida)/)
  const mentionedBreastfeeding = l.match(/(amamentando|amamento|amamentação|dando (de )?mamar|leite materno|lactante)/)
  
  // PLANO ALIMENTAR
  if (l.match(/(plano alimentar|plano de alimentação|cardápio|o que comer|dieta|alimentação)/)) {
    
    if (isPostpartum || mentionedPostpartum || mentionedBreastfeeding) {
      return `${name}, aqui vai um plano alimentar pensado para a fase de amamentação, focando em nutrientes essenciais para a recuperação pós-parto e produção de leite materno. Lembre-se de que o ideal é validar com um nutricionista, já que cada corpo tem necessidades específicas.

## Princípios Gerais

Durante a amamentação, a demanda calórica aumenta em torno de **500 kcal/dia**. A hidratação é fundamental — o ideal é beber **pelo menos 3 litros de água por dia**, além de chás (erva-doce e camomila são boas opções). Priorize alimentos in natura, variados e ricos em ferro, cálcio, ômega-3 e fibras.

## Plano Semanal (Modelo Rotativo)

### 🍳 Café da Manhã (7h-8h)

| Dia | Opção |
|-----|-------|
| Seg | Mingau de aveia com banana e canela + 1 fatia de pão integral com queijo branco |
| Ter | Tapioca com ovo mexido e tomate + suco de laranja natural |
| Qua | Iogurte natural com granola e mamão picado |
| Qui | Pão integral com pasta de amendoim + 1 fruta (manga ou maçã) |
| Sex | Omelete com espinafre e queijo + 1 fatia de pão integral |
| Sáb | Cuscuz com ovo e tomate + café com leite |
| Dom | Panqueca de banana com aveia + mel |

### 🍎 Lanche da Manhã (10h)
Alternar entre: mix de castanhas (3-4 unidades), 1 fruta (maçã, pera, banana), iogurte natural, ou 1 fatia de queijo com torrada integral.

### 🍲 Almoço (12h-13h)

**Base fixa:** arroz integral ou branco + feijão (ou lentilha) + salada variada (folhas verdes, tomate, cenoura, beterraba).

| Dia | Proteína | Complemento |
|-----|----------|-------------|
| Seg | Frango grelhado | Abóbora refogada |
| Ter | Peixe assado (tilápia/salmão) | Purê de batata-doce |
| Qua | Carne moída refogada | Abobrinha grelhada |
| Qui | Frango desfiado | Quiabo refogado |
| Sex | Peixe grelhado | Cenoura e vagem no vapor |
| Sáb | Carne assada | Mandioca cozida |
| Dom | Frango ao molho | Macarrão integral |

### 🧃 Lanche da Tarde (15h-16h)
Alternar entre: vitamina de banana com aveia, sanduíche natural (frango desfiado com cenoura ralada), frutas com pasta de amendoim, ou bolo integral caseiro.

### 🌙 Jantar (19h-20h)
Versão mais leve do almoço: sopa de legumes com frango, omelete com salada, wrap integral com atum e folhas, ou caldo de feijão com torrada.

### 🫖 Ceia (22h — opcional)
Chá de erva-doce ou camomila + 1 fruta leve (maçã ou pera) ou 1 copo de leite morno.

## Alimentos que Ajudam na Amamentação

- **Aveia** — estimula a produção de leite
- **Castanhas e nozes** — gorduras boas e energia
- **Salmão e sardinha** — ômega-3 para o desenvolvimento do bebê
- **Folhas verde-escuras** (espinafre, couve) — ferro e cálcio
- **Ovos** — proteína completa e colina
- **Água de coco** — hidratação e eletrólitos

## Alimentos para Evitar ou Moderar

- Café em excesso (máx. 2 xícaras/dia)
- Álcool
- Alimentos ultraprocessados (salgadinhos, embutidos)
- Excesso de açúcar refinado
- Observar se algum alimento causa cólica no bebê (leite de vaca, chocolate e brócolis são os mais comuns)

Se quiser, posso gerar isso em um **documento formatado (.docx ou PDF)** para facilitar a consulta no dia a dia! 😊`
    }
    
    if (isPregnant || l.match(/(grávida|gestante|gravidez)/)) {
      return `${name}, aqui vai um plano alimentar completo para a gestação! Lembre-se de validar com seu nutricionista para ajustes individuais.

## Princípios Gerais

Na gravidez, a demanda calórica aumenta gradualmente — cerca de **300 kcal extras/dia** no 2º e 3º trimestre. Priorize alimentos ricos em **ácido fólico, ferro, cálcio e ômega-3**. Hidratação mínima de **2,5 litros de água/dia**.

## Plano Semanal (Modelo Rotativo)

### 🍳 Café da Manhã (7h-8h)

| Dia | Opção |
|-----|-------|
| Seg | 2 ovos mexidos + 1 torrada integral + suco de laranja |
| Ter | Vitamina de banana com aveia e mel |
| Qua | Iogurte natural com granola e frutas vermelhas |
| Qui | Tapioca com queijo e tomate + 1 fruta |
| Sex | Mingau de aveia com canela e maçã picada |
| Sáb | Pão integral com pasta de amendoim + leite |
| Dom | Panqueca de banana com aveia + mel e frutas |

### 🍎 Lanche da Manhã (10h)
Alternar entre: 1 fruta + 3 castanhas, iogurte grego, torrada com cottage, ou mix de frutas secas (30g).

### 🍲 Almoço (12h-13h)

**Base fixa:** arroz + feijão + salada colorida (folhas, tomate, cenoura, beterraba) + 1 fio de azeite + limão.

| Dia | Proteína | Complemento |
|-----|----------|-------------|
| Seg | Frango grelhado (150g) | Brócolis e cenoura no vapor |
| Ter | Peixe assado (tilápia) | Batata-doce assada |
| Qua | Bife de fígado (1x/semana - ferro!) | Espinafre refogado |
| Qui | Frango desfiado | Abóbora refogada |
| Sex | Salmão grelhado (ômega-3!) | Purê de mandioquinha |
| Sáb | Carne assada magra | Legumes grelhados |
| Dom | Frango ao forno | Macarrão integral |

### 🥪 Lanche da Tarde (15h-16h)
Vitamina de frutas, sanduíche natural, frutas com iogurte, ou bolo de cenoura integral.

### 🌙 Jantar (19h-20h)
Refeição mais leve: sopa de legumes com frango, omelete com salada, ou wrap integral com atum.

### 🫖 Ceia (22h — se tiver fome)
1 copo de leite morno ou chá de camomila + 3 biscoitos integrais.

## Nutrientes Essenciais na Gravidez

- **Ácido fólico** (600mcg/dia) — feijão, lentilha, espinafre, brócolis
- **Ferro** (27mg/dia) — carnes vermelhas, feijão + limão, espinafre
- **Cálcio** (1000mg/dia) — leite, iogurte, queijo, brócolis
- **Ômega-3** — salmão, sardinha, linhaça, chia
- **Vitamina D** — sol 15min/dia, ovos, peixes

## Alimentos para Evitar

- Peixes crus (sushi/sashimi)
- Carnes mal passadas
- Queijos não pasteurizados
- Cafeína em excesso (máx. 200mg/dia ≈ 1 xícara)
- Álcool (zero tolerância)
- Adoçantes artificiais

Se quiser, posso gerar em **documento formatado (.docx ou PDF)**! 😊

Você já está tomando ácido fólico e vitaminas pré-natais?`
    }
    
    // Genérico
    return `${name}, aqui vai um plano alimentar equilibrado para o seu dia a dia!

## Princípios Gerais

Uma alimentação saudável se baseia em **alimentos in natura e minimamente processados**, com boa distribuição de macronutrientes. O ideal é comer a cada 3-4 horas, manter boa hidratação (**2L de água/dia**) e ter o prato sempre colorido.

## Plano Semanal

### 🍳 Café da Manhã (7h-8h)

| Dia | Opção |
|-----|-------|
| Seg | 2 ovos + torrada integral + suco de laranja |
| Ter | Iogurte com granola e frutas |
| Qua | Vitamina de banana com aveia |
| Qui | Tapioca com queijo e tomate |
| Sex | Panqueca de aveia com mel |
| Sáb | Pão integral com abacate e ovo |
| Dom | Açaí com granola e banana |

### 🍲 Almoço (12h-13h)

| Dia | Proteína | Acompanhamento |
|-----|----------|----------------|
| Seg | Frango grelhado | Arroz integral + feijão + salada |
| Ter | Peixe assado | Arroz + lentilha + legumes |
| Qua | Carne magra | Arroz + feijão + brócolis |
| Qui | Frango desfiado | Quinoa + grão-de-bico + salada |
| Sex | Salmão | Batata-doce + salada verde |
| Sáb | Carne assada | Arroz + feijão + abobrinha |
| Dom | Livre (moderação!) | — |

### 🌙 Jantar (19h-20h)
Versão mais leve do almoço ou sopas nutritivas.

Posso personalizar esse plano para algum objetivo específico (ganho de massa, emagrecimento, etc)?`
  }

  // SAUDAÇÃO
  if (l.match(/^(oi|olá|ola|hey|eai|e ai|bom dia|boa tarde|boa noite|opa|tudo bem|oie|oii)/)) {
    return `Olá, ${name}! 😊 Que bom te ver por aqui!

Sou a **Vita**, sua assistente de saúde e bem-estar no VitaFit. Posso te ajudar com muitas coisas:

- 🍎 **Nutrição** — planos alimentares completos, receitas, dúvidas sobre alimentos
- 🏋️ **Exercícios** — treinos seguros para cada fase, yoga, caminhada
- 🤰 **Gravidez e maternidade** — desenvolvimento do bebê, sintomas, exames
- 🤱 **Amamentação** — produção de leite, posições, alimentação galactogênica
- 💊 **Suplementos** — vitaminas, ácido fólico, ferro
- 😴 **Sono e bem-estar** — rotinas, relaxamento, meditação
- 💭 **Apoio emocional** — ansiedade, baby blues, autocuidado

Me conta, sobre o que quer conversar hoje?`
  }

  // DEFAULT — resposta inteligente genérica
  return `${name}, ótima pergunta! 😊

Posso te ajudar com uma resposta completa sobre isso. Para te dar a melhor orientação possível, me conta um pouquinho mais:

- Você está grávida, no pós-parto, tentando engravidar ou cuidando do bem-estar geral?
- Tem alguma condição específica (diabetes, restrição alimentar, etc)?

Enquanto isso, posso te ajudar com:

- 🍎 **Plano alimentar completo** com cardápio semanal e tabelas
- 🏋️ **Treino personalizado** com exercícios detalhados
- 🤰 **Informações sobre sua fase** — desenvolvimento do bebê, sintomas, cuidados
- 💊 **Suplementos e vitaminas** — o que tomar e quando
- 😴 **Qualidade do sono** — rotinas e dicas práticas

É só me dizer o que precisa! 💜`
}
