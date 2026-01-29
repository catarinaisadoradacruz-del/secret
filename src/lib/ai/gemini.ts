import { GoogleGenerativeAI } from '@google/generative-ai'

// Usar a chave de API com fallback
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || ''

if (!apiKey) {
  console.warn('⚠️ GOOGLE_GENERATIVE_AI_API_KEY não configurada!')
}

const genAI = new GoogleGenerativeAI(apiKey)

// Usar modelo estável
export const chatModel = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
})

export const embeddingModel = genAI.getGenerativeModel({
  model: 'text-embedding-004',
})

export async function generateEmbedding(text: string): Promise<number[]> {
  const result = await embeddingModel.embedContent(text)
  return result.embedding.values
}

export async function analyzeMealImage(
  imageBase64: string,
  userContext: {
    phase: string
    gestationWeek?: number
    restrictions: string[]
  }
) {
  const isPregnant = userContext.phase === 'PREGNANT'

  const prompt = `
Analise esta imagem de refeição e forneça informações nutricionais.

${isPregnant ? `
ATENÇÃO: A usuária é GESTANTE na ${userContext.gestationWeek}ª semana.
Verifique se algum alimento é contraindicado para gestantes.
Alimentos proibidos: peixes crus, carnes mal passadas, queijos não pasteurizados, embutidos, álcool.
` : ''}

${userContext.restrictions.length > 0 ? `Restrições alimentares: ${userContext.restrictions.join(', ')}` : ''}

Retorne APENAS JSON válido (sem markdown):
{
  "foods": [{"name": "nome", "portion": "porção", "calories": 0, "protein": 0, "carbs": 0, "fat": 0}],
  "totalCalories": 0,
  "totalProtein": 0,
  "totalCarbs": 0,
  "totalFat": 0,
  "isSafeForPregnancy": true,
  "warnings": [],
  "suggestions": []
}
`

  const result = await chatModel.generateContent([
    prompt,
    { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
  ])

  const text = result.response.text()
  const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim()
  return JSON.parse(cleanJson)
}

export async function generateWorkoutPlan(userProfile: {
  name: string
  phase: string
  gestationWeek?: number
  goals: string[]
  exerciseLevel: string
}) {
  const prompt = `
Crie um plano de treino semanal personalizado.

PERFIL:
- Nome: ${userProfile.name}
- Fase: ${userProfile.phase}
${userProfile.phase === 'PREGNANT' ? `- Semana: ${userProfile.gestationWeek}` : ''}
- Objetivos: ${userProfile.goals.join(', ')}
- Nível: ${userProfile.exerciseLevel}

${userProfile.phase === 'PREGNANT' ? `
REGRAS PARA GESTANTES:
- Evitar exercícios deitada de costas após 1º trimestre
- Sem alto impacto
- Incluir assoalho pélvico
- Frequência cardíaca moderada
` : ''}

Retorne APENAS JSON:
{
  "name": "Nome do plano",
  "description": "Descrição",
  "sessions": [
    {
      "day": "Segunda",
      "focus": "Foco",
      "duration": 30,
      "exercises": [
        {"name": "Exercício", "sets": 3, "reps": 12, "rest": 60, "notes": ""}
      ]
    }
  ]
}
`

  const result = await chatModel.generateContent(prompt)
  const text = result.response.text()
  return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())
}

