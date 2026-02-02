// Versão: 02-02-2026-v1 - Chat IA Premium Ultra com Respostas Ricas e Sugestões
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
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function detectTopics(message: string): string[] {
  const topics: string[] = []
  const l = message.toLowerCase()
  const map: Record<string, string[]> = {
    'nutrição': ['comer', 'comida', 'alimento', 'dieta', 'nutrição', 'refeição', 'vitamina', 'proteína', 'carboidrato', 'receita', 'café', 'almoço', 'jantar', 'lanche', 'fruta', 'verdura', 'legume', 'salmão', 'ferro', 'cálcio', 'ácido fólico', 'folato', 'ômega', 'suplemento', 'cardápio', 'alimentar', 'engordar', 'peso', 'gordura', 'integral', 'açúcar', 'sal', 'glúten', 'lactose', 'vegana', 'vegetariana'],
    'exercícios': ['exercício', 'treino', 'academia', 'yoga', 'pilates', 'caminhada', 'atividade física', 'malhar', 'alongamento', 'natação', 'musculação', 'cardio', 'corrida', 'dança', 'bicicleta', 'kegel', 'agachamento'],
    'gravidez': ['grávida', 'gravidez', 'gestação', 'gestante', 'bebê', 'parto', 'semanas', 'trimestre', 'ultrassom', 'pré-natal', 'prenatal', 'cesariana', 'cesárea', 'contração', 'dilatação', 'bolsa', 'placenta', 'cordão', 'útero', 'feto', 'embrião'],
    'sintomas': ['enjoo', 'náusea', 'dor', 'cólica', 'inchaço', 'cansaço', 'tontura', 'azia', 'constipação', 'prisão de ventre', 'câimbra', 'falta de ar', 'dor de cabeça', 'vômito', 'coceira', 'corrimento', 'sangramento', 'varizes', 'hemorroida', 'refluxo'],
    'emocional': ['ansiedade', 'ansiosa', 'medo', 'triste', 'tristeza', 'feliz', 'preocupada', 'estresse', 'chorar', 'depressão', 'angústia', 'nervosa', 'insegura', 'irritada', 'humor', 'choro', 'solidão'],
    'amamentação': ['amamentar', 'amamentação', 'leite', 'mama', 'peito', 'mamadeira', 'pega', 'bico', 'colostro', 'lactação', 'desmame'],
    'sono': ['dormir', 'sono', 'insônia', 'descanso', 'cansada', 'exausta', 'sonolência', 'cochilo'],
    'bebê': ['bebê', 'recém-nascido', 'nome', 'enxoval', 'bolsa maternidade', 'fralda', 'chupeta', 'berço', 'carrinho'],
    'exames': ['exame', 'ultrassom', 'sangue', 'glicose', 'teste', 'resultado', 'hemograma', 'toxoplasmose', 'diabetes gestacional', 'pré-eclâmpsia', 'pressão'],
    'beleza': ['cabelo', 'pele', 'estria', 'mancha', 'acne', 'unha', 'tintura', 'cosmético', 'creme', 'protetor solar'],
    'trabalho': ['trabalho', 'licença', 'maternidade', 'voltar', 'emprego', 'carreira', 'chefe'],
    'relacionamento': ['marido', 'parceiro', 'namorado', 'relação', 'sexo', 'intimidade', 'família', 'sogra'],
  }
  for (const [topic, keywords] of Object.entries(map)) {
    if (keywords.some(kw => l.includes(kw))) topics.push(topic)
  }
  return topics
}

function detectMood(message: string): 'negative' | 'positive' | 'curious' | 'urgent' | 'neutral' {
  const l = message.toLowerCase()
  if (['urgente', 'emergência', 'sangramento', 'dor forte', 'contração', 'hospital', 'socorro', 'perigo'].some(w => l.includes(w))) return 'urgent'
  if (['triste', 'medo', 'ansiedade', 'ansiosa', 'dor', 'ruim', 'angústia', 'deprimida', 'chorar', 'nervosa', 'preocupada', 'exausta', 'sozinha', 'horrível', 'péssimo', 'sofrendo', 'desanimada', 'frustrada', 'irritada'].some(w => l.includes(w))) return 'negative'
  if (['feliz', 'alegre', 'ótimo', 'maravilhosa', 'bem', 'animada', 'contente', 'amor', 'incrível', 'empolgada', 'legal', 'ótima'].some(w => l.includes(w))) return 'positive'
  if (['como', 'qual', 'quais', 'quando', 'porque', 'por que', 'o que', 'será', 'pode', 'posso', 'devo', 'é normal', 'é seguro', 'faz mal', 'preciso'].some(w => l.includes(w))) return 'curious'
  return 'neutral'
}

