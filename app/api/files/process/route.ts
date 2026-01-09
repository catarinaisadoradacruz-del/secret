import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
const GEMINI_UPLOAD_URL = 'https://generativelanguage.googleapis.com/upload/v1beta/files'

// Limites
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const INLINE_LIMIT = 4 * 1024 * 1024 // 4MB para inline data

// Tipos suportados
const SUPPORTED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'text/plain': 'text',
  'text/csv': 'text',
  'application/json': 'text',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
}

// No App Router, usamos route segment config ao inves de export const config
// O FormData e parseado automaticamente pelo Next.js

// Prompt para extracao
const EXTRACTION_PROMPT = `Voce e um assistente especializado em extrair texto de documentos.

TAREFA: Extraia TODO o conteudo deste arquivo.

INSTRUCOES:
1. Extraia ABSOLUTAMENTE TODO o texto visivel
2. Se for imagem ou PDF escaneado, aplique OCR
3. Mantenha a estrutura original (titulos, paragrafos, listas, tabelas)
4. Tabelas devem ser formatadas com | para separar colunas
5. Preserve numeros, datas, CPFs, telefones EXATAMENTE como aparecem
6. Nomes de pessoas devem ficar em MAIUSCULAS
7. NAO resuma, NAO interprete - apenas transcreva fielmente
8. Marque partes ilegiveis como [ILEGIVEL]
9. Se houver multiplas paginas, processe TODAS

Comece a transcricao completa:`

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log('\n========== PROCESSAMENTO DE ARQUIVO ==========')

  try {
    // Verificar autenticacao
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Nao autenticado'
      }, { status: 401 })
    }

    // Processar FormData
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'Arquivo nao enviado'
      }, { status: 400 })
    }

    const fileType = file.type || 'application/octet-stream'
    const fileName = file.name
    const fileSize = file.size

    console.log(`Arquivo: ${fileName}`)
    console.log(`Tipo: ${fileType}`)
    console.log(`Tamanho: ${(fileSize / 1024 / 1024).toFixed(2)} MB`)

    // Validar tamanho
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({
        success: false,
        error: `Arquivo muito grande. Maximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`
      }, { status: 400 })
    }

    // Determinar tipo de processamento
    const category = SUPPORTED_TYPES[fileType] || 'unknown'
    console.log(`Categoria: ${category}`)

    let extractedText = ''
    let processingMethod = ''

    // Converter para ArrayBuffer e base64
    const arrayBuffer = await file.arrayBuffer()
    const base64Data = Buffer.from(arrayBuffer).toString('base64')

    // Processar baseado no tipo
    if (category === 'text') {
      // Arquivos de texto puro - ler diretamente
      extractedText = await file.text()
      processingMethod = 'direct_read'
      console.log('Texto lido diretamente')

    } else if (category === 'image') {
      // Imagens - usar Gemini Vision para OCR
      extractedText = await extractWithGeminiVision(base64Data, fileType)
      processingMethod = 'gemini_vision'
      console.log('Imagem processada com Gemini Vision')

    } else if (category === 'pdf') {
      // PDFs - verificar tamanho e usar metodo apropriado
      if (fileSize <= INLINE_LIMIT) {
        // PDF pequeno - usar inline
        extractedText = await extractWithGeminiVision(base64Data, fileType)
        processingMethod = 'gemini_inline'
        console.log('PDF pequeno processado com inline data')
      } else {
        // PDF grande - usar File API
        extractedText = await extractWithFileAPI(base64Data, fileName, fileType)
        processingMethod = 'gemini_file_api'
        console.log('PDF grande processado com File API')
      }

    } else {
      // Tipo desconhecido - tentar processar com Gemini
      console.log('Tipo desconhecido, tentando Gemini Vision...')
      try {
        extractedText = await extractWithGeminiVision(base64Data, fileType)
        processingMethod = 'gemini_fallback'
      } catch (err) {
        return NextResponse.json({
          success: false,
          error: `Tipo de arquivo nao suportado: ${fileType}`
        }, { status: 400 })
      }
    }

    // Verificar se extraiu algo
    if (!extractedText || extractedText.trim().length === 0) {
      console.log('Primeira tentativa falhou, tentando OCR forcado...')

      // Segunda tentativa com prompt mais agressivo
      try {
        extractedText = await extractWithForcedOCR(base64Data, fileType)
        processingMethod += '_retry'
      } catch (retryErr) {
        console.error('Retry falhou:', retryErr)
      }
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nao foi possivel extrair texto do arquivo. Pode estar protegido, corrompido ou ser uma imagem sem texto.'
      }, { status: 422 })
    }

    const processingTime = Date.now() - startTime

    console.log(`\n✅ SUCESSO`)
    console.log(`Metodo: ${processingMethod}`)
    console.log(`Caracteres: ${extractedText.length}`)
    console.log(`Palavras: ${extractedText.split(/\s+/).length}`)
    console.log(`Tempo: ${processingTime}ms`)
    console.log('==============================================\n')

    return NextResponse.json({
      success: true,
      data: {
        text: extractedText,
        fileName,
        fileType,
        fileSize,
        charCount: extractedText.length,
        wordCount: extractedText.split(/\s+/).length,
        processingMethod,
        processingTime
      }
    })

  } catch (error: any) {
    console.error('\n❌ ERRO:', error.message)
    console.error('Stack:', error.stack)

    return NextResponse.json({
      success: false,
      error: error.message || 'Erro ao processar arquivo'
    }, { status: 500 })
  }
}

