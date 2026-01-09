import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * API para geracao de relatorios policiais
 * Usa o template da unidade do usuario
 */

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      tipo, // 'IP_PASSIVO', 'RELINT', 'REPRESENTACAO', etc
      unidadeId, // ID da unidade (ou usa a padrao do usuario)
      dados // Dados extraidos do IP/documento
    } = body

    // Buscar unidade
    let unidade
    if (unidadeId) {
      const { data } = await supabase
        .from('unidades')
        .select('*')
        .eq('id', unidadeId)
        .single()
      unidade = data
    } else {
      // Buscar unidade padrao do usuario (por ora, DIH)
      const { data } = await supabase
        .from('unidades')
        .select('*')
        .eq('id', 'DIH')
        .single()
      unidade = data
    }

    if (!unidade) {
      return NextResponse.json({ error: 'Unidade nao encontrada' }, { status: 404 })
    }

    // Gerar relatorio baseado no tipo
    let relatorio = ''

    if (tipo === 'IP_PASSIVO') {
      relatorio = gerarRelatorioIPPassivo(dados, unidade)
    } else if (tipo === 'RELINT') {
      relatorio = gerarRELINT(dados, unidade)
    } else {
      return NextResponse.json({ error: 'Tipo de relatorio nao suportado' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      relatorio,
      unidade: {
        id: unidade.id,
        nome: unidade.nome,
        cabecalho: unidade.cabecalho,
        brasao_url: unidade.brasao_url,
        brasao_pcgo_url: unidade.brasao_pcgo_url
      }
    })

  } catch (error: any) {
    console.error('Erro ao gerar relatorio:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * Gera relatorio de IP Passivo
 */
function gerarRelatorioIPPassivo(dados: any, unidade: any): string {
  const {
    numeroIP,
    anoIP,
    rai,
    dataFato,
    horaFato,
    localFato,
    tipificacao,
    vitima,
    investigado,
    resumoFatos,
    diligenciasPreliminares,
    diligenciasPosteriores,
    documentosJuntados,
    conclusaoAutoria,
    conclusaoMaterialidade,
    causaMortis,
    transcricaoLaudo
  } = dados

  const dataAtual = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })

  return `
═══════════════════════════════════════════════════════════════════════════
                              Estado de Goias
      ${unidade.subordinacao || 'Secretaria da Seguranca Publica e Administracao Penitenciaria'}
                              Policia Civil
                    ${unidade.departamento || 'Departamento de Policia Judiciaria'}
              ${unidade.cabecalho || unidade.nome}
═══════════════════════════════════════════════════════════════════════════

                           RELATORIO POLICIAL

┌─────────────────────────────────────────────────────────────────────────┐
│ Referencia: Inquerito Policial n ${numeroIP || '___'}/${anoIP || '____'} - ${unidade.id}
│ Incidencia Penal: ${tipificacao || 'Art. ___ do CPB'}
│ Investigado: ${investigado || 'A DEFINIR'}
│ Vitima(s): ${vitima?.nome || 'NAO INFORMADO'}
│ Assunto: Relatorio Final
└─────────────────────────────────────────────────────────────────────────┘


1- DO OBJETO DO RELATORIO:

    Trata-se de relatorio policial, com o fito de informar a autoridade da
conclusao das diligencias relacionadas ao procedimento policial em epigrafe.


2- DOS FATOS

    Conforme consta no Registro de atendimento integrado n ${rai || '_______'}, no dia
${dataFato || '__/__/____'} por volta das ${horaFato || '__:__'} a pessoa de ${vitima?.nome?.toUpperCase() || 'VITIMA NAO IDENTIFICADA'}
${resumoFatos || '[DESCRICAO DOS FATOS]'}, fatos ocorridos ${localFato || '[LOCAL DO FATO]'}.


3. DAS DILIGENCIAS PRELIMINARES

    Diante dos fatos a autoridade policial que a epoca presidia a presente
investigacao, determinou uma serie de diligencias com o intuito de apurar a
autoria, bem como as demais circunstancias relacionadas ao delito.

${diligenciasPreliminares || '    [DESCRICAO DAS DILIGENCIAS PRELIMINARES]'}

${documentosJuntados ? `
    Foram ainda juntados aos autos os seguintes documentos:

${documentosJuntados.map((doc: string, i: number) => `${i + 1}) ${doc}`).join('\n')}
` : ''}

${diligenciasPosteriores ? `
4. DAS DILIGENCIAS POSTERIORES

    Nessa linha de raciocinio, a presente investigacao foi encaminhada a esta
equipe policial, no estado em que se encontrava.

${diligenciasPosteriores}
` : ''}


${diligenciasPosteriores ? '5' : '4'}. CONCLUSAO

    No caso em tela, da detida leitura do Registro de Atendimento Integrado
n ${rai || '_______'}, bem como dos demais documentos posteriormente juntados aos autos,
depreende-se que a vitima ${vitima?.nome?.toUpperCase() || 'VITIMA'} veio a obito em razao ${causaMortis || '[CAUSA MORTIS]'},
conforme o trecho a seguir transcrito do laudo pericial: "${transcricaoLaudo || '[TRANSCRICAO DO LAUDO]'}".
Nesse raciocinio, a materialidade resta comprovada.

${conclusaoAutoria || '    [ANALISE DA AUTORIA]'}

    De mais a mais, fato e que todos os elementos investigativos que
estavam a disposicao desta equipe foram exauridos.

    Ante todo o exposto, sugerimos a douta autoridade policial que
encaminhe o presente inquerito policial ao Poder Judiciario, sugerindo ao
membro do Ministerio Publico que promova o arquivamento do presente
procedimento investigatorio, pela ausencia de elementos que possam subsidiar
uma eventual acao penal.

    E o que temos a relatar ate o presente momento.


                                        ${unidade.cidade || 'Goiania'}, ${dataAtual}




                              _________________________________
                                      Matricula ___________


═══════════════════════════════════════════════════════════════════════════
${unidade.rodape || unidade.endereco || ''}
                                  ${unidade.comarca || unidade.cidade + ' - ' + unidade.uf}
═══════════════════════════════════════════════════════════════════════════
`.trim()
}

