// Versão: 05-02-2026 - Planos Nutricionais com IA (Groq + Gemini + Fallback) - Colunas corrigidas
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const { days = 7, profile: clientProfile, feedback, preferences } = await request.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    // Buscar perfil completo
    const { data: profile } = await supabase
      .from('users')
      .select('name, phase, last_menstrual_date, due_date, dietary_restrictions, current_weight, height, allergies, goals, exercise_level, is_breastfeeding')
      .eq('id', user.id)
      .single()

    const userPhase = profile?.phase || clientProfile?.phase || 'ACTIVE'
    const restrictions = profile?.dietary_restrictions || clientProfile?.dietary_restrictions || []
    const allergies = profile?.allergies || clientProfile?.allergies || []
    const userName = profile?.name || 'Usuária'
    const goals = profile?.goals || []
    const exerciseLevel = profile?.exercise_level || 'moderate'

    let gestationWeek: number | undefined
    if (userPhase === 'PREGNANT' && profile?.last_menstrual_date) {
      const dum = new Date(profile.last_menstrual_date)
      gestationWeek = Math.floor((Date.now() - dum.getTime()) / (1000 * 60 * 60 * 24 * 7))
    }

    // Calcular calorias baseado no perfil
    let dailyCals = 1800
    if (userPhase === 'PREGNANT') {
      dailyCals = gestationWeek && gestationWeek > 27 ? 2500 : gestationWeek && gestationWeek > 13 ? 2300 : 2100
    } else if (userPhase === 'POSTPARTUM') {
      dailyCals = profile?.is_breastfeeding ? 2500 : 2000
    } else if (userPhase === 'TRYING') {
      dailyCals = 2000
    }

    const prompt = buildDetailedPrompt(userPhase, gestationWeek, days, restrictions, allergies, feedback, userName, preferences, goals, exerciseLevel, dailyCals)
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
              { role: 'system', content: 'Você é um nutricionista especialista em saúde materna brasileira. Responda APENAS com JSON válido, sem nenhum texto antes ou depois. Não use markdown.' },
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

    // Salvar novo plano com colunas corretas
    const planName = `Plano ${userPhase === 'PREGNANT' ? 'Gestante' : userPhase === 'POSTPARTUM' ? 'Pós-Parto' : userPhase === 'TRYING' ? 'Fertilidade' : 'Bem-Estar'} - ${days} dias`
    
    const { error: insertError } = await supabase.from('nutrition_plans').insert({
      user_id: user.id,
      name: planName,
      description: feedback ? `Preferências: ${feedback}` : `Plano personalizado de ${days} dias`,
      daily_calories: dailyCals,
      daily_protein: userPhase === 'PREGNANT' ? 75 : 60,
      daily_carbs: Math.round(dailyCals * 0.5 / 4),
      daily_fat: Math.round(dailyCals * 0.3 / 9),
      daily_fiber: 28,
      weekly_plan: normalizedPlan,
      is_active: true,
      generated_by_ai: true,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + days * 86400000).toISOString().split('T')[0],
    })

    if (insertError) {
      console.error('Error saving plan:', insertError)
    }

    return NextResponse.json({ plan: normalizedPlan, name: planName })
  } catch (error) {
    console.error('Nutrition plan error:', error)
    return NextResponse.json({ error: 'Erro ao gerar plano' }, { status: 500 })
  }
}

