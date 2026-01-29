import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)

export const chatModel = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',
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
Analise esta imagem de refeicao e forneca informacoes nutricionais.

${isPregnant ? `
ATENCAO: A usuaria e GESTANTE na ${userContext.gestationWeek}a semana.
Verifique se algum alimento e contraindicado para gestantes.
Alimentos proibidos: peixes crus, carnes mal passadas, queijos nao pasteurizados, embutidos, alcool.
` : ''}

${userContext.restrictions.length > 0 ? `Restricoes alimentares: ${userContext.restrictions.join(', ')}` : ''}

Retorne APENAS JSON valido (sem markdown):
{
  "foods": [{"name": "nome", "portion": "porcao", "calories": 0, "protein": 0, "carbs": 0, "fat": 0}],
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
- Nivel: ${userProfile.exerciseLevel}

${userProfile.phase === 'PREGNANT' ? `
REGRAS PARA GESTANTES:
- Evitar exercicios deitada de costas apos 1o trimestre
- Sem alto impacto
- Incluir assoalho pelvico
- Frequencia cardiaca moderada
` : ''}

Retorne APENAS JSON:
{
  "name": "Nome do plano",
  "description": "Descricao",
  "sessions": [
    {
      "day": "Segunda",
      "focus": "Foco",
      "duration": 30,
      "exercises": [
        {"name": "Exercicio", "sets": 3, "reps": 12, "rest": 60, "notes": ""}
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
Crie um plano alimentar semanal personalizado.

PERFIL:
- Nome: ${userProfile.name}
- Fase: ${userProfile.phase}
${userProfile.phase === 'PREGNANT' ? `- Semana: ${userProfile.gestationWeek}` : ''}
${userProfile.isBreastfeeding ? '- Amamentando: Sim' : ''}
- Objetivos: ${userProfile.goals.join(', ')}
- Restricoes: ${userProfile.restrictions.length > 0 ? userProfile.restrictions.join(', ') : 'Nenhuma'}

${userProfile.phase === 'PREGNANT' ? `
REGRAS PARA GESTANTES:
- Aumentar 300-500 kcal no 2o/3o trimestre
- Priorizar: acido folico, ferro, calcio, omega-3
- Evitar: peixes de alto mercurio, carnes cruas, alcool
` : ''}

${userProfile.isBreastfeeding ? `
REGRAS PARA AMAMENTACAO:
- Adicionar ~500 kcal
- Manter hidratacao
- Priorizar proteinas, calcio, ferro
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
      "breakfast": {"name": "descricao", "calories": 400},
      "morningSnack": {"name": "descricao", "calories": 150},
      "lunch": {"name": "descricao", "calories": 600},
      "afternoonSnack": {"name": "descricao", "calories": 150},
      "dinner": {"name": "descricao", "calories": 500}
    }
  ],
  "tips": ["dica 1", "dica 2"]
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
  const chat = chatModel.startChat({
    history: [
      { role: 'user', parts: [{ text: 'Sistema: ' + systemPrompt }] },
      { role: 'model', parts: [{ text: 'Entendido! Estou pronta para ajudar.' }] },
      ...history.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }))
    ],
  })

  const result = await chat.sendMessage(message)
  return result.response.text()
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
    breakfast: 'cafe da manha',
    lunch: 'almoco',
    dinner: 'jantar',
    snack: 'lanche'
  }

  const prompt = `
Crie uma receita saudavel para ${mealTypeLabels[mealType] || mealType}.

${isPregnant ? `
ATENCAO: A usuaria e GESTANTE na ${userContext.gestationWeek || 20}a semana.
A receita deve ser segura para gestantes:
- Evitar peixes crus, carnes mal passadas
- Evitar queijos nao pasteurizados
- Priorizar nutrientes: acido folico, ferro, calcio
` : ''}

${userContext.restrictions.length > 0 ? `Restricoes alimentares: ${userContext.restrictions.join(', ')}` : ''}

${availableIngredients ? `Ingredientes disponiveis: ${availableIngredients}` : ''}

Retorne APENAS JSON valido (sem markdown):
{
  "name": "Nome da receita",
  "description": "Descricao breve",
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
Gere ${count} sugestoes de nomes de bebe com genero ${genderLabel}.
Estilo preferido: ${style || 'classico e moderno'}

Retorne APENAS JSON valido:
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
