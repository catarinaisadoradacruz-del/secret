import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    let query = supabase
      .from('recipes')
      .select(`
        *,
        favorite_recipes!left(id)
      `)
      .or(`is_public.eq.true,user_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    const { data: recipes, error } = await query

    if (error) throw error

    // Map favorite status
    const recipesWithFavorites = recipes?.map(recipe => ({
      ...recipe,
      is_favorite: recipe.favorite_recipes?.length > 0,
      favorite_recipes: undefined
    }))

    return NextResponse.json(recipesWithFavorites || [])
  } catch (error) {
    console.error('Error fetching recipes:', error)
    return NextResponse.json({ error: 'Erro ao buscar receitas' }, { status: 500 })
  }
}
