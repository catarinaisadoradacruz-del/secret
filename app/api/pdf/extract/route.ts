import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY

// Limites
const MAX_INLINE_SIZE = 4 * 1024 * 1024 // 4MB para inline
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB maximo

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Arquivo obrigatorio' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Arquivo muito grande (max 50MB)' }, { status: 400 })
    }

    console.log('Processando PDF: ' + file.name + ' (' + (file.size / 1024 / 1024).toFixed(2) + ' MB)')

    const arrayBuffer = await file.arrayBuffer()
    const base64Data = Buffer.from(arrayBuffer).toString('base64')

    let extractedText = ''

    // Para arquivos maiores que 4MB, usar File API do Gemini
    if (file.size > MAX_INLINE_SIZE) {
      console.log('Usando File API para arquivo grande...')
      extractedText = await extractWithFileAPI(base64Data, file.name, file.type)
    } else {
      console.log('Usando inline data para arquivo pequeno...')
      extractedText = await extractWithInlineData(base64Data, file.type)
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json({
        error: 'Nao foi possivel extrair texto do PDF',
        details: 'O arquivo pode estar protegido, ser uma imagem escaneada sem OCR, ou estar corrompido'
      }, { status: 422 })
    }

    return NextResponse.json({
      success: true,
      text: extractedText,
      fileName: file.name,
      fileSize: file.size,
      charCount: extractedText.length,
      wordCount: extractedText.split(/\s+/).length
    })

  } catch (error: any) {
    console.error('Erro ao processar PDF:', error)
    return NextResponse.json({
      error: 'Erro ao processar PDF',
      details: error.message
    }, { status: 500 })
  }
}

// Extrair usando dados inline (para PDFs < 4MB)
async function extractWithInlineData(base64Data: string, mimeType: string): Promise<string> {
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
                mimeType,
                data: base64Data
              }
            },
            {
              text: 'TAREFA: Extraia TODO o texto deste documento PDF.\n\nINSTRUCOES CRITICAS:\n1. Extraia ABSOLUTAMENTE TODO o texto visivel\n2. Mantenha a estrutura original (titulos, paragrafos, listas, tabelas)\n3. Se houver tabelas, formate-as usando | para separar colunas\n4. Preserve numeros, datas, CPFs, telefones EXATAMENTE como aparecem\n5. Nomes de pessoas devem ficar em MAIUSCULAS\n6. NAO resuma, NAO interprete - apenas transcreva fielmente\n7. Se alguma parte estiver ilegivel, marque como [ILEGIVEL]\n8. Inclua cabecalhos e rodapes se existirem\n\nComece a transcricao:'
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 32768
        }
      })
    }
  )

  if (!response.ok) {
    const error = await response.json()
    console.error('Gemini inline error:', error)
    throw new Error(error.error?.message || 'Erro na API do Gemini')
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

// Extrair usando File API (para PDFs > 4MB)
async function extractWithFileAPI(base64Data: string, fileName: string, mimeType: string): Promise<string> {
  // Passo 1: Fazer upload do arquivo para o Gemini
  const uploadUrl = 'https://generativelanguage.googleapis.com/upload/v1beta/files?key=' + GEMINI_API_KEY

  // Converter base64 para buffer
  const buffer = Buffer.from(base64Data, 'base64')

  // Upload inicial para obter URI de upload
  const startUploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': buffer.length.toString(),
      'X-Goog-Upload-Header-Content-Type': mimeType,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      file: {
        display_name: fileName
      }
    })
  })

  if (!startUploadResponse.ok) {
    const error = await startUploadResponse.text()
    console.error('Upload start error:', error)
    throw new Error('Erro ao iniciar upload do arquivo')
  }

  const uploadUri = startUploadResponse.headers.get('X-Goog-Upload-URL')
  if (!uploadUri) {
    throw new Error('Nao obteve URI de upload')
  }

  // Passo 2: Fazer upload do conteudo
  const uploadResponse = await fetch(uploadUri, {
    method: 'PUT',
    headers: {
      'Content-Length': buffer.length.toString(),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize'
    },
    body: buffer
  })

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text()
    console.error('Upload content error:', error)
    throw new Error('Erro ao fazer upload do arquivo')
  }

  const uploadResult = await uploadResponse.json()
  const fileUri = uploadResult.file?.uri

  if (!fileUri) {
    console.error('Upload result:', uploadResult)
    throw new Error('Nao obteve URI do arquivo')
  }

  console.log('Arquivo enviado para Gemini:', fileUri)

  // Passo 3: Aguardar processamento (polling)
  let fileReady = false
  let attempts = 0
  const maxAttempts = 30 // 30 segundos max

  while (!fileReady && attempts < maxAttempts) {
    const checkResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/' + uploadResult.file.name + '?key=' + GEMINI_API_KEY
    )

    if (checkResponse.ok) {
      const fileStatus = await checkResponse.json()
      if (fileStatus.state === 'ACTIVE') {
        fileReady = true
        console.log('Arquivo pronto para processamento')
      } else if (fileStatus.state === 'FAILED') {
        throw new Error('Processamento do arquivo falhou')
      } else {
        console.log('Aguardando arquivo... (' + fileStatus.state + ')')
        await new Promise(resolve => setTimeout(resolve, 1000))
        attempts++
      }
    } else {
      attempts++
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  if (!fileReady) {
    throw new Error('Timeout aguardando processamento do arquivo')
  }

  // Passo 4: Chamar generateContent com a referencia do arquivo
  const generateResponse = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_API_KEY,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            {
              fileData: {
                mimeType,
                fileUri
              }
            },
            {
              text: 'TAREFA: Extraia TODO o texto deste documento PDF.\n\nINSTRUCOES CRITICAS:\n1. Extraia ABSOLUTAMENTE TODO o texto visivel\n2. Mantenha a estrutura original (titulos, paragrafos, listas, tabelas)\n3. Se houver tabelas, formate-as usando | para separar colunas\n4. Preserve numeros, datas, CPFs, telefones EXATAMENTE como aparecem\n5. Nomes de pessoas devem ficar em MAIUSCULAS\n6. NAO resuma, NAO interprete - apenas transcreva fielmente\n7. Se alguma parte estiver ilegivel, marque como [ILEGIVEL]\n8. Inclua cabecalhos e rodapes se existirem\n\nComece a transcricao:'
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 65536 // Maior para documentos grandes
        }
      })
    }
  )

  if (!generateResponse.ok) {
    const error = await generateResponse.json()
    console.error('Generate error:', error)
    throw new Error(error.error?.message || 'Erro ao extrair texto')
  }

  const data = await generateResponse.json()
  const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  // Passo 5: Deletar arquivo do Gemini (limpeza)
  try {
    await fetch(
      'https://generativelanguage.googleapis.com/v1beta/' + uploadResult.file.name + '?key=' + GEMINI_API_KEY,
      { method: 'DELETE' }
    )
    console.log('Arquivo deletado do Gemini')
  } catch (e) {
    console.warn('Nao conseguiu deletar arquivo:', e)
  }

  return extractedText
}
