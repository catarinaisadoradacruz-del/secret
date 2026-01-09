# Execute SQL no Supabase via Database API
$projectRef = 'qlxabxhszpvetblvnfxl'
$dbPassword = 'Segura!01@@@'
$serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseGFieGhzenB2ZXRibHZuZnhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzMyNSwiZXhwIjoyMDgzMzczMzI1fQ.8JOJnLml2uzDSLjUuWIprZpTADo_TnfqgblcELm2GYo'

Write-Host "=== Executando SQL no Supabase ===" -ForegroundColor Cyan

# Usar o endpoint de database sql query do Supabase
# POST https://api.supabase.com/v1/projects/{ref}/database/query
# Precisa do access token da organizacao

# Alternativa: usar pg REST proxy
# POST /pg com o query SQL

$headers = @{
    'apikey' = $serviceKey
    'Authorization' = "Bearer $serviceKey"
    'Content-Type' = 'application/json'
}

# Lista de SQLs para executar
$sqlStatements = @(
    "CREATE TABLE IF NOT EXISTS alvo_telefones (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), alvo_id UUID REFERENCES alvos(id) ON DELETE CASCADE, numero TEXT NOT NULL, status TEXT DEFAULT 'ativo', whatsapp BOOLEAN DEFAULT false, operadora TEXT, classificacao TEXT DEFAULT 'C', confirmado BOOLEAN DEFAULT false, data_informacao DATE, fonte TEXT, observacoes TEXT, created_at TIMESTAMPTZ DEFAULT NOW())",

    "CREATE TABLE IF NOT EXISTS alvo_enderecos (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), alvo_id UUID REFERENCES alvos(id) ON DELETE CASCADE, logradouro TEXT NOT NULL, numero TEXT, complemento TEXT, quadra TEXT, lote TEXT, bairro TEXT, cidade TEXT DEFAULT 'Goiania', uf TEXT DEFAULT 'GO', cep TEXT, tipo TEXT DEFAULT 'residencial', status TEXT DEFAULT 'NAO_CONFIRMADO', latitude DECIMAL(10,8), longitude DECIMAL(11,8), data_informacao DATE, fonte TEXT, observacoes TEXT, created_at TIMESTAMPTZ DEFAULT NOW())",

    "CREATE TABLE IF NOT EXISTS alvo_passagens (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), alvo_id UUID REFERENCES alvos(id) ON DELETE CASCADE, data_fato DATE, tipo_penal TEXT, artigo TEXT, delegacia TEXT, situacao TEXT, numero_processo TEXT, observacoes TEXT, created_at TIMESTAMPTZ DEFAULT NOW())",

    "CREATE TABLE IF NOT EXISTS alvo_veiculos (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), alvo_id UUID REFERENCES alvos(id) ON DELETE CASCADE, placa TEXT, marca TEXT, modelo TEXT, ano INTEGER, cor TEXT, renavam TEXT, chassi TEXT, situacao TEXT, restricoes TEXT, observacoes TEXT, created_at TIMESTAMPTZ DEFAULT NOW())",

    "CREATE TABLE IF NOT EXISTS documentos (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), investigation_id UUID REFERENCES investigations(id) ON DELETE CASCADE, tipo TEXT NOT NULL, titulo TEXT, conteudo TEXT, unidade TEXT, status TEXT DEFAULT 'rascunho', alvos_ids UUID[], created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())",

    "CREATE TABLE IF NOT EXISTS unidades (id TEXT PRIMARY KEY, nome TEXT NOT NULL, cabecalho TEXT, rodape TEXT, comarca TEXT, endereco TEXT, telefone TEXT, email TEXT, created_at TIMESTAMPTZ DEFAULT NOW())",

    "CREATE TABLE IF NOT EXISTS operacoes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), investigation_id UUID REFERENCES investigations(id) ON DELETE CASCADE, nome TEXT NOT NULL, codinome TEXT, data_prevista DATE, hora_prevista TIME, data_execucao DATE, status TEXT DEFAULT 'planejamento', tipo TEXT, objetivos TEXT, local TEXT, endereco_alvo TEXT, equipe JSONB, recursos JSONB, resultados TEXT, observacoes TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())",

    "CREATE TABLE IF NOT EXISTS forensic_images (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), investigation_id UUID REFERENCES investigations(id) ON DELETE CASCADE, arquivo_url TEXT NOT NULL, nome_arquivo TEXT, tamanho INTEGER, mime_type TEXT, tipo TEXT, descricao TEXT, hash_md5 TEXT, hash_sha256 TEXT, metadados JSONB, latitude DECIMAL(10,8), longitude DECIMAL(11,8), data_captura TIMESTAMPTZ, dispositivo TEXT, tags TEXT[], created_at TIMESTAMPTZ DEFAULT NOW())",

    "CREATE TABLE IF NOT EXISTS rai_analises (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), investigation_id UUID REFERENCES investigations(id) ON DELETE CASCADE, numero_rai TEXT, data_emissao DATE, codigo_validacao TEXT, unidade_pm TEXT, unidade_pc TEXT, data_fato TIMESTAMPTZ, local_fato TEXT, tipificacao TEXT, narrativa_pc TEXT, dados_extraidos JSONB, arquivo_url TEXT, created_at TIMESTAMPTZ DEFAULT NOW())",

    "CREATE TABLE IF NOT EXISTS relatos_pc (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), investigation_id UUID REFERENCES investigations(id) ON DELETE CASCADE, conteudo TEXT NOT NULL, tipificacao TEXT, acao_penal TEXT, exames TEXT, blocos_aplicados TEXT[], status TEXT DEFAULT 'rascunho', created_at TIMESTAMPTZ DEFAULT NOW())",

    "CREATE TABLE IF NOT EXISTS chat_sessions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), investigation_id UUID REFERENCES investigations(id) ON DELETE SET NULL, titulo TEXT NOT NULL DEFAULT 'Nova Conversa', tipo TEXT DEFAULT 'geral', documento_em_construcao JSONB, status TEXT DEFAULT 'ativo', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())",

    "CREATE TABLE IF NOT EXISTS chat_messages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE, role TEXT NOT NULL, content TEXT NOT NULL, tipo_acao TEXT, metadata JSONB, created_at TIMESTAMPTZ DEFAULT NOW())"
)

# Combinar todos os SQLs
$fullSQL = $sqlStatements -join "; "

Write-Host "`nSQL a ser executado:" -ForegroundColor Yellow
Write-Host "$($sqlStatements.Count) statements CREATE TABLE"

# Salvar SQL em arquivo para backup
$sqlPath = Join-Path $PSScriptRoot "create-tables.sql"
$fullSQL | Out-File -FilePath $sqlPath -Encoding UTF8
Write-Host "`nSQL salvo em: $sqlPath" -ForegroundColor Green

# Copiar para clipboard
$fullSQL | Set-Clipboard
Write-Host "SQL copiado para a area de transferencia!" -ForegroundColor Green

Write-Host "`n=== INSTRUCOES ===" -ForegroundColor Cyan
Write-Host "1. Abra o Supabase SQL Editor:" -ForegroundColor White
Write-Host "   https://supabase.com/dashboard/project/$projectRef/sql/new" -ForegroundColor Blue
Write-Host ""
Write-Host "2. Cole o SQL (Ctrl+V)" -ForegroundColor White
Write-Host "3. Clique em 'Run'" -ForegroundColor White
Write-Host ""
Write-Host "Ou use o arquivo scripts/setup-database-simples.sql que tem o SQL completo com RLS" -ForegroundColor Yellow
