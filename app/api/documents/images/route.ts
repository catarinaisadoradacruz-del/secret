import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// API para gerenciar imagens de documentos
// Permite salvar, recuperar e usar imagens em novos documentos

interface SaveImageRequest {
  sessionId: string
  documentId?: string
  images: {
    base64: string
    mimeType: string
    fileName?: string
    caption?: string
    ocrText?: string
  }[]
}

// POST - Salvar imagens no storage
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body: SaveImageRequest = await request.json()
    const { sessionId, documentId, images } = body

    if (!images || images.length === 0) {
      return NextResponse.json({ error: 'Nenhuma imagem fornecida' }, { status: 400 })
    }

    const savedImages: { id: string; url: string; fileName: string }[] = []

    for (let i = 0; i < images.length; i++) {
      const img = images[i]
      const timestamp = Date.now()
      const ext = img.mimeType.split('/')[1] || 'png'
      const fileName = img.fileName || `image_${timestamp}_${i}.${ext}`
      const filePath = `${session.user.id}/${sessionId}/${fileName}`

      // Converter base64 para buffer
      const buffer = Buffer.from(img.base64, 'base64')

      // Upload para o storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('document-images')
        .upload(filePath, buffer, {
          contentType: img.mimeType,
          upsert: true
        })

      if (uploadError) {
        console.error('Erro upload imagem:', uploadError)
        continue
      }

      // Obter URL publica
      const { data: urlData } = supabase.storage
        .from('document-images')
        .getPublicUrl(filePath)

      // Salvar metadados no banco
      const { data: metaData, error: metaError } = await supabase
        .from('document_images')
        .insert({
          user_id: session.user.id,
          session_id: sessionId,
          document_id: documentId,
          file_name: fileName,
          file_path: filePath,
          mime_type: img.mimeType,
          caption: img.caption,
          ocr_text: img.ocrText,
          file_size: buffer.length
        })
        .select('id')
        .single()

      if (!metaError && metaData) {
        savedImages.push({
          id: metaData.id,
          url: urlData.publicUrl,
          fileName
        })
      }
    }

    return NextResponse.json({
      success: true,
      savedCount: savedImages.length,
      images: savedImages
    })

  } catch (error) {
    console.error('Erro ao salvar imagens:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// GET - Listar imagens de uma sessao ou documento
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const documentId = searchParams.get('documentId')
    const imageId = searchParams.get('imageId')

    // Buscar imagem especifica
    if (imageId) {
      const { data, error } = await supabase
        .from('document_images')
        .select('*')
        .eq('id', imageId)
        .eq('user_id', session.user.id)
        .single()

      if (error || !data) {
        return NextResponse.json({ error: 'Imagem nao encontrada' }, { status: 404 })
      }

      // Obter URL
      const { data: urlData } = supabase.storage
        .from('document-images')
        .getPublicUrl(data.file_path)

      return NextResponse.json({
        ...data,
        url: urlData.publicUrl
      })
    }

    // Listar imagens
    let query = supabase
      .from('document_images')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (sessionId) {
      query = query.eq('session_id', sessionId)
    }

    if (documentId) {
      query = query.eq('document_id', documentId)
    }

    const { data, error } = await query.limit(50)

    if (error) {
      return NextResponse.json({ error: 'Erro ao buscar imagens' }, { status: 500 })
    }

    // Adicionar URLs
    const imagesWithUrls = data.map(img => {
      const { data: urlData } = supabase.storage
        .from('document-images')
        .getPublicUrl(img.file_path)

      return {
        ...img,
        url: urlData.publicUrl
      }
    })

    return NextResponse.json({
      images: imagesWithUrls,
      count: imagesWithUrls.length
    })

  } catch (error) {
    console.error('Erro ao listar imagens:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// DELETE - Remover imagem
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const imageId = searchParams.get('imageId')

    if (!imageId) {
      return NextResponse.json({ error: 'imageId obrigatorio' }, { status: 400 })
    }

    // Buscar imagem para obter path
    const { data: imgData, error: findError } = await supabase
      .from('document_images')
      .select('file_path')
      .eq('id', imageId)
      .eq('user_id', session.user.id)
      .single()

    if (findError || !imgData) {
      return NextResponse.json({ error: 'Imagem nao encontrada' }, { status: 404 })
    }

    // Remover do storage
    await supabase.storage
      .from('document-images')
      .remove([imgData.file_path])

    // Remover metadados
    await supabase
      .from('document_images')
      .delete()
      .eq('id', imageId)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erro ao remover imagem:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
