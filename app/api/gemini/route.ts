import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { IP_PASSIVO_PROMPT, CHECKLIST_DILIGENCIAS, TIPIFICACOES_HOMICIDIO } from '@/lib/prompts/ip-passivo'

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
const GEMINI_VISION_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

// System prompt completo baseado nas Skills da PCGO
const SYSTEM_PROMPT = `# PCGO - Assistente Investigativo Unificado

Voce e o assistente investigativo da Policia Civil do Estado de Goias (PCGO). Sua funcao e auxiliar investigadores com analise de documentos, geracao de relatorios e pecas investigativas.

## MODULOS DISPONIVEIS

### 1. ANALISE DE RAI
- Extrair dados estruturados de RAIs (Registro de Atendimento Integrado)
- Identificar pessoas envolvidas (Autor/Vitima/Testemunha)
- Criar timeline de eventos
- Sugerir diligencias investigativas
- NUNCA inventar dados - use "NAO INFORMADO" quando ausente

### 2. ELABORACAO DE RELATO PC
Gerar relatos tecnicos para RAI aplicando blocos automaticos:

**BLOCO ACAO CONDICIONADA:**
"Destarte, considerando que o crime em tela trata-se de acao penal publica CONDICIONADA a representacao, encaminho os autos a Vara Criminal competente, APRAZANDO ao ofendido o prazo de 6 (seis) meses para manifestar interesse em representar, conforme Art. 38 do CPP."

**BLOCO MENOR VITIMA:**
"Considerando que a vitima e MENOR DE IDADE, aplica-se o disposto no Estatuto da Crianca e do Adolescente (Lei 8.069/90), sendo a acao penal publica INCONDICIONADA, independente de representacao."

**BLOCO VIOLENCIA DOMESTICA (Maria da Penha):**
"Trata-se de fato tipico da Lei 11.340/06 (Maria da Penha), em que pese existir relacao domestica/familiar entre autor e vitima. A acao penal e publica INCONDICIONADA. Medidas protetivas de urgencia devem ser consideradas."

**BLOCO FLAGRANTE GRAVE:**
"Considerando a gravidade do delito e a situacao de flagrancia, requer-se a conversao em prisao preventiva, bem como requisicao de exame de corpo de delito e coleta de material genetico para DNA."

### 3. TABELA DE CRIMES FREQUENTES

| Crime | Artigo | Acao Penal | Exame |
|-------|--------|------------|-------|
| Homicidio | 121 CP | Incondicionada | Cadaverico + IC |
| Feminicidio | 121-A CP | Incondicionada | Cadaverico + IC |
| Lesao leve | 129 CP | Condicionada | Corpo delito IML |
| Lesao domestica | 129 + 11.340 | Incondicionada | Corpo delito |
| Ameaca | 147 CP | Condicionada | - |
| Estupro | 213 CP | Incondicionada | Especifico + DNA |
| Estupro vulneravel | 217-A CP | Incondicionada | Especifico + DNA |
| Furto | 155 CP | Incondicionada | - |
| Roubo | 157 CP | Incondicionada | IML (se lesao) |
| Estelionato | 171 CP | Condicionada | - |
| Trafico | 33/11.343 | Incondicionada | Toxicologica |
| Posse arma | 12/10.826 | Incondicionada | Balistica + DNA |
| Porte arma | 14/10.826 | Incondicionada | Balistica + DNA |

### 4. TEMPLATES DE DOCUMENTOS

#### RELINT (Relatorio de Inteligencia)
\`\`\`
[CABECALHO DA UNIDADE]

RELATORIO DE INTELIGENCIA N. [NUMERO]/[ANO]

PROCEDIMENTO: [NUMERO DO IP/PI/TC]
TIPIFICACAO: [CRIME]
DATA DO FATO: [DATA]

1. SINTESE
[Resumo objetivo do fato investigado]

2. METODOLOGIA
[Tecnicas empregadas: OSINT, analise telefonica, etc.]

3. ALVOS IDENTIFICADOS

3.1 [NOME DO ALVO] - [CPF]
- Qualificacao: [dados pessoais]
- Telefones: [lista com classificacao A/B/C]
- Enderecos: [lista com status CONFIRMADO/NAO CONFIRMADO]
- Passagens: [antecedentes]
- Vinculos: [relacoes com outros alvos]

4. ANALISE TEMPORAL
[Timeline dos eventos]

5. ANALISE GEOGRAFICA
[Enderecos relevantes e movimentacao]

6. CONCLUSAO
[Sintese das evidencias e proximos passos]

[RODAPE DA UNIDADE]
\`\`\`

#### REPRESENTACAO - INTERCEPTACAO TELEFONICA
\`\`\`
[CABECALHO]

EXCELENTISSIMO SENHOR DOUTOR JUIZ DE DIREITO DA [VARA] DE [COMARCA]

A POLICIA CIVIL DO ESTADO DE GOIAS, atraves da [UNIDADE], nos autos do [PROCEDIMENTO], vem respeitosamente a presenca de Vossa Excelencia REPRESENTAR pela INTERCEPTACAO DAS COMUNICACOES TELEFONICAS, com fulcro na Lei 9.296/96, pelos fatos e fundamentos a seguir expostos:

I - DOS FATOS
[Narrativa dos fatos investigados]

II - DOS ALVOS E TERMINAIS
[Lista de alvos com telefones a interceptar]

III - DA NECESSIDADE E ADEQUACAO
A medida e imprescindivel para:
- Identificar a estrutura criminosa
- Localizar autores/participes
- Obter provas da materialidade
- Desarticular a organizacao

IV - DO PRAZO
Requer-se o prazo de 15 (quinze) dias, prorrogavel.

V - DO PEDIDO
Ante o exposto, requer:
a) Autorizacao para interceptacao telefonica dos terminais listados;
b) Quebra de sigilo telefonico (retroativo);
c) Expedição de oficio as operadoras.

Termos em que pede deferimento.
[LOCAL], [DATA]

[DELEGADO]
\`\`\`

#### REPRESENTACAO - BUSCA E APREENSAO
\`\`\`
[CABECALHO]

EXCELENTISSIMO SENHOR DOUTOR JUIZ DE DIREITO...

REPRESENTACAO POR MANDADO DE BUSCA E APREENSAO

I - DOS FATOS
[Narrativa]

II - DO LOCAL
Endereco: [ENDERECO COMPLETO]
Coordenadas: [LAT/LONG se disponivel]
Descricao: [caracteristicas do imovel]

III - DO MORADOR/INVESTIGADO
[NOME] - [CPF]
[Qualificacao e vinculos com o crime]

IV - DOS OBJETOS A APREENDER
- Armas de fogo e municoes
- Aparelhos celulares
- Computadores e midias
- Documentos
- Veiculos [se aplicavel]
- Drogas [se aplicavel]
- Valores em especie

V - DA NECESSIDADE
[Fundamentacao]

VI - DO PEDIDO
Requer a expedicao de mandado de busca e apreensao domiciliar.

[LOCAL], [DATA]
[DELEGADO]
\`\`\`

### 5. METODOLOGIA 5W2H

Para cada investigacao, analisar:
- **WHAT (O QUE)**: Qual o crime/fato?
- **WHY (POR QUE)**: Qual a motivacao?
- **WHERE (ONDE)**: Local do fato e enderecos relacionados
- **WHEN (QUANDO)**: Data, hora e timeline
- **WHO (QUEM)**: Autores, vitimas, testemunhas
- **HOW (COMO)**: Modus operandi
- **HOW MUCH (QUANTO)**: Prejuizo, quantidade de drogas/armas

### 6. ANALISE DE IMAGENS (OCR)
Quando receber imagens, voce deve:
- Extrair TODO o texto visivel
- Identificar documentos (RG, CPF, CNH, etc.)
- Transcrever tabelas mantendo a estrutura
- Identificar rostos e descreve-los
- Ler placas de veiculos
- Identificar locais/enderecos visiveis

### 7. MODULO IP PASSIVO (INQUERITO POLICIAL PASSIVO)

#### CONCEITO FUNDAMENTAL
- RELATORIO = MODELO FIXO (template que nao muda)
- IP = PARAMETRO (dados variaveis que preenchem o modelo)
- O sistema NAO CRIA conteudo - apenas extrai dados do IP e preenche o modelo

#### COMANDOS DISPONIVEIS
- /ANALISAR IP - Analisa o inquerito policial e extrai todos os dados variaveis
- /GERAR RELATORIO - Preenche o modelo com os dados extraidos
- /LISTAR PENDENCIAS - Lista diligencias pendentes identificadas
- /STATUS - Mostra dados ja extraidos

#### DADOS A EXTRAIR DO IP
1. DADOS BASICOS: Numero do IP, Delegacia, Data Instauracao, RAI origem, Tipificacao
2. DADOS DO FATO: Data, Local completo, Narrativa PM, Narrativa PC
3. VITIMA: Nome, Sexo, Nascimento, Filiacao, RG, CPF, Endereco, Telefone
4. INVESTIGADO(S): Status (IDENTIFICADO/NAO IDENTIFICADO), Qualificacao ou Alcunhas
5. TESTEMUNHAS: Nome, Qualificacao, Contato, Status (OUVIDA/NAO OUVIDA)
6. LAUDOS/DOCUMENTOS: Tipo, Numero, Status (JUNTADO/PENDENTE)

#### ESTRUTURA DO RELATORIO IP PASSIVO
1. DO OBJETO DO RELATORIO
2. DOS FATOS
3. DAS DILIGENCIAS PRELIMINARES
4. DAS DILIGENCIAS POSTERIORES (se houver)
5. CONCLUSAO

## REGRAS CRITICAS

### PROIBIDO:
- Inventar dados que nao estao nos documentos
- Fazer suposicoes sem evidencia
- Usar linguagem informal em documentos
- Esquecer IML quando ha lesao
- Esquecer prazo de 6 meses em acao condicionada

### OBRIGATORIO:
- Basear-se APENAS em dados fornecidos
- Usar linguagem tecnica formal
- Nomes SEMPRE em MAIUSCULAS
- Verificar se vitima e menor (muda acao penal)
- Marcar dados faltantes como "NAO INFORMADO"
- Datas no formato DD/MM/AAAA

## FORMATO DE RESPOSTAS

Para ANALISE DE RAI, responda em JSON:
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

Para DOCUMENTOS, siga os templates fornecidos mantendo a estrutura oficial.

Para RELATOS PC, use linguagem juridica formal e estruturada.

Voce esta pronto para auxiliar. Aguardo instrucoes.`

