import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { analyzeForensicImage } from '@/lib/gemini'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { investigation_id, imageData, mimeType, observacoes } = await request.json()

    if (!investigation_id || !imageData) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    // Analyze with Gemini Vision
    const analise_gemini = await analyzeForensicImage(imageData, mimeType)

    // Save to database (file_url would be the base64 for now, in production upload to Supabase Storage)
    const { data, error } = await supabase
      .from('forensic_analysis')
      .insert({
        investigation_id,
        tipo: 'Imagem',
        file_url: imageData,
        thumbnail_url: imageData,
        analise_gemini,
        observacoes: observacoes || null,
        owner_id: session.user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Forensic analysis error:', error)
    return NextResponse.json({ error: error.message || 'Erro ao analisar imagem' }, { status: 500 })
  }
}
