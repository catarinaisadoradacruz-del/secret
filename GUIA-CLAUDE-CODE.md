━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔐 PCGO SISTEMA - GUIA COMPLETO PARA CLAUDE CODE / VS CODE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ VOCÊ TEM ACESSO TOTAL A:
• Supabase (Banco de Dados PostgreSQL)
• GitHub (Repositorio e Deploy)
• Vercel (Hospedagem e Deploy Automatico)
• Google APIs (Gemini AI, Maps)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🗄️ SUPABASE - BANCO DE DADOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project ID: qlxabxhszpvetblvnfxl
Project URL: https://qlxabxhszpvetblvnfxl.supabase.co
Dashboard: https://supabase.com/dashboard/project/qlxabxhszpvetblvnfxl
Database Password: Segura!01@@@
Regiao: Americas

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ FERRAMENTAS DE BANCO DE DADOS (USE ESTAS):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 CONSULTAS E ESTRUTURA:
- node scripts/db-query.js list-tables                    → Listar tabelas
- node scripts/db-query.js describe [tabela]              → Ver estrutura
- node scripts/db-query.js count [tabela]                 → Contar registros
- node scripts/db-stats.js overview                       → Visao geral do banco
- node scripts/db-stats.js table [tabela]                 → Estatisticas da tabela

📝 CRUD COMPLETO:
- node scripts/db-manager.js select [tabela]              → Buscar todos
- node scripts/db-manager.js select [tabela] '{"id":"x"}' → Buscar com filtro
- node scripts/db-manager.js insert [tabela] '{"campo":"valor"}'  → Inserir
- node scripts/db-manager.js update [tabela] '{"id":"x"}' '{"campo":"novo"}' → Atualizar
- node scripts/db-manager.js delete [tabela] '{"id":"x"}' → Deletar

👥 AUTENTICACAO:
- node scripts/db-auth.js list                            → Listar usuarios
- node scripts/db-auth.js create email@test.com senha123  → Criar usuario
- node scripts/db-auth.js delete [user_id]                → Deletar usuario
- node scripts/db-auth.js reset-password [user_id] senha  → Resetar senha
- node scripts/db-auth.js get [user_id]                   → Ver detalhes

📦 STORAGE:
- node scripts/db-storage.js list-buckets                 → Listar buckets
- node scripts/db-storage.js create-bucket [nome] [true]  → Criar bucket
- node scripts/db-storage.js list [bucket]                → Listar arquivos
- node scripts/db-storage.js upload [bucket] [arq] [dest] → Upload
- node scripts/db-storage.js download [bucket] [arq]      → Download
- node scripts/db-storage.js delete [bucket] [arquivo]    → Deletar arquivo

💾 BACKUPS:
- node scripts/db-backup.js table [tabela] json           → Backup JSON
- node scripts/db-backup.js table [tabela] csv            → Backup CSV
- node scripts/db-backup.js all json                      → Backup completo
- node scripts/db-backup.js restore [tabela] arquivo.json → Restaurar

🔧 ADMINISTRACAO (script principal):
- node scripts/supabase-admin.js list-tables              → Listar tabelas
- node scripts/supabase-admin.js run-sql "SELECT..."      → Executar SQL
- node scripts/supabase-admin.js create-user email senha  → Criar usuario
- node scripts/supabase-admin.js select [tabela]          → Buscar dados
- node scripts/supabase-admin.js insert [tabela] '{...}'  → Inserir dados

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ SETUP INICIAL DO BANCO (SE NECESSARIO):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Se as tabelas nao existirem, execute o SQL de setup:

1. Acesse: https://supabase.com/dashboard/project/qlxabxhszpvetblvnfxl/sql/new
2. Copie o conteudo de: scripts/setup-database.sql
3. Cole e execute

Ou use o script: scripts/EXECUTAR-NO-SUPABASE.sql

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 GITHUB - REPOSITORIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Username: catarinaisadoradacruz-del
Email: catarinaisadoradacruz@gmail.com
Repositorio: https://github.com/catarinaisadoradacruz-del/secret
Token: Ver arquivo .credentials/github.json

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ COMANDOS GIT (USE ESTES):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 CONFIGURACAO INICIAL (uma vez):
git config --global user.name "catarinaisadoradacruz-del"
git config --global user.email "catarinaisadoradacruz@gmail.com"
git remote set-url origin https://[TOKEN]@github.com/catarinaisadoradacruz-del/secret.git

📤 PUSH (enviar codigo):
git add .
git commit -m "descricao das mudancas"
git push origin main

