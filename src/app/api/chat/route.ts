// Versão: 07-02-2026-v1 - Chat IA Ultra Premium com Anti-Repetição e Respostas Nível Claude
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SERPER_API_KEY = '2d09dbaf10aadee46c34bfa7bc41f507d75d707a'

// ============================================================
// SISTEMA DE MEMÓRIA
// ============================================================

interface UserMemory {
  id?: string
  user_id: string
  content: string
  type: string
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

function extractMemoriesFromConversation(message: string): { category: string; key: string; value: string; confidence: number }[] {
  const memories: { category: string; key: string; value: string; confidence: number }[] = []
  const l = message.toLowerCase()
  
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
  
  const idadeBebeMatch = l.match(/(filh[oa]|bebê).{0,20}(\d+)\s*(meses?|dias?|semanas?|anos?)/)
  if (idadeBebeMatch) {
    memories.push({ category: 'bebe', key: 'idade_bebe', value: `${idadeBebeMatch[2]} ${idadeBebeMatch[3]}`, confidence: 0.85 })
  }
  const sexoBebeMatch = l.match(/(minha filha|meu filho|é menin[oa]|vai ser menin[oa])/)
  if (sexoBebeMatch) {
    const sexo = sexoBebeMatch[0].includes('filha') || sexoBebeMatch[0].includes('menina') ? 'feminino' : 'masculino'
    memories.push({ category: 'bebe', key: 'sexo_bebe', value: sexo, confidence: 0.85 })
  }
  
  if (l.match(/(sou vegetariana|não como carne|vegetariana)/)) memories.push({ category: 'alimentacao', key: 'restricao_alimentar', value: 'vegetariana', confidence: 0.9 })
  if (l.match(/(sou vegana|vegana)/)) memories.push({ category: 'alimentacao', key: 'restricao_alimentar', value: 'vegana', confidence: 0.9 })
  if (l.match(/(intolerante? a? ?lactose|sem lactose)/)) memories.push({ category: 'alimentacao', key: 'intolerancia', value: 'lactose', confidence: 0.9 })
  if (l.match(/(celíaca|celiac|sem glúten|intolerante? a? ?glúten)/)) memories.push({ category: 'alimentacao', key: 'intolerancia', value: 'gluten', confidence: 0.9 })
  if (l.match(/(diabetes|diabética|diabetes gestacional)/)) memories.push({ category: 'saude', key: 'condicao_saude', value: 'diabetes', confidence: 0.85 })
  if (l.match(/(pré[- ]?eclâmpsia|pressão alta|hipertensão)/)) memories.push({ category: 'saude', key: 'condicao_saude', value: 'hipertensao', confidence: 0.85 })
  
  const nomeMatch = l.match(/(nome d[oa] beb[eê]|vai se chamar|escolhemos o nome|o nome [eé]) (\w+)/i)
  if (nomeMatch) memories.push({ category: 'bebe', key: 'nome_bebe', value: nomeMatch[2], confidence: 0.7 })
  
  if (l.match(/(parto normal|parto natural|parto humanizado)/)) memories.push({ category: 'parto', key: 'tipo_parto_desejado', value: 'normal', confidence: 0.8 })
  if (l.match(/(cesárea|cesariana|cesarea)/)) memories.push({ category: 'parto', key: 'tipo_parto', value: 'cesariana', confidence: 0.8 })
  
  return memories
}

// ============================================================
// ANTI-REPETIÇÃO - Digere o que já foi dito
// ============================================================

function buildConversationDigest(history: { role: string; content: string }[]): string {
  if (history.length === 0) return ''
  
  const assistantMessages = history.filter(m => m.role === 'assistant')
  if (assistantMessages.length === 0) return ''
  
  // Extrair tópicos já cobertos
  const coveredTopics: string[] = []
  const mentionedFoods: string[] = []
  const mentionedExercises: string[] = []
  const givenAdvice: string[] = []
  
  for (const msg of assistantMessages) {
    const content = msg.content.toLowerCase()
    
    // Detectar tópicos cobertos
    if (content.includes('café da manhã') || content.includes('almoço') || content.includes('jantar')) coveredTopics.push('plano_alimentar_completo')
    if (content.includes('treino') || content.includes('exercício')) coveredTopics.push('exercicios')
    if (content.includes('amamentação') || content.includes('leite materno')) coveredTopics.push('amamentacao')
    if (content.includes('suplemento') || content.includes('vitamina')) coveredTopics.push('suplementos')
    if (content.includes('sono') || content.includes('dormir')) coveredTopics.push('sono')
    
    // Extrair alimentos já mencionados
    const foodPatterns = content.match(/(?:aveia|banana|ovo|frango|peixe|salmão|tilápia|quinoa|arroz|feijão|lentilha|batata-doce|brócolis|espinafre|iogurte|granola|tapioca|mamão|abóbora|cenoura|beterraba|cuscuz|panqueca)/g)
    if (foodPatterns) mentionedFoods.push(...foodPatterns)
    
    // Extrair exercícios já mencionados
    const exercisePatterns = content.match(/(?:agachamento|prancha|caminhada|yoga|pilates|alongamento|kegel|natação|elevação|afundo)/g)
    if (exercisePatterns) mentionedExercises.push(...exercisePatterns)
    
    // Extrair conselhos dados (primeiras 80 chars de cada parágrafo)
    const paragraphs = msg.content.split('\n\n').filter(p => p.length > 30)
    for (const p of paragraphs.slice(0, 5)) {
      givenAdvice.push(p.slice(0, 100))
    }
  }
  
  let digest = '\n\n=== CONTEXTO ANTI-REPETIÇÃO (NÃO repita o que já foi dito) ===\n'
  
  if (coveredTopics.length > 0) {
    digest += `\nTópicos já abordados nesta conversa: ${[...new Set(coveredTopics)].join(', ')}`
  }
  if (mentionedFoods.length > 0) {
    digest += `\nAlimentos já mencionados: ${[...new Set(mentionedFoods)].join(', ')}`
  }
  if (mentionedExercises.length > 0) {
    digest += `\nExercícios já mencionados: ${[...new Set(mentionedExercises)].join(', ')}`
  }
  
  digest += `\n\nREGRA CRÍTICA: Se a usuária pede algo que você já deu (ex: outro plano alimentar), NÃO repita as mesmas refeições/receitas. Ofereça VARIAÇÕES COMPLETAMENTE NOVAS. Se já deu um plano semanal, dê opções diferentes de café, almoço, jantar com alimentos que NÃO foram citados antes. Se ela pedir novamente a mesma coisa, pergunte se quer algo diferente ou mais detalhado sobre um ponto específico.`
  
  return digest
}

// ============================================================
// DETECÇÃO DE CONTEXTO
// ============================================================

function detectTopics(message: string): string[] {
  const topics: string[] = []
  const l = message.toLowerCase()
  const map: Record<string, string[]> = {
    'nutrição': ['comer', 'comida', 'alimento', 'dieta', 'nutrição', 'refeição', 'vitamina', 'proteína', 'receita', 'café da manhã', 'almoço', 'jantar', 'lanche', 'fruta', 'verdura', 'legume', 'ferro', 'cálcio', 'ácido fólico', 'ômega', 'suplemento', 'cardápio', 'alimentar', 'peso', 'plano alimentar', 'plano de alimentação', 'caloria'],
    'exercícios': ['exercício', 'treino', 'academia', 'yoga', 'pilates', 'caminhada', 'atividade física', 'malhar', 'alongamento', 'natação', 'musculação', 'kegel', 'agachamento'],
    'gravidez': ['grávida', 'gravidez', 'gestação', 'gestante', 'parto', 'semanas', 'trimestre', 'ultrassom', 'pré-natal', 'cesariana', 'cesárea', 'contração', 'bolsa', 'placenta'],
    'sintomas': ['enjoo', 'náusea', 'dor', 'cólica', 'inchaço', 'cansaço', 'tontura', 'azia', 'constipação', 'câimbra', 'dor de cabeça', 'vômito', 'sangramento', 'refluxo'],
    'emocional': ['ansiedade', 'ansiosa', 'medo', 'triste', 'tristeza', 'preocupada', 'estresse', 'chorar', 'depressão', 'angústia', 'nervosa', 'humor', 'baby blues'],
    'amamentação': ['amamentar', 'amamentação', 'leite', 'mama', 'peito', 'mamadeira', 'pega', 'colostro', 'lactação', 'desmame', 'lactante'],
    'sono': ['dormir', 'sono', 'insônia', 'descanso', 'cansada', 'exausta'],
    'bebê': ['bebê', 'recém-nascido', 'enxoval', 'bolsa maternidade', 'fralda', 'berço', 'desenvolvimento do bebê', 'vacina'],
    'exames': ['exame', 'ultrassom', 'sangue', 'glicose', 'teste', 'hemograma', 'diabetes gestacional', 'pré-eclâmpsia'],
    'beleza': ['pele', 'cabelo', 'estrias', 'mancha', 'melasma', 'skincare', 'cosmético', 'hidratante', 'protetor solar'],
    'sexualidade': ['relação', 'sexo', 'intimidade', 'libido', 'desejo'],
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

function generateSuggestions(topics: string[], userPhase: string, history: { role: string; content: string }[]): string[] {
  // Sugestões inteligentes baseadas no contexto da conversa
  const lastAssistantMsg = [...history].reverse().find(m => m.role === 'assistant')?.content?.toLowerCase() || ''
  
  // Se acabou de dar um plano alimentar, sugerir complementos
  if (lastAssistantMsg.includes('plano semanal') || lastAssistantMsg.includes('café da manhã')) {
    return ['Gerar PDF desse plano', 'Lista de compras para esse cardápio', 'Receitas detalhadas de algumas opções', 'Adaptar para restrição alimentar']
  }
  
  // Se falou sobre exercícios
  if (lastAssistantMsg.includes('treino') || lastAssistantMsg.includes('exercício')) {
    return ['Vídeo de demonstração', 'Aumentar a intensidade', 'Treino para outro dia', 'Alongamento pós-treino']
  }
  
  // Se falou sobre amamentação
  if (lastAssistantMsg.includes('amamentação') || lastAssistantMsg.includes('leite materno')) {
    return ['Receitas galactogênicas', 'Dor na amamentação', 'Quando introduzir fórmula', 'Armazenar leite materno']
  }

  if (topics.includes('nutrição')) return ['Monte um cardápio semanal completo', 'Quais alimentos devo evitar?', 'Receitas rápidas e nutritivas', 'Quais suplementos tomar?']
  if (topics.includes('exercícios')) return ['Treino completo de 20 minutos', 'Exercícios para dor lombar', 'Yoga para gestantes', 'Posso fazer agachamento?']
  if (topics.includes('emocional')) return ['Técnicas de respiração e relaxamento', 'Isso é normal na minha fase?', 'Dicas para melhorar o humor', 'Como pedir ajuda ao parceiro']
  if (topics.includes('amamentação')) return ['Alimentos que aumentam o leite', 'Posições corretas para amamentar', 'Dor na amamentação — o que fazer?', 'Meu bebê mama o suficiente?']
  if (topics.includes('sintomas')) return ['Remédios naturais seguros', 'Quando procurar o médico?', 'Como aliviar agora', 'É normal na minha fase?']
  if (topics.includes('sono')) return ['Rotina para dormir melhor', 'Melhor posição para dormir grávida', 'Chás seguros para sono', 'Insônia — causas e soluções']
  
  if (userPhase === 'POSTPARTUM') return ['Plano alimentar para amamentação', 'Quando voltar a malhar?', 'Recuperação pós-parto completa', 'Como lidar com o cansaço extremo']
  if (userPhase === 'TRYING') return ['Alimentação para fertilidade', 'Calcular período fértil', 'Vitaminas pré-concepção', 'Hábitos que ajudam a engravidar']
  return ['Monte um plano alimentar completo', 'Sugestão de treino para hoje', 'Receitas saudáveis e rápidas', 'Dicas de bem-estar geral']
}

// ============================================================
// SYSTEM PROMPT ULTRA - Com exemplos e regras rígidas
// ============================================================

function buildSystemPrompt(profile: UserProfile, searchContext: string, mood: string, topics: string[], antiRepetitionDigest: string): string {
  const { name, phase, gestationWeek, memories, conversationCount } = profile
  
  let memoryBlock = ''
  if (memories.length > 0) {
    const items = memories.slice(0, 20).map(m => `• ${m.content.replace(':', ': ')}`).join('\n')
    memoryBlock = `\n\nO QUE VOCÊ JÁ SABE SOBRE ${name.toUpperCase()} (use naturalmente, sem mencionar que tem memórias):\n${items}`
  }
  
  let phaseBlock = ''
  if (phase === 'PREGNANT' && gestationWeek) {
    const trimester = gestationWeek <= 13 ? '1º trimestre' : gestationWeek <= 27 ? '2º trimestre' : '3º trimestre'
    phaseBlock = `\nFASE: Grávida de ${gestationWeek} semanas (${trimester})`
  } else if (phase === 'POSTPARTUM') {
    const idadeBebe = memories.find(m => m.content.startsWith('idade_bebe:'))
    phaseBlock = `\nFASE: Pós-parto${idadeBebe ? ` (bebê de ${idadeBebe.content.split(':')[1]})` : ''}`
  } else if (phase === 'TRYING') {
    phaseBlock = '\nFASE: Tentando engravidar'
  }
  
  let moodBlock = ''
  if (mood === 'urgent') moodBlock = '\n⚠️ URGÊNCIA: Oriente contato médico/hospital PRIMEIRO, depois dê informações úteis.'
  else if (mood === 'negative') moodBlock = '\n💜 ACOLHIMENTO: Valide os sentimentos dela primeiro com empatia genuína, depois oriente.'
  
  const isBreastfeeding = memories.some(m => m.content.includes('amamentando:true') || m.content.includes('esta_amamentando:true'))

  return `Você é a VITA — assistente premium de saúde materna do app VitaFit. Você combina o conhecimento de nutricionista, enfermeira obstétrica, personal trainer de gestantes e psicóloga perinatal.

PERSONALIDADE: Calorosa, inteligente, detalhista, empática. Fala como uma profissional de saúde brasileira experiente que genuinamente se importa. Linguagem natural e acessível, sem ser infantil nem robótica.

DADOS DA USUÁRIA:
• Nome: ${name}
• Conversas anteriores: ${conversationCount}${phaseBlock}${isBreastfeeding ? '\n• Está amamentando' : ''}${memoryBlock}${moodBlock}

══════════════════════════════════════════════
REGRAS OBRIGATÓRIAS DE QUALIDADE
══════════════════════════════════════════════

REGRA 1 — RESPOSTAS LONGAS E COMPLETAS:
Suas respostas DEVEM ter no MÍNIMO 400 palavras para perguntas sobre planos, receitas, treinos ou temas de saúde. Para perguntas simples (sim/não, dúvida pontual), mínimo 150 palavras. NUNCA dê respostas curtas e genéricas. Você é uma especialista — aja como uma.

REGRA 2 — ESTRUTURA OBRIGATÓRIA:
Toda resposta com mais de 200 palavras DEVE usar:
- Títulos com ## e ### para separar seções
- **Negrito** para conceitos-chave
- Tabelas (formato markdown com | ) para comparações, cronogramas e cardápios semanais
- Listas organizadas quando listar itens
- 3-5 emojis estratégicos (🍳🍎🍲🌙🫖💪🧘‍♀️💊💡⚠️💜)

REGRA 3 — ESPECIFICIDADE ABSOLUTA:
❌ PROIBIDO: "coma proteínas", "beba água", "faça exercícios"
✅ OBRIGATÓRIO: "150g de frango grelhado ou 2 ovos cozidos", "3 litros de água/dia — mantenha uma garrafa de 500ml por perto", "caminhe 25 minutos em ritmo moderado ou 15 minutos de yoga"

Sempre inclua: quantidades exatas em gramas/ml, horários sugeridos, alternativas para cada item, e a razão por trás da recomendação.

REGRA 4 — PERSONALIZAÇÃO:
- Use o nome "${name}" naturalmente (2-3x por resposta)
- Referencie a fase dela (${phase}) em todas as orientações
- Se ela mencionou algo em mensagens anteriores, faça conexões ("como você está amamentando, isso é especialmente importante porque...")
- Adapte TUDO ao contexto dela — nunca dê conselhos genéricos

REGRA 5 — ANTI-REPETIÇÃO:
Se ela pedir algo que já foi discutido nesta conversa, NÃO repita. Ofereça:
- Variações completamente novas
- Aprofundamento em um aspecto específico
- Pergunte se quer algo diferente ou mais detalhado sobre um ponto

REGRA 6 — FINALIZE SEMPRE COM:
1. Uma 💡 dica prática rápida ou curiosidade interessante sobre o tema
2. Se a resposta foi um plano/cardápio/treino: ofereça gerar em documento formatado (.docx ou PDF)
3. Uma pergunta de follow-up natural e relevante (nunca genérica)

REGRA 7 — SEGURANÇA:
- Para questões médicas: dê informação útil E recomende profissional
- Nunca diagnostique
- Sinais de alerta → oriente buscar atendimento

══════════════════════════════════════════════
FORMATOS DE REFERÊNCIA (siga estes modelos)
══════════════════════════════════════════════

QUANDO PEDIREM PLANO ALIMENTAR, use EXATAMENTE este formato:

[1-2 frases de contexto pessoal]

## Princípios Gerais
[3-4 linhas sobre necessidades nutricionais específicas da fase dela, com números]

## Plano Semanal (Modelo Rotativo)

### 🍳 Café da Manhã (7h-8h)

| Dia | Opção |
|-----|-------|
| Seg | [refeição completa com detalhes] |
| Ter | [refeição diferente] |
[todos os 7 dias]

### 🍎 Lanche da Manhã (10h)
[3-4 opções para alternar com quantidades]

### 🍲 Almoço (12h-13h)
**Base fixa:** [arroz + feijão + salada — detalhar]

| Dia | Proteína | Complemento |
|-----|----------|-------------|
[7 dias com proteína e complemento variados]

### 🧃 Lanche da Tarde (15h-16h)
[3-4 opções]

### 🌙 Jantar (19h-20h)
[Opções detalhadas]

### 🫖 Ceia (22h — opcional)
[1-2 opções]

## Alimentos que Ajudam [na fase específica]
[Lista de 6-8 alimentos com explicação do benefício]

## Alimentos para Evitar ou Moderar
[Lista de 5-6 itens com razão]

QUANDO PEDIREM TREINO, use este formato:

## Treino [Nome] — [Fase da usuária]
**Duração:** X min | **Nível:** [iniciante/intermediário] | **Frequência:** X vezes/semana

### Aquecimento (5 min)
1. [exercício] — [tempo] — [instrução breve]

### Parte Principal (X min)
1. [exercício] — [séries x repetições] — [dica de postura/execução]
[6-10 exercícios]

### Volta à Calma (5 min)
1. [alongamento] — [tempo]

### ⚠️ Sinais para Parar
[3-4 sinais de alerta]

### 💡 Dicas
[2-3 dicas práticas]

QUANDO FOR DÚVIDA SOBRE SINTOMA/SAÚDE:

## [Nome do Sintoma] — O Que Você Precisa Saber

### O que é e por que acontece
[Explicação clara, 3-5 linhas]

### O que fazer agora
[3-5 ações práticas imediatas com detalhes]

### Quando procurar o médico
[Sinais de alerta claros]

### Dicas de prevenção
[3-4 dicas práticas]

${searchContext ? `\nINFORMAÇÕES DA WEB (integre naturalmente):\n${searchContext}` : ''}${antiRepetitionDigest}`
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
  return ['receita de', 'como fazer', 'o que é', 'é seguro', 'pode comer', 'posso', 'é normal', 'pesquisa', 'estudo', 'remédio', 'medicamento'].some(k => l.includes(k)) || 
    (message.includes('?') && message.length > 25)
}

function cleanMarkdown(text: string): string {
  return text
    .replace(/\n{4,}/g, '\n\n\n')
    .replace(/^(#{1,6})\s*\n/gm, '')
    .replace(/\*\*\s*\*\*/g, '')
    .trim()
}

// ============================================================
// VALIDAÇÃO DE QUALIDADE DA RESPOSTA
// ============================================================

function validateResponseQuality(response: string, message: string): { isGood: boolean; reason?: string } {
  // Muito curta para perguntas que precisam de detalhe
  const needsDetail = message.toLowerCase().match(/(plano|cardápio|treino|receita|alimentação|exercício|como|o que|quais|dicas|sugestão|sugestões|me ajud|preciso)/)
  
  if (needsDetail && response.length < 500) {
    return { isGood: false, reason: 'too_short' }
  }
  
  if (response.length < 100) {
    return { isGood: false, reason: 'too_short' }
  }
  
  // Respostas genéricas demais
  const genericPhrases = ['não tenho informações', 'não posso ajudar', 'sinto muito', 'como assistente de ia', 'como modelo de linguagem']
  if (genericPhrases.some(p => response.toLowerCase().includes(p))) {
    return { isGood: false, reason: 'too_generic' }
  }
  
  return { isGood: true }
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
        
        profile.memories = await loadUserMemories(supabase, user.id)
        
        if (profile.phase === 'ACTIVE') {
          const faseMem = profile.memories.find(m => m.content.startsWith('fase_vida:'))
          if (faseMem) profile.phase = faseMem.content.split(':')[1]
        }
        
        const { count } = await supabase
          .from('chat_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
        profile.conversationCount = count || 0
      }
    } catch (dbError) { console.warn('Erro ao carregar perfil:', dbError) }

    // --- Detectar contexto ---
    const topics = detectTopics(message)
    const mood = detectMood(message)
    
    // --- Anti-repetição ---
    const antiRepetitionDigest = buildConversationDigest(history)
    
    // --- Sugestões inteligentes ---
    const suggestions = generateSuggestions(topics, profile.phase, history)

    // --- Salvar memórias ---
    const newMemories = extractMemoriesFromConversation(message)
    if (newMemories.length > 0 && userId) {
      try {
        const supabase = await createClient()
        await saveUserMemories(supabase, userId, newMemories, sessionId)
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
    const systemPrompt = buildSystemPrompt(profile, searchContext, mood, topics, antiRepetitionDigest)
    
    const chatHistory = history.slice(-20).map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }))

    // ===== 1. GROQ (Llama 3.3 70B) =====
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
            temperature: 0.7,
            max_tokens: 4096,
            top_p: 0.9,
            frequency_penalty: 0.3,
            presence_penalty: 0.2,
          })
        })
        if (response.ok) {
          const data = await response.json()
          const text = data.choices?.[0]?.message?.content
          if (text) {
            const quality = validateResponseQuality(text, message)
            if (quality.isGood) {
              return NextResponse.json({ response: cleanMarkdown(text), provider: 'groq', suggestions })
            }
            // Se falhou qualidade, tentar Gemini
            console.warn('Groq resposta baixa qualidade:', quality.reason)
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
            generationConfig: { temperature: 0.7, maxOutputTokens: 4096, topP: 0.9 },
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
            parameters: { max_new_tokens: 3000, temperature: 0.7, return_full_text: false }
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

    // ===== 4. FALLBACK LOCAL =====
    return NextResponse.json({
      response: generateSmartFallback(message, profile, mood, topics, history),
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
// FALLBACK LOCAL ULTRA
// ============================================================

function generateSmartFallback(message: string, profile: UserProfile, mood: string, topics: string[], history: { role: string; content: string }[]): string {
  const { name, phase } = profile
  const l = message.toLowerCase()
  const isPostpartum = phase === 'POSTPARTUM'
  const isPregnant = phase === 'PREGNANT'
  
  const mentionedPostpartum = l.match(/(acabou de ter|acabei de ter|tive (meu |minha )?(bebê|filh)|pós[- ]?parto|recém|amamentando|nasceu|\d+ meses? de vida)/)
  const mentionedBreastfeeding = l.match(/(amamentando|amamento|amamentação|dando (de )?mamar|leite materno|lactante)/)
  
  // ---- Verificar se já deu este tipo de resposta antes (anti-repetição) ----
  const previousAssistantMsgs = history.filter(m => m.role === 'assistant')
  const alreadyGaveMealPlan = previousAssistantMsgs.some(m => m.content.includes('Plano Semanal') && m.content.includes('Café da Manhã'))
  
  // PLANO ALIMENTAR
  if (l.match(/(plano alimentar|plano de alimentação|cardápio|o que comer|dieta|alimentação|monte um plano)/)) {
    
    if (alreadyGaveMealPlan) {
      return `${name}, vi que já montamos um plano alimentar nessa conversa! 😊 Posso te ajudar com algo mais específico:

## O Que Posso Fazer Agora

### 📝 Aprofundar
- Receitas detalhadas de qualquer refeição do plano
- Versão para dias corridos (refeições rápidas em 15 min)
- Adaptar para restrição alimentar (vegetariana, sem lactose, etc.)

### 🛒 Praticidade
- Lista de compras organizada por seção do mercado
- Preparação antecipada (meal prep) para a semana
- Substituições econômicas mantendo o valor nutricional

### 📊 Complementar
- Plano de hidratação detalhado
- Guia de suplementos para sua fase
- Lanches práticos para ter sempre à mão

Me diz o que te interessa mais! Ou se prefere um plano completamente diferente com outras receitas, é só pedir 💜`
    }
    
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
Alternar entre: mix de castanhas (3-4 unidades), 1 fruta (maçã, pera, banana), iogurte natural com 1 colher de mel, ou 1 fatia de queijo com torrada integral.

### 🍲 Almoço (12h-13h)

**Base fixa:** arroz integral ou branco + feijão (ou lentilha) + salada variada (folhas verdes, tomate, cenoura, beterraba).

| Dia | Proteína | Complemento |
|-----|----------|-------------|
| Seg | Frango grelhado (150g) | Abóbora refogada |
| Ter | Peixe assado — tilápia ou salmão (150g) | Purê de batata-doce |
| Qua | Carne moída refogada (130g) | Abobrinha grelhada |
| Qui | Frango desfiado (150g) | Quiabo refogado |
| Sex | Peixe grelhado (150g) | Cenoura e vagem no vapor |
| Sáb | Carne assada magra (130g) | Mandioca cozida |
| Dom | Frango ao molho (150g) | Macarrão integral |

### 🧃 Lanche da Tarde (15h-16h)
Alternar entre: vitamina de banana com aveia e leite (300ml), sanduíche natural (frango desfiado com cenoura ralada), frutas com pasta de amendoim (2 colheres), ou 1 fatia de bolo integral caseiro.

### 🌙 Jantar (19h-20h)
Versão mais leve do almoço. Opções: sopa de legumes com frango desfiado, omelete de 2 ovos com salada verde, wrap integral com atum e folhas, ou caldo de feijão com torrada integral.

### 🫖 Ceia (22h — opcional)
Chá de erva-doce ou camomila + 1 fruta leve (maçã ou pera) ou 1 copo de leite morno (200ml).

## Alimentos que Ajudam na Amamentação

- **Aveia** — estimula a produção de leite (galactogênico comprovado)
- **Castanhas e nozes** — gorduras boas, energia e vitamina E
- **Salmão e sardinha** — ômega-3 essencial para o desenvolvimento cerebral do bebê
- **Folhas verde-escuras** (espinafre, couve, rúcula) — ferro e cálcio
- **Ovos** — proteína completa, colina e vitamina D
- **Água de coco** — hidratação, potássio e eletrólitos naturais
- **Sementes de linhaça e chia** — ômega-3 vegetal e fibras

## Alimentos para Evitar ou Moderar

- **Café em excesso** — máx. 2 xícaras pequenas/dia (a cafeína passa pelo leite)
- **Álcool** — evitar completamente durante amamentação
- **Ultraprocessados** — salgadinhos, embutidos, refrigerantes
- **Açúcar refinado** em excesso — prefira mel, açúcar demerara ou frutas
- **Observe cólicas no bebê** — leite de vaca, chocolate, brócolis e repolho são os mais comuns causadores

💡 **Curiosidade:** O leite materno é composto por cerca de 87% de água! Por isso manter a hidratação alta é tão importante — cada gole de água que você bebe ajuda diretamente na produção de leite de qualidade.

Se quiser, posso gerar esse plano em um **documento formatado (.docx ou PDF)** para facilitar a consulta no dia a dia! 😊

Você já está tomando algum suplemento vitamínico ou mineral durante a amamentação?`
    }
    
    if (isPregnant || l.match(/(grávida|gestante|gravidez)/)) {
      const week = profile.gestationWeek
      const trimesterInfo = week ? (week <= 13 ? 'No 1º trimestre, o foco é ácido fólico e combater enjoos com refeições pequenas e frequentes.' : week <= 27 ? 'No 2º trimestre, aumente gradualmente as calorias (~300 kcal extras/dia) e foque em ferro e cálcio.' : 'No 3º trimestre, refeições menores e mais frequentes ajudam com a compressão do estômago. Foque em ferro e proteínas.') : 'A demanda calórica aumenta gradualmente — cerca de **300 kcal extras/dia** no 2º e 3º trimestre.'
      
      return `${name}, aqui vai um plano alimentar completo para a sua gestação${week ? ` (${week} semanas)` : ''}! Lembre-se de validar com seu nutricionista para ajustes individuais.

## Princípios Gerais

${trimesterInfo} Priorize alimentos ricos em **ácido fólico, ferro, cálcio e ômega-3**. Hidratação mínima de **2,5 litros de água/dia**. Coma a cada 3 horas para evitar hipoglicemia e enjoos.

## Plano Semanal (Modelo Rotativo)

### 🍳 Café da Manhã (7h-8h)

| Dia | Opção |
|-----|-------|
| Seg | 2 ovos mexidos + 1 torrada integral com azeite + suco de laranja (vitamina C ajuda absorção de ferro) |
| Ter | Vitamina de banana com aveia, mel e leite (350ml) |
| Qua | Iogurte natural com granola e frutas vermelhas (morango, mirtilo) |
| Qui | Tapioca com queijo branco e tomate + 1 fruta |
| Sex | Mingau de aveia com canela, maçã picada e nozes |
| Sáb | Pão integral com pasta de amendoim + banana fatiada + leite |
| Dom | Panqueca de banana com aveia (2 un.) + mel e frutas |

### 🍎 Lanche da Manhã (10h)
Alternar entre: 1 fruta + 3 castanhas-do-pará (selênio!), iogurte grego com mel, torrada integral com cottage, ou mix de frutas secas (30g).

### 🍲 Almoço (12h-13h)

**Base fixa:** arroz + feijão + salada colorida (folhas, tomate, cenoura, beterraba) + 1 fio de azeite + limão (vitamina C para absorção de ferro).

| Dia | Proteína | Complemento |
|-----|----------|-------------|
| Seg | Frango grelhado (150g) | Brócolis e cenoura no vapor |
| Ter | Peixe assado — tilápia (150g) | Batata-doce assada |
| Qua | Bife de fígado (100g — 1x/semana, riquíssimo em ferro!) | Espinafre refogado |
| Qui | Frango desfiado (150g) | Abóbora refogada com alho |
| Sex | Salmão grelhado (150g — ômega-3!) | Purê de mandioquinha |
| Sáb | Carne assada magra (130g) | Legumes grelhados variados |
| Dom | Frango ao forno com ervas (150g) | Macarrão integral ao sugo |

### 🥪 Lanche da Tarde (15h-16h)
Vitamina de frutas com leite, sanduíche natural de frango, frutas com iogurte e granola, ou 1 fatia de bolo de cenoura integral.

### 🌙 Jantar (19h-20h)
Refeição mais leve: sopa de legumes com frango, omelete de 2 ovos com salada, wrap integral com atum e rúcula, ou caldo de feijão com torrada.

### 🫖 Ceia (22h — se tiver fome)
1 copo de leite morno com canela (200ml) ou chá de camomila + 3 biscoitos integrais ou 1 banana.

## Nutrientes Essenciais na Gravidez

- **Ácido fólico** (600mcg/dia) — feijão, lentilha, espinafre, brócolis, laranja
- **Ferro** (27mg/dia) — carnes vermelhas, feijão + limão, espinafre, beterraba
- **Cálcio** (1000mg/dia) — leite, iogurte, queijo, brócolis, gergelim
- **Ômega-3** — salmão, sardinha, linhaça, chia (desenvolvimento cerebral do bebê)
- **Vitamina D** — 15 min de sol/dia, ovos, peixes gordos
- **Vitamina B12** — carnes, ovos, laticínios

## Alimentos para Evitar

- **Peixes crus** (sushi/sashimi) — risco de toxoplasmose e listeria
- **Carnes mal passadas** — sempre bem passadas
- **Queijos não pasteurizados** (brie, camembert, gorgonzola)
- **Cafeína em excesso** — máx. 200mg/dia (≈ 1 xícara de café)
- **Álcool** — tolerância zero
- **Adoçantes artificiais** — prefira mel ou açúcar demerara com moderação
- **Chás de boldo, canela em excesso e arruda** — podem causar contrações

💡 **Dica:** Coma 1 castanha-do-pará por dia — ela fornece toda a sua necessidade diária de selênio, um mineral antioxidante importantíssimo para a gestação!

Posso gerar em **documento formatado (.docx ou PDF)** para imprimir ou consultar! 😊

Você já está tomando ácido fólico e vitaminas pré-natais? E tem alguma restrição alimentar que eu deva considerar?`
    }
    
    return `${name}, vou montar um plano alimentar completo para você! Para personalizar melhor, me conta:

## Preciso Saber

- 🤰 **Fase:** Está grávida, no pós-parto, tentando engravidar ou cuidando do bem-estar geral?
- 🥗 **Restrições:** Tem alguma restrição alimentar (vegetariana, intolerância a lactose, etc)?
- 🎯 **Objetivo:** Ganhar peso saudável, manter, recuperação pós-parto?
- ⏰ **Rotina:** Tem tempo para cozinhar ou precisa de opções rápidas?

Enquanto isso, uma dica rápida: monte seu prato ideal com o método do **prato colorido** — 1/4 de proteína, 1/4 de carboidrato integral, e 1/2 de vegetais variados + 1 fio de azeite 🥑

Me conta sua fase que já monto o plano completo! 💜`
  }

  // RECEITAS
  if (l.match(/(receita|como fazer|como preparar|me ensina|ensina a fazer)/)) {
    const isQuick = l.match(/(rápida|rápido|prática|fácil|15 min|rápidas)/)
    
    return `${name}, vou te dar ${isQuick ? 'receitas práticas e rápidas' : 'ótimas receitas'}! 🍳

## 1. Panqueca Proteica de Banana e Aveia
**Tempo:** 10 min | **Rende:** 4 unidades

### Ingredientes
- 1 banana madura
- 2 ovos
- 3 colheres de sopa de aveia em flocos
- 1 pitada de canela
- 1 colher de chá de mel (opcional)

### Modo de Preparo
1. Amasse a banana com um garfo até virar purê
2. Misture os ovos e a aveia até ficar homogêneo
3. Aqueça uma frigideira antiaderente em fogo médio
4. Coloque 1 concha da massa e espalhe
5. Espere 2 minutos até dourar, vire e espere mais 1 minuto
6. Sirva com frutas frescas e mel

**Valor nutricional (4 un.):** ~320 kcal | 18g proteína | 38g carb | 12g gordura

---

## 2. Bowl de Frango Desfiado Express
**Tempo:** 15 min (usando frango já cozido) | **Rende:** 1 porção

### Ingredientes
- 150g de frango desfiado (pode ser do dia anterior)
- 1/2 xícara de arroz integral cozido
- 1/2 abacate fatiado
- Tomate cereja cortado ao meio (5-6 un.)
- Folhas de rúcula
- 1 fio de azeite + limão + sal

### Modo de Preparo
1. Monte na tigela: arroz na base, frango de um lado, abacate do outro
2. Adicione tomates e rúcula
3. Tempere com azeite, limão e sal
4. Pronto! Nutritivo e rápido

**Valor nutricional:** ~480 kcal | 38g proteína | 32g carb | 22g gordura

---

## 3. Sopa Cremosa de Abóbora com Gengibre
**Tempo:** 25 min | **Rende:** 4 porções

### Ingredientes
- 500g de abóbora cabotiá picada
- 1 cebola picada
- 2 dentes de alho
- 1 colher de chá de gengibre ralado
- 500ml de caldo de legumes (ou água)
- Sal, pimenta e noz-moscada
- 1 fio de azeite

### Modo de Preparo
1. Refogue cebola e alho no azeite por 2 min
2. Adicione abóbora e gengibre, refogue mais 3 min
3. Cubra com caldo, tampe e cozinhe 15 min até amolecer
4. Bata tudo no liquidificador até ficar cremoso
5. Ajuste sal e temperos. Sirva quente!

**Valor nutricional (porção):** ~120 kcal | 3g proteína | 18g carb | 4g gordura

💡 **Dica:** Congele porções individuais para ter sempre uma refeição saudável pronta — basta descongelar no micro-ondas!

Quer mais receitas? Posso fazer receitas específicas para ${isPostpartum || mentionedBreastfeeding ? 'amamentação (galactogênicas)' : isPregnant ? 'gestação' : 'seu objetivo'}! 😊`
  }

  // EXERCÍCIOS / TREINO
  if (l.match(/(exercício|treino|academia|malhar|atividade física|yoga|pilates|alongamento)/)) {
    const isPostpartumExercise = isPostpartum || mentionedPostpartum
    
    return `${name}, aqui vai um treino completo e seguro para ${isPostpartumExercise ? 'o pós-parto' : isPregnant ? 'gestantes' : 'você'}! 💪

## Treino ${isPostpartumExercise ? 'Recuperação Pós-Parto' : isPregnant ? 'Gestante Ativa' : 'Bem-Estar Feminino'}
**Duração:** 25 minutos | **Nível:** Iniciante/Intermediário | **Frequência:** 3-4x/semana

### 🔥 Aquecimento (5 min)
1. **Marcha no lugar** — 1 minuto (eleve os joelhos alternadamente)
2. **Rotação de ombros** — 30 segundos para frente, 30 para trás
3. **Inclinação lateral do tronco** — 10 repetições cada lado
4. **Respiração diafragmática** — 5 respirações profundas (inspire 4s, expire 6s)

### 💪 Parte Principal (15 min)

1. **Agachamento sumo** — 3 séries x 12 repetições
   📌 Pés afastados na largura dos ombros, pontas para fora. Desça como se fosse sentar, joelhos acompanham a ponta dos pés.

2. **Elevação pélvica (ponte)** — 3 séries x 15 repetições
   📌 Deitada, joelhos flexionados, eleve o quadril contraindo glúteos. Segure 2 segundos no topo.${isPostpartumExercise ? ' Excelente para recuperação do assoalho pélvico!' : ''}

3. **Prancha no antebraço** — 3 séries x 20 segundos
   📌 Cotovelos alinhados com ombros, corpo reto da cabeça aos pés. ${isPregnant ? 'Pode fazer apoiada nos joelhos se ficar desconfortável.' : 'Aumente 5 segundos a cada semana.'}

4. **Afundo estacionário** — 3 séries x 10 cada perna
   📌 Passo à frente, joelho de trás quase toca o chão. Mantenha tronco ereto.

5. **Abdução de quadril** — 3 séries x 15 cada lado
   📌 Deitada de lado, eleve a perna de cima mantendo o corpo alinhado.

6. **Rosca bíceps com garrafa** — 3 séries x 12 repetições
   📌 Use garrafas de 500ml cheias de água ou areia. Flexione o cotovelo mantendo-o junto ao corpo.

7. **Kegel** — 3 séries x 10 contrações (segure 5 segundos cada)
   📌 Contraia como se fosse segurar o xixi. ${isPostpartumExercise ? 'Fundamental para recuperação do períneo!' : 'Fortalece o assoalho pélvico.'}

### 🧘 Volta à Calma (5 min)
1. **Alongamento de posterior** — 30 segundos cada perna
2. **Borboleta sentada** — 30 segundos (abra os joelhos e pressione para baixo)
3. **Gato-vaca** — 10 repetições lentas (de quatro, alterne arqueando e curvando a coluna)
4. **Criança** — 30 segundos (ajoelhada, braços estendidos à frente, relaxe)
5. **Respiração final** — 5 respirações profundas com olhos fechados

### ⚠️ Sinais para Parar Imediatamente
- Tontura, falta de ar ou dor no peito
- Sangramento vaginal
- Dor abdominal ou pélvica intensa
- Contrações antes do esperado${isPregnant ? '\n- Vazamento de líquido amniótico' : ''}

### 💡 Dicas Importantes
- **Hidrate-se** antes, durante e depois (tenha uma garrafa de 500ml por perto)
- **Vista roupas confortáveis** e tênis com bom amortecimento
- **Respire** — nunca prenda a respiração durante os exercícios
- **Progressão gradual** — aumente repetições ou tempo a cada semana

💡 **Curiosidade:** Exercícios regulares durante ${isPostpartumExercise ? 'o pós-parto ajudam a combater o baby blues e melhoram a qualidade do sono' : isPregnant ? 'a gravidez podem reduzir o risco de diabetes gestacional em até 27%' : 'a rotina melhoram o humor, o sono e a energia'}!

Posso gerar em **PDF** para acompanhar durante o treino! 😊

Quer que eu monte um treino para outros dias da semana também? Ou prefere focar em algo específico (core, perna, relaxamento)?`
  }

  // SAUDAÇÃO
  if (l.match(/^(oi|olá|ola|hey|eai|e ai|bom dia|boa tarde|boa noite|opa|tudo bem|oie|oii|oin)/)) {
    const greeting = l.includes('bom dia') ? 'Bom dia' : l.includes('boa tarde') ? 'Boa tarde' : l.includes('boa noite') ? 'Boa noite' : 'Olá'
    return `${greeting}, ${name}! 😊 Que bom te ver por aqui!

Sou a **Vita**, sua assistente de saúde e bem-estar no VitaFit. Posso te ajudar com:

- 🍎 **Nutrição** — planos alimentares completos com cardápio semanal, receitas detalhadas, orientação sobre suplementos
- 🏋️ **Exercícios** — treinos seguros e personalizados para cada fase, com séries, repetições e dicas de execução
- 🤰 **Gravidez** — desenvolvimento do bebê semana a semana, sintomas, exames, preparação para o parto
- 🤱 **Amamentação** — alimentação galactogênica, posições, dificuldades comuns e soluções
- 💊 **Suplementos** — o que tomar, quando e por quê
- 😴 **Sono e bem-estar** — rotinas, relaxamento, meditação guiada
- 💜 **Apoio emocional** — ansiedade, baby blues, autocuidado

Minhas respostas são completas e detalhadas — com tabelas, planos estruturados e dicas práticas!

Sobre o que quer conversar hoje?`
  }
  
  // EMOCIONAL
  if (mood === 'negative' || topics.includes('emocional')) {
    return `${name}, obrigada por compartilhar isso comigo 💜

Primeiro, quero que você saiba: **o que você está sentindo é válido e completamente normal.** ${isPostpartum ? 'O pós-parto é uma montanha-russa emocional — hormônios mudando, privação de sono, nova rotina... é muita coisa ao mesmo tempo.' : isPregnant ? 'A gestação traz mudanças hormonais intensas que afetam diretamente o humor e as emoções.' : 'Cuidar de si mesma é tão importante quanto cuidar dos outros.'}

## O Que Pode Ajudar Agora

### 🧘 Para Este Momento (Próximos 5 minutos)
1. **Respiração 4-7-8:** Inspire por 4 segundos → Segure 7 segundos → Expire por 8 segundos. Repita 4 vezes.
2. **Grounding:** Identifique 5 coisas que você vê, 4 que pode tocar, 3 sons, 2 cheiros, 1 sabor.
3. **Coloque uma mão no peito** e sinta sua respiração por 1 minuto inteiro.

### 🌿 Para os Próximos Dias
- **Movimento suave** — mesmo 10 minutos de caminhada liberam endorfinas
- **Luz solar** — 15 minutos de sol pela manhã regulam o relógio biológico
- **Conexão** — conversar com alguém de confiança (amiga, mãe, parceiro)
- **Alimentação** — alimentos ricos em triptofano (banana, aveia, castanhas) ajudam na produção de serotonina
- **Sono** — priorize dormir quando puder, mesmo que sejam cochilos curtos

### ⚠️ Quando Procurar Ajuda Profissional
- Tristeza persistente por mais de 2 semanas
- Dificuldade em criar vínculo com o bebê
- Pensamentos de se machucar ou machucar outros
- Choro constante sem motivo aparente
- Perda total de interesse nas coisas

Se identificar esses sinais, procure seu obstetra ou um psicólogo perinatal. **Pedir ajuda é um ato de coragem e amor** — por você e por quem depende de você 💜

💡 O CVV (Centro de Valorização da Vida) atende 24h pelo **188** ou chat em cvv.org.br

Quer conversar mais sobre isso? Estou aqui para te ouvir 😊`
  }

  // AMAMENTAÇÃO
  if (topics.includes('amamentação')) {
    return `${name}, vou te dar um guia completo sobre amamentação! 🤱

## Tudo Sobre Amamentação

### 📋 O Básico
A OMS recomenda **amamentação exclusiva até os 6 meses** e complementar até pelo menos 2 anos. O leite materno é o alimento mais completo para o bebê — contém anticorpos, nutrientes e se adapta às necessidades do bebê em cada fase.

### 🍼 Posições Corretas

| Posição | Quando Usar | Dica |
|---------|-------------|------|
| **Tradicional (berço)** | Mais comum, bebê deitado no braço | Barriga do bebê encostada na sua |
| **Invertida (futebol americano)** | Cesárea, mamas grandes | Bebê fica sob seu braço, pés para trás |
| **Deitada** | Noite, cansaço, cesárea | Vocês duas deitadas de lado |
| **Cavalinho** | Bebê com refluxo | Bebê sentado no seu colo de frente |

### 🍎 Alimentação que Aumenta o Leite (Galactogênicos)
- **Aveia** — o mais famoso galactogênico natural (mingau, vitamina, granola)
- **Erva-doce** — como chá (2-3 xícaras/dia) ou no tempero
- **Água** — mínimo 3 litros/dia (tenha SEMPRE uma garrafa por perto!)
- **Castanhas e nozes** — 3-4 unidades por dia
- **Cerveja preta SEM álcool** — o malte ajuda na produção (1 copo/dia)
- **Canjica** — tradição brasileira com respaldo: aveia + leite + milho

### ❓ Dúvidas Mais Comuns

**"Meu leite é fraco?"**
Não existe leite fraco! O leite materno se adapta às necessidades do bebê. O leite do início da mamada (anterior) é mais aguado para hidratar; o do final (posterior) é mais gorduroso para saciar.

**"Como saber se está mamando o suficiente?"**
✅ 6+ fraldas molhadas por dia
✅ Ganho de peso adequado (pediatra monitora)
✅ Bebê satisfeito após mamadas
✅ Você sente as mamas aliviando durante a mamada

**"Dor ao amamentar é normal?"**
Um leve desconforto nos primeiros dias pode ser normal, mas **dor intensa NÃO é normal**. Geralmente indica pega incorreta. Busque um consultor de amamentação se a dor persistir.

💡 **Curiosidade:** O leite materno muda de composição ao longo do dia! De manhã tem mais cortisol (para despertar), e à noite tem mais melatonina (para ajudar o bebê a dormir). Incrível, né?

Quer que eu aprofunde em algum desses tópicos? Ou quer um plano alimentar focado em aumentar a produção de leite? 😊`
  }

  // AGRADECIMENTO
  if (l.match(/^(obrigad[oa]|valeu|brigad[oa]|thanks|vlw|tmj)/)) {
    return `De nada, ${name}! 😊 Fico feliz em ajudar!

Se precisar de qualquer coisa — plano alimentar, treino, receitas, tirar dúvidas — é só chamar. Estou aqui 24h por dia para te acompanhar nessa jornada! 💜

Tem mais alguma coisa que posso fazer por você?`
  }

  // DEFAULT — resposta inteligente
  return `${name}, posso te ajudar com uma resposta completa sobre isso! 😊

Para te dar a melhor orientação, me conta um pouquinho mais do contexto:

- 🤰 **Sua fase:** grávida, pós-parto, tentando engravidar ou bem-estar geral?
- 🎯 **Objetivo:** o que você gostaria de alcançar?

Enquanto isso, posso te ajudar com qualquer um desses temas:

- 🍎 **Plano alimentar completo** — cardápio semanal com tabelas, quantidades e alternativas
- 🏋️ **Treino personalizado** — exercícios detalhados com séries, repetições e dicas
- 🍳 **Receitas saudáveis** — passo a passo com valor nutricional
- 💊 **Suplementos** — o que tomar e quando
- 🤱 **Amamentação** — alimentação, posições, dificuldades
- 😴 **Sono e bem-estar** — rotinas e dicas práticas
- 💜 **Apoio emocional** — técnicas de relaxamento e autocuidado

É só me dizer sobre o que quer conversar! 💜`
}
