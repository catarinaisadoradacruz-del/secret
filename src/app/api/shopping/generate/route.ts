// API para gerar lista de compras com IA
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { listId, context, preferences } = await request.json()

    // Buscar dados do usuário
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar perfil do usuário
    const { data: profile } = await supabase
      .from('users')
      .select('phase, dietary_restrictions, goals')
      .eq('id', user.id)
      .single()

    const userPhase = profile?.phase || 'ACTIVE'
    const restrictions = profile?.dietary_restrictions || []

    // Gerar prompt baseado no contexto
    const prompt = buildShoppingPrompt(userPhase, context, preferences, restrictions)

    // Tentar Gemini primeiro
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
    
    if (geminiKey) {
      try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': geminiKey
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
            },
          }),
        })

        if (response.ok) {
          const data = await response.json()
          const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text

          if (responseText) {
            const items = parseShoppingList(responseText)
            return NextResponse.json({ items, source: 'gemini' })
          }
        }
      } catch (error) {
        console.warn('Gemini falhou:', error)
      }
    }

    // Fallback: lista pré-definida baseada na fase
    const fallbackItems = generateFallbackList(userPhase, context)
    return NextResponse.json({ items: fallbackItems, source: 'fallback' })

  } catch (error) {
    console.error('Erro ao gerar lista:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

function buildShoppingPrompt(
  phase: string, 
  context: string, 
  preferences: string,
  restrictions: string[]
): string {
  const phaseContext = {
    'TRYING': 'Mulher tentando engravidar - foco em fertilidade, ácido fólico, zinco, ferro',
    'PREGNANT': 'Gestante - foco em nutrientes essenciais, ácido fólico, ferro, cálcio, proteínas, evitar alimentos crus',
    'POSTPARTUM': 'Pós-parto/amamentação - foco em recuperação, produção de leite, energia, hidratação',
    'ACTIVE': 'Mulher em busca de alimentação saudável e equilibrada'
  }

  const restrictionsText = restrictions.length > 0 
    ? `Restrições alimentares: ${restrictions.join(', ')}.` 
    : ''

  return `Você é um nutricionista especialista em saúde materna. Gere uma lista de compras saudável.

CONTEXTO:
- Perfil: ${phaseContext[phase as keyof typeof phaseContext] || phaseContext['ACTIVE']}
- Objetivo: ${context || 'Semana saudável'}
- Preferências: ${preferences || 'Nenhuma específica'}
${restrictionsText}

REGRAS:
1. Gere EXATAMENTE no formato JSON abaixo
2. Inclua 15-20 itens variados e nutritivos
3. Organize por categorias
4. Seja específico nos alimentos

Responda APENAS com JSON válido neste formato:
{
  "items": [
    {"name": "Espinafre", "quantity": "2 maços", "category": "verduras"},
    {"name": "Banana prata", "quantity": "1 dúzia", "category": "frutas"},
    {"name": "Peito de frango", "quantity": "500g", "category": "proteinas"},
    {"name": "Leite desnatado", "quantity": "2L", "category": "laticinios"},
    {"name": "Arroz integral", "quantity": "1kg", "category": "graos"}
  ]
}

Categorias válidas: frutas, verduras, proteinas, laticinios, graos, bebidas, outros`
}

function parseShoppingList(text: string): any[] {
  try {
    // Extrair JSON do texto
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return parsed.items || []
    }
  } catch (e) {
    console.error('Erro ao parsear lista:', e)
  }
  return []
}

function generateFallbackList(phase: string, context: string): any[] {
  const baseList = [
    { name: 'Banana', quantity: '1 dúzia', category: 'frutas' },
    { name: 'Maçã', quantity: '6 unidades', category: 'frutas' },
    { name: 'Laranja', quantity: '1kg', category: 'frutas' },
    { name: 'Espinafre', quantity: '2 maços', category: 'verduras' },
    { name: 'Brócolis', quantity: '500g', category: 'verduras' },
    { name: 'Cenoura', quantity: '500g', category: 'verduras' },
    { name: 'Tomate', quantity: '500g', category: 'verduras' },
    { name: 'Peito de frango', quantity: '1kg', category: 'proteinas' },
    { name: 'Ovos', quantity: '1 dúzia', category: 'proteinas' },
    { name: 'Feijão preto', quantity: '500g', category: 'proteinas' },
    { name: 'Leite', quantity: '2L', category: 'laticinios' },
    { name: 'Iogurte natural', quantity: '4 unidades', category: 'laticinios' },
    { name: 'Queijo cottage', quantity: '200g', category: 'laticinios' },
    { name: 'Arroz integral', quantity: '1kg', category: 'graos' },
    { name: 'Aveia', quantity: '500g', category: 'graos' },
    { name: 'Pão integral', quantity: '1 pacote', category: 'graos' },
  ]

  // Adicionar itens específicos para gestante
  if (phase === 'PREGNANT') {
    baseList.push(
      { name: 'Sardinha em lata', quantity: '4 latas', category: 'proteinas' },
      { name: 'Lentilha', quantity: '500g', category: 'proteinas' },
      { name: 'Abacate', quantity: '3 unidades', category: 'frutas' },
      { name: 'Couve', quantity: '2 maços', category: 'verduras' }
    )
  }

  return baseList
}
