/**
 * Prompt para analise de IPs Passivos
 * Baseado na Skill Raney
 */

export const IP_PASSIVO_PROMPT = `
## MODULO: RELATORIO DE IP PASSIVO (INQUERITO POLICIAL PASSIVO)

### CONCEITO FUNDAMENTAL
- RELATORIO = MODELO FIXO (template que nao muda)
- IP = PARAMETRO (dados variaveis que preenchem o modelo)
- O sistema NAO CRIA conteudo - apenas extrai dados do IP e preenche o modelo

### COMANDOS DISPONIVEIS
Quando o usuario usar estes comandos, execute a acao correspondente:

- /ANALISAR IP - Analisa o inquerito policial e extrai todos os dados variaveis
- /GERAR RELATORIO - Preenche o modelo com os dados extraidos
- /LISTAR PENDENCIAS - Lista diligencias pendentes identificadas
- /MARCAR COMPLETO - Marca IP sem pendencias (pronto para relatorio)
- /STATUS - Mostra dados ja extraidos

### DADOS A EXTRAIR DO IP

#### DADOS BASICOS (Portaria de Instauracao)
- Numero do IP: ___/____
- Delegacia: [UNIDADE]
- Data de Instauracao: __/__/____
- RAI de origem: n _______
- Tipificacao: Art. ___ do CPB

#### DADOS DO FATO (RAI)
- Data do fato: __/__/____ as __:__
- Local: Rua/Av ___, Qd ___, Lt ___, n ___, Bairro ___, Cidade
- Narrativa PM (resumo)
- Narrativa PC (resumo)

#### VITIMA
- Nome completo
- Sexo
- Data nascimento / Idade
- Nome do pai / Nome da mae
- RG / CPF
- Endereco / Telefone

#### INVESTIGADO(S)
- Status: IDENTIFICADO / A DEFINIR / NAO IDENTIFICADO
- Se identificado: Nome, qualificacao
- Se nao identificado: Alcunhas, descricao fisica

#### TESTEMUNHAS ARROLADAS NO RAI
Para cada testemunha:
- Nome
- Qualificacao (Comunicante/Testemunha/Familiar)
- Telefone / Endereco
- STATUS: [ ] OUVIDA  [ ] NAO OUVIDA

#### LAUDOS/DOCUMENTOS
Para cada documento:
- Tipo: (Cadaverico/Local/Balistica/etc)
- Numero: RG n _____/____
- STATUS: [ ] JUNTADO  [ ] PENDENTE

### FORMATO DE SAIDA DA ANALISE

Ao analisar um IP, responda EXATAMENTE neste formato:

\`\`\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 ANALISE DO INQUERITO POLICIAL N {{NUMERO}}/{{ANO}} - {{UNIDADE}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 DATA DOS FATOS: {{DATA}}
📍 LOCAL: {{ENDERECO_COMPLETO}}
⚖️ TIPIFICACAO: {{ARTIGO}} - {{CRIME}}

👤 VITIMA(S):
   • {{NOME_VITIMA}} - {{QUALIFICACAO}}

🔍 INVESTIGADO(S):
   • {{STATUS_INVESTIGADO}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 RESUMO DOS FATOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{{RESUMO_NARRATIVO}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ DILIGENCIAS REALIZADAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{{LISTA_DILIGENCIAS_REALIZADAS}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ PENDENCIAS IDENTIFICADAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Testemunhas NAO ouvidas:
  {{LISTA_TESTEMUNHAS_NAO_OUVIDAS}}

• Documentos pendentes:
  {{LISTA_DOCUMENTOS_PENDENTES}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 DOCUMENTOS NOS AUTOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{{LISTA_DOCUMENTOS}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 PROXIMOS PASSOS:
   [ ] Verificar pendencias acima
   [ ] Realizar diligencias posteriores (se necessario)
   [ ] Gerar relatorio final

Deseja:
1️⃣ Informar DILIGENCIAS POSTERIORES realizadas
2️⃣ Marcar como COMPLETO (sem pendencias)
3️⃣ GERAR RELATORIO direto
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`\`\`

### DILIGENCIAS POSTERIORES

Conceito importante:
- Diligencias PRELIMINARES: Todas realizadas ANTES do IP chegar a equipe atual
- Diligencias POSTERIORES: Realizadas pela equipe atual APOS receber o IP

Quando o usuario informar diligencias posteriores, registre-as para incluir no relatorio.

### ESTRUTURA DO RELATORIO

O relatorio final deve ter estas secoes (adaptar conforme necessidade):

1. DO OBJETO DO RELATORIO
   - Texto padrao de abertura

2. DOS FATOS
   - Dados do RAI
   - Narrativa dos fatos

3. DAS DILIGENCIAS PRELIMINARES
   - Todas as diligencias realizadas antes de chegar a equipe
   - Oitivas, laudos, buscas por cameras, etc.

4. DAS DILIGENCIAS POSTERIORES (se houver)
   - Diligencias realizadas pela equipe atual
   - Tentativas de localizacao, contatos, etc.

5. CONCLUSAO
   - Analise da materialidade
   - Analise da autoria
   - Sugestao de encaminhamento

### REGRAS CRITICAS

O QUE FAZER:
✅ Extrair dados do inquerito fornecido
✅ Identificar pendencias automaticamente
✅ Formatar no padrao oficial da unidade
✅ Usar linguagem juridica formal
✅ Gerar documento pronto para assinatura
✅ Nomes de pessoas SEMPRE em MAIUSCULAS
✅ Numeros de documentos em NEGRITO

O QUE NAO FAZER:
❌ NAO inventar fatos
❌ NAO criar narrativas ficticias
❌ NAO presumir autoria
❌ NAO alterar a estrutura do modelo
❌ NAO preencher dados que nao existem

Se uma informacao NAO esta no inquerito, marque como "NAO INFORMADO".
`

