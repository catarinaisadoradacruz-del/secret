import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: lists, error } = await supabase
      .from('shopping_lists')
      .select(`
        *,
        items:shopping_items(*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(lists)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar listas' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { name, items } = await req.json()

    // Criar lista
    const { data: list, error: listError } = await supabase
      .from('shopping_lists')
      .insert({ user_id: user.id, name })
      .select()
      .single()

    if (listError) throw listError

    // Adicionar itens
    if (items && items.length > 0) {
      const itemsWithListId = items.map((item: { name: string; quantity?: number; category?: string }) => ({
        ...item,
        list_id: list.id,
      }))

      await supabase.from('shopping_items').insert(itemsWithListId)
    }

    return NextResponse.json(list)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar lista' }, { status: 500 })
  }
}