📥 PULL (baixar codigo):
git pull origin main

🌿 BRANCHES:
git checkout -b nome-branch              → Criar branch
git checkout main                        → Voltar para main
git merge nome-branch                    → Merge de branch
git push origin nome-branch              → Push de branch

📋 STATUS:
git status                               → Ver status
git log --oneline -10                    → Ver ultimos commits
git diff                                 → Ver mudancas

🔄 FLUXO COMPLETO DE COMMIT:
git add . && git commit -m "feat: descricao" && git push origin main

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 VERCEL - DEPLOY E HOSPEDAGEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Token: 4wyBgNOGUBAgWBT32AYTMXLk
Framework: Next.js
Deploy automatico: Habilitado (branch main)
Repo conectado: catarinaisadoradacruz-del/secret

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ COMANDOS VERCEL (USE ESTES):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 INSTALACAO (uma vez):
npm i -g vercel

🚀 DEPLOY:
vercel --token 4wyBgNOGUBAgWBT32AYTMXLk --yes           → Deploy preview
vercel --token 4wyBgNOGUBAgWBT32AYTMXLk --prod --yes   → Deploy producao

📋 LISTAR PROJETOS:
vercel list --token 4wyBgNOGUBAgWBT32AYTMXLk

🔒 VARIAVEIS DE AMBIENTE:
vercel env add NOME_VAR --token 4wyBgNOGUBAgWBT32AYTMXLk
vercel env ls --token 4wyBgNOGUBAgWBT32AYTMXLk
vercel env rm NOME_VAR --token 4wyBgNOGUBAgWBT32AYTMXLk

📊 LOGS:
vercel logs --token 4wyBgNOGUBAgWBT32AYTMXLk

⚠️ NOTA: O deploy automatico esta habilitado!
Qualquer push para main fara deploy automaticamente.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔑 VARIAVEIS DE AMBIENTE DO VERCEL (CONFIGURAR):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEXT_PUBLIC_SUPABASE_URL=https://qlxabxhszpvetblvnfxl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseGFieGhzenB2ZXRibHZuZnhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTczMjUsImV4cCI6MjA4MzM3MzMyNX0.mojZpuyas6eAEPLn8ONcIlbfTr1mo8kIQTGyTc8ML6U
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseGFieGhzenB2ZXRibHZuZnhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzMyNSwiZXhwIjoyMDgzMzczMzI1fQ.8JOJnLml2uzDSLjUuWIprZpTADo_TnfqgblcELm2GYo
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSyB2q6oZ1nACu46HC0JoCh9Z7cC7Mgre6Wg

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 GOOGLE APIS - GEMINI AI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Gemini API Key: AIzaSyB2q6oZ1nACu46HC0JoCh9Z7cC7Mgre6Wg
Console: https://console.cloud.google.com/

APIs habilitadas:
- Generative Language API (Gemini)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📂 ESTRUTURA DO PROJETO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