function getTrimestreInfo(week: number): { trimestre: number; nome: string; descricao: string; tamanho: string; desenvolvimento: string; nutrientes: string; cuidados: string } {
  if (week <= 4) return { trimestre: 1, nome: '1º trimestre (início)', descricao: 'implantação e formação inicial', tamanho: 'uma semente de papoula', desenvolvimento: 'O embrião está se implantando no útero. As células estão se dividindo rapidamente.', nutrientes: 'Ácido fólico (600mcg/dia), vitamina B12, ferro', cuidados: 'Evite álcool e cigarro. Comece o ácido fólico se ainda não toma.' }
  if (week <= 8) return { trimestre: 1, nome: '1º trimestre', descricao: 'formação dos órgãos principais', tamanho: 'uma framboesa', desenvolvimento: 'O coraçãozinho já bate! Braços e pernas começam a se formar. O cérebro está em desenvolvimento acelerado.', nutrientes: 'Ácido fólico, ferro (espinafre, feijão), vitamina C (ajuda absorver ferro)', cuidados: 'Enjoos são comuns. Coma pouco e com frequência. Gengibre ajuda muito.' }
  if (week <= 13) return { trimestre: 1, nome: '1º trimestre (final)', descricao: 'finalização da formação básica', tamanho: 'um limão', desenvolvimento: 'Todos os órgãos principais já estão formados. Unhas e impressões digitais começam a aparecer.', nutrientes: 'Ácido fólico, ferro, proteínas (70g/dia), água (2.5L/dia)', cuidados: 'Os enjoos tendem a melhorar em breve. Continue com as vitaminas pré-natais.' }
  if (week <= 17) return { trimestre: 2, nome: '2º trimestre (início)', descricao: 'fase de ouro da gravidez', tamanho: 'um abacate', desenvolvimento: 'O bebê pode ouvir sua voz! Movimentos ficam mais coordenados. Sobrancelhas e cabelos surgem.', nutrientes: 'Ferro (27mg/dia), cálcio (1000mg/dia), ômega-3 (sardinha, salmão)', cuidados: 'Melhor fase para exercícios! Aproveite a energia extra.' }
  if (week <= 21) return { trimestre: 2, nome: '2º trimestre', descricao: 'crescimento acelerado', tamanho: 'uma banana', desenvolvimento: 'Você pode sentir os primeiros chutes! O bebê tem ciclos de sono e vigília. Papilas gustativas se desenvolvem.', nutrientes: 'Ferro, cálcio, vitamina D (sol 15min/dia), proteínas magras', cuidados: 'Comece a conversar com o bebê - ele reconhece sua voz!' }
  if (week <= 27) return { trimestre: 2, nome: '2º trimestre (final)', descricao: 'maturação dos sentidos', tamanho: 'uma couve-flor', desenvolvimento: 'Olhos se abrem pela primeira vez! Pulmões estão amadurecendo. O bebê reage a luz e sons.', nutrientes: 'DHA (ômega-3), ferro, cálcio, fibras (combate constipação)', cuidados: 'Teste de diabetes gestacional geralmente é feito agora. Mantenha-se hidratada.' }
  if (week <= 31) return { trimestre: 3, nome: '3º trimestre (início)', descricao: 'ganho de peso e maturação', tamanho: 'um coco', desenvolvimento: 'O bebê ganha cerca de 200g por semana! Cérebro em desenvolvimento intenso. Ele sonha e tem soluços.', nutrientes: 'Proteínas, cálcio, ferro, fibras, vitamina K (brócolis, couve)', cuidados: 'Coma porções menores. Elevando as pernas alivia inchaço.' }
  if (week <= 36) return { trimestre: 3, nome: '3º trimestre', descricao: 'preparação para o parto', tamanho: 'um melão', desenvolvimento: 'O bebê está praticando a respiração. A maioria vira de cabeça para baixo. Pulmões quase maduros.', nutrientes: 'Tâmaras (6/dia a partir de 36sem), proteínas, ferro, vitamina C', cuidados: 'Prepare a mala da maternidade. Pratique exercícios de respiração.' }
  return { trimestre: 3, nome: '3º trimestre (final)', descricao: 'reta final!', tamanho: 'uma melancia pequena', desenvolvimento: 'O bebê está pronto para nascer! Ganhando as últimas reservas de gordura. Todos os órgãos estão maduros.', nutrientes: 'Tâmaras, proteínas, ferro, muita água (3L/dia)', cuidados: 'Sinais de trabalho de parto: contrações regulares, perda do tampão, ruptura da bolsa.' }
}

