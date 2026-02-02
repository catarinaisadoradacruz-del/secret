// Versão: 02-02-2026 - Geração de Planos Nutricionais com IA (Groq + Gemini + Fallback Rico)
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const { days = 7, profile: clientProfile, feedback } = await request.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    // Buscar perfil
    const { data: profile } = await supabase
      .from('users')
      .select('name, phase, last_menstrual_date, dietary_restrictions, weight, height, allergies')
      .eq('id', user.id)
      .single()

    const userPhase = profile?.phase || clientProfile?.phase || 'ACTIVE'
    const restrictions = profile?.dietary_restrictions || clientProfile?.dietary_restrictions || []
    const allergies = profile?.allergies || clientProfile?.allergies || []
    const userName = profile?.name || 'Usuária'

    let gestationWeek: number | undefined
    if (userPhase === 'PREGNANT' && profile?.last_menstrual_date) {
      const dum = new Date(profile.last_menstrual_date)
      gestationWeek = Math.floor((Date.now() - dum.getTime()) / (1000 * 60 * 60 * 24 * 7))
    }

    const prompt = buildDetailedPrompt(userPhase, gestationWeek, days, restrictions, allergies, feedback, userName)
    let plan = null

    // ===== 1. GROQ =====
    const groqKey = process.env.GROQ_API_KEY
    if (groqKey && !plan) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: 'Você é um nutricionista especialista em saúde materna. Responda APENAS com JSON válido, sem nenhum texto antes ou depois. Não use markdown.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 8000,
            response_format: { type: 'json_object' }
          })
        })
        if (response.ok) {
          const data = await response.json()
          const text = data.choices?.[0]?.message?.content
          if (text) {
            try { plan = JSON.parse(text) } catch { plan = parseJSON(text) }
          }
        }
      } catch (e) { console.warn('Groq nutrition failed:', e) }
    }

    // ===== 2. GEMINI =====
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (geminiKey && !plan) {
      try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-goog-api-key': geminiKey },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 8192, responseMimeType: 'application/json' },
          }),
        })
        if (response.ok) {
          const data = await response.json()
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text
          if (text) {
            try { plan = JSON.parse(text) } catch { plan = parseJSON(text) }
          }
        }
      } catch (e) { console.warn('Gemini nutrition failed:', e) }
    }

    // ===== 3. FALLBACK RICO =====
    if (!plan) {
      plan = generateRichFallbackPlan(userPhase, gestationWeek, days, restrictions, userName)
    }

    // Normalizar estrutura do plano
    const normalizedPlan = normalizePlan(plan, days)

    // Desativar planos anteriores
    await supabase.from('nutrition_plans').update({ is_active: false }).eq('user_id', user.id)

    // Salvar novo plano
    await supabase.from('nutrition_plans').insert({
      user_id: user.id,
      name: `Plano ${userPhase === 'PREGNANT' ? 'Gestante' : userPhase === 'POSTPARTUM' ? 'Pós-Parto' : 'Saudável'} - ${days} dias`,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + days * 86400000).toISOString().split('T')[0],
      meals_per_day: 5,
      daily_calories: userPhase === 'PREGNANT' ? 2300 : userPhase === 'POSTPARTUM' ? 2500 : 1800,
      plan_data: normalizedPlan,
      is_active: true,
      days: days
    })

    return NextResponse.json({ plan: normalizedPlan })
  } catch (error) {
    console.error('Nutrition plan error:', error)
    return NextResponse.json({ error: 'Erro ao gerar plano' }, { status: 500 })
  }
}