// Extrair com Gemini Vision (para imagens e PDFs pequenos)
async function extractWithGeminiVision(base64Data: string, mimeType: string): Promise<string> {
  console.log('Chamando Gemini Vision...')

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
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
          { text: EXTRACTION_PROMPT }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 32768
      }
    })
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Gemini Vision error:', error)
    throw new Error(error.error?.message || 'Erro no Gemini Vision')
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

// Extrair com OCR forcado (segunda tentativa)
async function extractWithForcedOCR(base64Data: string, mimeType: string): Promise<string> {
  console.log('Tentando OCR forcado...')

  const forcedPrompt = `IMPORTANTE: Este arquivo pode conter IMAGENS ESCANEADAS de documentos.

VOCE DEVE:
1. Aplicar OCR em TODAS as imagens
2. Extrair TODO texto visivel, mesmo que esteja em imagens
3. Transcrever documentos escaneados completamente
4. NAO dizer que nao consegue ler - tente extrair qualquer texto visivel

Se o documento parecer ser uma digitalizacao/scan, transcreva todo o conteudo da imagem.

${EXTRACTION_PROMPT}`

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
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
          { text: forcedPrompt }
        ]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 32768
      }
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Erro no OCR forcado')
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

// Extrair com File API (para arquivos grandes)
async function extractWithFileAPI(base64Data: string, fileName: string, mimeType: string): Promise<string> {
  console.log('Usando Gemini File API para arquivo grande...')

  const buffer = Buffer.from(base64Data, 'base64')

  // Passo 1: Iniciar upload
  const startResponse = await fetch(`${GEMINI_UPLOAD_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': buffer.length.toString(),
      'X-Goog-Upload-Header-Content-Type': mimeType,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      file: { display_name: fileName }
    })
  })

  if (!startResponse.ok) {
    throw new Error('Falha ao iniciar upload')
  }

  const uploadUri = startResponse.headers.get('X-Goog-Upload-URL')
  if (!uploadUri) {
    throw new Error('URI de upload nao recebido')
  }

  // Passo 2: Enviar arquivo
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
    throw new Error('Falha ao enviar arquivo')
  }

  const uploadResult = await uploadResponse.json()
  const fileUri = uploadResult.file?.uri
  const filePath = uploadResult.file?.name

  if (!fileUri) {
    throw new Error('URI do arquivo nao recebido')
  }

  console.log('Arquivo enviado:', fileUri)

  // Passo 3: Aguardar processamento
  let fileReady = false
  let attempts = 0

  while (!fileReady && attempts < 60) {
    const checkResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${filePath}?key=${GEMINI_API_KEY}`
    )

    if (checkResponse.ok) {
      const status = await checkResponse.json()
      if (status.state === 'ACTIVE') {
        fileReady = true
      } else if (status.state === 'FAILED') {
        throw new Error('Processamento do arquivo falhou')
      } else {
        await new Promise(r => setTimeout(r, 1000))
        attempts++
      }
    } else {
      await new Promise(r => setTimeout(r, 1000))
      attempts++
    }
  }

  if (!fileReady) {
    throw new Error('Timeout aguardando processamento')
  }

  // Passo 4: Extrair texto
  const extractResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
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
          { text: EXTRACTION_PROMPT }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 65536
      }
    })
  })

  if (!extractResponse.ok) {
    const error = await extractResponse.json()
    throw new Error(error.error?.message || 'Erro ao extrair texto')
  }

  const data = await extractResponse.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  // Passo 5: Limpar arquivo
  try {
    await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${filePath}?key=${GEMINI_API_KEY}`,
      { method: 'DELETE' }
    )
  } catch (e) {
    console.warn('Nao conseguiu deletar arquivo temporario')
  }

  return text
}
