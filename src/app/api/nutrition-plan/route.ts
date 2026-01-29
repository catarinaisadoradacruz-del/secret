// API para gerar plano alimentar com IA
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { days = 7, goal } = await request.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar perfil
    const { data: profile } = await supabase
      .from('users')
      .select('name, phase, last_menstrual_date, dietary_restrictions, weight, height')
      .eq('id', user.id)
      .single()

    const userPhase = profile?.phase || 'ACTIVE'
    const restrictions = profile?.dietary_restrictions || []

    // Calcular semana gestacional
    let gestationWeek: number | undefined
    if (userPhase === 'PREGNANT' && profile?.last_menstrual_date) {
      const dum = new Date(profile.last_menstrual_date)
      const diffDays = Math.ceil((Date.now() - dum.getTime()) / (1000 * 60 * 60 * 24))
      gestationWeek = Math.floor(diffDays / 7)
    }

    // Tentar Gemini
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
    let plan: any = null
    
    if (geminiKey) {
      try {
        const prompt = buildMealPlanPrompt(userPhase, gestationWeek, days, goal, restrictions)
        
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': geminiKey
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 8192 },
          }),
        })

        if (response.ok) {
          const data = await response.json()
          const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text
          if (responseText) {
            plan = parseMealPlan(responseText)
          }
        }
      } catch (error) {
        console.warn('Gemini falhou:', error)
      }
    }

    // Fallback
    if (!plan) {
      plan = generateFallbackPlan(userPhase, days)
    }

    // Salvar plano
    const { data: savedPlan, error } = await supabase
      .from('nutrition_plans')
      .insert({
        user_id: user.id,
        name: `Plano ${userPhase === 'PREGNANT' ? 'Gestante' : 'Saudável'} - ${days} dias`,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        meals_per_day: 5,
        daily_calories: userPhase === 'PREGNANT' ? 2300 : 2000,
        plan_data: plan,
        is_active: true
      })
      .select()
      .single()

    return NextResponse.json({ plan, savedId: savedPlan?.id })

  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

function buildMealPlanPrompt(
  phase: string, 
  gestationWeek: number | undefined,
  days: number,
  goal?: string,
  restrictions?: string[]
): string {
  const phaseInfo: Record<string, string> = {
    'PREGNANT': gestationWeek 
      ? `Gestante de ${gestationWeek} semanas. Foco: ácido fólico, ferro, cálcio, proteínas, DHA.`
      : 'Gestante. Foco em nutrientes essenciais para gravidez.',
    'POSTPARTUM': 'Pós-parto/Amamentação. Foco: recuperação, produção de leite, energia.',
    'TRYING': 'Tentando engravidar. Foco: fertilidade, ácido fólico, zinco.',
    'ACTIVE': 'Alimentação equilibrada e saudável.'
  }

  return `Crie um plano alimentar de ${days} dias.

PERFIL: ${phaseInfo[phase] || phaseInfo['ACTIVE']}
${goal ? `OBJETIVO: ${goal}` : ''}
${restrictions?.length ? `RESTRIÇÕES: ${restrictions.join(', ')}` : ''}

Responda APENAS com JSON válido:
{
  "days": [
    {
      "day": 1,
      "meals": {
        "breakfast": {"name": "Café da manhã", "description": "Omelete com espinafre + torrada integral + suco de laranja", "calories": 350},
        "morning_snack": {"name": "Lanche manhã", "description": "Iogurte natural com granola", "calories": 150},
        "lunch": {"name": "Almoço", "description": "Frango grelhado + arroz integral + salada colorida", "calories": 500},
        "afternoon_snack": {"name": "Lanche tarde", "description": "Frutas picadas com castanhas", "calories": 200},
        "dinner": {"name": "Jantar", "description": "Sopa de legumes com frango desfiado", "calories": 400}
      },
      "totalCalories": 1600,
      "tips": "Beba bastante água ao longo do dia"
    }
  ],
  "weeklyTips": ["Varie as cores dos vegetais", "Prefira proteínas magras"],
  "shoppingList": ["Espinafre", "Ovos", "Frango", "Arroz integral"]
}`
}

function parseMealPlan(text: string): any {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (e) {
    console.error('Erro ao parsear plano:', e)
  }
  return null
}

function generateFallbackPlan(phase: string, days: number): any {
  const baseMeals = {
    breakfast: { name: "Café da manhã", description: "Omelete com vegetais + torrada integral + fruta", calories: 350 },
    morning_snack: { name: "Lanche da manhã", description: "Iogurte natural com granola", calories: 150 },
    lunch: { name: "Almoço", description: "Proteína magra + arroz integral + legumes + salada", calories: 500 },
    afternoon_snack: { name: "Lanche da tarde", description: "Frutas + oleaginosas", calories: 200 },
    dinner: { name: "Jantar", description: "Proteína + vegetais refogados + carboidrato leve", calories: 400 }
  }

  const daysArray = []
  for (let i = 1; i <= days; i++) {
    daysArray.push({
      day: i,
      meals: baseMeals,
      totalCalories: 1600,
      tips: phase === 'PREGNANT' 
        ? 'Não esqueça de tomar suas vitaminas pré-natais!'
        : 'Mantenha-se hidratada!'
    })
  }

  return {
    days: daysArray,
    weeklyTips: [
      'Beba pelo menos 2 litros de água por dia',
      'Varie as cores dos vegetais no prato',
      'Prefira alimentos integrais',
      'Evite alimentos ultraprocessados'
    ],
    shoppingList: [
      'Ovos', 'Frango', 'Peixe', 'Arroz integral', 'Feijão',
      'Espinafre', 'Brócolis', 'Cenoura', 'Tomate', 'Alface',
      'Banana', 'Maçã', 'Laranja', 'Abacate',
      'Iogurte natural', 'Leite', 'Queijo cottage',
      'Aveia', 'Granola', 'Castanhas'
    ]
  }
}