function buildDetailedPrompt(phase: string, week: number | undefined, days: number, restrictions: string[], allergies: string[], feedback?: string, name?: string): string {
  const phaseInfo: Record<string, string> = {
    'PREGNANT': week
      ? `Gestante de ${week} semanas (${week <= 13 ? '1º trimestre - foco em ácido fólico, ferro, vitamina B12, evitar alimentos crus' : week <= 27 ? '2º trimestre - foco em ferro, cálcio, ômega-3, DHA, proteínas' : '3º trimestre - foco em ferro, cálcio, fibras, tâmaras, hidratação'}). Necessidade calórica: ~2300kcal/dia. Proteína: 70g/dia.`
      : 'Gestante. Necessidade calórica: ~2300kcal/dia.',
    'POSTPARTUM': 'Pós-parto/Amamentação. Necessidade calórica: ~2500kcal/dia. Foco em alimentos galactogênicos (aveia, linhaça), ferro para recuperação, proteínas e muita hidratação.',
    'TRYING': 'Tentando engravidar. Necessidade calórica: ~2000kcal/dia. Foco em ácido fólico (400mcg/dia), zinco, selênio, vitamina E, antioxidantes.',
    'ACTIVE': 'Mulher em fase de bem-estar geral. Necessidade calórica: ~1800kcal/dia. Alimentação equilibrada e nutritiva.'
  }

  return `Crie um plano alimentar COMPLETO e DETALHADO de ${days} dias para: ${phaseInfo[phase] || phaseInfo['ACTIVE']}

${restrictions.length ? `RESTRIÇÕES: ${restrictions.join(', ')}` : ''}
${allergies.length ? `ALERGIAS: ${allergies.join(', ')}` : ''}
${feedback ? `PREFERÊNCIAS ESPECIAIS: ${feedback}` : ''}

REGRAS IMPORTANTES:
- Cada dia DEVE ter refeições DIFERENTES dos outros dias (variedade é essencial!)
- Use ingredientes brasileiros comuns e acessíveis
- Inclua as quantidades exatas (ex: "150g de frango", "2 colheres de arroz")
- Valores nutricionais devem ser realistas (proteína, carboidratos, gordura para cada refeição)
- As dicas devem ser específicas para cada dia, não genéricas
- O total calórico diário deve estar entre 1800-2500 dependendo da fase

Responda SOMENTE com este JSON (sem markdown, sem texto extra):
[
  {
    "day": 1,
    "meals": {
      "breakfast": {
        "name": "Nome da refeição do café",
        "description": "Descrição detalhada com quantidades: Ex: 2 ovos mexidos com tomate + 1 fatia de pão integral + 1 copo de suco de laranja natural",
        "calories": 350,
        "protein": 18,
        "carbs": 35,
        "fat": 14
      },
      "morning_snack": {
        "name": "Nome do lanche da manhã",
        "description": "Descrição com quantidades",
        "calories": 150,
        "protein": 6,
        "carbs": 20,
        "fat": 5
      },
      "lunch": {
        "name": "Nome do almoço",
        "description": "Descrição completa com todos os acompanhamentos e quantidades",
        "calories": 550,
        "protein": 35,
        "carbs": 55,
        "fat": 18
      },
      "afternoon_snack": {
        "name": "Nome do lanche da tarde",
        "description": "Descrição com quantidades",
        "calories": 200,
        "protein": 8,
        "carbs": 25,
        "fat": 7
      },
      "dinner": {
        "name": "Nome do jantar",
        "description": "Descrição completa com quantidades",
        "calories": 450,
        "protein": 30,
        "carbs": 40,
        "fat": 15
      }
    },
    "tips": ["Dica específica para o dia 1", "Segunda dica prática"]
  }
]

Gere exatamente ${days} dias com refeições DIFERENTES a cada dia. Use culinária brasileira variada.`
}

function parseJSON(text: string): any {
  try {
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const match = cleaned.match(/[\[\{][\s\S]*[\]\}]/)
    if (match) return JSON.parse(match[0])
  } catch {}
  return null
}

function normalizePlan(raw: any, days: number): any[] {
  if (!raw) return generateRichFallbackPlan('ACTIVE', undefined, days, [], 'Usuária')
  
  // Se já é array no formato correto
  if (Array.isArray(raw)) {
    return raw.slice(0, days).map((day: any, idx: number) => normalizeDayPlan(day, idx + 1))
  }
  
  // Se tem propriedade 'days'
  if (raw.days && Array.isArray(raw.days)) {
    return raw.days.slice(0, days).map((day: any, idx: number) => normalizeDayPlan(day, idx + 1))
  }

  // Se tem propriedade 'plan'
  if (raw.plan && Array.isArray(raw.plan)) {
    return raw.plan.slice(0, days).map((day: any, idx: number) => normalizeDayPlan(day, idx + 1))
  }

  return generateRichFallbackPlan('ACTIVE', undefined, days, [], 'Usuária')
}