function generateSuggestions(message: string, topics: string[], userPhase: string, gestationWeek?: number): string[] {
  const suggestions: string[] = []
  const tri = gestationWeek ? getTrimestreInfo(gestationWeek) : null

  if (topics.includes('nutrição')) {
    suggestions.push('Monte um cardápio completo para meu dia', 'Quais alimentos devo evitar?', 'Me dá uma receita rápida e saudável', 'Quais suplementos devo tomar?')
  } else if (topics.includes('exercícios')) {
    suggestions.push('Monte um treino de 20 minutos', 'Posso fazer agachamento?', 'Exercícios para dor lombar', 'Yoga ou pilates - qual melhor?')
  } else if (topics.includes('emocional')) {
    suggestions.push('Técnicas de respiração para ansiedade', 'Isso é normal na gravidez?', 'Como conversar com meu parceiro sobre isso', 'Dicas para melhorar meu humor')
  } else if (topics.includes('sintomas')) {
    suggestions.push('Remédios naturais para isso', 'Quando devo procurar o médico?', 'O que posso fazer agora para aliviar?', 'Isso é normal na minha fase?')
  } else if (topics.includes('sono')) {
    suggestions.push('Melhor posição para dormir grávida', 'Chás que ajudam no sono', 'Rotina para dormir melhor', 'Travesseiro de gestante vale a pena?')
  } else if (topics.includes('bebê')) {
    suggestions.push('Lista de enxoval essencial', 'Melhores nomes para bebê', 'Como montar o quarto do bebê', 'O que levar na mala da maternidade')
  } else if (topics.includes('amamentação')) {
    suggestions.push('Como ter mais leite', 'Dor na amamentação é normal?', 'Posições para amamentar', 'Alimentos que ajudam na lactação')
  } else if (topics.includes('gravidez')) {
    if (tri) {
      suggestions.push(
        `O que esperar na semana ${gestationWeek}?`,
        `Exames importantes no ${tri.nome}`,
        `Alimentação ideal para ${tri.nome}`,
        'Como está o desenvolvimento do bebê?'
      )
    } else {
      suggestions.push('Sintomas normais da gravidez', 'Alimentação para gestantes', 'Exercícios seguros', 'Como calcular semana gestacional')
    }
  } else if (topics.includes('exames')) {
    suggestions.push('Quais exames fazer nessa fase?', 'O que significa esse resultado?', 'Quando fazer ultrassom morfológico?', 'Preciso fazer teste de glicose?')
  } else {
    // Sugestões padrão baseadas na fase
    if (userPhase === 'PREGNANT' && tri) {
      suggestions.push(
        `O que comer com ${gestationWeek} semanas?`,
        'Exercícios seguros para hoje',
        'Como aliviar sintomas comuns',
        `Como está meu bebê na semana ${gestationWeek}?`
      )
    } else if (userPhase === 'POSTPARTUM') {
      suggestions.push('Alimentação para amamentação', 'Quando posso voltar a malhar?', 'Dicas para recuperação pós-parto', 'Como lidar com cansaço')
    } else if (userPhase === 'TRYING') {
      suggestions.push('Alimentação para fertilidade', 'Como calcular período fértil', 'Vitaminas para quem quer engravidar', 'Hábitos que aumentam as chances')
    } else {
      suggestions.push('Monte um plano alimentar', 'Sugestão de treino para hoje', 'Receitas saudáveis e rápidas', 'Dicas de bem-estar')
    }
  }

  return suggestions.slice(0, 4)
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
• Desenvolvimento atual: ${tri.desenvolvimento}
• Nutrientes prioritários: ${tri.nutrientes}
• Cuidados nessa fase: ${tri.cuidados}
• Faltam aproximadamente ${40 - gestationWeek} semanas para o parto`

    personalBlock = `COMO PERSONALIZAR:
• Sempre contextualize para a semana ${gestationWeek} especificamente
• Mencione o tamanho do bebê (${tri.tamanho}) quando falar sobre desenvolvimento
• Dê informações ESPECÍFICAS para o ${tri.nome}, nunca genéricas
• Quando sugerir alimentos, dê NOMES CONCRETOS com quantidades (ex: "2 ovos cozidos" não "proteínas")
• Quando sugerir exercícios, diga EXATAMENTE o que fazer (ex: "caminhe 25 min no ritmo moderado" não "faça exercícios leves")
• Se falar de sintomas, explique POR QUE acontecem nessa fase
• Inclua sempre uma CURIOSIDADE interessante sobre o bebê ou a fase`
  } else if (userPhase === 'PREGNANT') {
    phaseBlock = 'A usuária está grávida mas não informou a semana. Pergunte gentilmente em que semana ela está para personalizar as dicas.'
  } else if (userPhase === 'TRYING') {
    phaseBlock = `CONTEXTO: Tentando engravidar
• Foque em fertilidade, ácido fólico (400mcg/dia), alimentação balanceada
• Oriente sobre período fértil, temperatura basal, muco cervical
• Seja otimista e encorajadora, mas realista
• Sugira hábitos que comprovadamente melhoram fertilidade`
  } else if (userPhase === 'POSTPARTUM') {
    phaseBlock = `CONTEXTO: Pós-parto
• Foque em recuperação, amamentação, nutrição para lactante
• Alimentos galactogênicos: aveia, linhaça, água de coco, cerveja preta sem álcool
• Cuidados com saúde mental (baby blues/depressão pós-parto)
• Retorno gradual a exercícios (após liberação médica, geralmente 6-8 semanas)`
  } else {
    phaseBlock = 'Fase: bem-estar geral feminino. Foque em saúde, nutrição e exercícios para mulheres.'
  }

  const moodBlock = mood === 'urgent'
    ? `ATENÇÃO: A mensagem pode indicar urgência médica. Priorize orientar sobre sinais de alerta e SEMPRE recomende contato imediato com o obstetra ou ida ao hospital. Dê informações práticas do que fazer enquanto isso.`
    : mood === 'negative'
    ? `IMPORTANTE: A usuária parece emocionalmente vulnerável. Priorize acolhimento antes de informação. Valide o que ela sente ("é completamente normal", "você não está sozinha"). Depois ofereça 2-3 dicas práticas e acionáveis.`
    : mood === 'positive'
    ? 'A usuária está com humor positivo! Celebre com ela e mantenha a energia. Compartilhe uma curiosidade legal ou algo empolgante sobre a fase dela.'
    : mood === 'curious'
    ? 'A usuária está em modo curioso/explorando. Dê respostas completas com OPÇÕES e ALTERNATIVAS. Apresente diferentes perspectivas quando relevante.'
    : ''

  return `Você é a VITA, assistente especialista em saúde materna e bem-estar feminino do app VitaFit. Você combina conhecimento de nutricionista, enfermeira obstétrica, personal trainer especializada em gestantes e psicóloga perinatal.

PERSONALIDADE:
• Fala como uma amiga enfermeira: carinhosa, experiente e prática
• Linguagem 100% brasileira natural (nada de "você poderia considerar" ou "é importante notar")
• Empática e acolhedora, nunca julgadora
• SEMPRE dá dicas acionáveis e específicas (com nomes, quantidades, horários)
• Traz curiosidades e informações que surpreendem positivamente

INFORMAÇÕES DA USUÁRIA:
• Nome: ${userName}
${phaseBlock}
${personalBlock}
${moodBlock ? `\n${moodBlock}` : ''}
${topics.length > 0 ? `\nTópicos detectados: ${topics.join(', ')}` : ''}

REGRAS OBRIGATÓRIAS DE RESPOSTA:
1. PERSONALIZAÇÃO: Use "${userName}" e dados específicos da fase dela SEMPRE
2. ESPECIFICIDADE: Nunca diga "coma proteínas" → diga "ovo cozido, frango grelhado ou iogurte grego"
   Nunca diga "faça exercícios leves" → diga "caminhe 20 minutos ou faça 10 min de alongamento"
   Nunca diga "beba bastante água" → diga "tente beber pelo menos 8 copos (2L) até o fim do dia"
3. OPÇÕES: Sempre que possível, apresente 2-3 OPÇÕES diferentes para a pessoa escolher
   Ex: "Pra esse sintoma, você pode tentar: 1) chá de gengibre... 2) acupressão no ponto P6... 3) comer biscoito seco..."
4. ESTRUTURA: Parágrafos curtos (2-3 linhas). Listas com • quando listar itens. Sem blocos longos
5. DICA DO DIA: Inclua sempre pelo menos 1 dica CONCRETA que ela possa aplicar AGORA
6. FOLLOW-UP: Termine com UMA pergunta natural para manter a conversa
7. EMOJIS: 3-5 emojis por resposta, distribuídos naturalmente
8. COMPRIMENTO: 200-400 palavras. Resposta rica e completa, mas sem virar artigo
9. NÃO USE: asteriscos para negrito/itálico, markdown, hashtags (#)
10. CURIOSIDADES: Inclua 1 fato interessante ou pouco conhecido quando relevante
11. SEGURANÇA: Para questões médicas sérias, PRIMEIRO dê informação útil, DEPOIS recomende profissional
12. TOM: Como áudio de WhatsApp para uma amiga grávida - natural, caloroso, informativo

FORMATO IDEAL:
[Saudação pessoal com contexto da fase]

[Resposta principal com informações específicas e NOMES CONCRETOS]

[2-3 opções ou alternativas quando aplicável]

[Dica prática para aplicar hoje]

[Uma curiosidade ou fato interessante]

[Pergunta de follow-up natural]

EXEMPLOS DE RESPOSTAS EXCELENTES:
"${userName}, com ${gestationWeek || 20} semanas, o ferro é super importante porque o volume de sangue aumenta 50% na gravidez! 🩸

Pra garantir ferro suficiente, você tem 3 ótimas opções:
1) Feijão preto com arroz + um fio de limão (a vitamina C triplica a absorção!)
2) Bife de fígado 1x por semana (campeão de ferro, 12mg por porção)
3) Espinafre refogado com alho + ovo (combinação ferro + proteína perfeita)

