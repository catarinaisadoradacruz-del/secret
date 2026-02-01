import { NextResponse } from 'next/server'

export async function GET() {
  const envCheck = {
    GROQ_API_KEY: process.env.GROQ_API_KEY ? `${process.env.GROQ_API_KEY.substring(0, 10)}...` : 'NOT SET',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? `${process.env.GEMINI_API_KEY.substring(0, 10)}...` : 'NOT SET',
    HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY ? `${process.env.HUGGINGFACE_API_KEY.substring(0, 10)}...` : 'NOT SET',
  }
  
  // Teste rápido do Groq
  let groqStatus = 'NOT TESTED'
  const groqKey = process.env.GROQ_API_KEY
  if (groqKey) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: 'Diga oi' }],
          max_tokens: 20
        })
      })
      if (res.ok) {
        const data = await res.json()
        groqStatus = `OK - ${data.choices?.[0]?.message?.content || 'empty'}`
      } else {
        const err = await res.text()
        groqStatus = `ERROR ${res.status}: ${err.substring(0, 200)}`
      }
    } catch (e: unknown) {
      const error = e as Error
      groqStatus = `EXCEPTION: ${error.message}`
    }
  }

  return NextResponse.json({ envCheck, groqStatus })
}