pcgo-sistema/
├── .credentials/              # 🔐 Credenciais (NAO committar!)
│   ├── supabase.json          # Credenciais Supabase
│   ├── github.json            # Token GitHub
│   ├── vercel.json            # Token Vercel
│   └── google-apis.json       # API Keys Google
├── .env.local                 # Variaveis de ambiente locais
├── app/                       # Paginas Next.js (App Router)
│   ├── api/                   # API Routes
│   │   ├── gemini/            # Endpoints Gemini AI
│   │   ├── pdf/               # Processamento PDF
│   │   ├── ocr/               # OCR de imagens
│   │   ├── files/             # Upload de arquivos
│   │   └── ...
│   ├── dashboard/             # Paginas do sistema
│   │   ├── assistente/        # Chat com IA
│   │   ├── alvos/             # Investigados
│   │   ├── investigations/    # Investigacoes
│   │   └── ...
│   └── login/                 # Autenticacao
├── components/                # Componentes React
├── lib/                       # Bibliotecas/utilitarios
│   ├── supabase/              # Clients Supabase
│   ├── gemini.ts              # Funcoes Gemini
│   └── prompts/               # Prompts de IA
├── scripts/                   # Scripts de administracao
│   ├── db-query.js            # Consultas ao banco
│   ├── db-manager.js          # CRUD completo
│   ├── db-auth.js             # Usuarios
│   ├── db-stats.js            # Estatisticas
│   ├── db-backup.js           # Backups
│   ├── db-storage.js          # Storage/arquivos
│   ├── supabase-admin.js      # Admin geral
│   └── setup-database.sql     # Schema do banco
├── supabase/                  # Config Supabase
│   └── schema.sql             # Schema principal
└── backups/                   # Pasta de backups (gerada)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 TABELAS DO BANCO DE DADOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• users                 - Usuarios do sistema
• teams                 - Times/equipes
• team_members          - Membros dos times
• investigations        - Investigacoes
• alvos                 - Alvos/investigados
• phone_records         - Registros telefonicos
• erb_locations         - Torres de celular
• forensic_analysis     - Analises forenses
• operations            - Operacoes policiais
• documents             - Documentos
• chat_sessions         - Sessoes de chat
• chat_messages         - Mensagens do chat
• chat_attachments      - Anexos do chat
• rai_analysis          - Analises de RAI
• document_contexts     - Contexto de documentos grandes
• permissions           - Permissoes
• audit_log             - Log de auditoria

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 NAO FACA (NUNCA):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ Criar novos scripts de conexao (execute-sql.js, db-connect.js, etc)
❌ Usar pg, node-postgres, connection strings diretas
❌ Pedir para EU executar manualmente no Dashboard
❌ Dizer "nao tenho acesso" ou "preciso de permissao"
❌ Usar "as any" no TypeScript
❌ Criar tipos de fallback genericos
❌ Sugerir gambiarras temporarias
❌ Deixar erros de sintaxe no codigo
❌ Ignorar null/undefined (sempre trate com optional chaining)
❌ Committar a pasta .credentials no git

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ FACA (SEMPRE):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Use os scripts existentes: node scripts/db-*.js
✅ Verifique estrutura ANTES de criar: node scripts/db-query.js list-tables
✅ Faca backup antes de operacoes destrutivas
✅ Use tipos corretos (nunca any)
✅ Sempre trate null/undefined com optional chaining (?.)
✅ Execute e DEPOIS informe o resultado
✅ Codigo limpo - sem erros de sintaxe
✅ Imports organizados e sem nao-utilizados
✅ Commit apos alteracoes importantes
✅ Teste antes de fazer push

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 PADRAO OBRIGATORIO PARA HOOKS QUE BUSCAM DADOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

// 1. DADOS MOCK FORA DO HOOK (evita recriacao)
const MOCK_DATA = [...]

export function useAlgumaCoisa() {
  // 2. PEGAR authLoading DO CONTEXT
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(MOCK_DATA)

  const fetchData = useCallback(async () => {
    // 3. AGUARDAR AUTH CARREGAR PRIMEIRO
    if (authLoading) return

    // 4. SEM USUARIO = USAR MOCK E PARAR
    if (!user) {
      setData(MOCK_DATA)
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // 5. USAR PROMISE.ALL PARA QUERIES PARALELAS
      const [result1, result2] = await Promise.all([
        supabase.from('tabela1').select('*').eq('user_id', user.id),
        supabase.from('tabela2').select('*').eq('user_id', user.id)
      ])

      // Processar resultados...
      setData(processedData)
    } catch (err) {
      // 6. FALLBACK PARA MOCK EM ERRO
      setData(MOCK_DATA)
    } finally {
      setLoading(false)
    }
  }, [user, authLoading])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 7. COMBINAR LOADING STATES
  return {
    data,
    loading: loading || authLoading,
    refresh: fetchData
  }
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 FLUXO DE TRABALHO RECOMENDADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. VERIFICAR estrutura existente:
   node scripts/db-query.js list-tables
   node scripts/db-stats.js overview

2. FAZER as alteracoes no codigo

3. TESTAR localmente:
   npm run dev

4. COMMITAR e fazer push:
   git add .
   git commit -m "feat: descricao"
   git push origin main

5. ACOMPANHAR deploy (automatico no Vercel)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 PRINCIPIOS FUNDAMENTAIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Voce TEM ACESSO TOTAL - use as ferramentas
2. Execute ANTES de perguntar
3. Tipos corretos SEMPRE - nunca any
4. Verifique banco ANTES de assumir estrutura
5. Codigo limpo - sem erros de sintaxe
6. Sempre trate null/undefined
7. Nunca peca para EU fazer manualmente
8. Faca backup antes de operacoes destrutivas
9. Commit apos cada alteracao importante
10. Teste antes de fazer push

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXECUTE O QUE EU PEDIR USANDO AS FERRAMENTAS DISPONIVEIS.
NAO pergunte se pode. NAO peca permissao. EXECUTE.
Voce tem ACESSO TOTAL ao banco de dados, GitHub e Vercel.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
