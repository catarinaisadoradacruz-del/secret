import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || ''

export async function POST(request: Request) {
  try {
    if (!apiKey) {
      return NextResponse.json({ error: 'API key não configurada' }, { status: 500 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar dados do usuário
    const { data: userData } = await supabase
      .from('users')
      .select('name, phase, last_menstrual_date, dietary_restrictions, goals, is_breastfeeding')
      .eq('id', user.id)
      .single()

    const userName = userData?.name || 'Usuária'
    const phase = userData?.phase || 'ACTIVE'
    const restrictions = userData?.dietary_restrictions || []
    const goals = userData?.goals || []
    const isBreastfeeding = userData?.is_breastfeeding || false

    let gestationWeek: number | undefined
    if (phase === 'PREGNANT' && userData?.last_menstrual_date) {
      const dum = new Date(userData.last_menstrual_date)
      const today = new Date()
      const diffDays = Math.ceil((today.getTime() - dum.getTime()) / (1000 * 60 * 60 * 24))
      gestationWeek = Math.floor(diffDays / 7)
    }

    // Gerar plano com IA
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = buildMealPlanPrompt(userName, phase, gestationWeek, restrictions, goals, isBreastfeeding)
    
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    
    // Limpar e parsear JSON
    const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim()
    const plan = JSON.parse(cleanJson)

    // Salvar plano no banco
    await supabase
      .from('nutrition_plans')
      .update({ is_active: false })
      .eq('user_id', user.id)

    await supabase
      .from('nutrition_plans')
      .insert({
        user_id: user.id,
        name: `Plano ${new Date().toLocaleDateString('pt-BR')}`,
        plan_data: plan,
        is_active: true
      })

    return NextResponse.json({ plan })

  } catch (error: any) {
    console.error('Erro ao gerar plano:', error)
    return NextResponse.json({ 
      error: 'Erro ao gerar plano alimentar',
      details: error.message 
    }, { status: 500 })
  }
}

function buildMealPlanPrompt(
  name: string,
  phase: string,
  gestationWeek?: number,
  restrictions: string[] = [],
  goals: string[] = [],
  isBreastfeeding: boolean = false
): string {
  let prompt = `
Crie um plano alimentar semanal completo e personalizado.

PERFIL DA USUÁRIA:
- Nome: ${name}
`

  if (phase === 'PREGNANT' && gestationWeek) {
    const trimester = gestationWeek <= 13 ? '1º trimestre' : gestationWeek <= 26 ? '2º trimestre' : '3º trimestre'
    prompt += `- Fase: GESTANTE 🤰
- Semana de gestação: ${gestationWeek}ª (${trimester})

DIRETRIZES PARA GESTANTES:
- Calorias: ${gestationWeek <= 13 ? '1800-2000' : '2200-2500'} kcal/dia
- Aumentar proteína para 80-100g/dia
- Priorizar: ácido fólico, ferro, cálcio, ômega-3, vitamina D
- NUNCA incluir: peixes crus (sushi), carnes mal passadas, queijos não pasteurizados, embutidos, álcool
- Fracionar em 5-6 refeições pequenas
`
  } else if (phase === 'POSTPARTUM') {
    prompt += `- Fase: PÓS-PARTO 🤱
${isBreastfeeding ? '- Amamentando: SIM (adicionar ~500 kcal extras)' : '- Amamentando: NÃO'}

DIRETRIZES PARA PÓS-PARTO:
- Calorias: ${isBreastfeeding ? '2300-2500' : '1800-2000'} kcal/dia
- Alta proteína para recuperação
- Priorizar: ferro, cálcio, vitamina D, ômega-3
- Incluir alimentos para produção de leite se amamentando
`
  } else {
    prompt += `- Fase: Ativa e saudável 💪

DIRETRIZES:
- Calorias: 1800-2200 kcal/dia
- Dieta equilibrada e variada
`
  }

  if (restrictions.length > 0) {
    prompt += `\nRESTRIÇÕES ALIMENTARES: ${restrictions.join(', ')}\n`
  }

  if (goals.length > 0) {
    prompt += `\nOBJETIVOS: ${goals.join(', ')}\n`
  }

  prompt += `
Retorne APENAS um JSON válido (sem markdown, sem explicações) no formato:
{
  "dailyCalories": 2000,
  "dailyProtein": 80,
  "dailyCarbs": 250,
  "dailyFat": 65,
  "meals": [
    {
      "day": "Segunda-feira",
      "breakfast": {"name": "Descrição detalhada do café da manhã", "calories": 400},
      "morningSnack": {"name": "Descrição do lanche", "calories": 150},
      "lunch": {"name": "Descrição detalhada do almoço", "calories": 600},
      "afternoonSnack": {"name": "Descrição do lanche", "calories": 150},
      "dinner": {"name": "Descrição detalhada do jantar", "calories": 500}
    }
  ],
  "tips": [
    "Dica personalizada 1",
    "Dica personalizada 2",
    "Dica personalizada 3"
  ],
  "weeklyShoppingList": ["item 1", "item 2", "item 3"]
}

IMPORTANTE:
- Inclua os 7 dias da semana (Segunda a Domingo)
- Seja específico nas descrições (ex: "2 ovos mexidos com espinafre, 1 fatia de pão integral com abacate")
- As calorias devem somar aproximadamente o total diário
- Dê 3-5 dicas práticas e personalizadas
- Liste 15-20 itens para a lista de compras
`

  return prompt
}
