import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { recipeId } = await request.json()

    // Check if already favorited
    const { data: existing } = await supabase
      .from('favorite_recipes')
      .select('id')
      .eq('user_id', user.id)
      .eq('recipe_id', recipeId)
      .single()

    if (existing) {
      // Remove favorite
      await supabase
        .from('favorite_recipes')
        .delete()
        .eq('id', existing.id)

      return NextResponse.json({ favorited: false })
    } else {
      // Add favorite
      await supabase
        .from('favorite_recipes')
        .insert({
          user_id: user.id,
          recipe_id: recipeId
        })

      return NextResponse.json({ favorited: true })
    }
  } catch (error) {
    console.error('Error toggling favorite:', error)
    return NextResponse.json({ error: 'Erro ao favoritar' }, { status: 500 })
  }
}
