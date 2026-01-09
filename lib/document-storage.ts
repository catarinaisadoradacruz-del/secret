// Armazenamento de documentos processados no Supabase
// Permite recuperar contexto entre sessoes

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { ProcessedDocument, DocumentChunk, ExtractedEntity } from './document-processor'

const supabase = createClientComponentClient()

export interface StoredDocumentContext {
  id: string
  session_id: string
  user_id: string
  file_name: string
  file_type: string
  file_size: number
  total_chunks: number
  summary: string
  key_points: string[]
  entities: ExtractedEntity[]
  chunks_data: DocumentChunk[]
  created_at: string
  expires_at: string // Contexto expira apos 24h
}

/**
 * Salva contexto de documento processado
 */
export async function saveDocumentContext(
  sessionId: string,
  userId: string,
  doc: ProcessedDocument
): Promise<string | null> {
  try {
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // Expira em 24h

    const { data, error } = await supabase
      .from('document_contexts')
      .insert({
        session_id: sessionId,
        user_id: userId,
        file_name: doc.fileName,
        file_type: doc.fileType,
        file_size: doc.fileSize,
        total_chunks: doc.totalChunks,
        summary: doc.summary,
        key_points: doc.keyPoints,
        entities: doc.entities,
        chunks_data: doc.chunks,
        expires_at: expiresAt.toISOString()
      })
      .select('id')
      .single()

    if (error) {
      console.error('Erro ao salvar contexto:', error)
      return null
    }

    return data.id
  } catch (err) {
    console.error('Erro ao salvar contexto:', err)
    return null
  }
}

/**
 * Recupera todos os contextos de documentos de uma sessao
 */
export async function getSessionDocuments(sessionId: string): Promise<StoredDocumentContext[]> {
  try {
    const { data, error } = await supabase
      .from('document_contexts')
      .select('*')
      .eq('session_id', sessionId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar contextos:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('Erro ao buscar contextos:', err)
    return []
  }
}

/**
 * Recupera chunks especificos de um documento
 */
export async function getDocumentChunks(
  documentContextId: string,
  startIndex: number = 0,
  count: number = 3
): Promise<DocumentChunk[]> {
  try {
    const { data, error } = await supabase
      .from('document_contexts')
      .select('chunks_data')
      .eq('id', documentContextId)
      .single()

    if (error || !data) {
      return []
    }

    const chunks = data.chunks_data as DocumentChunk[]
    return chunks.slice(startIndex, startIndex + count)
  } catch (err) {
    console.error('Erro ao buscar chunks:', err)
    return []
  }
}

/**
 * Busca em todos os documentos da sessao por termo
 */
export async function searchInDocuments(
  sessionId: string,
  searchTerm: string
): Promise<{ documentId: string; fileName: string; matches: { chunk: DocumentChunk; context: string }[] }[]> {
  const documents = await getSessionDocuments(sessionId)
  const results: { documentId: string; fileName: string; matches: { chunk: DocumentChunk; context: string }[] }[] = []

  const searchLower = searchTerm.toLowerCase()

  for (const doc of documents) {
    const matches: { chunk: DocumentChunk; context: string }[] = []

    for (const chunk of doc.chunks_data) {
      const contentLower = chunk.content.toLowerCase()
      const index = contentLower.indexOf(searchLower)

      if (index !== -1) {
        // Extrair contexto ao redor do termo encontrado
        const start = Math.max(0, index - 100)
        const end = Math.min(chunk.content.length, index + searchTerm.length + 100)
        const context = chunk.content.slice(start, end)

        matches.push({ chunk, context })
      }
    }

    if (matches.length > 0) {
      results.push({
        documentId: doc.id,
        fileName: doc.file_name,
        matches
      })
    }
  }

  return results
}

/**
 * Gera contexto consolidado de todos os documentos para a IA
 */
export async function generateConsolidatedContext(sessionId: string): Promise<string> {
  const documents = await getSessionDocuments(sessionId)

  if (documents.length === 0) {
    return ''
  }

  let context = '\n=== DOCUMENTOS CARREGADOS NA SESSAO ===\n\n'

  for (const doc of documents) {
    context += `📄 ${doc.file_name}\n`
    context += `   Tipo: ${doc.file_type} | Tamanho: ${formatFileSize(doc.file_size)}\n`
    context += `   Partes: ${doc.total_chunks}\n`

    if (doc.summary) {
      context += `   Resumo: ${doc.summary.substring(0, 200)}${doc.summary.length > 200 ? '...' : ''}\n`
    }

    if (doc.entities && doc.entities.length > 0) {
      const pessoas = doc.entities.filter(e => e.type === 'PESSOA').slice(0, 5)
      if (pessoas.length > 0) {
        context += `   Pessoas: ${pessoas.map(p => p.value).join(', ')}\n`
      }
    }

    context += '\n'
  }

  context += 'Use /buscar [termo] para encontrar informacoes especificas nos documentos.\n'
  context += '=== FIM DA LISTA DE DOCUMENTOS ===\n\n'

  return context
}

/**
 * Remove contextos expirados
 */
export async function cleanupExpiredContexts(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('document_contexts')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id')

    if (error) {
      console.error('Erro ao limpar contextos:', error)
      return 0
    }

    return data?.length || 0
  } catch (err) {
    console.error('Erro ao limpar contextos:', err)
    return 0
  }
}

/**
 * Remove contexto especifico
 */
export async function removeDocumentContext(documentContextId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('document_contexts')
      .delete()
      .eq('id', documentContextId)

    return !error
  } catch (err) {
    console.error('Erro ao remover contexto:', err)
    return false
  }
}

/**
 * Atualiza resumo de um documento
 */
export async function updateDocumentSummary(
  documentContextId: string,
  summary: string,
  keyPoints: string[]
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('document_contexts')
      .update({ summary, key_points: keyPoints })
      .eq('id', documentContextId)

    return !error
  } catch (err) {
    console.error('Erro ao atualizar resumo:', err)
    return false
  }
}

// Funcao auxiliar
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
