import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chatModel } from '@/lib/ai/gemini'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const gender = searchParams.get('gender')

    // Buscar favoritos do usuário
    const { data: favorites } = await supabase
      .from('favorite_baby_names')
      .select(`
        *,
        name:baby_names(*)
      `)
      .eq('user_id', user.id)

    // Buscar nomes por gênero
    let query = supabase.from('baby_names').select('*').limit(50)

    if (gender && gender !== 'all') {
      query = query.eq('gender', gender.toUpperCase())
    }

    const { data: names } = await query

    return NextResponse.json({ names: names || [], favorites: favorites || [] })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar nomes' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { action, nameId, liked, preferences } = await req.json()

    if (action === 'favorite') {
      const { data, error } = await supabase
        .from('favorite_baby_names')
        .upsert({
          user_id: user.id,
          name_id: nameId,
          liked,
        })
        .select()
        .single()

      if (error) throw error
      return NextResponse.json(data)
    }

    if (action === 'generate') {
      // Gerar sugestões com IA
      const prompt = `
Gere 10 nomes de bebê com base nas preferências:
- Gênero: ${preferences.gender || 'qualquer'}
- Estilo: ${preferences.style || 'clássico e moderno'}
- Origem: ${preferences.origin || 'qualquer'}

Retorne APENAS JSON válido:
{
  "names": [
    {"name": "Nome", "gender": "MALE/FEMALE/NEUTRAL", "origin": "origem", "meaning": "significado"}
  ]
}
`
      const result = await chatModel.generateContent(prompt)
      const text = result.response.text()
      const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())

      return NextResponse.json(parsed)
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao processar' }, { status: 500 })
  }
}
