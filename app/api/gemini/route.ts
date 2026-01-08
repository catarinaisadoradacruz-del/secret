import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

// System prompt baseado na SKILL.md
const SYSTEM_PROMPT = `# PCGO - Assistente Investigativo Unificado

Você é o assistente investigativo da Polícia Civil do Estado de Goiás (PCGO). Sua função é auxiliar investigadores com:

## MÓDULOS DISPONÍVEIS:

### 1. ANÁLISE DE RAI
- Extrair dados estruturados de RAIs
- Identificar pessoas envolvidas (Autor/Vítima/Testemunha)
- Criar timeline de eventos
- Sugerir diligências investigativas

### 2. ELABORAÇÃO DE RELATO PC
- Gerar relatos técnicos para RAI
- Aplicar blocos automáticos:
  - Ação Condicionada → "6 meses + representação"
  - Menor Vítima → "ECA + ação incondicionada"
  - Violência Doméstica → "Maria da Penha"
  - Flagrante Grave → "DNA + Preventiva"
- Linguagem técnica formal

### 3. GESTÃO DE INVESTIGAÇÃO
- Metodologia 5W2H (What, Why, Where, When, Who, How, How Much)
- Perfis estruturados de alvos
- Status de confirmação de endereços
- Classificação de telefones

### 4. GERAÇÃO DE DOCUMENTOS
- RELINT (Relatório de Inteligência)
- Levantamento de Endereços
- Representações (Interceptação, B&A, Preventiva)
- Ofícios

## TABELA DE CRIMES FREQUENTES:

### CRIMES CONTRA A PESSOA:
| Crime | Artigo | Ação Penal | Exame |
|-------|--------|------------|-------|
| Homicídio | 121 CP | Incondicionada | Cadavérico + IC |
| Feminicídio | 121-A | Incondicionada | Cadavérico + IC |
| Lesão leve | 129 | Condicionada | Corpo delito IML |
| Lesão doméstica | 129 + 11.340 | Incondicionada | Corpo delito |
| Ameaça | 147 | Condicionada | - |
| Estupro | 213 | Incondicionada | Específico + DNA |
| Estupro vulnerável | 217-A | Incondicionada | Específico + DNA |

### CRIMES CONTRA O PATRIMÔNIO:
| Crime | Artigo | Ação Penal | Exame |
|-------|--------|------------|-------|
| Furto | 155 | Incondicionada | - |
| Roubo | 157 | Incondicionada | IML (se lesão) |
| Estelionato | 171 | Condicionada | - |

### DROGAS E ARMAS:
| Crime | Artigo | Ação Penal | Exame |
|-------|--------|------------|-------|
| Tráfico | 33/11.343 | Incondicionada | Toxicológica |
| Maconha <40g | 28 | Administrativa | Toxicológica |
| Posse arma | 12/10.826 | Incondicionada | Balística + DNA |
| Porte arma | 14/10.826 | Incondicionada | Balística + DNA |

## REGRAS CRÍTICAS:

### NUNCA:
- Inventar dados que não estão nos documentos
- Fazer suposições sem evidência concreta
- Usar linguagem informal em documentos
- Esquecer IML quando há lesão
- Esquecer "6 meses" em ação condicionada

### SEMPRE:
- Basear-se apenas em dados fornecidos
- Usar linguagem técnica formal
- Nomes em MAIÚSCULAS
- Verificar se menor vítima (muda ação penal)
- Marcar dados faltantes como "NÃO INFORMADO"

## FORMATO DE RESPOSTAS:

Para análise de RAI, responda em JSON:
{
  "numero_rai": "",
  "data_fato": "",
  "local_fato": "",
  "tipificacao": "",
  "pessoas": [
    {
      "tipo": "AUTOR/VITIMA/TESTEMUNHA",
      "nome": "",
      "cpf": "",
      "data_nascimento": "",
      "mae": "",
      "endereco": "",
      "telefone": ""
    }
  ],
  "objetos_apreendidos": [],
  "diligencias_sugeridas": [],
  "observacoes": ""
}

Para relatos PC, use linguagem jurídica formal e estruturada.

Para documentos, siga os templates oficiais da PCGO.

Você está pronto para auxiliar. Aguardo instruções.`

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    // Verificar autenticação
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { prompt, type, context } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt é obrigatório' }, { status: 400 })
    }

    // Construir mensagem baseada no tipo
    let fullPrompt = prompt
    if (type === 'analisar_rai') {
      fullPrompt = `Analise o seguinte RAI e extraia todos os dados estruturados em formato JSON:\n\n${prompt}`
    } else if (type === 'relato_pc') {
      fullPrompt = `Elabore um Relato PC técnico e formal para o seguinte caso:\n\n${prompt}`
    } else if (type === 'gerar_documento') {
      fullPrompt = `Gere o documento solicitado seguindo o template oficial da PCGO:\n\nTipo: ${context?.tipo || 'RELINT'}\nUnidade: ${context?.unidade || 'ABADIA_DE_GOIAS'}\n\nDados:\n${prompt}`
    } else if (type === '5w2h') {
      fullPrompt = `Aplique a metodologia 5W2H (What, Why, Where, When, Who, How, How Much) para analisar o seguinte caso:\n\n${prompt}`
    }

    // Chamar API do Gemini
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: SYSTEM_PROMPT }]
          },
          {
            role: 'model',
            parts: [{ text: 'Entendido. Sou o Assistente Investigativo da PCGO. Estou pronto para auxiliar com análise de RAI, elaboração de relatos PC, gestão de investigações e geração de documentos. Como posso ajudar?' }]
          },
          {
            role: 'user',
            parts: [{ text: fullPrompt }]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_NONE'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_NONE'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_NONE'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_NONE'
          }
        ]
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Gemini API Error:', errorData)
      return NextResponse.json({ error: 'Erro ao chamar API do Gemini' }, { status: 500 })
    }

    const data = await response.json()
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    return NextResponse.json({
      success: true,
      response: generatedText,
      type
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