function buildDetailedPrompt(phase: string, week: number | undefined, days: number, restrictions: string[], allergies: string[], feedback?: string, name?: string, preferences?: any, goals?: string[], exerciseLevel?: string, dailyCals?: number): string {
  const phaseInfo: Record<string, string> = {
    'PREGNANT': week
      ? `Gestante de ${week} semanas (${week <= 13 ? '1º trimestre - foco em ácido fólico, ferro, vitamina B12, gengibre para enjoo, refeições menores e frequentes' : week <= 27 ? '2º trimestre - foco em ferro, cálcio, ômega-3, DHA, proteínas, vitamina D' : '3º trimestre - foco em ferro, cálcio, fibras, tâmaras, magnésio, hidratação extra'}). Necessidade calórica: ~${dailyCals}kcal/dia. Proteína mínima: 75g/dia.`
      : `Gestante. Necessidade calórica: ~${dailyCals}kcal/dia.`,
    'POSTPARTUM': `Pós-parto/Amamentação. Necessidade calórica: ~${dailyCals}kcal/dia. Foco em alimentos galactogênicos (aveia, linhaça, água de coco), ferro para recuperação, proteínas para cicatrização e muita hidratação. Refeições práticas e rápidas.`,
    'TRYING': `Tentando engravidar. Necessidade calórica: ~${dailyCals}kcal/dia. Foco em ácido fólico (400mcg/dia via espinafre, lentilha), zinco (castanhas, sementes), selênio (castanha-do-pará), vitamina E, antioxidantes, ômega-3.`,
    'ACTIVE': `Mulher em fase de bem-estar geral. Necessidade calórica: ~${dailyCals}kcal/dia. Alimentação equilibrada, variada e nutritiva.`
  }

  return `Crie um plano alimentar COMPLETO e DETALHADO de ${days} dias para: ${phaseInfo[phase] || phaseInfo['ACTIVE']}

${restrictions.length ? `RESTRIÇÕES ALIMENTARES: ${restrictions.join(', ')}` : ''}
${allergies.length ? `ALERGIAS: ${allergies.join(', ')}` : ''}
${goals?.length ? `OBJETIVOS: ${goals.join(', ')}` : ''}
${exerciseLevel ? `NÍVEL DE EXERCÍCIO: ${exerciseLevel}` : ''}
${feedback ? `PREFERÊNCIAS ESPECIAIS DA USUÁRIA: ${feedback}` : ''}

REGRAS IMPORTANTES:
- Cada dia DEVE ter refeições COMPLETAMENTE DIFERENTES dos outros dias
- Use ingredientes brasileiros comuns e acessíveis (encontrados em qualquer mercado)
- Inclua as quantidades exatas (ex: "150g de frango", "2 colheres de arroz integral", "1 copo de 200ml")
- Valores nutricionais devem ser REALISTAS e PRECISOS
- As dicas devem ser ESPECÍFICAS para cada dia e práticas
- O total calórico diário deve ficar próximo de ${dailyCals} kcal
- Varie as proteínas: frango, peixe, ovo, carne, feijão, lentilha, tofu
- Inclua cores variadas (folhas verdes, legumes alaranjados, frutas vermelhas)
- Considere praticidade: pelo menos 2 refeições rápidas (< 15min) por dia

Responda SOMENTE com este JSON (sem markdown, sem texto extra):
{
  "days": [
    {
      "day": 1,
      "meals": {
        "breakfast": {
          "name": "Nome criativo da refeição",
          "description": "Descrição detalhada com TODAS as quantidades exatas",
          "calories": 380,
          "protein": 18,
          "carbs": 35,
          "fat": 14
        },
        "morning_snack": {
          "name": "Nome do lanche",
          "description": "Descrição com quantidades",
          "calories": 160,
          "protein": 6,
          "carbs": 22,
          "fat": 5
        },
        "lunch": {
          "name": "Nome do almoço",
          "description": "Descrição completa com acompanhamentos e quantidades",
          "calories": 550,
          "protein": 35,
          "carbs": 55,
          "fat": 18
        },
        "afternoon_snack": {
          "name": "Nome do lanche",
          "description": "Descrição com quantidades",
          "calories": 200,
          "protein": 8,
          "carbs": 26,
          "fat": 7
        },
        "dinner": {
          "name": "Nome do jantar",
          "description": "Descrição completa com quantidades",
          "calories": 450,
          "protein": 30,
          "carbs": 42,
          "fat": 15
        }
      },
      "tips": ["Dica prática e específica 1", "Dica prática e específica 2", "Dica sobre hidratação ou suplementação"]
    }
  ]
}

Gere exatamente ${days} dias com refeições 100% DIFERENTES a cada dia. Culinária BRASILEIRA variada e acessível.`
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
  
  if (Array.isArray(raw)) {
    return raw.slice(0, days).map((day: any, idx: number) => normalizeDayPlan(day, idx + 1))
  }
  
  if (raw.days && Array.isArray(raw.days)) {
    return raw.days.slice(0, days).map((day: any, idx: number) => normalizeDayPlan(day, idx + 1))
  }

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

  return { day: dayNumber, meals: normalizedMeals, tips }
}

function getMealTypeName(type: string): string {
  const names: Record<string, string> = { breakfast: 'Café da Manhã', morning_snack: 'Lanche da Manhã', lunch: 'Almoço', afternoon_snack: 'Lanche da Tarde', dinner: 'Jantar' }
  return names[type] || type
}