function normalizeDayPlan(day: any, dayNumber: number): any {
  const mealTypes = ['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner']
  const normalizedMeals: Record<string, any> = {}
  
  const meals = day.meals || day
  for (const type of mealTypes) {
    const meal = meals[type]
    if (meal) {
      normalizedMeals[type] = {
        name: meal.name || getMealTypeName(type),
        description: meal.description || 'Refeição balanceada',
        calories: Number(meal.calories) || 300,
        protein: Number(meal.protein) || 15,
        carbs: Number(meal.carbs) || 30,
        fat: Number(meal.fat) || 10,
      }
    } else {
      normalizedMeals[type] = getDefaultMeal(type, dayNumber)
    }
  }

  const tips = Array.isArray(day.tips) ? day.tips : (typeof day.tips === 'string' ? [day.tips] : ['Mantenha-se hidratada! Beba pelo menos 2L de água hoje.'])

  return {
    day: dayNumber,
    meals: normalizedMeals,
    tips
  }
}

function getMealTypeName(type: string): string {
  const names: Record<string, string> = { breakfast: 'Café da Manhã', morning_snack: 'Lanche da Manhã', lunch: 'Almoço', afternoon_snack: 'Lanche da Tarde', dinner: 'Jantar' }
  return names[type] || type
}

function getDefaultMeal(type: string, day: number): any {
  // Isso não deve ser chamado se a IA gerar corretamente, mas por segurança
  const defaults: Record<string, any> = {
    breakfast: { name: 'Café da Manhã', description: 'Omelete com vegetais + torrada integral', calories: 350, protein: 18, carbs: 30, fat: 14 },
    morning_snack: { name: 'Lanche da Manhã', description: 'Iogurte natural com granola', calories: 150, protein: 8, carbs: 20, fat: 5 },
    lunch: { name: 'Almoço', description: 'Proteína + arroz integral + feijão + salada', calories: 550, protein: 35, carbs: 55, fat: 16 },
    afternoon_snack: { name: 'Lanche da Tarde', description: 'Frutas com castanhas', calories: 200, protein: 5, carbs: 25, fat: 10 },
    dinner: { name: 'Jantar', description: 'Sopa de legumes com proteína', calories: 400, protein: 28, carbs: 35, fat: 14 },
  }
  return defaults[type] || defaults.lunch
}

