$serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseGFieGhzenB2ZXRibHZuZnhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzMyNSwiZXhwIjoyMDgzMzczMzI1fQ.8JOJnLml2uzDSLjUuWIprZpTADo_TnfqgblcELm2GYo'
$headers = @{
    apikey = $serviceKey
    Authorization = "Bearer $serviceKey"
}

$tables = @(
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

Write-Host "=== Verificando tabelas do PCGO Sistema ===" -ForegroundColor Cyan
Write-Host ""

$missing = @()
$existing = @()

foreach ($table in $tables) {
    try {
        $uri = "https://qlxabxhszpvetblvnfxl.supabase.co/rest/v1/$table" + "?select=id&limit=1"
        $response = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get -ErrorAction Stop
        Write-Host "[OK] $table" -ForegroundColor Green
        $existing += $table
    } catch {
        Write-Host "[FALTA] $table" -ForegroundColor Red
        $missing += $table
    }
}

Write-Host ""
Write-Host "=== Resumo ===" -ForegroundColor Cyan
Write-Host "Tabelas existentes: $($existing.Count)" -ForegroundColor Green
Write-Host "Tabelas faltando: $($missing.Count)" -ForegroundColor Red

if ($missing.Count -gt 0) {
    Write-Host ""
    Write-Host "!!! ACAO NECESSARIA !!!" -ForegroundColor Yellow
    Write-Host "Execute o arquivo scripts/setup-database-simples.sql no Supabase SQL Editor:"
    Write-Host "https://supabase.com/dashboard/project/qlxabxhszpvetblvnfxl/sql/new" -ForegroundColor Blue
    Write-Host ""
    Write-Host "Tabelas que precisam ser criadas:" -ForegroundColor Yellow
    Write-Host ($missing -join ', ')
}
