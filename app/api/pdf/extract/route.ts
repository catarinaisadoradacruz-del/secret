import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY

// Limites
const MAX_INLINE_SIZE = 4 * 1024 * 1024 // 4MB para inline
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB maximo

// Prompt otimizado para PDFs com imagens e texto
const EXTRACTION_PROMPT = `TAREFA: Extraia TODO o conteudo deste documento PDF.

INSTRUCOES CRITICAS:
1. Este documento pode conter TEXTO E/OU IMAGENS - extraia TUDO
2. Se houver imagens escaneadas, aplique OCR e transcreva o texto das imagens
3. Extraia ABSOLUTAMENTE TODO o texto visivel, incluindo:
   - Texto normal
   - Texto em imagens
   - Tabelas (formate usando | para separar colunas)
   - Cabecalhos e rodapes
   - Carimbos e assinaturas digitalizadas
   - Anotacoes manuscritas (se legiveis)
4. Preserve a estrutura original (titulos, paragrafos, listas)
5. Preserve numeros, datas, CPFs, telefones EXATAMENTE como aparecem
6. Nomes de pessoas devem ficar em MAIUSCULAS
7. NAO resuma, NAO interprete - apenas transcreva fielmente
8. Se alguma parte estiver ilegivel, marque como [ILEGIVEL]
9. Se houver multiplas paginas, processe TODAS

Comece a transcricao completa:`

