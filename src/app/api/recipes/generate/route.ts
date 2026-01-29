import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateRecipe } from '@/lib/ai/gemini'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { type, restrictions, ingredients } = body

    // Fetch user profile for context
    const { data: profile } = await supabase
      .from('users')
      .select('current_phase, gestation_weeks, dietary_restrictions')
      .eq('id', user.id)
      .single()

    const userContext = {
      phase: profile?.current_phase || 'GESTANTE',
      gestationWeek: profile?.gestation_weeks,
      restrictions: [
        ...(profile?.dietary_restrictions || []),
        ...(restrictions ? restrictions.split(',').map((r: string) => r.trim()) : [])
      ]
    }

    // Generate recipe with AI
    const generatedRecipe = await generateRecipe(type || 'lunch', userContext, ingredients)

    // Save to database
    const { data: recipe, error } = await supabase
      .from('recipes')
      .insert({
        user_id: user.id,
        name: generatedRecipe.name,
        description: generatedRecipe.description,
        category: type || 'lunch',
        difficulty: generatedRecipe.difficulty || 'medium',
        prep_time: generatedRecipe.prep_time || 15,
        cook_time: generatedRecipe.cook_time || 30,
        servings: generatedRecipe.servings || 2,
        calories_per_serving: generatedRecipe.calories_per_serving || 350,
        protein_per_serving: generatedRecipe.protein_per_serving || 20,
        ingredients: generatedRecipe.ingredients,
        instructions: generatedRecipe.instructions,
        is_public: false,
        is_ai_generated: true
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ recipe })
  } catch (error) {
    console.error('Error generating recipe:', error)
    return NextResponse.json({ error: 'Erro ao gerar receita' }, { status: 500 })
  }
}
