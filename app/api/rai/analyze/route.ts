import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { extractRAIData } from '@/lib/gemini'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    // Verify authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { investigation_id, rai_text } = await request.json()

    if (!investigation_id || !rai_text) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    // Extract data using Gemini
    const dados_extraidos = await extractRAIData(rai_text)

    // Save to database
    const { data, error } = await supabase
      .from('rai_analysis')
      .insert({
        investigation_id,
        rai_numero: dados_extraidos.numero_rai || null,
        dados_extraidos,
        analise_completa: rai_text,
        owner_id: session.user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('RAI analysis error:', error)
    return NextResponse.json({ error: error.message || 'Erro ao analisar RAI' }, { status: 500 })
  }
}
