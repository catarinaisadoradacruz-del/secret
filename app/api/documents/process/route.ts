import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  chunkDocument,
  extractEntities,
  isDocumentTooLarge,
  estimateTokens,
  prepareChunksForAI,
  type DocumentChunk
} from '@/lib/document-processor'

interface ProcessRequest {
  content: string
  fileName: string
  fileType: string
  fileSize: number
  sessionId: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    // Verificar autenticacao
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body: ProcessRequest = await request.json()
    const { content, fileName, fileType, fileSize, sessionId } = body

    if (!content || !fileName) {
      return NextResponse.json({ error: 'Conteudo e nome do arquivo obrigatorios' }, { status: 400 })
    }

    // Processar documento - DIVIDIR SEM RESUMIR
    const isLarge = isDocumentTooLarge(content)
    const chunks = chunkDocument(content, fileName)

    // Extrair entidades de todos os chunks
    const allEntities = chunks.flatMap((chunk, idx) => extractEntities(chunk.content, idx))

    // Salvar no banco
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 48) // 48h de validade

    const { data: savedContext, error: saveError } = await supabase
      .from('document_contexts')
      .insert({
        session_id: sessionId,
        user_id: session.user.id,
        file_name: fileName,
        file_type: fileType,
        file_size: fileSize,
        total_chunks: chunks.length,
        entities: allEntities,
        chunks_data: chunks,
        expires_at: expiresAt.toISOString()
      })
      .select('id')
      .single()

    if (saveError) {
      console.error('Erro ao salvar contexto:', saveError)
      // Continuar mesmo sem salvar - retornar dados processados
    }

    // Preparar preview do primeiro chunk
    const preview = prepareChunksForAI(chunks, 0, 1)

    return NextResponse.json({
      success: true,
      documentId: savedContext?.id || `temp_${Date.now()}`,
      isLarge,
      stats: {
        totalChunks: chunks.length,
        totalCharacters: content.length,
        totalTokens: estimateTokens(content),
        entitiesFound: allEntities.length
      },
      entities: allEntities,
      preview: {
        content: preview.content,
        info: preview.chunkInfo,
        hasMore: preview.hasMore
      }
    })

  } catch (error) {
    console.error('Erro ao processar documento:', error)
    return NextResponse.json(
      { error: 'Erro interno ao processar documento' },
      { status: 500 }
    )
  }
}

// GET - Buscar chunks especificos de um documento
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    const startIndex = parseInt(searchParams.get('startIndex') || '0')
    const count = parseInt(searchParams.get('count') || '2')
    const searchTerm = searchParams.get('search')

    if (!documentId) {
      return NextResponse.json({ error: 'documentId obrigatorio' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('document_contexts')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', session.user.id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Documento nao encontrado' }, { status: 404 })
    }

    const chunks = data.chunks_data as DocumentChunk[]

    // Se tem termo de busca, filtrar chunks relevantes
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const matchingChunks = chunks.filter(chunk =>
        chunk.content.toLowerCase().includes(searchLower)
      )

      if (matchingChunks.length === 0) {
        return NextResponse.json({
          fileName: data.file_name,
          totalChunks: data.total_chunks,
          searchTerm,
          matchCount: 0,
          message: `Nenhuma ocorrencia de "${searchTerm}" encontrada no documento.`
        })
      }

      // Retornar chunks que contem o termo
      let content = ''
      matchingChunks.slice(0, 3).forEach(chunk => {
        content += `\n========== PARTE ${chunk.index + 1} DE ${chunks.length} (contem "${searchTerm}") ==========\n`
        content += chunk.content
        content += '\n'
      })

      return NextResponse.json({
        fileName: data.file_name,
        totalChunks: data.total_chunks,
        searchTerm,
        matchCount: matchingChunks.length,
        matchingChunkIndices: matchingChunks.map(c => c.index),
        content,
        hasMore: matchingChunks.length > 3
      })
    }

    // Retornar chunks sequenciais
    const result = prepareChunksForAI(chunks, startIndex, count)

    return NextResponse.json({
      fileName: data.file_name,
      fileType: data.file_type,
      fileSize: data.file_size,
      totalChunks: data.total_chunks,
      currentStart: startIndex,
      currentEnd: Math.min(startIndex + count, chunks.length),
      content: result.content,
      chunkInfo: result.chunkInfo,
      hasMore: result.hasMore,
      nextIndex: result.nextIndex,
      entities: data.entities
    })

  } catch (error) {
    console.error('Erro ao buscar chunks:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// DELETE - Remover documento do contexto
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json({ error: 'documentId obrigatorio' }, { status: 400 })
    }

    const { error } = await supabase
      .from('document_contexts')
      .delete()
      .eq('id', documentId)
      .eq('user_id', session.user.id)

    if (error) {
      return NextResponse.json({ error: 'Erro ao remover documento' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erro ao remover documento:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
