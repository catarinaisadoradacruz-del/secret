import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!)

export const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
export const geminiVision = genAI.getGenerativeModel({ model: 'gemini-pro-vision' })

export async function extractRAIData(text: string) {
  const prompt = `Você é um assistente especializado em análise de RAI (Registro de Atendimento Integrado) da Polícia Civil de Goiás.

Analise o texto do RAI abaixo e extraia as seguintes informações de forma OBJETIVA e FACTUAL. NUNCA invente, suponha ou deduza dados que não estão explicitamente no texto.

REGRAS CRÍTICAS:
❌ NÃO invente dados ausentes
❌ NÃO faça suposições sobre relacionamentos
❌ NÃO deduza informações implícitas
✅ Extraia APENAS dados explícitos
✅ Use "Não informado" quando dados estiverem ausentes

Retorne um JSON com a seguinte estrutura:

{
  "numero_rai": "string",
  "data_ocorrencia": "YYYY-MM-DD",
  "local_fatos": "string",
  "vitima": {
    "nome": "string",
    "cpf": "string",
    "telefone": "string",
    "endereco": "string"
  },
  "autor": {
    "nome": "string",
    "cpf": "string",
    "caracteristicas": "string"
  },
  "narrativa_fatos": "string",
  "tipo_crime": "string",
  "objetos": ["string"],
  "testemunhas": [{"nome": "string", "contato": "string"}]
}

Texto do RAI:
${text}

Retorne APENAS o JSON, sem comentários ou explicações.`

  const result = await geminiModel.generateContent(prompt)
  const response = await result.response
  const jsonText = response.text()
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim()

  return JSON.parse(jsonText)
}

export async function analyzeForensicImage(imageData: string, mimeType: string) {
  const prompt = `Analise esta imagem forense e forneça:

1. Descrição geral da imagem
2. Elementos relevantes para investigação (pessoas, objetos, locais, veículos)
3. Características identificáveis (placas, rostos, marcas)
4. Possíveis evidências visuais
5. Qualidade da imagem e visibilidade

Seja objetivo e factual. NÃO faça suposições sem fundamento.

Retorne um JSON com:
{
  "descricao_geral": "string",
  "elementos_relevantes": ["string"],
  "caracteristicas_identificaveis": ["string"],
  "evidencias": ["string"],
  "qualidade_imagem": "string"
}`

  const result = await geminiVision.generateContent([
    prompt,
    {
      inlineData: {
        data: imageData.split(',')[1],
        mimeType
      }
    }
  ])

  const response = await result.response
  const jsonText = response.text()
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim()

  return JSON.parse(jsonText)
}