// Tipos de chat
const CHAT_TYPES = {
  'general': 'Assistente geral investigativo',
  'rai': 'Analise de RAI',
  'relato': 'Elaboracao de Relato PC',
  'relint': 'Geracao de RELINT',
  'representacao': 'Geracao de Representacao',
  '5w2h': 'Analise 5W2H',
  'ocr': 'Extracao de texto de imagem',
  'pdf_extract': 'Extracao de texto de PDF',
  'ip_passivo_analisar': 'Analise de IP Passivo',
  'ip_passivo_relatorio': 'Geracao de Relatorio IP Passivo',
  'ip_passivo_pendencias': 'Listagem de Pendencias IP'
}

// Log para evitar warning de variavel nao usada
console.debug('Chat types disponíveis:', Object.keys(CHAT_TYPES).length)

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    // Verificar autenticacao
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { prompt, type, context, sessionId, history, imageData, fileData } = body

    if (!prompt && !imageData && !fileData) {
      return NextResponse.json({ error: 'Prompt, imagem ou arquivo e obrigatorio' }, { status: 400 })
    }

    // ============================================
    // PROCESSAMENTO DE OCR (IMAGENS)
    // ============================================
    if (type === 'ocr' && imageData) {
      const ocrPrompt = prompt || 'Extraia todo o texto visivel nesta imagem. Se houver documentos, transcreva completamente. Se houver tabelas, formate-as.'

      const visionRequest = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: imageData.mimeType,
                  data: imageData.data
                }
              },
              {
                text: `INSTRUCOES DE OCR PCGO:
${ocrPrompt}

REGRAS:
1. Extraia TODO o texto visivel, mesmo pequeno
2. Mantenha a estrutura original (paragrafos, listas)
3. Identifique tipo de documento (RG, CPF, CNH, BO, etc.)
4. Se houver tabelas, formate com | para colunas
5. Nomes de pessoas em MAIUSCULAS
6. Numeros de documentos exatamente como aparecem
7. Se nao conseguir ler algo, indique [ILEGIVEL]`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      }

      const response = await fetch(`${GEMINI_VISION_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(visionRequest)
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Gemini Vision Error:', errorData)
        return NextResponse.json({ error: 'Erro ao processar imagem' }, { status: 500 })
      }

      const data = await response.json()
      const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

      return NextResponse.json({
        success: true,
        response: extractedText,
        type: 'ocr'
      })
    }

    // ============================================
    // PROCESSAMENTO DE PDF
    // ============================================
    if (type === 'pdf_extract' && fileData) {
      // Para PDFs, usamos a capacidade de vision do Gemini
      const pdfPrompt = prompt || 'Extraia todo o texto deste documento PDF.'

      const pdfRequest = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: fileData.mimeType,
                  data: fileData.data
                }
              },
              {
                text: `INSTRUCOES DE EXTRACAO DE PDF:
${pdfPrompt}

REGRAS:
1. Extraia TODO o texto do documento
2. Mantenha a estrutura (titulos, paragrafos, listas)
3. Se houver tabelas, formate adequadamente
4. Nomes de pessoas em MAIUSCULAS
5. Preserve numeros e datas exatamente como aparecem`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 16384,
        }
      }

      const response = await fetch(`${GEMINI_VISION_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pdfRequest)
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Gemini PDF Error:', errorData)
        return NextResponse.json({ error: 'Erro ao processar PDF' }, { status: 500 })
      }

      const data = await response.json()
      const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

      return NextResponse.json({
        success: true,
        response: extractedText,
        type: 'pdf_extract'
      })
    }

    // ============================================
    // CHAT NORMAL / GERACAO DE DOCUMENTOS
    // ============================================

    // Construir mensagens do chat
    const messages: Array<{ role: string; parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> }> = [
      {
        role: 'user',
        parts: [{ text: SYSTEM_PROMPT }]
      },
      {
        role: 'model',
        parts: [{ text: 'Entendido. Sou o Assistente Investigativo da PCGO. Estou pronto para auxiliar com analise de RAI, elaboracao de relatos PC, gestao de investigacoes, geracao de RELINT, representacoes e outros documentos. Posso tambem analisar imagens e extrair texto via OCR. Como posso ajudar?' }]
      }
    ]

    // Adicionar historico de conversa se existir
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
      fullPrompt = `TAREFA: Analise o seguinte RAI e extraia todos os dados estruturados.

INSTRUCOES:
1. Extraia APENAS dados explicitos no documento
2. Use "NAO INFORMADO" para dados ausentes
3. Retorne em formato JSON valido
4. Identifique TODOS os envolvidos (autor, vitima, testemunha)
5. Liste objetos apreendidos
6. Sugira diligencias baseadas no tipo criminal

RAI PARA ANALISE:
${prompt}`
    } else if (type === 'relato_pc') {
      fullPrompt = `TAREFA: Elabore um Relato PC tecnico e formal.

INSTRUCOES:
1. Use linguagem juridica formal
2. Aplique os blocos automaticos conforme o caso
3. Verifique se vitima e menor de idade
4. Verifique se e violencia domestica
5. Indique a acao penal correta
6. Solicite exames periciais adequados

DADOS DO CASO:
${prompt}`
    } else if (type === 'gerar_documento') {
      const docType = context?.tipo || 'RELINT'
      const unidade = context?.unidade || 'DIH'

      fullPrompt = `TAREFA: Gere um documento ${docType} completo.

UNIDADE EMISSORA: ${unidade}
TIPO DE DOCUMENTO: ${docType}

INSTRUCOES:
1. Siga o template oficial do tipo ${docType}
2. Preencha todos os campos com os dados fornecidos
3. Use "NAO INFORMADO" para dados ausentes
4. Mantenha a formatacao oficial PCGO
5. Inclua cabecalho e rodape da unidade

DADOS PARA O DOCUMENTO:
${prompt}`
    } else if (type === '5w2h') {
      fullPrompt = `TAREFA: Aplique a metodologia 5W2H para analisar o caso.

INSTRUCOES:
Analise sistematicamente:
- WHAT (O QUE): Qual o crime/fato investigado?
- WHY (POR QUE): Qual a possivel motivacao?
- WHERE (ONDE): Onde ocorreu? Enderecos relacionados?
- WHEN (QUANDO): Data, hora e timeline dos eventos?
- WHO (QUEM): Quem sao autores, vitimas, testemunhas?
- HOW (COMO): Como foi executado (modus operandi)?
- HOW MUCH (QUANTO): Qual o prejuizo ou quantidade envolvida?

CASO PARA ANALISE:
${prompt}`
    } else if (type === 'representacao_interceptacao') {
      fullPrompt = `TAREFA: Gere uma Representacao por Interceptacao Telefonica.

INSTRUCOES:
1. Siga o modelo oficial
2. Fundamente juridicamente (Lei 9.296/96)
3. Demonstre a necessidade e adequacao
4. Liste os terminais a interceptar
5. Sugira prazo de 15 dias

DADOS:
${prompt}`
    } else if (type === 'representacao_busca') {
      fullPrompt = `TAREFA: Gere uma Representacao por Busca e Apreensao.

INSTRUCOES:
1. Siga o modelo oficial
2. Descreva detalhadamente o local
3. Identifique o morador/investigado
4. Liste os objetos a apreender
5. Fundamente a necessidade

DADOS:
${prompt}`
    } else if (type === 'ip_passivo_analisar' || prompt.toLowerCase().includes('/analisar ip')) {
      // Analise de Inquerito Policial Passivo
      fullPrompt = `${IP_PASSIVO_PROMPT}

${CHECKLIST_DILIGENCIAS}

${TIPIFICACOES_HOMICIDIO}

TAREFA: Analise o Inquerito Policial fornecido e extraia TODOS os dados conforme o formato especificado.

INSTRUCOES:
1. Identifique o numero do IP, delegacia e data de instauracao
2. Extraia dados completos da vitima
3. Identifique status dos investigados
4. Liste TODAS as testemunhas e seu status (ouvida/nao ouvida)
5. Liste TODOS os laudos/documentos e seu status (juntado/pendente)
6. Identifique pendencias automaticamente
7. Use o formato de saida padrao da skill

INQUERITO PARA ANALISE:
${prompt}`
    } else if (type === 'ip_passivo_relatorio' || prompt.toLowerCase().includes('/gerar relatorio')) {
      // Geracao de Relatorio de IP Passivo
      const unidade = context?.unidade || 'DIH'
      const diligenciasPosteriores = context?.diligenciasPosteriores || []

      fullPrompt = `${IP_PASSIVO_PROMPT}

TAREFA: Gere o RELATORIO FINAL do Inquerito Policial Passivo.

UNIDADE EMISSORA: ${unidade}
DILIGENCIAS POSTERIORES INFORMADAS: ${diligenciasPosteriores.length > 0 ? diligenciasPosteriores.join(', ') : 'Nenhuma'}

INSTRUCOES:
1. Use os dados ja extraidos da analise anterior
2. Siga a estrutura oficial do relatorio:
   - DO OBJETO DO RELATORIO
   - DOS FATOS
   - DAS DILIGENCIAS PRELIMINARES
   - DAS DILIGENCIAS POSTERIORES (se houver)
   - CONCLUSAO
3. Use linguagem juridica formal
4. Nomes em MAIUSCULAS
5. Numeros de documentos em negrito
6. NAO invente dados - use "NAO INFORMADO" quando ausente

DADOS DO IP:
${prompt}`
    } else if (type === 'ip_passivo_pendencias' || prompt.toLowerCase().includes('/listar pendencias')) {
      // Listagem de pendencias do IP
      fullPrompt = `${CHECKLIST_DILIGENCIAS}

TAREFA: Liste TODAS as pendencias identificadas no Inquerito Policial.

CATEGORIAS DE PENDENCIAS:
1. Testemunhas NAO ouvidas
2. Laudos/documentos pendentes
3. Consultas em sistemas nao realizadas
4. Diligencias de campo pendentes
5. Analises tecnicas pendentes

Para cada pendencia, indique:
- Tipo da pendencia
- Descricao
- Prioridade (ALTA/MEDIA/BAIXA)
- Sugestao de acao

DADOS DO IP:
${prompt}`
    } else if (type === 'continue_document') {
      // Para continuacao de documentos em construcao
      const docEmConstrucao = context?.documentoAtual || ''
      fullPrompt = `TAREFA: Continue a construcao do documento.

DOCUMENTO ATUAL:
${docEmConstrucao}

INSTRUCAO DO USUARIO:
${prompt}

INSTRUCOES:
1. Mantenha a formatacao e estrutura existente
2. Adicione/modifique conforme solicitado
3. Retorne o documento completo atualizado`
    }

    // Verificar se ha anexos no contexto
    let hasBase64Files = false
    const base64Files: Array<{ mimeType: string; data: string; name: string }> = []

    if (context?.anexos && context.anexos.length > 0) {
      fullPrompt += '\n\n--- ARQUIVOS ANEXADOS ---\n'
      for (const anexo of context.anexos) {
        if (anexo.conteudo) {
          // Verificar se e base64 (formato: [BASE64:mime:data])
          const base64Match = anexo.conteudo.match(/^\[BASE64:([^:]+):(.+)\]$/)
          if (base64Match) {
            hasBase64Files = true
            base64Files.push({
              mimeType: base64Match[1],
              data: base64Match[2],
              name: anexo.nome
            })
            fullPrompt += `\n[${anexo.nome}]: Arquivo binario anexado para processamento\n`
          } else {
            fullPrompt += `\n[${anexo.nome} (${anexo.tipo})]:\n${anexo.conteudo}\n`
          }
        }
      }
      fullPrompt += '\n--- FIM DOS ANEXOS ---'
    }

    // Construir parts da mensagem
    const userParts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = []

    // Se tem arquivos base64, adicionar como inlineData primeiro
    if (hasBase64Files) {
      for (const file of base64Files) {
        userParts.push({
          inlineData: {
            mimeType: file.mimeType,
            data: file.data
          }
        })
      }
      // Adicionar instrucao para processar os arquivos
      fullPrompt = `IMPORTANTE: Voce recebeu ${base64Files.length} arquivo(s) anexado(s). Extraia e analise TODO o conteudo dos arquivos.\n\n` + fullPrompt
    }

    // Adicionar o texto do prompt
    userParts.push({ text: fullPrompt })

    // Adicionar a nova mensagem do usuario
    messages.push({
      role: 'user',
      parts: userParts
    })

    // Chamar API do Gemini
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: messages,
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 16384, // Aumentado para documentos completos
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
      console.error('Gemini API Error:', errorData)
      return NextResponse.json({ error: 'Erro ao chamar API do Gemini' }, { status: 500 })
    }

    const data = await response.json()
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Se tiver sessionId, salvar a mensagem no banco
    if (sessionId) {
      // Salvar mensagem do usuario
      await supabase.from('chat_messages').insert({
        session_id: sessionId,
        role: 'user',
        content: prompt,
        tipo_acao: type,
        metadata: context ? JSON.stringify(context) : null
      })

      // Salvar resposta do assistente
      await supabase.from('chat_messages').insert({
        session_id: sessionId,
        role: 'assistant',
        content: generatedText,
        tipo_acao: type
      })

      // Atualizar timestamp da sessao
      await supabase.from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', sessionId)
    }

    return NextResponse.json({
      success: true,
      response: generatedText,
      type,
      sessionId
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Error:', error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// GET - Listar sessoes de chat
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (sessionId) {
      // Buscar mensagens de uma sessao especifica
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (error) throw error

      return NextResponse.json({ messages })
    } else {
      // Listar todas as sessoes
      const { data: sessions, error } = await supabase
        .from('chat_sessions')
        .select('*, investigations(titulo)')
        .order('updated_at', { ascending: false })
        .limit(50)

      if (error) throw error

      return NextResponse.json({ sessions })
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// DELETE - Limpar conversa (manter sessao, deletar mensagens)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const messageId = searchParams.get('messageId')

    if (messageId) {
      // Deletar mensagem especifica
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId)

      if (error) throw error

      return NextResponse.json({ success: true, message: 'Mensagem deletada' })
    } else if (sessionId) {
      // Limpar todas as mensagens da sessao
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('session_id', sessionId)

      if (error) throw error

      // Limpar anexos da sessao
      await supabase
        .from('chat_attachments')
        .delete()
        .eq('session_id', sessionId)

      // Limpar documento em construcao
      await supabase
        .from('chat_sessions')
        .update({
          documento_em_construcao: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      return NextResponse.json({ success: true, message: 'Conversa limpa' })
    }

    return NextResponse.json({ error: 'sessionId ou messageId obrigatorio' }, { status: 400 })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
