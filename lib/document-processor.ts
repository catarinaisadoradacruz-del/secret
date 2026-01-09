// Sistema de processamento de documentos grandes
// Divide documentos em partes SEM RESUMIR - mantendo texto original intacto
// Extrai e armazena imagens para OCR e reutilizacao

export interface DocumentChunk {
  id: string
  content: string
  index: number
  totalChunks: number
  metadata: {
    startChar: number
    endChar: number
    wordCount: number
    pageNumber?: number
    hasImages?: boolean
  }
}

export interface ExtractedImage {
  id: string
  documentId: string
  index: number
  base64: string
  mimeType: string
  width?: number
  height?: number
  pageNumber?: number
  caption?: string
  ocrText?: string // Texto extraido via OCR
  isProcessed: boolean
}

export interface ProcessedDocument {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  totalChunks: number
  chunks: DocumentChunk[]
  images: ExtractedImage[]
  entities: ExtractedEntity[]
  processedAt: string
  // NAO tem summary - texto original e mantido intacto
}

export interface ExtractedEntity {
  type: 'PESSOA' | 'CPF' | 'TELEFONE' | 'ENDERECO' | 'DATA' | 'VALOR' | 'PLACA' | 'EMAIL' | 'RG' | 'VEICULO'
  value: string
  context: string
  chunkIndex: number
  position: { start: number; end: number }
}

// Configuracoes
const CHUNK_SIZE = 6000 // caracteres por chunk - maior para manter mais contexto
const CHUNK_OVERLAP = 500 // sobreposicao maior para nao perder informacoes
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB max por imagem

/**
 * Divide um documento grande em chunks menores SEM PERDER INFORMACAO
 * Cada chunk e uma parte EXATA do documento original
 */
export function chunkDocument(text: string, fileName: string): DocumentChunk[] {
  const chunks: DocumentChunk[] = []
  const cleanText = text.replace(/\r\n/g, '\n').trim()

  if (cleanText.length <= CHUNK_SIZE) {
    // Documento pequeno, nao precisa dividir
    return [{
      id: generateChunkId(fileName, 0),
      content: cleanText,
      index: 0,
      totalChunks: 1,
      metadata: {
        startChar: 0,
        endChar: cleanText.length,
        wordCount: countWords(cleanText)
      }
    }]
  }

  let currentPosition = 0
  let chunkIndex = 0

  while (currentPosition < cleanText.length) {
    let endPosition = Math.min(currentPosition + CHUNK_SIZE, cleanText.length)

    // Tentar quebrar em um ponto natural (fim de paragrafo, frase, ou palavra)
    if (endPosition < cleanText.length) {
      // Procurar fim de paragrafo
      const paragraphBreak = cleanText.lastIndexOf('\n\n', endPosition)
      if (paragraphBreak > currentPosition + CHUNK_SIZE * 0.6) {
        endPosition = paragraphBreak + 2
      } else {
        // Procurar fim de frase
        const sentenceBreak = findSentenceBreak(cleanText, currentPosition, endPosition)
        if (sentenceBreak > currentPosition + CHUNK_SIZE * 0.6) {
          endPosition = sentenceBreak
        } else {
          // Procurar fim de linha
          const lineBreak = cleanText.lastIndexOf('\n', endPosition)
          if (lineBreak > currentPosition + CHUNK_SIZE * 0.5) {
            endPosition = lineBreak + 1
          }
        }
      }
    }

    const chunkContent = cleanText.slice(currentPosition, endPosition)

    if (chunkContent.trim().length > 0) {
      chunks.push({
        id: generateChunkId(fileName, chunkIndex),
        content: chunkContent,
        index: chunkIndex,
        totalChunks: 0, // Sera atualizado depois
        metadata: {
          startChar: currentPosition,
          endChar: endPosition,
          wordCount: countWords(chunkContent)
        }
      })
      chunkIndex++
    }

    // Proximo chunk COM overlap para garantir que nada se perca
    currentPosition = endPosition - CHUNK_OVERLAP
    if (currentPosition <= 0 || endPosition >= cleanText.length) {
      currentPosition = endPosition
    }
    if (endPosition >= cleanText.length) break
  }

  // Atualizar totalChunks em todos os chunks
  chunks.forEach(chunk => {
    chunk.totalChunks = chunks.length
  })

  return chunks
}

