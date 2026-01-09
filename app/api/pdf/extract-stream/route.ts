import { NextRequest } from 'next/server'
import { PDFDocument } from 'pdf-lib'

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY

// Prompt otimizado para extrair texto de UMA pagina com maxima precisao
const PAGE_EXTRACTION_PROMPT = `TAREFA: Extraia com MAXIMA PRECISAO todo o texto desta pagina.

INSTRUCOES CRITICAS:
1. Transcreva ABSOLUTAMENTE TODO o texto visivel - cada palavra, cada numero
2. Se for imagem escaneada, aplique OCR com cuidado
3. Preserve EXATAMENTE como aparece:
   - Numeros de processos, protocolos, IPs
   - Datas (DD/MM/AAAA)
   - CPFs, RGs, CNPJs
   - Telefones
   - Enderecos completos
   - Valores monetarios
4. Nomes de pessoas devem ficar em MAIUSCULAS
5. Tabelas: formate com | para separar colunas
6. Se algo estiver ilegivel: [ILEGIVEL]
7. NAO resuma, NAO interprete - transcreva FIELMENTE
8. Inclua cabecalhos, rodapes, carimbos, assinaturas

Transcricao completa da pagina:`

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
            maxOutputTokens: 16384 // Mais tokens por pagina para garantir qualidade
          }
        })
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error(`Erro na pagina ${pageNumber}:`, errorData)
      return `[ERRO AO PROCESSAR PAGINA ${pageNumber}: ${errorData.error?.message || 'Erro desconhecido'}]`
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    return text
  } catch (err: any) {
    console.error(`Erro na pagina ${pageNumber}:`, err.message)
    return `[ERRO AO PROCESSAR PAGINA ${pageNumber}: ${err.message}]`
  }
}

export async function POST(request: NextRequest) {
  // Criar stream para enviar progresso em tempo real
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const formData = await request.formData()
        const file = formData.get('file') as File | null

        if (!file) {
          sendEvent('error', { message: 'Arquivo PDF obrigatorio' })
          controller.close()
          return
        }

        sendEvent('start', {
          message: `Iniciando processamento de ${file.name}`,
          fileName: file.name,
          fileSize: file.size
        })

        // Carregar PDF
        const arrayBuffer = await file.arrayBuffer()

        sendEvent('log', { message: 'Carregando estrutura do PDF...' })

        const pdfDoc = await PDFDocument.load(arrayBuffer)
        const totalPages = pdfDoc.getPageCount()

        sendEvent('info', {
          message: `PDF carregado com sucesso! Total de ${totalPages} paginas.`,
          totalPages
        })

        sendEvent('log', { message: `Vou processar cada pagina individualmente para garantir precisao...` })

        // Processar CADA pagina individualmente
        let fullText = ''
        let totalChars = 0

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          sendEvent('progress', {
            message: `Processando pagina ${pageNum} de ${totalPages}...`,
            current: pageNum,
            total: totalPages,
            percent: Math.round((pageNum / totalPages) * 100)
          })

          // Criar PDF com apenas esta pagina
          const singlePageDoc = await PDFDocument.create()
          const [copiedPage] = await singlePageDoc.copyPages(pdfDoc, [pageNum - 1])
          singlePageDoc.addPage(copiedPage)

          // Converter para base64
          const singlePageBytes = await singlePageDoc.save()
          const base64 = Buffer.from(singlePageBytes).toString('base64')

          // Extrair texto desta pagina
          const pageText = await extractPageText(base64, pageNum)
          const pageChars = pageText.length

          fullText += `\n\n--- PAGINA ${pageNum} ---\n${pageText}`
          totalChars += pageChars

          sendEvent('page_done', {
            message: `Pagina ${pageNum} concluida: ${pageChars} caracteres extraidos`,
            page: pageNum,
            chars: pageChars,
            totalChars
          })

          // Pequeno delay para evitar rate limit do Gemini
          if (pageNum < totalPages) {
            await new Promise(r => setTimeout(r, 800))
          }
        }

        sendEvent('complete', {
          message: `Processamento concluido! ${totalPages} paginas extraidas com ${totalChars} caracteres no total.`,
          totalPages,
          totalChars,
          text: fullText
        })

      } catch (error: any) {
        sendEvent('error', {
          message: `Erro ao processar PDF: ${error.message}`,
          error: error.message
        })
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
