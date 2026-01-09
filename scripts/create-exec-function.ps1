# Criar funcao exec_sql no Supabase para permitir executar SQL via RPC
$projectRef = 'qlxabxhszpvetblvnfxl'
$serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseGFieGhzenB2ZXRibHZuZnhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzMyNSwiZXhwIjoyMDgzMzczMzI1fQ.8JOJnLml2uzDSLjUuWIprZpTADo_TnfqgblcELm2GYo'

$headers = @{
    'apikey' = $serviceKey
    'Authorization' = "Bearer $serviceKey"
    'Content-Type' = 'application/json'
}

Write-Host "=== Criando Funcao exec_sql ===" -ForegroundColor Cyan

# SQL para criar a funcao
$createFunctionSQL = @"
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS \$\$
BEGIN
  EXECUTE query;
END;
\$\$;
"@

Write-Host "Funcao exec_sql permite executar SQL via REST API" -ForegroundColor Yellow
Write-Host ""
Write-Host "Para criar esta funcao, execute o seguinte SQL no Supabase:"
Write-Host ""
Write-Host $createFunctionSQL -ForegroundColor Green
Write-Host ""
Write-Host "Depois, voce podera executar SQL via:"
Write-Host "POST /rest/v1/rpc/exec_sql"
Write-Host "Body: { 'query': 'CREATE TABLE...' }"

# Copiar para clipboard
$createFunctionSQL | Set-Clipboard
Write-Host ""
Write-Host "SQL copiado para a area de transferencia!" -ForegroundColor Green