/**
 * Processa arquivo de imagem - extrai e prepara para OCR
 */
export async function processImage(
  file: File,
  documentId: string,
  index: number
): Promise<ExtractedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = async (e) => {
      const base64 = e.target?.result as string

      // Extrair apenas a parte base64 (remover data:image/...;base64,)
      const base64Data = base64.split(',')[1] || base64

      const image: ExtractedImage = {
        id: `img_${documentId}_${index}_${Date.now()}`,
        documentId,
        index,
        base64: base64Data,
        mimeType: file.type,
        isProcessed: false
      }

      // Tentar obter dimensoes da imagem
      if (file.type.startsWith('image/')) {
        try {
          const img = new Image()
          img.onload = () => {
            image.width = img.width
            image.height = img.height
            resolve(image)
          }
          img.onerror = () => resolve(image)
          img.src = base64
        } catch {
          resolve(image)
        }
      } else {
        resolve(image)
      }
    }

    reader.onerror = () => reject(new Error('Erro ao ler arquivo'))
    reader.readAsDataURL(file)
  })
}

/**
 * Extrai entidades importantes do texto (CPF, telefone, nomes, etc)
 * Salva a POSICAO para poder localizar depois
 */
export function extractEntities(text: string, chunkIndex: number = 0): ExtractedEntity[] {
  const entities: ExtractedEntity[] = []

  // Padroes regex para entidades
  const patterns: { type: ExtractedEntity['type']; regex: RegExp }[] = [
    { type: 'CPF', regex: /\b\d{3}\.?\d{3}\.?\d{3}[-.]?\d{2}\b/g },
    { type: 'TELEFONE', regex: /\(?\d{2}\)?[\s.-]?\d{4,5}[-.]?\d{4}\b/g },
    { type: 'EMAIL', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g },
    { type: 'DATA', regex: /\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/g },
    { type: 'VALOR', regex: /R\$\s*[\d.,]+(?:\s*(?:mil|milhao|milhoes|reais))?\b/gi },
    { type: 'PLACA', regex: /\b[A-Z]{3}[-\s]?\d{1}[A-Z0-9]?\d{2}\b/gi },
    { type: 'RG', regex: /\b\d{1,2}\.?\d{3}\.?\d{3}[-.]?[0-9X]\b/g },
    { type: 'ENDERECO', regex: /(?:Rua|Av\.?|Avenida|Alameda|Travessa|Praca|Rodovia|BR-\d+|Quadra|QD|Lote|Lt)[^,\n]{5,80}/gi },
    { type: 'VEICULO', regex: /(?:FIAT|VOLKSWAGEN|VW|CHEVROLET|GM|FORD|HONDA|TOYOTA|HYUNDAI|RENAULT|NISSAN|JEEP|BMW|MERCEDES|AUDI)[^,\n]{3,50}/gi },
  ]

  // Extrair nomes em MAIUSCULAS (comum em documentos policiais)
  const nomePattern = /\b[A-Z][A-Z]+(?:\s+(?:DE|DA|DO|DOS|DAS|E))?\s+[A-Z][A-Z]+(?:\s+[A-Z][A-Z]+)*\b/g
  let nomeMatch
  while ((nomeMatch = nomePattern.exec(text)) !== null) {
    const nome = nomeMatch[0]
    // Filtrar falsos positivos (siglas comuns, etc)
    if (nome.length > 5 && !isCommonAcronym(nome) && nome.split(' ').length >= 2) {
      entities.push({
        type: 'PESSOA',
        value: nome,
        context: getContext(text, nomeMatch.index, 60),
        chunkIndex,
        position: { start: nomeMatch.index, end: nomeMatch.index + nome.length }
      })
    }
  }

  // Extrair outras entidades
  for (const { type, regex } of patterns) {
    let match
    // Reset regex
    regex.lastIndex = 0
    while ((match = regex.exec(text)) !== null) {
      entities.push({
        type,
        value: match[0].trim(),
        context: getContext(text, match.index, 40),
        chunkIndex,
        position: { start: match.index, end: match.index + match[0].length }
      })
    }
  }

  // Remover duplicatas mantendo a primeira ocorrencia
  return deduplicateEntities(entities)
}