function getDefaultMeal(type: string, day: number): any {
  const defaults: Record<string, any> = {
    breakfast: { name: 'Café da Manhã Nutritivo', description: 'Omelete com vegetais + torrada integral + suco natural', calories: 350, protein: 18, carbs: 30, fat: 14 },
    morning_snack: { name: 'Lanche da Manhã', description: '1 pote de iogurte natural com granola e frutas', calories: 150, protein: 8, carbs: 20, fat: 5 },
    lunch: { name: 'Almoço Completo', description: 'Proteína grelhada + arroz integral + feijão + salada colorida', calories: 550, protein: 35, carbs: 55, fat: 16 },
    afternoon_snack: { name: 'Lanche da Tarde', description: '1 maçã + 30g de castanhas + chá de camomila', calories: 200, protein: 5, carbs: 25, fat: 10 },
    dinner: { name: 'Jantar Leve', description: 'Sopa de legumes com frango desfiado + torrada integral', calories: 400, protein: 28, carbs: 35, fat: 14 },
  }
  return defaults[type] || defaults.lunch
}

function generateRichFallbackPlan(phase: string, week: number | undefined, days: number, restrictions: string[], name: string): any[] {
  const breakfasts = [
    { name: 'Omelete de Espinafre com Torrada', description: '2 ovos mexidos com espinafre refogado + 1 fatia de pão integral com azeite + 1 copo (200ml) de suco de laranja natural', calories: 380, protein: 22, carbs: 32, fat: 18 },
    { name: 'Mingau de Aveia com Frutas', description: '1/2 xícara de aveia cozida com 1 copo de leite + 1 banana picada + morangos + 1 col. de mel + canela', calories: 340, protein: 12, carbs: 52, fat: 8 },
    { name: 'Panqueca de Banana Fit', description: '3 panquecas (1 banana + 2 ovos + 3 col. aveia) + 1 col. pasta de amendoim + frutas vermelhas', calories: 360, protein: 14, carbs: 45, fat: 14 },
    { name: 'Torrada com Abacate e Ovo', description: '2 torradas integrais + 1/2 abacate amassado + 1 ovo pochê + tomate cereja + gergelim', calories: 400, protein: 16, carbs: 34, fat: 22 },
    { name: 'Smoothie Bowl de Açaí', description: 'Bowl: 100g polpa de açaí + 1 banana congelada batidos + 2 col. granola + kiwi + mel', calories: 380, protein: 8, carbs: 58, fat: 12 },
    { name: 'Crepioca com Queijo', description: 'Crepioca (1 ovo + 2 col. tapioca) + queijo branco + tomate + orégano + 1 copo de suco de acerola', calories: 320, protein: 18, carbs: 30, fat: 14 },
    { name: 'Iogurte Grego com Granola', description: '1 pote de iogurte grego natural + 2 col. granola sem açúcar + kiwi picado + 1 col. chia + mel', calories: 310, protein: 18, carbs: 36, fat: 10 },
    { name: 'Vitamina Proteica', description: '1 banana + 1 copo de leite + 2 col. aveia + 1 col. pasta de amendoim + 1 col. cacau em pó', calories: 350, protein: 14, carbs: 42, fat: 14 },
    { name: 'Tapioca com Queijo Coalho', description: 'Tapioca (3 col.) + queijo coalho grelhado + tomate + manjericão + 1 copo de suco de manga', calories: 340, protein: 14, carbs: 44, fat: 12 },
    { name: 'Pão com Ricota e Pêssego', description: '2 fatias de pão integral + ricota temperada (3 col.) + fatias de pêssego + mel + café com leite', calories: 330, protein: 16, carbs: 40, fat: 10 },
  ]
  const morningSnacks = [
    { name: 'Iogurte com Frutas Vermelhas', description: '1 pote de iogurte natural + 1/2 xícara de frutas vermelhas', calories: 150, protein: 8, carbs: 20, fat: 4 },
    { name: 'Mix de Castanhas e Damascos', description: '30g de mix (caju, amêndoas, nozes) + 3 damascos secos', calories: 180, protein: 5, carbs: 16, fat: 12 },
    { name: 'Banana com Canela', description: '1 banana média + canela polvilhada + 5 amêndoas', calories: 160, protein: 3, carbs: 30, fat: 5 },
    { name: 'Queijo Branco com Morangos', description: '2 fatias de queijo branco + 5 morangos + 1 col. mel', calories: 170, protein: 10, carbs: 18, fat: 7 },
    { name: 'Torrada com Cottage', description: '1 torrada integral + 2 col. de cottage + tomate cereja picado', calories: 140, protein: 10, carbs: 15, fat: 4 },
    { name: 'Smoothie Verde', description: '1 xícara de espinafre + 1 banana + 200ml leite de coco batidos', calories: 160, protein: 4, carbs: 28, fat: 5 },
    { name: 'Maçã com Pasta de Amendoim', description: '1 maçã fatiada + 1 col. de pasta de amendoim integral', calories: 200, protein: 5, carbs: 25, fat: 10 },
    { name: 'Cenoura com Homus', description: '1 cenoura em palitos + 3 col. de homus caseiro', calories: 130, protein: 5, carbs: 16, fat: 5 },
    { name: 'Vitamina de Mamão', description: '1 fatia de mamão + 1/2 copo de leite + 1 col. linhaça dourada', calories: 155, protein: 5, carbs: 22, fat: 5 },
    { name: 'Barrinha de Aveia Caseira', description: '1 barra de aveia com mel + banana passa + castanhas', calories: 170, protein: 4, carbs: 26, fat: 6 },
  ]
  const lunches = [
    { name: 'Frango Grelhado com Quinoa', description: 'Peito de frango grelhado (150g) + 4 col. quinoa + brócolis refogado + salada de tomate e rúcula', calories: 520, protein: 40, carbs: 42, fat: 16 },
    { name: 'Salmão com Batata Doce', description: 'Filé de salmão grelhado (150g) + 1 batata doce média assada + espinafre refogado + cenoura ralada', calories: 550, protein: 38, carbs: 45, fat: 20 },
    { name: 'Feijoada Light', description: 'Feijoada light (peito de peru + linguiça de frango) + 3 col. arroz integral + couve refogada + 1 laranja', calories: 540, protein: 32, carbs: 55, fat: 18 },
    { name: 'Bowl Mexicano', description: 'Arroz integral + feijão preto + frango desfiado + guacamole + tomate + milho + alface', calories: 530, protein: 35, carbs: 52, fat: 16 },
    { name: 'Tilápia ao Forno com Legumes', description: 'Filé de tilápia (180g) ao forno + 3 col. arroz integral + abobrinha, cenoura e pimentão assados', calories: 480, protein: 36, carbs: 44, fat: 14 },
    { name: 'Strogonoff de Frango Light', description: 'Strogonoff (frango + iogurte natural, sem creme) + arroz integral + salada verde com tomate', calories: 510, protein: 34, carbs: 50, fat: 16 },
    { name: 'Carne com Mandioca', description: 'Carne magra cozida (150g) + 2 pedaços de mandioca cozida + couve refogada + 3 col. feijão', calories: 560, protein: 38, carbs: 52, fat: 18 },
    { name: 'Bowl de Atum Oriental', description: 'Arroz integral + 1 lata de atum em pedaços + pepino + edamame + cenoura ralada + gergelim + gengibre', calories: 490, protein: 34, carbs: 48, fat: 15 },
    { name: 'Frango com Purê de Abóbora', description: '2 sobrecoxas sem pele grelhadas + purê de abóbora + salada de grão de bico com tomate', calories: 530, protein: 36, carbs: 46, fat: 18 },
    { name: 'Escondidinho de Carne', description: 'Escondidinho: carne moída magra + purê de batata doce gratinado + salada de alface, rúcula e pepino', calories: 500, protein: 32, carbs: 48, fat: 18 },
  ]
  const afternoonSnacks = [
    { name: 'Sanduíche Natural de Frango', description: 'Pão integral + frango desfiado + cenoura ralada + alface + requeijão light', calories: 220, protein: 16, carbs: 22, fat: 7 },
    { name: 'Frutas com Granola', description: '1 fatia de melão + 1/2 manga picada + 2 col. granola sem açúcar', calories: 200, protein: 4, carbs: 38, fat: 4 },
    { name: 'Wrap de Peito de Peru', description: '1 wrap integral pequeno + peito de peru + queijo branco + tomate', calories: 210, protein: 15, carbs: 20, fat: 8 },
    { name: 'Batata Doce com Canela', description: '1 batata doce média assada + canela + 1 col. iogurte natural', calories: 190, protein: 4, carbs: 38, fat: 2 },
    { name: 'Bolinho de Banana Fit', description: '2 bolinhos de banana com aveia (caseiros, sem açúcar) + chá de camomila', calories: 200, protein: 6, carbs: 32, fat: 6 },
    { name: 'Açaí no Copo', description: '100ml de açaí + banana + 1 col. granola (sem adição de açúcar)', calories: 230, protein: 4, carbs: 36, fat: 8 },
    { name: 'Homus com Torradinhas', description: '3 col. homus + palitos de pepino e cenoura + 3 torradas integrais', calories: 190, protein: 7, carbs: 22, fat: 8 },
    { name: 'Salada de Frutas Natural', description: 'Mamão + banana + maçã + uva + 1 col. linhaça dourada', calories: 180, protein: 3, carbs: 36, fat: 4 },
    { name: 'Pão de Queijo Fit', description: '3 pãezinhos (polvilho + cottage) + 1 copo de suco de maracujá', calories: 210, protein: 8, carbs: 28, fat: 8 },
    { name: 'Milho Cozido com Água de Coco', description: '1 espiga de milho cozida + 1 copo de água de coco gelada', calories: 200, protein: 5, carbs: 34, fat: 5 },
  ]
  const dinners = [
    { name: 'Sopa de Legumes com Frango', description: 'Sopa: frango desfiado (100g) + cenoura, batata, abobrinha + 1 fatia pão integral', calories: 380, protein: 28, carbs: 34, fat: 12 },
    { name: 'Omelete de Forno', description: 'Omelete: 3 ovos + espinafre + tomate + queijo branco + salada verde', calories: 360, protein: 24, carbs: 10, fat: 24 },
    { name: 'Wrap Integral de Atum', description: '1 wrap integral + atum + alface + tomate + cottage + mostarda', calories: 370, protein: 26, carbs: 30, fat: 14 },
    { name: 'Risoto de Cogumelos', description: 'Risoto: arroz arbóreo + cogumelos (shimeji + paris) + parmesão ralado + salsinha', calories: 420, protein: 14, carbs: 56, fat: 14 },
    { name: 'Salada Quente de Lentilha', description: 'Lentilha cozida (1 xíc.) + berinjela e abobrinha assadas + rúcula + azeite + queijo', calories: 380, protein: 18, carbs: 42, fat: 14 },
    { name: 'Tilápia com Purê', description: 'Tilápia grelhada (150g) + purê de batata + brócolis no vapor + limão', calories: 400, protein: 32, carbs: 36, fat: 12 },
    { name: 'Panqueca de Carne', description: '2 panquecas integrais + recheio de carne moída + molho de tomate + salada', calories: 410, protein: 28, carbs: 38, fat: 16 },
    { name: 'Caldo Verde Light', description: 'Caldo verde: couve + batata + linguiça de frango + torrada integral', calories: 350, protein: 18, carbs: 38, fat: 12 },
    { name: 'Macarrão Integral com Frango', description: 'Macarrão integral (100g seco) + frango em cubos + brócolis + azeite + parmesão', calories: 430, protein: 32, carbs: 44, fat: 14 },
    { name: 'Tofu Salteado com Vegetais', description: 'Tofu firme (200g) salteado + pimentão + cenoura + brócolis + molho shoyu + gengibre + arroz integral', calories: 390, protein: 22, carbs: 38, fat: 16 },
  ]

  const tipsByPhase: Record<string, string[][]> = {
    'PREGNANT': [
      ['Tome seu ácido fólico pela manhã com suco de laranja - vitamina C melhora a absorção do ferro', 'Coma algo a cada 2-3 horas para evitar enjoo matinal', 'Beba pelo menos 8 copos de água hoje'],
      ['Espinafre e feijão são campeões de ferro - inclua no almoço', 'Hidratação: coloque uma garrafa de 500ml na mesa e reponha a cada hora', 'Vitamina B6 (banana, batata, frango) ajuda com náuseas'],
      ['Cálcio é prioridade: leite, iogurte, queijo, brócolis, gergelim', 'Salmão ou sardinha 2x/semana para ômega-3 (DHA) - essencial para o cérebro do bebê', 'Se sentir azia, evite deitar logo após comer'],
      ['Coma fruta cítrica junto com alimentos ricos em ferro - triplica a absorção!', 'Aveia no café da manhã é ótima para fibras e evitar constipação', 'Ferro + vitamina C = combo poderoso'],
      ['Vitamina D: 15 min de sol pela manhã (braços e pernas)', 'Proteína a cada refeição: seu bebê precisa para crescer', 'Evite adoçantes artificiais - prefira mel ou melado'],
      ['Máximo 1 xícara de café por dia (200mg cafeína)', 'Alimentos ricos em colina: ovos, brócolis, couve-flor', 'Magnésio (castanhas, chocolate amargo) ajuda com câimbras'],
      ['Lanche antes de dormir evita hipoglicemia noturna', 'No 3º trimestre: tâmaras (6/dia a partir de 36 sem.) podem ajudar no parto', 'Fibras + água = intestino funcionando bem'],
    ],
    'POSTPARTUM': [
      ['Amamentando? Beba pelo menos 3L de água - cada mamada desidrata', 'Aveia no café ajuda na produção de leite', 'Não pule refeições mesmo nos dias mais cansativos'],
      ['Ferro para recuperação: feijão, carnes vermelhas, espinafre', 'Água de coco é ótima para hidratação e reposição de minerais', 'Congele marmitas nos dias bons para os dias difíceis'],
      ['Coma sempre que o bebê dormir - não pule refeições', 'Peça ajuda! Aceite quando oferecerem comida', 'Vitamina C (laranja, acerola) ajuda na cicatrização'],
      ['Linhaça moída no iogurte: rica em ômega-3 para você e o bebê', 'Proteína em toda refeição ajuda na cicatrização', 'Feno-grego em chá pode ajudar na lactação'],
      ['Não faça dieta restritiva! Seu corpo precisa de energia para produzir leite', 'Cerveja preta SEM ÁLCOOL pode ajudar na lactação', 'Cálcio: você está doando mineral pelo leite'],
      ['Sol pela manhã + vitamina D ajudam no humor e na recuperação', 'Se muito cansada, priorize proteínas e carboidratos complexos', 'Chocolate amargo (70%+) em pequenas porções é permitido!'],
      ['Planeje refeições simples para os dias difíceis', 'Smoothies são aliados: nutritivos e rápidos de fazer', 'Seu corpo se recupera - seja gentil consigo mesma'],
    ],
    'ACTIVE': [
      ['Prato colorido = prato nutritivo! Inclua 3+ cores diferentes', 'Beba 1 copo de água antes de cada refeição', 'Mastigue devagar - leva 20 min para sentir saciedade'],
      ['Carboidratos integrais: mais fibra, mais saciedade', 'Proteína no café da manhã reduz fome ao longo do dia', 'Temperos naturais (alho, cúrcuma, gengibre) são anti-inflamatórios'],
      ['Cozinhe em casa o máximo possível', 'Castanhas: lanche perfeito entre refeições (1 punhado)', 'Evite ultraprocessados - leia os rótulos'],
      ['Varie proteínas: frango, peixe, ovo, feijão, tofu', 'Azeite extra-virgem: a gordura mais saudável', 'Frutas da estação são mais baratas e nutritivas'],
      ['Prepare marmitas no domingo para a semana', 'Não vá ao mercado com fome - faça lista antes', 'Chás ajudam na hidratação: camomila, hortelã, gengibre'],
      ['Sono ruim = mais fome no dia seguinte', 'Probióticos (iogurte natural) cuidam do seu intestino', 'Inclua uma salada crua por dia para enzimas digestivas'],
      ['Cada refeição é uma oportunidade de nutrir seu corpo', 'Permita-se: equilíbrio é mais importante que perfeição', 'Fibras + água = intestino saudável e pele bonita'],
    ]
  }

  const phaseTips = tipsByPhase[phase] || tipsByPhase['ACTIVE']
  const result: any[] = []
  
  for (let i = 0; i < days; i++) {
    result.push({
      day: i + 1,
      meals: {
        breakfast: { ...breakfasts[i % breakfasts.length] },
        morning_snack: { ...morningSnacks[i % morningSnacks.length] },
        lunch: { ...lunches[i % lunches.length] },
        afternoon_snack: { ...afternoonSnacks[i % afternoonSnacks.length] },
        dinner: { ...dinners[i % dinners.length] }
      },
      tips: phaseTips[i % phaseTips.length]
    })
  }

  return result
}