/**
 * Gera RELINT
 */
function gerarRELINT(dados: any, unidade: any): string {
  const {
    numero,
    ano,
    procedimento,
    tipificacao,
    dataFato,
    sintese,
    metodologia,
    alvos,
    analiseGeografica,
    analiseTemporal,
    conclusao
  } = dados

  const dataAtual = new Date().toLocaleDateString('pt-BR')

  return `
═══════════════════════════════════════════════════════════════════════════
                              Estado de Goias
      ${unidade.subordinacao || 'Secretaria da Seguranca Publica e Administracao Penitenciaria'}
                              Policia Civil
                    ${unidade.departamento || 'Departamento de Policia Judiciaria'}
              ${unidade.cabecalho || unidade.nome}
═══════════════════════════════════════════════════════════════════════════

                    RELATORIO DE INTELIGENCIA N. ${numero || '___'}/${ano || new Date().getFullYear()}

PROCEDIMENTO: ${procedimento || '[NUMERO DO IP/PI/TC]'}
TIPIFICACAO: ${tipificacao || '[CRIME]'}
DATA DO FATO: ${dataFato || '[DATA]'}


1. SINTESE

${sintese || '[Resumo objetivo do fato investigado]'}


2. METODOLOGIA

${metodologia || '[Tecnicas empregadas: OSINT, analise telefonica, etc.]'}


3. ALVOS IDENTIFICADOS

${alvos?.map((alvo: any, i: number) => `
3.${i + 1} ${alvo.nome?.toUpperCase() || 'ALVO ' + (i + 1)} - ${alvo.cpf || 'CPF NAO INFORMADO'}
- Qualificacao: ${alvo.qualificacao || 'NAO INFORMADO'}
- Telefones: ${alvo.telefones?.join(', ') || 'NAO INFORMADO'}
- Enderecos: ${alvo.enderecos?.join('; ') || 'NAO INFORMADO'}
- Passagens: ${alvo.passagens || 'NAO INFORMADO'}
- Vinculos: ${alvo.vinculos || 'NAO INFORMADO'}
`).join('\n') || '[LISTA DE ALVOS]'}


4. ANALISE TEMPORAL

${analiseTemporal || '[Timeline dos eventos]'}


5. ANALISE GEOGRAFICA

${analiseGeografica || '[Enderecos relevantes e movimentacao]'}


6. CONCLUSAO

${conclusao || '[Sintese das evidencias e proximos passos]'}


                                        ${unidade.cidade || 'Goiania'}, ${dataAtual}


                              _________________________________
                                      Matricula ___________


═══════════════════════════════════════════════════════════════════════════
${unidade.rodape || unidade.endereco || ''}
                                  ${unidade.comarca || unidade.cidade + ' - ' + unidade.uf}
═══════════════════════════════════════════════════════════════════════════
`.trim()
}