/**
 * Prepara chunk(s) para envio a IA - SEM RESUMIR
 */
export function prepareChunksForAI(
  chunks: DocumentChunk[],
  startIndex: number = 0,
  maxChunks: number = 2
): { content: string; hasMore: boolean; nextIndex: number; chunkInfo: string } {
  const selectedChunks = chunks.slice(startIndex, startIndex + maxChunks)

  let content = ''
  selectedChunks.forEach(chunk => {
    content += `\n========== PARTE ${chunk.index + 1} DE ${chunk.totalChunks} ==========\n`
    content += chunk.content
    content += '\n'
  })

  const chunkInfo = `Mostrando partes ${startIndex + 1}-${Math.min(startIndex + maxChunks, chunks.length)} de ${chunks.length}`

  return {
    content,
    hasMore: startIndex + maxChunks < chunks.length,
    nextIndex: startIndex + maxChunks,
    chunkInfo
  }
}

/**
 * Prepara imagem para OCR via Gemini Vision
 */
export function prepareImageForOCR(image: ExtractedImage): {
  inlineData: { mimeType: string; data: string }
} {
  return {
    inlineData: {
      mimeType: image.mimeType,
      data: image.base64
    }
  }
}

/**
 * Gera prompt para OCR de imagem
 */
export function getOCRPrompt(): string {
  return `Extraia TODO o texto visivel nesta imagem.
Mantenha a formatacao original (paragrafos, listas, tabelas).
Se houver tabelas, mantenha a estrutura.
Se houver texto manuscrito, tente ler.
NAO resuma, NAO interprete - apenas transcreva o texto exatamente como aparece.
Se nao conseguir ler alguma parte, indique com [ILEGIVEL].`
}

/**
 * Estima tokens de um texto (aproximacao para Gemini)
 */
export function estimateTokens(text: string): number {
  // Aproximacao: 1 token ~ 4 caracteres em portugues
  return Math.ceil(text.length / 4)
}

/**
 * Verifica se o documento e muito grande para processar de uma vez
 */
export function isDocumentTooLarge(text: string): boolean {
  const tokens = estimateTokens(text)
  return tokens > 12000 // ~48k caracteres
}

/**
 * Calcula progresso de processamento
 */
export function calculateProgress(currentChunk: number, totalChunks: number): number {
  if (totalChunks === 0) return 100
  return Math.round((currentChunk / totalChunks) * 100)
}

/**
 * Formata tamanho de arquivo
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

/**
 * Recorta uma secao do documento por posicao de caracteres
 */
export function extractSection(
  chunks: DocumentChunk[],
  startChar: number,
  endChar: number
): string {
  let result = ''

  for (const chunk of chunks) {
    // Verificar se o chunk intersecta com a secao desejada
    if (chunk.metadata.endChar <= startChar) continue
    if (chunk.metadata.startChar >= endChar) break

    const chunkStart = Math.max(0, startChar - chunk.metadata.startChar)
    const chunkEnd = Math.min(chunk.content.length, endChar - chunk.metadata.startChar)

    result += chunk.content.slice(chunkStart, chunkEnd)
  }

  return result
}

/**
 * Encontra chunks que contem um termo de busca
 */
export function searchInChunks(
  chunks: DocumentChunk[],
  searchTerm: string
): { chunkIndex: number; positions: number[]; context: string }[] {
  const results: { chunkIndex: number; positions: number[]; context: string }[] = []
  const searchLower = searchTerm.toLowerCase()

  for (const chunk of chunks) {
    const contentLower = chunk.content.toLowerCase()
    const positions: number[] = []
    let pos = 0

    while ((pos = contentLower.indexOf(searchLower, pos)) !== -1) {
      positions.push(pos)
      pos += searchTerm.length
    }

    if (positions.length > 0) {
      // Pegar contexto da primeira ocorrencia
      const firstPos = positions[0]
      const contextStart = Math.max(0, firstPos - 100)
      const contextEnd = Math.min(chunk.content.length, firstPos + searchTerm.length + 100)

      results.push({
        chunkIndex: chunk.index,
        positions,
        context: '...' + chunk.content.slice(contextStart, contextEnd) + '...'
      })
    }
  }

  return results
}