export async function generateMealPlan(userProfile: {
  name: string
  phase: string
  gestationWeek?: number
  goals: string[]
  restrictions: string[]
  isBreastfeeding?: boolean
}) {
  const prompt = `
Crie um plano alimentar semanal personalizado completo.

PERFIL:
- Nome: ${userProfile.name}
- Fase: ${userProfile.phase}
${userProfile.phase === 'PREGNANT' ? `- Semana de gestação: ${userProfile.gestationWeek}` : ''}
${userProfile.isBreastfeeding ? '- Amamentando: Sim' : ''}
- Objetivos: ${userProfile.goals.join(', ')}
- Restrições: ${userProfile.restrictions.length > 0 ? userProfile.restrictions.join(', ') : 'Nenhuma'}

${userProfile.phase === 'PREGNANT' ? `
REGRAS PARA GESTANTES:
- Aumentar 300-500 kcal no 2º/3º trimestre
- Priorizar: ácido fólico, ferro, cálcio, ômega-3
- Evitar: peixes de alto mercúrio, carnes cruas, álcool
` : ''}

${userProfile.isBreastfeeding ? `
REGRAS PARA AMAMENTAÇÃO:
- Adicionar ~500 kcal
- Manter hidratação
- Priorizar proteínas, cálcio, ferro
` : ''}

Retorne APENAS JSON:
{
  "dailyCalories": 2000,
  "dailyProtein": 80,
  "dailyCarbs": 250,
  "dailyFat": 65,
  "meals": [
    {
      "day": "Segunda",
      "breakfast": {"name": "descrição detalhada", "calories": 400},
      "morningSnack": {"name": "descrição", "calories": 150},
      "lunch": {"name": "descrição detalhada", "calories": 600},
      "afternoonSnack": {"name": "descrição", "calories": 150},
      "dinner": {"name": "descrição detalhada", "calories": 500}
    }
  ],
  "tips": ["dica 1", "dica 2"],
  "weeklyShoppingList": ["item 1", "item 2"]
}
`

  const result = await chatModel.generateContent(prompt)
  const text = result.response.text()
  return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())
}

export async function chatWithAssistant(
  message: string,
  systemPrompt: string,
  history: Array<{ role: string; content: string }>
) {
  try {
    const chat = chatModel.startChat({
      history: [
        { role: 'user', parts: [{ text: 'Sistema: ' + systemPrompt }] },
        { role: 'model', parts: [{ text: 'Entendido! Estou pronta para ajudar como sua assistente de nutrição e bem-estar.' }] },
        ...history.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }))
      ],
    })

    const result = await chat.sendMessage(message)
    return result.response.text()
  } catch (error) {
    console.error('Erro no chatWithAssistant:', error)
    throw error
  }
}

export async function generateRecipe(
  mealType: string,
  userContext: {
    phase: string
    gestationWeek?: number
    restrictions: string[]
  },
  availableIngredients?: string
) {
  const isPregnant = userContext.phase === 'GESTANTE' || userContext.phase === 'PREGNANT'

  const mealTypeLabels: Record<string, string> = {
    breakfast: 'café da manhã',
    lunch: 'almoço',
    dinner: 'jantar',
    snack: 'lanche'
  }

  const prompt = `
Crie uma receita saudável para ${mealTypeLabels[mealType] || mealType}.

${isPregnant ? `
ATENÇÃO: A usuária é GESTANTE na ${userContext.gestationWeek || 20}ª semana.
A receita deve ser segura para gestantes:
- Evitar peixes crus, carnes mal passadas
- Evitar queijos não pasteurizados
- Priorizar nutrientes: ácido fólico, ferro, cálcio
` : ''}

${userContext.restrictions.length > 0 ? `Restrições alimentares: ${userContext.restrictions.join(', ')}` : ''}

${availableIngredients ? `Ingredientes disponíveis: ${availableIngredients}` : ''}

Retorne APENAS JSON válido (sem markdown):
{
  "name": "Nome da receita",
  "description": "Descrição breve",
  "difficulty": "easy|medium|hard",
  "prep_time": 15,
  "cook_time": 30,
  "servings": 2,
  "calories_per_serving": 350,
  "protein_per_serving": 20,
  "ingredients": [
    {"item": "ingrediente", "quantity": "quantidade"}
  ],
  "instructions": [
    "Passo 1",
    "Passo 2"
  ],
  "tips": ["dica opcional"]
}
`

  const result = await chatModel.generateContent(prompt)
  const text = result.response.text()
  const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim()
  return JSON.parse(cleanJson)
}

export async function generateBabyNames(
  gender: 'male' | 'female' | 'neutral',
  style: string,
  count: number = 10
) {
  const genderLabel = gender === 'male' ? 'masculino' : gender === 'female' ? 'feminino' : 'neutro'

  const prompt = `
Gere ${count} sugestões de nomes de bebê com gênero ${genderLabel}.
Estilo preferido: ${style || 'clássico e moderno'}

Retorne APENAS JSON válido:
{
  "names": [
    {
      "name": "Nome",
      "meaning": "Significado do nome",
      "origin": "Origem (ex: hebraico, latim)"
    }
  ]
}
`

  const result = await chatModel.generateContent(prompt)
  const text = result.response.text()
  const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim()
  return JSON.parse(cleanJson)
}
