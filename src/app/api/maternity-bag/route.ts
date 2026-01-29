import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DEFAULT_ITEMS = {
  MOM: [
    { item: 'Camisolas ou pijamas (3-4)', essential: true },
    { item: 'Roupão', essential: false },
    { item: 'Chinelo', essential: true },
    { item: 'Sutiãs de amamentação (2-3)', essential: true },
    { item: 'Calcinhas pós-parto (5-6)', essential: true },
    { item: 'Absorventes pós-parto', essential: true },
    { item: 'Itens de higiene pessoal', essential: true },
    { item: 'Roupa para sair do hospital', essential: true },
    { item: 'Pomada para mamilos', essential: true },
    { item: 'Cinta pós-parto', essential: false },
  ],
  BABY: [
    { item: 'Bodies (6-8)', essential: true },
    { item: 'Mijões/Culotes (4-5)', essential: true },
    { item: 'Macacões (3-4)', essential: true },
    { item: 'Meias e luvinhas (3 pares)', essential: true },
    { item: 'Touca (2)', essential: true },
    { item: 'Manta', essential: true },
    { item: 'Fraldas RN', essential: true },
    { item: 'Lenços umedecidos', essential: true },
    { item: 'Pomada para assadura', essential: true },
    { item: 'Roupa para sair do hospital', essential: true },
  ],
  DOCUMENTS: [
    { item: 'RG e CPF', essential: true },
    { item: 'Carteira do plano de saúde', essential: true },
    { item: 'Cartão pré-natal', essential: true },
    { item: 'Exames do pré-natal', essential: true },
    { item: 'Plano de parto (se tiver)', essential: false },
    { item: 'Certidão de casamento (se aplicável)', essential: false },
  ],
  COMPANION: [
    { item: 'Roupa confortável', essential: true },
    { item: 'Itens de higiene', essential: true },
    { item: 'Carregador de celular', essential: true },
    { item: 'Lanches', essential: false },
    { item: 'Documento de identificação', essential: true },
  ],
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar itens do usuário
    const { data: items, error } = await supabase
      .from('maternity_bag_items')
      .select('*')
      .eq('user_id', user.id)
      .order('category')

    if (error) throw error

    // Se não tem itens, retornar os padrão
    if (!items || items.length === 0) {
      return NextResponse.json({ items: [], defaults: DEFAULT_ITEMS })
    }

    return NextResponse.json({ items, defaults: DEFAULT_ITEMS })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar itens' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { action, items, itemId, checked, category, item } = await req.json()

    // Inicializar com itens padrão
    if (action === 'initialize') {
      const allItems: { user_id: string; category: string; item: string; essential: boolean; checked: boolean }[] = []

      for (const [cat, catItems] of Object.entries(DEFAULT_ITEMS)) {
        for (const i of catItems) {
          allItems.push({
            user_id: user.id,
            category: cat,
            item: i.item,
            essential: i.essential,
            checked: false,
          })
        }
      }

      const { data, error } = await supabase
        .from('maternity_bag_items')
        .insert(allItems)
        .select()

      if (error) throw error
      return NextResponse.json(data)
    }

    // Marcar item como checked/unchecked
    if (action === 'toggle') {
      const { data, error } = await supabase
        .from('maternity_bag_items')
        .update({ checked })
        .eq('id', itemId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json(data)
    }

    // Adicionar item customizado
    if (action === 'add') {
      const { data, error } = await supabase
        .from('maternity_bag_items')
        .insert({
          user_id: user.id,
          category,
          item,
          essential: false,
          checked: false,
        })
        .select()
        .single()

      if (error) throw error
      return NextResponse.json(data)
    }

    // Deletar item
    if (action === 'delete') {
      const { error } = await supabase
        .from('maternity_bag_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', user.id)

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao processar' }, { status: 500 })
  }
}