function generateRichFallbackPlan(phase: string, week: number | undefined, days: number, restrictions: string[], name: string): any[] {
  // Banco de refeições variadas para gerar planos ricos sem IA
  const breakfasts = [
    { name: 'Omelete de Espinafre', description: '2 ovos mexidos com espinafre refogado + 1 fatia de pão integral com azeite + 1 copo de suco de laranja', calories: 380, protein: 22, carbs: 32, fat: 18 },
    { name: 'Mingau de Aveia com Frutas', description: '1/2 xíc. de aveia cozida com leite + banana picada + morango + 1 col. de mel + canela', calories: 340, protein: 12, carbs: 52, fat: 8 },
    { name: 'Panqueca de Banana', description: '3 panquecas de banana com aveia + 1 col. de pasta de amendoim + frutas vermelhas', calories: 360, protein: 14, carbs: 45, fat: 14 },
    { name: 'Torrada com Abacate e Ovo', description: '2 torradas integrais com abacate amassado + 1 ovo pochê + tomate cereja + gergelim', calories: 400, protein: 16, carbs: 34, fat: 22 },
    { name: 'Smoothie Bowl de Açaí', description: 'Bowl de açaí (100g polpa) com banana + granola (2 col.) + frutas frescas + mel', calories: 380, protein: 8, carbs: 58, fat: 12 },
    { name: 'Crepioca Nutritiva', description: 'Crepioca (1 ovo + 2 col. tapioca) com queijo branco + tomate + orégano + suco de acerola', calories: 320, protein: 18, carbs: 30, fat: 14 },
    { name: 'Iogurte Grego com Granola', description: '1 pote de iogurte grego natural + granola sem açúcar + kiwi picado + 1 col. de chia + mel', calories: 310, protein: 18, carbs: 36, fat: 10 },
    { name: 'Vitamina Proteica', description: 'Vitamina de banana + leite + aveia + 1 col. pasta de amendoim + cacau em pó', calories: 350, protein: 14, carbs: 42, fat: 14 },
    { name: 'Tapioca com Queijo e Tomate', description: 'Tapioca (3 col.) com queijo coalho grelhado + tomate + manjericão + suco de manga', calories: 340, protein: 14, carbs: 44, fat: 12 },
    { name: 'Pão Integral com Ricota e Frutas', description: '2 fatias de pão integral + ricota temperada + fatias de pêssego + mel + café com leite', calories: 330, protein: 16, carbs: 40, fat: 10 },
  ]

  const morningSnacks = [
    { name: 'Iogurte com Frutas', description: '1 pote de iogurte natural + 1/2 xíc. de frutas vermelhas', calories: 150, protein: 8, carbs: 20, fat: 4 },
    { name: 'Mix de Castanhas', description: '30g de mix (castanha de caju, amêndoas, nozes) + 3 damascos secos', calories: 180, protein: 5, carbs: 16, fat: 12 },
    { name: 'Banana com Canela', description: '1 banana média + canela + 5 amêndoas', calories: 160, protein: 3, carbs: 30, fat: 5 },
    { name: 'Queijo com Frutas', description: '2 fatias de queijo branco + 5 morangos + 1 col. de mel', calories: 170, protein: 10, carbs: 18, fat: 7 },
    { name: 'Torrada com Cottage', description: '1 torrada integral + 2 col. de cottage + tomate cereja', calories: 140, protein: 10, carbs: 15, fat: 4 },
    { name: 'Smoothie Verde', description: 'Smoothie de espinafre + banana + leite de coco (200ml)', calories: 160, protein: 4, carbs: 28, fat: 5 },
    { name: 'Maçã com Pasta de Amendoim', description: '1 maçã fatiada + 1 col. de pasta de amendoim integral', calories: 200, protein: 5, carbs: 25, fat: 10 },
    { name: 'Palitos de Cenoura com Homus', description: '1 cenoura em palitos + 3 col. de homus caseiro', calories: 130, protein: 5, carbs: 16, fat: 5 },
    { name: 'Vitamina de Mamão', description: '1 fatia de mamão + 1/2 copo de leite + 1 col. de linhaça', calories: 155, protein: 5, carbs: 22, fat: 5 },
    { name: 'Barra de Cereal Caseira', description: '1 barra de aveia com mel + banana passa + castanhas', calories: 170, protein: 4, carbs: 26, fat: 6 },
  ]

  const lunches = [
    { name: 'Frango Grelhado com Quinoa', description: 'Peito de frango grelhado (150g) + quinoa (4 col.) + brócolis refogado + salada de tomate e rúcula', calories: 520, protein: 40, carbs: 42, fat: 16 },
    { name: 'Salmão com Batata Doce', description: 'Filé de salmão grelhado (150g) + batata doce assada (1 méd.) + espinafre refogado + cenoura', calories: 550, protein: 38, carbs: 45, fat: 20 },
    { name: 'Feijoada Light', description: 'Feijoada light com peito de peru e linguiça de frango + arroz integral (3 col.) + couve refogada + laranja', calories: 540, protein: 32, carbs: 55, fat: 18 },
    { name: 'Bowl Mexicano', description: 'Arroz integral + feijão preto + frango desfiado + guacamole + tomate + milho + alface', calories: 530, protein: 35, carbs: 52, fat: 16 },
    { name: 'Peixe Assado com Legumes', description: 'Filé de tilápia ao forno (180g) + arroz integral (3 col.) + legumes assados (abobrinha, cenoura, pimentão)', calories: 480, protein: 36, carbs: 44, fat: 14 },
    { name: 'Strogonoff de Frango Light', description: 'Strogonoff de frango com iogurte (não creme) + arroz integral + salada verde com tomate', calories: 510, protein: 34, carbs: 50, fat: 16 },
    { name: 'Carne com Mandioca', description: 'Carne magra cozida (150g) + mandioca cozida (2 ped.) + refogado de couve + feijão (3 col.)', calories: 560, protein: 38, carbs: 52, fat: 18 },
    { name: 'Bowl de Atum', description: 'Arroz integral + atum em pedaços (1 lata) + pepino + edamame + cenoura ralada + gergelim + molho de gengibre', calories: 490, protein: 34, carbs: 48, fat: 15 },
    { name: 'Frango com Purê de Abóbora', description: 'Sobrecoxa de frango sem pele (2 un.) + purê de abóbora + salada de grão de bico + tomate', calories: 530, protein: 36, carbs: 46, fat: 18 },
    { name: 'Escondidinho de Carne', description: 'Escondidinho de carne moída magra com purê de batata doce + salada de alface, rúcula e pepino', calories: 500, protein: 32, carbs: 48, fat: 18 },
  ]

  const afternoonSnacks = [
    { name: 'Sanduíche Natural', description: 'Sanduíche de pão integral com frango desfiado + cenoura ralada + alface', calories: 220, protein: 16, carbs: 22, fat: 7 },
    { name: 'Frutas com Granola', description: '1 fatia de melão + 1/2 manga + 2 col. de granola', calories: 200, protein: 4, carbs: 38, fat: 4 },
    { name: 'Wrap de Peru', description: '1 wrap integral pequeno com peito de peru + queijo branco + tomate', calories: 210, protein: 15, carbs: 20, fat: 8 },
    { name: 'Batata Doce com Canela', description: '1 batata doce média assada + canela + 1 col. de iogurte', calories: 190, protein: 4, carbs: 38, fat: 2 },
    { name: 'Bolinho de Banana', description: '2 bolinhos de banana com aveia (caseiros) + chá de camomila', calories: 200, protein: 6, carbs: 32, fat: 6 },
    { name: 'Açaí no Copo', description: 'Açaí (100ml) com banana + granola (1 col.) sem adição de açúcar', calories: 230, protein: 4, carbs: 36, fat: 8 },
    { name: 'Pasta de Grão de Bico', description: '3 col. de homus + palitos de pepino e cenoura + 3 torradinhas integrais', calories: 190, protein: 7, carbs: 22, fat: 8 },
    { name: 'Salada de Frutas', description: 'Mix de frutas da estação (mamão, banana, maçã, uva) + 1 col. de linhaça', calories: 180, protein: 3, carbs: 36, fat: 4 },
    { name: 'Pão de Queijo Fit', description: '3 pães de queijo pequenos caseiros (com polvilho + cottage) + suco de maracujá', calories: 210, protein: 8, carbs: 28, fat: 8 },
    { name: 'Milho Cozido', description: '1 espiga de milho cozida com manteiga light + água de coco', calories: 200, protein: 5, carbs: 34, fat: 5 },
  ]

  const dinners = [
    { name: 'Sopa de Legumes com Frango', description: 'Sopa nutritiva com frango desfiado (100g) + cenoura, batata, abobrinha + 1 fatia de pão integral', calories: 380, protein: 28, carbs: 34, fat: 12 },
    { name: 'Omelete de Forno', description: 'Omelete de 3 ovos com espinafre, tomate, queijo branco + salada verde', calories: 360, protein: 24, carbs: 10, fat: 24 },
    { name: 'Wrap Integral de Atum', description: '1 wrap integral com atum + alface + tomate + queijo cottage + mostarda', calories: 370, protein: 26, carbs: 30, fat: 14 },
    { name: 'Risoto de Cogumelos', description: 'Risoto de arroz arbóreo com cogumelos (shimeji e paris) + parmesão + salsinha', calories: 420, protein: 14, carbs: 56, fat: 14 },
    { name: 'Salada Quente de Lentilha', description: 'Lentilha cozida (1 xíc.) + legumes assados (berinjela, abobrinha) + rúcula + azeite + queijo', calories: 380, protein: 18, carbs: 42, fat: 14 },
    { name: 'Peixe com Purê', description: 'Tilápia grelhada (150g) + purê de batata + brócolis no vapor + limão', calories: 400, protein: 32, carbs: 36, fat: 12 },
    { name: 'Panqueca Integral de Carne', description: '2 panquecas integrais recheadas com carne moída + molho de tomate + salada', calories: 410, protein: 28, carbs: 38, fat: 16 },
    { name: 'Caldo Verde Light', description: 'Caldo verde com couve, batata, linguiça de frango + torrada integral', calories: 350, protein: 18, carbs: 38, fat: 12 },
    { name: 'Macarrão Integral com Frango', description: 'Macarrão integral (100g) com peito de frango em cubos + brócolis + azeite + parmesão', calories: 430, protein: 32, carbs: 44, fat: 14 },
    { name: 'Tofu Salteado com Vegetais', description: 'Tofu firme (200g) salteado com pimentão, cenoura, brócolis + molho de soja + gengibre + arroz integral', calories: 390, protein: 22, carbs: 38, fat: 16 },
  ]

  const tipsByPhase: Record<string, string[][]> = {
    'PREGNANT': [
      ['Tome seu ácido fólico pela manhã com suco de laranja (vitamina C melhora absorção)', 'Coma algo a cada 2-3 horas para evitar enjoo'],
      ['Hidratação é essencial! Coloque uma garrafa de 500ml na mesa e beba a cada hora', 'Espinafre e feijão são campeões de ferro - inclua no almoço'],
      ['Seu bebê está crescendo rápido! Cálcio é prioridade (leite, iogurte, queijo)', 'Salmão ou sardinha 2x/semana para ômega-3 (DHA)'],
      ['Coma uma fruta cítrica junto com alimentos ricos em ferro - triplica absorção!', 'Aveia no café da manhã é ótima para fibras e evitar constipação'],
      ['Vitamina D: pegue 15 min de sol pela manhã (braços e pernas)', 'Proteína a cada refeição - seu bebê precisa para crescer'],
      ['Evite café em excesso (máx 200mg/dia = 1 xícara)', 'Inclua alimentos ricos em colina: ovos, brócolis, couve-flor'],
      ['Faça um lanche antes de dormir para evitar hipoglicemia noturna', 'Tâmaras no terceiro trimestre podem ajudar no trabalho de parto (6/dia a partir de 36 semanas)'],
    ],
    'POSTPARTUM': [
      ['Amamentando? Beba pelo menos 3L de água - cada mamada desidrata', 'Aveia no café ajuda na produção de leite'],
      ['Recuperação pós-parto exige ferro: feijão, carnes vermelhas, espinafre', 'Água de coco é ótima para hidratação e reposição mineral'],
      ['Peça ajuda para cozinhar! Congele marmitas nos dias bons', 'Coma sempre que o bebê dormir - não pule refeições'],
      ['Linhaça moída no iogurte: rica em ômega-3 para você e o bebê', 'Proteína em toda refeição ajuda na cicatrização (cesárea ou normal)'],
      ['Cerveja preta SEM ÁLCOOL pode ajudar na lactação', 'Não faça dieta restritiva! Seu corpo precisa de energia para produzir leite'],
      ['Vitamina D + sol pela manhã ajudam no humor e na recuperação', 'Se sentir muito cansada, priorize proteínas e carboidratos complexos'],
      ['Chocolate amargo (70%+) em pequenas porções é permitido e ajuda o humor!', 'Planeje refeições simples para os dias mais difíceis'],
    ],
    'ACTIVE': [
      ['Prato colorido = prato nutritivo! Tente incluir 3 cores diferentes', 'Beba 1 copo de água antes de cada refeição'],
      ['Prefira carboidratos integrais: mais fibra, mais saciedade', 'Proteína no café da manhã reduz fome ao longo do dia'],
      ['Cozinhe em casa o máximo possível - você controla os ingredientes', 'Um punhado de castanhas é o lanche perfeito entre refeições'],
      ['Varie as fontes de proteína: frango, peixe, ovo, feijão, tofu', 'Temperos naturais (alho, cúrcuma, gengibre) são anti-inflamatórios'],
      ['Prepare marmitas no domingo para a semana - facilita muito!', 'Frutas da estação são mais baratas e nutritivas'],
      ['Azeite extra-virgem é a gordura mais saudável para cozinhar', 'Evite alimentos ultraprocessados - leia os rótulos'],
      ['Mastigue devagar - leva 20 min para o cérebro registrar saciedade', 'Faça uma lista de compras e não vá ao mercado com fome'],
    ]
  }

  const phaseTips = tipsByPhase[phase] || tipsByPhase['ACTIVE']

  const result: any[] = []
  for (let i = 0; i < days; i++) {
    const b = breakfasts[i % breakfasts.length]
    const ms = morningSnacks[i % morningSnacks.length]
    const lu = lunches[i % lunches.length]
    const as2 = afternoonSnacks[i % afternoonSnacks.length]
    const d = dinners[i % dinners.length]
    const dayTips = phaseTips[i % phaseTips.length]

    result.push({
      day: i + 1,
      meals: {
        breakfast: { ...b },
        morning_snack: { ...ms },
        lunch: { ...lu },
        afternoon_snack: { ...as2 },
        dinner: { ...d }
      },
      tips: dayTips
    })
  }

  return result
}