export async function POST(request: NextRequest) {
  console.log('=== INICIO PROCESSAMENTO PDF ===')

  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      console.log('Erro: Usuario nao autenticado')
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    console.log('Usuario autenticado:', session.user.email)

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      console.log('Erro: Arquivo nao enviado')
      return NextResponse.json({ error: 'Arquivo obrigatorio' }, { status: 400 })
    }

    console.log('Arquivo recebido:', file.name, '- Tipo:', file.type, '- Tamanho:', (file.size / 1024 / 1024).toFixed(2), 'MB')

    if (file.size > MAX_FILE_SIZE) {
      console.log('Erro: Arquivo muito grande')
      return NextResponse.json({ error: 'Arquivo muito grande (max 50MB)' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const base64Data = Buffer.from(arrayBuffer).toString('base64')

    console.log('Arquivo convertido para base64, tamanho:', (base64Data.length / 1024 / 1024).toFixed(2), 'MB')

    let extractedText = ''
    let method = ''

    // Para arquivos maiores que 4MB, usar File API do Gemini
    if (file.size > MAX_INLINE_SIZE) {
      console.log('>>> Usando File API (arquivo > 4MB)')
      method = 'file_api'
      extractedText = await extractWithFileAPI(base64Data, file.name, file.type)
    } else {
      console.log('>>> Usando Inline Data (arquivo <= 4MB)')
      method = 'inline'
      extractedText = await extractWithInlineData(base64Data, file.type)
    }

    console.log('Texto extraido:', extractedText.length, 'caracteres')

    if (!extractedText || extractedText.trim().length === 0) {
      console.log('AVISO: Nenhum texto extraido, tentando novamente com prompt diferente...')

      // Segunda tentativa com prompt mais agressivo para OCR
      try {
        if (file.size > MAX_INLINE_SIZE) {
          extractedText = await extractWithFileAPI(base64Data, file.name, file.type, true)
        } else {
          extractedText = await extractWithInlineData(base64Data, file.type, true)
        }
      } catch (retryErr) {
        console.error('Erro na segunda tentativa:', retryErr)
      }
    }

    if (!extractedText || extractedText.trim().length === 0) {
      console.log('ERRO: Nao foi possivel extrair texto apos 2 tentativas')
      return NextResponse.json({
        error: 'Nao foi possivel extrair texto do PDF',
        details: 'O arquivo pode estar protegido, ser uma imagem escaneada sem OCR, ou estar corrompido'
      }, { status: 422 })
    }

    console.log('=== SUCESSO ===')
    console.log('Metodo usado:', method)
    console.log('Caracteres extraidos:', extractedText.length)
    console.log('Palavras extraidas:', extractedText.split(/\s+/).length)

    return NextResponse.json({
      success: true,
      text: extractedText,
      fileName: file.name,
      fileSize: file.size,
      charCount: extractedText.length,
      wordCount: extractedText.split(/\s+/).length,
      method
    })

  } catch (error: any) {
    console.error('=== ERRO FATAL ===')
    console.error('Erro ao processar PDF:', error)
    console.error('Stack:', error.stack)
    return NextResponse.json({
      error: 'Erro ao processar PDF',
      details: error.message
    }, { status: 500 })
  }
}

// Extrair usando dados inline (para PDFs < 4MB)
async function extractWithInlineData(base64Data: string, mimeType: string, forceOcr: boolean = false): Promise<string> {
  const prompt = forceOcr
    ? `Este e um documento PDF que pode conter imagens escaneadas. APLIQUE OCR em todas as imagens e extraia TODO o texto visivel. Se o documento parecer ser uma imagem escaneada de um documento, transcreva todo o conteudo da imagem. Nao diga que nao consegue ler - tente extrair qualquer texto visivel.\n\n${EXTRACTION_PROMPT}`
    : EXTRACTION_PROMPT

  console.log('Chamando Gemini API (inline)...')

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
            { text: prompt }
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
    console.error('Gemini inline error:', JSON.stringify(error, null, 2))
    throw new Error(error.error?.message || 'Erro na API do Gemini')
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  console.log('Resposta Gemini (inline):', text.substring(0, 200) + '...')

  return text
}

// Extrair usando File API (para PDFs > 4MB)
async function extractWithFileAPI(base64Data: string, fileName: string, mimeType: string, forceOcr: boolean = false): Promise<string> {
  const prompt = forceOcr
    ? `Este e um documento PDF que pode conter imagens escaneadas. APLIQUE OCR em todas as imagens e extraia TODO o texto visivel. Se o documento parecer ser uma imagem escaneada de um documento, transcreva todo o conteudo da imagem. Nao diga que nao consegue ler - tente extrair qualquer texto visivel.\n\n${EXTRACTION_PROMPT}`
    : EXTRACTION_PROMPT

  // Passo 1: Fazer upload do arquivo para o Gemini
  const uploadUrl = 'https://generativelanguage.googleapis.com/upload/v1beta/files?key=' + GEMINI_API_KEY

  // Converter base64 para buffer
  const buffer = Buffer.from(base64Data, 'base64')

  console.log('Iniciando upload para Gemini File API...')

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
    throw new Error('Erro ao iniciar upload do arquivo: ' + error)
  }

  const uploadUri = startUploadResponse.headers.get('X-Goog-Upload-URL')
  if (!uploadUri) {
    throw new Error('Nao obteve URI de upload')
  }

  console.log('Upload URI obtido, enviando arquivo...')

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
    throw new Error('Erro ao fazer upload do arquivo: ' + error)
  }

  const uploadResult = await uploadResponse.json()
  const fileUri = uploadResult.file?.uri

  if (!fileUri) {
    console.error('Upload result:', JSON.stringify(uploadResult, null, 2))
    throw new Error('Nao obteve URI do arquivo')
  }

  console.log('Arquivo enviado:', fileUri)

  // Passo 3: Aguardar processamento (polling)
  let fileReady = false
  let attempts = 0
  const maxAttempts = 60 // 60 segundos max para arquivos grandes

  while (!fileReady && attempts < maxAttempts) {
    const checkResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/' + uploadResult.file.name + '?key=' + GEMINI_API_KEY
    )

    if (checkResponse.ok) {
      const fileStatus = await checkResponse.json()
      console.log('Status do arquivo:', fileStatus.state, '- Tentativa', attempts + 1)

      if (fileStatus.state === 'ACTIVE') {
        fileReady = true
        console.log('Arquivo pronto para processamento!')
      } else if (fileStatus.state === 'FAILED') {
        throw new Error('Processamento do arquivo falhou no Gemini')
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000))
        attempts++
      }
    } else {
      console.log('Erro ao verificar status, tentando novamente...')
      attempts++
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  if (!fileReady) {
    throw new Error('Timeout aguardando processamento do arquivo (60s)')
  }

  // Passo 4: Chamar generateContent com a referencia do arquivo
  console.log('Chamando Gemini para extrair texto...')

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
            { text: prompt }
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
    console.error('Generate error:', JSON.stringify(error, null, 2))
    throw new Error(error.error?.message || 'Erro ao extrair texto')
  }

  const data = await generateResponse.json()
  const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  console.log('Texto extraido via File API:', extractedText.substring(0, 200) + '...')

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
