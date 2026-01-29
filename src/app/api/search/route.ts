// API de pesquisa usando Serper
// Versão: 29-01-2026

import { NextResponse } from 'next/server'

const SERPER_API_KEY = '2d09dbaf10aadee46c34bfa7bc41f507d75d707a'

export async function POST(request: Request) {
  try {
    const { query } = await request.json()
    
    if (!query) {
      return NextResponse.json({ error: 'Query é obrigatória' }, { status: 400 })
    }

    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: query,
        gl: 'br',
        hl: 'pt-br',
        num: 10
      })
    })

    if (!response.ok) {
      console.error('Serper API error:', response.status, await response.text())
      return NextResponse.json({ 
        error: 'Erro na pesquisa',
        results: [] 
      }, { status: response.status })
    }

    const data = await response.json()
    
    // Formatar resultados
    const results = []
    
    // Resultados orgânicos
    if (data.organic && data.organic.length > 0) {
      for (const item of data.organic) {
        results.push({
          title: item.title,
          snippet: item.snippet,
          link: item.link,
          imageUrl: item.thumbnailUrl || item.imageUrl || null,
          date: item.date || null,
          position: item.position
        })
      }
    }

    // Knowledge Graph (se disponível)
    if (data.knowledgeGraph) {
      const kg = data.knowledgeGraph
      if (kg.title && kg.description) {
        results.unshift({
          title: kg.title,
          snippet: kg.description,
          link: kg.website || kg.descriptionLink || '#',
          imageUrl: kg.imageUrl || null,
          date: null,
          isKnowledgeGraph: true
        })
      }
    }

    // Perguntas relacionadas
    const relatedQuestions = data.peopleAlsoAsk?.map((item: any) => ({
      question: item.question,
      answer: item.snippet,
      link: item.link
    })) || []

    return NextResponse.json({
      results,
      relatedQuestions,
      searchParameters: {
        query,
        location: 'Brazil',
        language: 'Portuguese'
      }
    })

  } catch (error) {
    console.error('Erro no search:', error)
    return NextResponse.json({ 
      error: 'Erro interno',
      results: [] 
    }, { status: 500 })
  }
}

// GET para teste
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'API de pesquisa VitaFit',
    usage: 'POST { query: "sua pesquisa" }'
  })
}
