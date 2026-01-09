import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY
const GEMINI_VISION_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

interface OCRRequest {
  imageBase64: string
  mimeType: string
  extractTables?: boolean
  documentId?: string
  imageIndex?: number
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    // Verificar autenticacao
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body: OCRRequest = await request.json()
    const { imageBase64, mimeType, extractTables = true, documentId, imageIndex } = body

    if (!imageBase64 || !mimeType) {
      return NextResponse.json({ error: 'Imagem obrigatoria' }, { status: 400 })
    }

    // Construir prompt para OCR
    let prompt = `Extraia TODO o texto visivel nesta imagem.

REGRAS IMPORTANTES:
1. NAO resuma, NAO interprete - transcreva EXATAMENTE como aparece
2. Mantenha a formatacao original (paragrafos, espacamentos)
3. Se houver texto manuscrito, tente ler e indique [MANUSCRITO: texto]
4. Se algo estiver ilegivel, indique [ILEGIVEL]
5. Mantenha numeros, datas e valores exatamente como aparecem`

    if (extractTables) {
      prompt += `
6. Se houver TABELAS, formate em markdown:
   | Coluna 1 | Coluna 2 |
   |----------|----------|
   | Dado 1   | Dado 2   |
7. Se houver LISTAS, mantenha a estrutura com bullets ou numeros`
    }

    prompt += `

Comece a transcricao agora:`

    // Fazer request ao Gemini Vision
    const response = await fetch(`${GEMINI_VISION_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: imageBase64
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1, // Baixa para maior precisao
          maxOutputTokens: 8192
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Erro Gemini OCR:', errorText)
      return NextResponse.json({ error: 'Erro ao processar imagem' }, { status: 500 })
    }

    const data = await response.json()
    const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Se tiver documentId, salvar o resultado no contexto
    if (documentId && imageIndex !== undefined) {
      try {
        // Buscar o documento atual
        const { data: docData } = await supabase
          .from('document_contexts')
          .select('chunks_data')
          .eq('id', documentId)
          .single()

        if (docData) {
          // Atualizar imagem com OCR no chunks_data (se armazenado la)
          // Por enquanto, apenas logamos
          console.log(`OCR processado para documento ${documentId}, imagem ${imageIndex}`)
        }
      } catch (e) {
        console.error('Erro ao atualizar documento com OCR:', e)
      }
    }

    return NextResponse.json({
      success: true,
      text: extractedText,
      charCount: extractedText.length,
      wordCount: extractedText.split(/\s+/).filter((w: string) => w.length > 0).length
    })

  } catch (error) {
    console.error('Erro OCR:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// Endpoint para OCR em lote (multiplas imagens)
export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { images } = body as { images: { base64: string; mimeType: string; index: number }[] }

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'Lista de imagens obrigatoria' }, { status: 400 })
    }

    // Processar em paralelo (max 5 por vez para nao sobrecarregar)
    const batchSize = 5
    const results: { index: number; text: string; success: boolean; error?: string }[] = []

    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize)

      const batchResults = await Promise.all(
        batch.map(async (img) => {
          try {
            const response = await fetch(`${GEMINI_VISION_URL}?key=${GEMINI_API_KEY}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{
                  role: 'user',
                  parts: [
                    {
                      text: `Extraia TODO o texto desta imagem. NAO resuma. Transcreva exatamente.
Se ilegivel: [ILEGIVEL]. Se manuscrito: [MANUSCRITO: texto].
Mantenha tabelas em formato markdown. Comece:`
                    },
                    {
                      inlineData: {
                        mimeType: img.mimeType,
                        data: img.base64
                      }
                    }
                  ]
                }],
                generationConfig: {
                  temperature: 0.1,
                  maxOutputTokens: 4096
                }
              })
            })

            if (!response.ok) {
              return { index: img.index, text: '', success: false, error: 'Erro API' }
            }

            const data = await response.json()
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

            return { index: img.index, text, success: true }
          } catch (e) {
            return { index: img.index, text: '', success: false, error: String(e) }
          }
        })
      )

      results.push(...batchResults)
    }

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      results,
      stats: {
        total: images.length,
        successful,
        failed
      }
    })

  } catch (error) {
    console.error('Erro OCR em lote:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