/**
 * Gera informacoes do documento para contexto (sem resumir)
 */
export function generateDocumentInfo(doc: ProcessedDocument): string {
  let info = `=== DOCUMENTO: ${doc.fileName} ===\n`
  info += `Tipo: ${doc.fileType} | Tamanho: ${formatFileSize(doc.fileSize)}\n`
  info += `Total de partes: ${doc.totalChunks}\n`

  if (doc.images.length > 0) {
    info += `Imagens: ${doc.images.length}\n`
  }

  if (doc.entities.length > 0) {
    info += `\n--- ENTIDADES IDENTIFICADAS ---\n`
    const grouped = groupEntitiesByType(doc.entities)
    for (const [type, items] of Object.entries(grouped)) {
      const uniqueValues = [...new Set(items.map(e => e.value))]
      info += `${type}: ${uniqueValues.slice(0, 10).join(', ')}${uniqueValues.length > 10 ? ` (+${uniqueValues.length - 10} mais)` : ''}\n`
    }
  }

  return info
}

// === Funcoes auxiliares privadas ===

function generateChunkId(fileName: string, index: number): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `chunk_${fileName.replace(/\W/g, '_').substring(0, 20)}_${index}_${random}`
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(word => word.length > 0).length
}

function findSentenceBreak(text: string, start: number, end: number): number {
  // Procurar fim de frase (. ! ?) seguido de espaco ou nova linha
  for (let i = end; i > start + (end - start) * 0.5; i--) {
    if ((text[i] === '.' || text[i] === '!' || text[i] === '?') &&
        (text[i - 1] !== '.' && text[i - 2] !== '.')) { // Evitar ...
      const nextChar = text[i + 1]
      if (nextChar === ' ' || nextChar === '\n' || nextChar === undefined) {
        return i + 1
      }
    }
  }
  return -1
}

function getContext(text: string, index: number, contextSize: number): string {
  const start = Math.max(0, index - contextSize)
  const end = Math.min(text.length, index + contextSize)
  return text.slice(start, end).replace(/\n/g, ' ').trim()
}

function isCommonAcronym(text: string): boolean {
  const acronyms = [
    'PCGO', 'PMGO', 'MPE', 'TJGO', 'CPF', 'RG', 'CNH', 'CNPJ',
    'RAI', 'BO', 'IP', 'TC', 'MP', 'TJ', 'STF', 'STJ', 'PF',
    'RELINT', 'DENARC', 'DEIC', 'DRACO', 'DHPP', 'SSP', 'PC',
    'NAO', 'SIM', 'PELO', 'PELA', 'PARA', 'COM', 'SEM', 'POR',
    'QUE', 'DOS', 'DAS', 'NOS', 'NAS', 'AOS', 'SOBRE', 'ENTRE'
  ]
  return acronyms.includes(text.toUpperCase().trim())
}

function deduplicateEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
  const seen = new Map<string, ExtractedEntity>()

  for (const entity of entities) {
    const key = `${entity.type}:${entity.value.toLowerCase()}`
    if (!seen.has(key)) {
      seen.set(key, entity)
    }
  }

  return Array.from(seen.values())
}

function groupEntitiesByType(entities: ExtractedEntity[]): Record<string, ExtractedEntity[]> {
  return entities.reduce((acc, entity) => {
    if (!acc[entity.type]) acc[entity.type] = []
    acc[entity.type].push(entity)
    return acc
  }, {} as Record<string, ExtractedEntity[]>)
}

// === Exportar configuracoes ===
export const CONFIG = {
  CHUNK_SIZE,
  CHUNK_OVERLAP,
  MAX_IMAGE_SIZE
}
