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
    const mimeType = image.type

    // Analyze with Gemini
    const analysis = await analyzeMealImage(base64Image, mimeType)

    // Save meal to database
    const { data: meal, error: mealError } = await supabase
      .from('meals')
      .insert({
        user_id: user.id,
        meal_type: formData.get('meal_type') || 'SNACK',
        description: analysis.description,
        calories: analysis.calories,
        protein: analysis.protein,
        carbs: analysis.carbs,
        fat: analysis.fat,
        fiber: analysis.fiber,
        foods: analysis.foods,
        ai_analysis: analysis.analysis,
        image_url: null // Could upload to storage if needed
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
