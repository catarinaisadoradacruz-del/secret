// API para gerar lista de compras com IA
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { context, preferences } = body

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar perfil do usuário
    const { data: profile } = await supabase
      .from('users')
      .select('name, phase, dietary_restrictions')
      .eq('id', user.id)
      .single()

    const userPhase = profile?.phase || 'ACTIVE'
    const userName = profile?.name || 'Usuária'
    const restrictions = profile?.dietary_restrictions || []

    // Tentar gerar com Gemini
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
    let items: any[] = []
    
    if (geminiKey) {
      try {
        const prompt = buildShoppingPrompt(userPhase, context, preferences, restrictions)
        
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': geminiKey
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
          }),
        })

        if (response.ok) {
          const data = await response.json()
          const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text
          if (responseText) {
            items = parseShoppingList(responseText)
          }
        }
      } catch (error) {
        console.warn('Gemini falhou:', error)
      }
    }

    // Fallback se não conseguiu gerar
    if (items.length === 0) {
      items = generateFallbackList(userPhase)
    }

    // Criar a lista no banco
    const listName = getListName(userPhase, context)
    const { data: newList, error: listError } = await supabase
      .from('shopping_lists')
      .insert({ user_id: user.id, name: listName })
      .select()
      .single()

    if (listError || !newList) {
      console.error('Erro ao criar lista:', listError)
      return NextResponse.json({ error: 'Erro ao criar lista' }, { status: 500 })
    }

    // Inserir os itens
    const itemsToInsert = items.map(item => ({
      list_id: newList.id,
      name: item.name,
      quantity: item.quantity || '1',
      category: item.category || 'outros',
      checked: false
    }))

    const { error: itemsError } = await supabase
      .from('shopping_items')
      .insert(itemsToInsert)

    if (itemsError) {
      console.error('Erro ao inserir itens:', itemsError)
    }

    return NextResponse.json({ 
      success: true, 
      listId: newList.id, 
      itemsCount: items.length 
    })

  } catch (error) {
    console.error('Erro ao gerar lista:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

function getListName(phase: string, context?: string): string {
  if (context) return context
  
  const names: Record<string, string> = {
    'PREGNANT': '🤰 Lista Gestante - Semana Saudável',
    'POSTPARTUM': '👶 Lista Pós-Parto - Nutrição',
    'TRYING': '💜 Lista Fertilidade - Essenciais',
    'ACTIVE': '🥗 Lista Saudável da Semana'
  }
  return names[phase] || names['ACTIVE']
}

function buildShoppingPrompt(
  phase: string, 
  context?: string, 
  preferences?: string,
  restrictions?: string[]
): string {
  const phaseContext: Record<string, string> = {
    'TRYING': 'Mulher tentando engravidar - foco em fertilidade, ácido fólico, zinco, ferro',
    'PREGNANT': 'Gestante - foco em nutrientes essenciais, ácido fólico, ferro, cálcio, proteínas. EVITAR: peixes crus, queijos não pasteurizados',
    'POSTPARTUM': 'Pós-parto/amamentação - foco em recuperação, produção de leite, energia, hidratação',
    'ACTIVE': 'Mulher em busca de alimentação saudável e equilibrada'
  }

  const restrictionsText = restrictions && restrictions.length > 0 
    ? `\nRestrições alimentares: ${restrictions.join(', ')}.` 
    : ''

  return `Você é um nutricionista especialista. Gere uma lista de compras saudável.

PERFIL: ${phaseContext[phase] || phaseContext['ACTIVE']}
${context ? `OBJETIVO: ${context}` : 'OBJETIVO: Semana saudável'}
${preferences ? `PREFERÊNCIAS: ${preferences}` : ''}${restrictionsText}

Responda APENAS com JSON válido neste formato (15-20 itens variados):
{
  "items": [
    {"name": "Espinafre", "quantity": "2 maços", "category": "verduras"},
    {"name": "Banana prata", "quantity": "1 dúzia", "category": "frutas"},
    {"name": "Peito de frango", "quantity": "500g", "category": "proteinas"},
    {"name": "Leite desnatado", "quantity": "2L", "category": "laticinios"},
    {"name": "Arroz integral", "quantity": "1kg", "category": "graos"}
  ]
}

Categorias: frutas, verduras, proteinas, laticinios, graos, bebidas, outros`
}

function parseShoppingList(text: string): any[] {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return parsed.items || []
    }
  } catch (e) {
    console.error('Erro ao parsear:', e)
  }
  return []
}

function generateFallbackList(phase: string): any[] {
  const baseList = [
    { name: 'Banana', quantity: '1 dúzia', category: 'frutas' },
    { name: 'Maçã', quantity: '6 unidades', category: 'frutas' },
    { name: 'Laranja', quantity: '1kg', category: 'frutas' },
    { name: 'Abacate', quantity: '3 unidades', category: 'frutas' },
    { name: 'Espinafre', quantity: '2 maços', category: 'verduras' },
    { name: 'Brócolis', quantity: '500g', category: 'verduras' },
    { name: 'Cenoura', quantity: '500g', category: 'verduras' },
    { name: 'Tomate', quantity: '500g', category: 'verduras' },
    { name: 'Couve', quantity: '2 maços', category: 'verduras' },
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

  // Itens extras para gestante
  if (phase === 'PREGNANT') {
    baseList.push(
      { name: 'Sardinha em lata', quantity: '4 latas', category: 'proteinas' },
      { name: 'Lentilha', quantity: '500g', category: 'proteinas' },
      { name: 'Suco de laranja natural', quantity: '1L', category: 'bebidas' }
    )
  }

  return baseList
}
