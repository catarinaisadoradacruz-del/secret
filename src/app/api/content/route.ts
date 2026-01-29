import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const type = searchParams.get('type')

    let query = supabase
      .from('educational_content')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false })

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    if (type && type !== 'all') {
      query = query.eq('type', type)
    }

    const { data: content, error } = await query

    if (error) throw error

    // Buscar progresso do usuário
    const { data: progress } = await supabase
      .from('user_content_progress')
      .select('content_id, completed, progress_percent')
      .eq('user_id', user.id)

    // Combinar conteúdo com progresso
    const contentWithProgress = (content || []).map(item => {
      const userProgress = (progress || []).find(p => p.content_id === item.id)
      return {
        ...item,
        userProgress: userProgress || null
      }
    })

    return NextResponse.json(contentWithProgress)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar conteúdo' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { contentId, completed, progressPercent } = await req.json()

    const { data, error } = await supabase
      .from('user_content_progress')
      .upsert({
        user_id: user.id,
        content_id: contentId,
        completed: completed || false,
        progress_percent: progressPercent || 0,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao salvar progresso' }, { status: 500 })
  }
}
