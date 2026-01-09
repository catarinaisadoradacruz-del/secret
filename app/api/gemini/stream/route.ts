import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY
const GEMINI_STREAM_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent'

const SYSTEM_PROMPT = `# PCGO - Assistente Investigativo Unificado

Voce e o assistente investigativo da Policia Civil do Estado de Goias (PCGO). Sua funcao e auxiliar investigadores com analise de documentos, geracao de relatorios e pecas investigativas.

## CAPACIDADES
- Analise de RAI (Registro de Atendimento Integrado)
- Elaboracao de Relato PC
- Geracao de RELINT
- Representacoes (Interceptacao, Busca, Preventiva)
- Analise 5W2H
- OCR de imagens e documentos

## REGRAS
- NUNCA inventar dados
- Usar "NAO INFORMADO" para dados ausentes
- Nomes SEMPRE em MAIUSCULAS
- Linguagem tecnica formal
- Datas no formato DD/MM/AAAA

Responda de forma clara e estruturada, usando markdown quando apropriado.`

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return new Response(JSON.stringify({ error: 'Nao autenticado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const body = await request.json()
    const { prompt, type, context, sessionId, history } = body

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt obrigatorio' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Construir mensagens
    const messages: Array<{ role: string; parts: { text: string }[] }> = [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
      { role: 'model', parts: [{ text: 'Entendido. Sou o Assistente Investigativo da PCGO. Como posso ajudar?' }] }
    ]

    // Adicionar historico
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        })
      }
    }

    // Construir prompt baseado no tipo
    let fullPrompt = prompt

    if (type === 'analisar_rai') {
      fullPrompt = `TAREFA: Analise o seguinte RAI e extraia todos os dados estruturados.\n\nRAI:\n${prompt}`
    } else if (type === 'relato_pc') {
      fullPrompt = `TAREFA: Elabore um Relato PC tecnico e formal.\n\nDADOS:\n${prompt}`
    } else if (type === 'gerar_documento') {
      const docType = context?.tipo || 'RELINT'
      fullPrompt = `TAREFA: Gere um documento ${docType} completo.\n\nDADOS:\n${prompt}`
    } else if (type === '5w2h') {
      fullPrompt = `TAREFA: Aplique a metodologia 5W2H.\n\nCASO:\n${prompt}`
    } else if (type === 'continue_document') {
      const docAtual = context?.documentoAtual || ''
      fullPrompt = `DOCUMENTO ATUAL:\n${docAtual}\n\nINSTRUCAO:\n${prompt}\n\nRetorne o documento completo atualizado.`
    }

    // Adicionar contexto de anexos
    if (context?.anexos && context.anexos.length > 0) {
      fullPrompt += '\n\n--- ARQUIVOS ANEXADOS ---\n'
      for (const anexo of context.anexos) {
        if (anexo.conteudo) {
          fullPrompt += `\n[${anexo.nome}]:\n${anexo.conteudo}\n`
        }
      }
    }

    messages.push({ role: 'user', parts: [{ text: fullPrompt }] })

    // Fazer request com streaming
    const response = await fetch(`${GEMINI_STREAM_URL}?key=${GEMINI_API_KEY}&alt=sse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: messages,
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 16384,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
        ]
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Gemini Stream Error:', errorData)
      return new Response(JSON.stringify({ error: 'Erro ao chamar API' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Criar um TransformStream para processar os dados SSE
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    let fullResponse = ''

    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const text = decoder.decode(chunk)
        const lines = text.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6)
              if (jsonStr.trim() === '[DONE]') continue

              const data = JSON.parse(jsonStr)
              const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

              if (content) {
                fullResponse += content
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: content })}\n\n`))
              }
            } catch (e) {
              // Ignorar erros de parse
            }
          }
        }
      },
      async flush(controller) {
        // Salvar no banco quando terminar
        if (sessionId && fullResponse) {
          try {
            await supabase.from('chat_messages').insert({
              session_id: sessionId,
              role: 'user',
              content: prompt,
              tipo_acao: type
            })

            await supabase.from('chat_messages').insert({
              session_id: sessionId,
              role: 'assistant',
              content: fullResponse,
              tipo_acao: type
            })

            await supabase.from('chat_sessions')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', sessionId)
          } catch (e) {
            console.error('Erro ao salvar:', e)
          }
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, fullText: fullResponse })}\n\n`))
      }
    })

    // Pipe o response do Gemini atraves do transform
    const readable = response.body?.pipeThrough(transformStream)

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Stream Error:', error)
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
