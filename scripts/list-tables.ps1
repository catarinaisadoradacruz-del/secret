# Listar todas as tabelas existentes no Supabase
$projectRef = 'qlxabxhszpvetblvnfxl'
$serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseGFieGhzenB2ZXRibHZuZnhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzMyNSwiZXhwIjoyMDgzMzczMzI1fQ.8JOJnLml2uzDSLjUuWIprZpTADo_TnfqgblcELm2GYo'

$headers = @{
    'apikey' = $serviceKey
    'Authorization' = "Bearer $serviceKey"
    'Content-Type' = 'application/json'
}

Write-Host "=== Verificando TODAS as tabelas no banco ===" -ForegroundColor Cyan

# Listar todas as tabelas possiveis baseado no GraphQL
$tablesFromGraphQL = @(
    'alvos',
    'audit_log',
    'documents',
    'erb_locations',
    'forensic_analysis',
    'investigations',
    'operations',
    'permissions',
    'phone_records',
    'rai_analysis',
    'team_members',
    'teams',
    'users'
)

# Tabelas que o codigo espera
$expectedTables = @(
    'investigations',
    'alvos',
    'alvo_telefones',
    'alvo_enderecos',
    'alvo_passagens',
    'alvo_veiculos',
    'documentos',
    'unidades',
    'phone_records',
    'operacoes',
    'forensic_images',
    'rai_analises',
    'relatos_pc',
    'chat_sessions',
    'chat_messages'
)

Write-Host "`n=== Tabelas existentes (via GraphQL) ===" -ForegroundColor Yellow
foreach ($table in $tablesFromGraphQL) {
    Write-Host "  [OK] $table" -ForegroundColor Green
}

Write-Host "`n=== Verificando tabelas esperadas pelo codigo ===" -ForegroundColor Yellow
$existing = @()
$missing = @()

foreach ($table in $expectedTables) {
    try {
        $url = "https://$projectRef.supabase.co/rest/v1/$table"
        $response = Invoke-RestMethod -Uri "$url`?select=id&limit=1" -Headers $headers -Method Get -ErrorAction Stop
        Write-Host "  [OK] $table" -ForegroundColor Green
        $existing += $table
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        if ($code -eq 404) {
            Write-Host "  [FALTA] $table" -ForegroundColor Red
            $missing += $table
        } else {
            Write-Host "  [ERRO] $table - $code" -ForegroundColor Yellow
        }
    }
}

Write-Host "`n=== RESUMO ===" -ForegroundColor Cyan
Write-Host "Existentes: $($existing.Count)" -ForegroundColor Green
Write-Host "Faltando: $($missing.Count)" -ForegroundColor Red

if ($missing.Count -gt 0) {
    Write-Host "`nTabelas que precisam ser criadas:" -ForegroundColor Yellow
    foreach ($t in $missing) {
        Write-Host "  - $t" -ForegroundColor Red
    }
}

Write-Host "`n=== MAPEAMENTO DE NOMES ===" -ForegroundColor Cyan
Write-Host "Pode haver um mapeamento diferente entre os nomes:" -ForegroundColor Yellow
Write-Host "  documents (existe) -> documentos (esperado)" -ForegroundColor White
Write-Host "  operations (existe) -> operacoes (esperado)" -ForegroundColor White
Write-Host "  forensic_analysis (existe) -> forensic_images (esperado)" -ForegroundColor White
Write-Host "  rai_analysis (existe) -> rai_analises (esperado)" -ForegroundColor White
