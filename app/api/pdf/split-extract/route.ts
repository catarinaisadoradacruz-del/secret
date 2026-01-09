import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument } from 'pdf-lib'

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY

// Prompt otimizado para extrair texto de UMA pagina
const PAGE_EXTRACTION_PROMPT = `Extraia TODO o texto desta pagina do documento.

INSTRUCOES:
1. Transcreva ABSOLUTAMENTE TODO o texto visivel
2. Se for imagem escaneada, aplique OCR
3. Preserve numeros, datas, CPFs, telefones EXATAMENTE
4. Nomes de pessoas em MAIUSCULAS
5. Tabelas: use | para separar colunas
6. Se algo estiver ilegivel: [ILEGIVEL]
7. NAO resuma - transcreva fielmente

Texto da pagina:`

// Extrair texto de uma unica pagina usando Gemini
async function extractPageText(pageBase64: string, pageNumber: number): Promise<string> {
  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_API_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: pageBase64
                }
              },
              { text: PAGE_EXTRACTION_PROMPT }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192
          }
        })
      }
    )

    if (!response.ok) {
      console.error(`Erro na pagina ${pageNumber}:`, response.status)
      return `[ERRO AO PROCESSAR PAGINA ${pageNumber}]`
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    return text
  } catch (err: any) {
    console.error(`Erro na pagina ${pageNumber}:`, err.message)
    return `[ERRO AO PROCESSAR PAGINA ${pageNumber}]`
  }
}

export async function POST(request: NextRequest) {
  console.log('=== SPLIT-EXTRACT: Iniciando processamento ===')

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const maxPagesParam = formData.get('maxPages') as string | null
    const startPageParam = formData.get('startPage') as string | null

    if (!file) {
      return NextResponse.json({ error: 'Arquivo obrigatorio' }, { status: 400 })
    }

    const maxPages = maxPagesParam ? parseInt(maxPagesParam) : 0 // 0 = todas
    const startPage = startPageParam ? parseInt(startPageParam) : 1

    console.log(`Arquivo: ${file.name}, Tamanho: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
    console.log(`Paginas: inicio=${startPage}, max=${maxPages || 'todas'}`)

    // Carregar PDF
    const arrayBuffer = await file.arrayBuffer()
    const pdfDoc = await PDFDocument.load(arrayBuffer)
    const totalPages = pdfDoc.getPageCount()

    console.log(`Total de paginas no PDF: ${totalPages}`)

    // Calcular range de paginas
    const endPage = maxPages > 0
      ? Math.min(startPage + maxPages - 1, totalPages)
      : totalPages

    const pagesToProcess = endPage - startPage + 1

    console.log(`Processando paginas ${startPage} a ${endPage} (${pagesToProcess} paginas)`)

    // Processar cada pagina
    const results: { page: number; text: string; chars: number }[] = []
    let totalChars = 0

    for (let i = startPage; i <= endPage; i++) {
      console.log(`Processando pagina ${i}/${endPage}...`)

      // Criar PDF com apenas esta pagina
      const singlePageDoc = await PDFDocument.create()
      const [copiedPage] = await singlePageDoc.copyPages(pdfDoc, [i - 1]) // 0-indexed
      singlePageDoc.addPage(copiedPage)

      // Converter para base64
      const singlePageBytes = await singlePageDoc.save()
      const base64 = Buffer.from(singlePageBytes).toString('base64')

      // Extrair texto
      const pageText = await extractPageText(base64, i)

      results.push({
        page: i,
        text: pageText,
        chars: pageText.length
      })

      totalChars += pageText.length

      console.log(`Pagina ${i}: ${pageText.length} caracteres`)

      // Pequeno delay para evitar rate limit
      if (i < endPage) {
        await new Promise(r => setTimeout(r, 500))
      }
    }

    // Montar texto final
    const fullText = results
      .map(r => `\n--- PAGINA ${r.page} ---\n${r.text}`)
      .join('\n')

    console.log('=== SPLIT-EXTRACT: Concluido ===')
    console.log(`Total: ${totalChars} caracteres de ${pagesToProcess} paginas`)

    return NextResponse.json({
      success: true,
      fileName: file.name,
      totalPages,
      processedPages: pagesToProcess,
      startPage,
      endPage,
      totalChars,
      hasMore: endPage < totalPages,
      nextStartPage: endPage < totalPages ? endPage + 1 : null,
      text: fullText,
      pages: results
    })

  } catch (error: any) {
    console.error('=== SPLIT-EXTRACT: Erro ===', error)
    return NextResponse.json({
      error: 'Erro ao processar PDF',
      details: error.message
    }, { status: 500 })
  }
}

// GET para verificar status/info
export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: '/api/pdf/split-extract',
    description: 'Divide PDF em paginas e extrai texto de cada uma',
    params: {
      file: 'PDF file (required)',
      maxPages: 'Max pages per request (optional, default=all)',
      startPage: 'Starting page number (optional, default=1)'
    },
    example: 'POST with FormData: file=PDF, maxPages=10, startPage=1'
  })
}
