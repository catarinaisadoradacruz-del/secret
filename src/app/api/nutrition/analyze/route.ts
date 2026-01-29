import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeMealImage } from '@/lib/ai/gemini'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Fetch user profile for context
    const { data: profile } = await supabase
      .from('users')
      .select('current_phase, gestation_weeks, dietary_restrictions')
      .eq('id', user.id)
      .single()

    const formData = await request.formData()
    const image = formData.get('image') as File

    if (!image) {
      return NextResponse.json(
        { error: 'Imagem não fornecida' },
        { status: 400 }
      )
    }

    // Convert image to base64
    const bytes = await image.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = buffer.toString('base64')

    // Build user context for AI analysis
    const userContext = {
      phase: profile?.current_phase || 'GESTANTE',
      gestationWeek: profile?.gestation_weeks || undefined,
      restrictions: profile?.dietary_restrictions || []
    }

    // Analyze with Gemini
    const analysis = await analyzeMealImage(base64Image, userContext)

    // Build description from foods
    const foodNames = analysis.foods?.map((f: { name: string }) => f.name).join(', ') || 'Refeição analisada'

    // Save meal to database
    const { data: meal, error: mealError } = await supabase
      .from('meals')
      .insert({
        user_id: user.id,
        meal_type: formData.get('meal_type') || 'SNACK',
        description: foodNames,
        calories: analysis.totalCalories || 0,
        protein: analysis.totalProtein || 0,
        carbs: analysis.totalCarbs || 0,
        fat: analysis.totalFat || 0,
        fiber: 0,
        foods: analysis.foods || [],
        ai_analysis: JSON.stringify({
          isSafeForPregnancy: analysis.isSafeForPregnancy,
          warnings: analysis.warnings,
          suggestions: analysis.suggestions
        }),
        image_url: null
      })
      .select()
      .single()

    if (mealError) {
      console.error('Error saving meal:', mealError)
      // Return analysis even if save fails
      return NextResponse.json({
        analysis,
        saved: false,
        message: 'Análise concluída, mas houve erro ao salvar'
      })
    }

    return NextResponse.json({
      analysis,
      meal,
      saved: true
    })

  } catch (error) {
    console.error('Error analyzing meal:', error)
    return NextResponse.json(
      { error: 'Erro ao analisar refeição' },
      { status: 500 }
    )
  }
}