Dica pra hoje: no almoço, esprema meio limão em cima do feijão. Parece simples, mas a vitamina C pode aumentar a absorção de ferro em até 3x! 🍋

Curiosidade: sabia que o sangue do seu corpo agora é quase 50% a mais? Por isso o ferro é tão crucial - ele faz a hemoglobina que carrega oxigênio pro bebê! ❤️

Você já fez exame de hemoglobina recentemente?"
${searchContext ? `\nINFORMAÇÕES PESQUISADAS (integre naturalmente, não cite links):\n${searchContext}` : ''}`
}

function shouldSearchWeb(message: string): boolean {
  const keywords = ['pesquisa', 'pesquisar', 'busca', 'buscar', 'como fazer', 'receita de', 'o que é', 'qual', 'quais', 'dicas', 'recomendações', 'melhores', 'é seguro', 'pode', 'faz mal', 'pode comer', 'posso', 'é normal', 'estudo', 'pesquisas mostram', 'cientificamente']
  const l = message.toLowerCase()
  return keywords.some(k => l.includes(k)) || (message.includes('?') && message.length > 15)
}

async function searchWithSerper(query: string): Promise<string | null> {
  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: `${query} maternidade gestação saúde mulher Brasil`, gl: 'br', hl: 'pt-br', num: 5 })
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
            if (gestationWeek < 1) gestationWeek = undefined
            if (gestationWeek && gestationWeek > 42) gestationWeek = undefined
          }
        }
      }
    } catch (dbError) { console.warn('Erro ao buscar usuário:', dbError) }

    const topics = detectTopics(message)
    const mood = detectMood(message)
    const suggestions = generateSuggestions(message, topics, userPhase, gestationWeek)

    let searchContext = ''
    if (shouldSearchWeb(message)) {
      try {
        const results = await searchWithSerper(message)
        if (results) searchContext = results
      } catch (e) { console.warn('Erro pesquisa:', e) }
    }

    const systemPrompt = buildSystemPrompt(userName, userPhase, gestationWeek, searchContext, mood, topics)
    const chatHistory = history.slice(-12).map((msg: { role: string; content: string }) => ({
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
            temperature: 0.8,
            max_tokens: 2000,
            top_p: 0.92,
            frequency_penalty: 0.3,
          })
        })
        if (response.ok) {
          const data = await response.json()
          const text = data.choices?.[0]?.message?.content
          if (text) {
            return NextResponse.json({ response: cleanResponse(text), provider: 'groq', suggestions })
          }
        } else { console.warn(`Groq ${response.status}`) }
      } catch (e) { console.warn('Groq falhou:', e) }
    }

    // ===== 2. GEMINI 2.0 =====
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
            generationConfig: { temperature: 0.85, maxOutputTokens: 2048, topP: 0.92 },
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
            return NextResponse.json({ response: cleanResponse(text), provider: 'gemini', suggestions })
          }
        }
      } catch (e) { console.warn('Gemini falhou:', e) }
    }

    // ===== 3. HUGGING FACE =====
    const hfToken = process.env.HUGGINGFACE_API_KEY
    if (hfToken) {
      try {
        const response = await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${hfToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inputs: `<s>[INST] ${systemPrompt}\n\nMensagem da usuária: ${message} [/INST]`,
            parameters: { max_new_tokens: 800, temperature: 0.7, return_full_text: false }
          })
        })
        if (response.ok) {
          const data = await response.json()
          const text = data[0]?.generated_text
          if (text) {
            return NextResponse.json({ response: cleanResponse(text), provider: 'huggingface', suggestions })
          }
        }
      } catch (e) { console.warn('HF falhou:', e) }
    }

    // ===== 4. FALLBACK LOCAL RICO =====
    return NextResponse.json({
      response: generateLocalResponse(message, userName, userPhase, gestationWeek, searchContext, mood, topics),
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

function generateLocalResponse(message: string, userName: string, userPhase: string, gestationWeek: number | undefined, searchContext: string, mood: string, topics: string[]): string {
  const l = message.toLowerCase()
  const isPregnant = userPhase === 'PREGNANT'
  const weekText = gestationWeek ? `com ${gestationWeek} semanas` : ''
  const tri = gestationWeek ? getTrimestreInfo(gestationWeek) : null

  // Saudação
  if (l.match(/^(oi|olá|ola|hey|eai|e ai|bom dia|boa tarde|boa noite|opa|tudo bem|oi vita|oie|oii)/)) {
    if (isPregnant && tri) {
      return `Oi, ${userName}! 😊 Que bom te ver por aqui!\n\n${weekText}, seu bebê já está do tamanho de ${tri.tamanho}! ${tri.desenvolvimento} 🤰\n\nNessa fase, os nutrientes mais importantes pra vocês são: ${tri.nutrientes}.\n\n${tri.cuidados}\n\nPosso te ajudar com muitas coisas hoje:\n\n🍎 Montar um cardápio personalizado pro ${tri.nome}\n🏋️ Sugerir exercícios seguros pra essa semana\n💊 Tirar dúvidas sobre vitaminas e suplementos\n😴 Dicas para dormir melhor\n🤢 Aliviar sintomas como enjoo, azia ou cansaço\n💭 Conversar sobre como você está se sentindo\n\nSobre o que quer falar hoje?`
    }
    if (userPhase === 'POSTPARTUM') {
      return `Oi, ${userName}! 😊 Como você está hoje?\n\nSei que o pós-parto pode ser uma montanha-russa de emoções e cansaço, mas estou aqui pra te ajudar com o que precisar!\n\nPosso te ajudar com:\n\n🤱 Dicas de amamentação e alimentação galactogênica\n🍎 Nutrição para recuperação pós-parto\n🏃‍♀️ Quando e como voltar aos exercícios\n😴 Estratégias para dormir melhor (mesmo com o bebê acordando)\n💭 Apoio emocional - baby blues é mais comum do que você imagina\n\nMe conta, como posso te ajudar?`
    }
    if (userPhase === 'TRYING') {
      return `Oi, ${userName}! 😊 Que bom te ver!\n\nEstou aqui para te acompanhar nessa jornada linda de tentar engravidar! 💫\n\nPosso te ajudar com:\n\n📅 Calcular seu período fértil\n🥗 Alimentação que melhora a fertilidade\n💊 Vitaminas essenciais (ácido fólico 400mcg/dia é o principal!)\n🏃‍♀️ Exercícios que ajudam\n❤️ Apoio emocional - sei que a espera pode ser difícil\n\nComo posso te ajudar hoje?`
    }
    return `Oi, ${userName}! 😊 Que bom te ver!\n\nSou a Vita, sua companheira de bem-estar aqui no VitaFit. Posso te ajudar com:\n\n🍎 Nutrição personalizada e receitas saudáveis\n🏃‍♀️ Treinos e exercícios para cada fase\n🤰 Tudo sobre gravidez e maternidade\n💭 Bem-estar emocional e autocuidado\n\nMe conta, sobre o que quer conversar?`
  }

  // Alimentação - Respostas muito mais ricas
  if (l.match(/(comer|alimentação|comida|alimento|dieta|nutrição|café da manhã|almoço|jantar|lanche|cardápio|o que posso comer|fome|refeição)/)) {
    if (isPregnant && tri) {
      const cardapios: Record<number, string> = {
        1: `${userName}, ótima pergunta! ${weekText}, a alimentação faz toda diferença pro desenvolvimento do bebê (que já está do tamanho de ${tri.tamanho}!) 🥰\n\nVou te dar 3 opções de cardápio completo para hoje:\n\nOPÇÃO 1 - Prática e Rápida:\n☕ Café: 2 ovos mexidos + 1 torrada integral + 1 copo de suco de laranja\n🍎 Lanche: 1 banana + 1 colher de pasta de amendoim\n🍲 Almoço: Frango grelhado (150g) + arroz integral (4 col) + feijão (3 col) + salada de espinafre\n🥪 Lanche: Iogurte natural com 2 col de granola\n🌙 Jantar: Sopa de legumes com frango desfiado + 1 fatia de pão integral\n\nOPÇÃO 2 - Anti-Enjoo:\n☕ Café: Torrada seca com queijo branco + chá de gengibre\n🍎 Lanche: 5 bolachas água e sal + suco de limão\n🍲 Almoço: Macarrão integral com molho de tomate caseiro + peito de peru\n🥪 Lanche: 1 maçã + 5 castanhas\n🌙 Jantar: Omelete de espinafre + salada\n\nOPÇÃO 3 - Rica em Ácido Fólico:\n☕ Café: Vitamina de banana com aveia e mel\n🍎 Lanche: Mix de frutas secas (30g)\n🍲 Almoço: Bife de fígado + arroz + brócolis refogado + feijão\n🥪 Lanche: Torrada com abacate\n🌙 Jantar: Salada de lentilha com legumes\n\nDica importante: no ${tri.nome}, ${tri.nutrientes} são essenciais! 💚\n\nCuriosidade: sabia que o ácido fólico ajuda a fechar o tubo neural do bebê? É por isso que ele é TÃO importante nas primeiras semanas! 🧠\n\nQual dessas opções combina mais com você?`,
        2: `${userName}, com ${gestationWeek} semanas, seu bebê está em crescimento acelerado e precisa de muito nutriente! O bebê agora tem o tamanho de ${tri.tamanho}! 💪\n\nVou te dar 3 opções de cardápio completo:\n\nOPÇÃO 1 - Rica em Ferro + Cálcio:\n☕ Café: Mingau de aveia com banana + 1 copo de leite\n🍎 Lanche: Iogurte grego com frutas vermelhas\n🍲 Almoço: Bife grelhado (150g) + arroz integral + feijão preto + salada com limão (vitamina C ajuda absorver ferro!)\n🥪 Lanche: Sanduíche natural de frango com queijo branco\n🌙 Jantar: Salmão grelhado (fonte de ômega-3!) + purê de batata doce + brócolis\n\nOPÇÃO 2 - Equilibrada e Prática:\n☕ Café: Pão integral com ovo + suco de acerola\n🍎 Lanche: 1 fatia de queijo + 5 morangos\n🍲 Almoço: Frango assado + quinoa + abobrinha grelhada + feijão\n🥪 Lanche: Smoothie de manga com iogurte\n🌙 Jantar: Wrap integral com atum + salada\n\nOPÇÃO 3 - Dia de Sopas e Leveza:\n☕ Café: Panqueca de banana com aveia + mel\n🍎 Lanche: Palitos de cenoura com homus\n🍲 Almoço: Bowl de frango com arroz integral e legumes assados\n🥪 Lanche: Vitamina de abacate com leite\n🌙 Jantar: Caldo verde com proteína + torrada\n\nNessa fase: ${tri.nutrientes} são prioridade!\n\n${tri.desenvolvimento} ❤️\n\nQuer que eu detalhe alguma receita ou ajuste algo?`,
        3: `${userName}, na reta final com ${gestationWeek} semanas! Seu bebê tem o tamanho de ${tri.tamanho} e está se preparando pra chegar! 🎉\n\nAlimentação agora é crucial. Porções menores e mais frequentes funcionam melhor porque o estômago fica apertado. Aqui vão 3 opções:\n\nOPÇÃO 1 - Anti-Azia e Leve:\n☕ Café: Iogurte natural + granola + banana picada\n🍎 Lanche: 2 torradas com queijo cottage\n🍲 Almoço: Frango grelhado + arroz + abóbora assada + salada\n🥪 Lanche: Smoothie de mamão com linhaça\n🌙 Jantar: Sopa creme de legumes + 1 fatia de pão\n🌛 Ceia: 6 tâmaras (estudos mostram que ajudam no trabalho de parto!)\n\nOPÇÃO 2 - Energia para Reta Final:\n☕ Café: Omelete de 2 ovos com tomate + suco de laranja\n🍎 Lanche: Banana com canela + castanhas\n🍲 Almoço: Peixe assado + batata doce + brócolis\n🥪 Lanche: Iogurte grego com mel\n🌙 Jantar: Macarrão integral com atum e vegetais\n🌛 Ceia: 1 copo de leite morno com mel\n\nOPÇÃO 3 - Máxima Nutrição:\n☕ Café: Açaí com granola e frutas\n🍎 Lanche: Mix de nuts + frutas secas\n🍲 Almoço: Bife de alcatra + arroz integral + feijão + salada colorida\n🥪 Lanche: Wrap de peito de peru\n🌙 Jantar: Omelete de forno com legumes\n🌛 Ceia: Tâmaras + leite\n\nDica crucial: beba no MÍNIMO 3 litros de água por dia! Mantenha uma garrafa sempre por perto 💧\n\n${tri.cuidados}\n\nComo está sendo essa reta final?`
      }
      return cardapios[tri.trimestre] || cardapios[2]
    }

    return `${userName}, vamos montar uma alimentação mais saudável! 🥗\n\nVou te dar 3 opções de cardápio para hoje:\n\nOPÇÃO 1 - Equilibrada:\n☕ Café: 2 ovos + 1 torrada integral + fruta\n🍎 Lanche: Iogurte com granola\n🍲 Almoço: Frango grelhado + arroz integral + feijão + salada colorida\n🥪 Lanche: Banana com pasta de amendoim\n🌙 Jantar: Sopa de legumes com frango\n\nOPÇÃO 2 - Prática e Rápida:\n☕ Café: Smoothie de banana com aveia e leite\n🍎 Lanche: Mix de castanhas (30g)\n🍲 Almoço: Bowl de quinoa com legumes e ovo cozido\n🥪 Lanche: Torrada com cottage e tomate\n🌙 Jantar: Omelete de legumes\n\nOPÇÃO 3 - Rica em Proteínas:\n☕ Café: Panqueca de aveia com whey\n🍎 Lanche: Iogurte grego com frutas\n🍲 Almoço: Salmão + batata doce + brócolis\n🥪 Lanche: Sanduíche natural de frango\n🌙 Jantar: Wrap integral com atum + salada\n\nRegra de ouro: prato colorido = prato nutritivo! 🌈\n\nQual opção combina mais com seu dia hoje?`
  }

  // Exercícios
  if (l.match(/(exercício|treino|academia|yoga|pilates|caminhada|atividade|malhar|alongamento|kegel|agachamento)/)) {
    if (isPregnant && tri) {
      const treinos: Record<number, string> = {
        1: `${userName}, que ótimo que quer se movimentar ${weekText}! No ${tri.nome}, exercícios leves são os melhores 🏃‍♀️\n\nVou te dar 3 opções de treino:\n\nOPÇÃO 1 - Caminhada Anti-Enjoo (20 min):\n• 5 min andando devagar (aquecimento)\n• 10 min em ritmo moderado (consegue conversar)\n• 5 min desacelerando\n• Dica: coma 1 biscoitinho seco 30 min antes!\n\nOPÇÃO 2 - Yoga Suave (15 min):\n• Posição do gato-vaca: 10 repetições (alivia tensão lombar)\n• Borboleta sentada: 30 seg (abre quadril)\n• Respiração 4-4: inspire 4s, expire 4s (5 ciclos)\n• Savasana: 3 min de relaxamento\n\nOPÇÃO 3 - Alongamento Matinal (10 min):\n• Pescoço: 3 rotações de cada lado\n• Ombros: 10 elevações e solturas\n• Coluna: gato-vaca na cama mesmo\n• Pernas: alongamento de panturrilha na parede\n\n⚠️ Pare se sentir: tontura, falta de ar, dor ou sangramento.\n\nCuriosidade: exercício na gravidez reduz em até 40% o risco de diabetes gestacional! 💪\n\nQual dessas opções te atrai mais?`,
        2: `${userName}, o ${tri.nome} é a MELHOR fase pra se exercitar! Mais energia e menos enjoo 🎉\n\nVou te dar 3 opções de treino:\n\nOPÇÃO 1 - Caminhada + Fortalecimento (30 min):\n• 15 min caminhada em ritmo bom\n• 10 agachamentos na parede\n• 15 elevações de panturrilha\n• 10 exercícios de Kegel (contrai 5s, relaxa 5s)\n• 5 min de alongamento final\n\nOPÇÃO 2 - Pilates para Gestante (25 min):\n• Aquecimento: respiração diafragmática (2 min)\n• Bridge (elevação de quadril): 3x12\n• Abdução de perna deitada: 3x15 cada lado\n• Bola suíça: sentada, circulos com quadril (2 min)\n• Alongamento: borboleta + gato-vaca\n\nOPÇÃO 3 - Natação/Hidroginástica (40 min):\n• A água suporta o peso da barriga!\n• Baixo impacto nas articulações\n• Alivia inchaço nas pernas\n• Melhora a circulação\n• Sensação de leveza incrível\n\n${tri.desenvolvimento} ❤️\n\nDica: esse é O momento de fortalecer pernas e assoalho pélvico pro parto! Os exercícios de Kegel fazem uma diferença enorme 💪\n\nQual treino quer experimentar?`,
        3: `${userName}, com ${gestationWeek} semanas, o foco é conforto e preparação pro parto! 🤰\n\nVou te dar 3 opções suaves:\n\nOPÇÃO 1 - Bola Suíça (15 min):\n• Sentada na bola: circular com quadril (2 min cada direção)\n• Quicar suavemente (2 min) - alivia dor lombar!\n• Inclinar pelve pra frente e trás (10x)\n• Abrir pernas na bola e alongar (1 min)\n• Esta é sua MELHOR AMIGA agora!\n\nOPÇÃO 2 - Respiração + Preparo para Parto (20 min):\n• Respiração 4-7-8: inspira 4s, segura 7s, expira 8s (5x)\n• Agachamento na parede: segurar 20s, 5 repetições\n• Borboleta sentada: 2 min\n• Exercícios de Kegel: 3x15\n• Relaxamento com visualização (5 min)\n\nOPÇÃO 3 - Caminhada Leve (20 min):\n• Ritmo tranquilo, sem pressa\n• Ideal: 2x ao dia (manhã e fim de tarde)\n• Ajuda o bebê a encaixar!\n• Leve água e vá com tênis confortável\n\n${tri.cuidados}\n\nCuriosidade: caminhar nos últimos meses ajuda o bebê a se posicionar para o parto! 👶\n\nQuer detalhes de algum exercício?`
      }
      return treinos[tri.trimestre] || treinos[2]
    }

    return `${userName}, bora se movimentar! 💪\n\nTenho 3 opções de treino pra você:\n\nOPÇÃO 1 - Cardio Leve (25 min):\n• 5 min aquecimento (marcha no lugar)\n• 15 min caminhada rápida ou dança\n• 5 min alongamento\n\nOPÇÃO 2 - Força Básica (20 min):\n• 3x15 agachamentos\n• 3x10 flexões (pode ser no joelho)\n• 3x12 abdominais\n• 3x15 elevação de panturrilha\n\nOPÇÃO 3 - Yoga/Relaxamento (30 min):\n• Saudação ao sol (5 repetições)\n• Guerreiro I e II (30s cada lado)\n• Árvore (equilíbrio, 30s cada)\n• Savasana (5 min)\n\nDica: 15 min por dia é melhor que 1h uma vez por semana! Consistência é tudo 😊\n\nQual estilo combina mais com você?`
  }

  // Enjoo/náusea
  if (l.match(/(enjoo|enjoada|náusea|vômito|azia|refluxo)/)) {
    return `${userName}, eu sei como isso é desconfortável 😔 ${isPregnant ? `Com ${gestationWeek || 'algumas'} semanas, isso acontece por causa do aumento do hormônio hCG.` : ''}\n\nTenho várias opções pra te ajudar:\n\n🟢 ALÍVIO RÁPIDO (pra agora):\n• Gengibre: mastigue um pedacinho ou faça chá (o mais eficaz comprovado!)\n• Biscoito de água e sal ou torrada seca\n• Gelo de limão: congele suco de limão e chupe\n• Acupressão: pressione o ponto P6 (3 dedos abaixo do pulso, no meio)\n\n🟡 PREVENÇÃO (pro dia todo):\n• Coma de 2 em 2 horas, pouca quantidade\n• Deixe biscoitinhos secos no criado-mudo\n• Evite cheiros fortes (peça pra alguém cozinhar)\n• Beba líquidos ENTRE as refeições, nunca durante\n• Alimentos frios causam menos enjoo que quentes\n\n🔴 ATENÇÃO MÉDICA se:\n• Vomitar mais de 3x por dia\n• Perder peso\n• Não conseguir manter líquidos\n• Urina muito escura (desidratação)\n\nCuriosidade: sabia que enjoo na gravidez é na verdade um sinal de que os hormônios estão funcionando bem? Gestações com enjoo têm MENOR risco de aborto! 🌟\n\nQuando o enjoo é mais forte: de manhã, à tarde ou o dia todo?`
  }

  // Emocional
  if (l.match(/(ansiedade|ansiosa|medo|triste|deprimida|chorar|estresse|nervosa|preocupada|insegura|sozinha|angústia|irritada)/)) {
    return `${userName}, obrigada por confiar em mim pra falar sobre isso 💜\n\nO que você está sentindo é completamente válido. ${isPregnant ? 'A gravidez traz uma montanha-russa de hormônios (progesterona e estrogênio nas alturas!) e emoções intensas são absolutamente normais.' : 'Todas nós passamos por momentos difíceis, e reconhecer isso já é um passo bonito.'}\n\nTenho 3 técnicas que podem te ajudar AGORA:\n\n1) RESPIRAÇÃO 4-7-8 (minha favorita):\n• Inspire pelo nariz contando até 4\n• Segure contando até 7\n• Expire pela boca contando até 8\n• Repita 4 vezes - o efeito calmante é imediato!\n\n2) GROUNDING (pra ansiedade):\n• Nomeie 5 coisas que você VÊ\n• 4 que pode TOCAR\n• 3 que OUVE\n• 2 que CHEIRA\n• 1 que SABOREIA\n\n3) AUTOCUIDADO RÁPIDO:\n• Uma caminhada de 10 min ao ar livre\n• Um banho morno com calma\n• Escreva o que sente sem filtro\n• Ligue pra alguém que te faz bem\n\nFato importante: pedir ajuda é ato de CORAGEM, não fraqueza. Se isso for persistente, conversar com psicólogo pode transformar tudo 💪\n\nVocê quer me contar mais sobre como está se sentindo?`
  }

  // Sono
  if (l.match(/(dormir|sono|insônia|descanso|cansada|exausta|sonolência|cochilo)/)) {
    return `${userName}, o sono é fundamental e eu entendo a frustração! 😴\n\n${isPregnant ? `Com ${gestationWeek || 'algumas'} semanas, dormir fica mais difícil por causa da barriga crescendo, idas ao banheiro e a progesterona (que dá sonolência de dia mas atrapalha o sono profundo de noite). Mas tenho soluções!` : 'Vamos melhorar essa qualidade de sono!'}\n\nOPÇÃO 1 - Rotina Noturna (começa 1h antes de dormir):\n• Desligar telas (celular, TV)\n• Chá de camomila ou maracujá\n• 5 min de alongamento suave\n• Respiração 4-4-4 deitada\n• Quarto escuro e fresco (18-22°C)\n\nOPÇÃO 2 - Posição Ideal:\n${isPregnant ? '• Lado ESQUERDO: melhor circulação pro bebê\n• Almofada entre as pernas (alivia quadril)\n• Almofada atrás das costas (apoio)\n• Travesseiro de gestante é um investimento que VALE' : '• De lado é a posição mais saudável\n• Travesseiro entre os joelhos alivia a coluna\n• Colchão firme faz diferença'}\n\nOPÇÃO 3 - Hábitos do Dia:\n• Zero cafeína após 14h\n• Exercício leve de manhã (ajuda a dormir à noite)\n• Jantar leve até 20h\n• Se não dormir em 20 min, levante e leia algo chato\n\nDica de ouro: mantenha horários REGULARES de dormir e acordar, mesmo no fim de semana! O corpo funciona por ritmo ⏰\n\nO problema é pegar no sono ou acordar durante a noite?`
  }

  // Amamentação
  if (l.match(/(amamentar|amamentação|leite|mama|peito|mamadeira|pega|colostro|lactação|desmame)/)) {
    return `${userName}, vamos falar sobre amamentação! 🤱\n\nTenho informações específicas dependendo da sua dúvida:\n\n📌 AUMENTAR PRODUÇÃO DE LEITE:\n• Amamente em livre demanda (quanto mais suga, mais produz)\n• Beba no mínimo 3L de água por dia\n• Alimentos galactogênicos: aveia, linhaça, cerveja preta sem álcool, água de coco\n• Descanse sempre que puder (cortisol alto reduz leite)\n\n📌 POSIÇÕES PARA AMAMENTAR:\n1) Tradicional (barriga com barriga)\n2) Football americano (bebê debaixo do braço)\n3) Deitada de lado (melhor pra cesárea!)\n4) Reclinada (bebê sobre o peito)\n\n📌 DOR NA AMAMENTAÇÃO:\n• Pega correta: boca do bebê deve pegar TODA a aréola, não só o bico\n• Lanolina pura nos mamilos após cada mamada\n• Conchas de amamentação protegem entre as mamadas\n• Se persistir, procure uma consultora de amamentação\n\nCuriosidade: o leite materno muda de composição ao longo do dia! De manhã é mais rico em cortisol (energia), à noite contém melatonina (sono) 🌙\n\nQual é sua principal dúvida sobre amamentação?`
  }

  // Default com pesquisa
  if (searchContext) {
    return `${userName}, pesquisei sobre isso pra você! 😊\n\nBaseado nas informações mais recentes:\n\n${searchContext}\n\nLembrando que cada caso é individual, e para orientações personalizadas, converse com seu médico 💜\n\nQuer que eu aprofunde em algum ponto?`
  }

  // Default inteligente
  if (isPregnant && tri) {
    return `${userName}, ótima pergunta! 😊\n\nCom ${gestationWeek} semanas, você está no ${tri.nome}. Seu bebê tem o tamanho de ${tri.tamanho}!\n\n${tri.desenvolvimento}\n\nPrioridades dessa fase:\n• Nutrientes: ${tri.nutrientes}\n• ${tri.cuidados}\n\nPosso te ajudar com muitas coisas específicas pra essa fase:\n\n🍎 Montar cardápio completo do dia com 3 opções\n🏋️ Treino seguro de 15-30 min\n🤢 Aliviar sintomas como enjoo, azia ou cansaço\n💊 Tirar dúvidas sobre vitaminas\n😴 Dicas para dormir melhor\n💭 Conversar sobre como você se sente\n📋 Lista de compras saudável\n\nSobre qual desses temas quer saber mais?`
  }

  return `${userName}, estou aqui pra te ajudar! 😊\n\nPosso conversar sobre vários temas:\n\n🍎 Montar cardápio personalizado com opções\n🏋️ Criar treino sob medida pro seu nível\n🤰 Tirar dúvidas sobre gravidez e maternidade\n🤱 Dicas de amamentação\n💭 Apoio emocional e bem-estar\n😴 Melhorar qualidade do sono\n👶 Tudo sobre cuidados com bebê\n📋 Lista de compras saudável\n\nMe conta com mais detalhes o que quer saber!`
}
