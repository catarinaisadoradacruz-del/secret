$serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseGFieGhzenB2ZXRibHZuZnhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzMyNSwiZXhwIjoyMDgzMzczMzI1fQ.8JOJnLml2uzDSLjUuWIprZpTADo_TnfqgblcELm2GYo'

$headers = @{
    apikey = $serviceKey
    Authorization = "Bearer $serviceKey"
    "Content-Type" = "application/json"
    Prefer = "return=minimal"
}

# Tabelas a criar via insert de dados dummy e depois delete
# (Isso nao vai funcionar para criar tabelas, entao precisamos usar o SQL Editor)

Write-Host "=== Criando tabelas no Supabase ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "ATENCAO: O Supabase REST API nao permite criar tabelas." -ForegroundColor Yellow
Write-Host "Voce precisa executar o SQL manualmente." -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Abra o link abaixo no navegador:" -ForegroundColor White
Write-Host "   https://supabase.com/dashboard/project/qlxabxhszpvetblvnfxl/sql/new" -ForegroundColor Blue
Write-Host ""
Write-Host "2. Cole o conteudo do arquivo:" -ForegroundColor White
Write-Host "   scripts/setup-database-simples.sql" -ForegroundColor Green
Write-Host ""
Write-Host "3. Clique em 'Run' para executar" -ForegroundColor White
Write-Host ""

# Copiar SQL para clipboard
$sqlPath = Join-Path $PSScriptRoot "setup-database-simples.sql"
if (Test-Path $sqlPath) {
    Get-Content $sqlPath | Set-Clipboard
    Write-Host "O SQL foi copiado para a area de transferencia!" -ForegroundColor Green
    Write-Host "Basta colar (Ctrl+V) no SQL Editor do Supabase." -ForegroundColor Green
} else {
    Write-Host "Arquivo SQL nao encontrado em: $sqlPath" -ForegroundColor Red
}