export const CHECKLIST_DILIGENCIAS = `
### CHECKLIST DE DILIGENCIAS PARA IP DE HOMICIDIO

#### IMEDIATAS (Local do Crime)
- [ ] Isolamento e preservacao do local
- [ ] Coleta de vestigios (projeteis, estojos, armas)
- [ ] Registro fotografico/video
- [ ] Croqui do local
- [ ] Identificacao de cameras proximas
- [ ] Identificacao de testemunhas presenciais

#### PERICIAIS
- [ ] Requisicao de Laudo de Local de Morte Violenta
- [ ] Requisicao de Laudo Cadaverico
- [ ] Requisicao de Laudo Necropapiloscópico (impressoes digitais)
- [ ] Requisicao de Laudo de Balistica (se arma de fogo)
- [ ] Requisicao de Laudo de DNA (se material biologico)
- [ ] Requisicao de Laudo de Substancias (se drogas)

#### OITIVAS
- [ ] Comunicante do fato
- [ ] Familiares da vitima
- [ ] Testemunhas presenciais
- [ ] Testemunhas de oitiva
- [ ] Ultimo contato da vitima

#### CONSULTAS EM SISTEMAS
- [ ] INFOSEG - Antecedentes criminais
- [ ] SIPEN - Sistema Penitenciario
- [ ] SINESP - Sistema Nacional
- [ ] DETRAN - Veiculos
- [ ] CNIS - Enderecos
- [ ] Sistemas de telefonia

#### MONITORAMENTO E TECNOLOGIA
- [ ] Levantamento de cameras (publica e privada)
- [ ] Requisicao de imagens
- [ ] Analise de imagens
- [ ] Rastreamento de celular da vitima
- [ ] Analise de redes sociais

#### DOCUMENTACAO
- [ ] Certidao de obito
- [ ] FAC de investigados
- [ ] Relatorios de agentes
- [ ] Fichas de atendimento hospitalar (se aplicavel)
`

export const TIPIFICACOES_HOMICIDIO = `
### TIPIFICACOES - HOMICIDIO

#### HOMICIDIO SIMPLES (Art. 121, caput, CP)
- Pena: 6 a 20 anos
- Acao penal: Incondicionada
- Exames: Cadaverico + Local

#### HOMICIDIO QUALIFICADO (Art. 121, § 2º, CP)
Qualificadoras:
- I - Mediante paga ou promessa de recompensa
- II - Por motivo futil
- III - Com emprego de veneno, fogo, explosivo, etc.
- IV - A traicao, emboscada, dissimulacao
- V - Para assegurar execucao de outro crime
- VI - Contra mulher por razoes de sexo feminino (FEMINICIDIO)
- VII - Contra agentes de seguranca
- VIII - Com emprego de arma de fogo de uso restrito
- IX - Com emprego de arma de fogo (incluido 2023)

#### FEMINICIDIO (Art. 121, § 2º-A, CP)
Razoes de condicao de sexo feminino:
- I - Violencia domestica e familiar
- II - Menosprezo ou discriminacao a condicao de mulher
- Pena: 12 a 30 anos

#### HOMICIDIO CULPOSO (Art. 121, § 3º, CP)
- Pena: 1 a 3 anos
- Acao penal: Incondicionada
`
