# Testar endpoints SQL do Supabase
$projectRef = 'qlxabxhszpvetblvnfxl'
$serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseGFieGhzenB2ZXRibHZuZnhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzMyNSwiZXhwIjoyMDgzMzczMzI1fQ.8JOJnLml2uzDSLjUuWIprZpTADo_TnfqgblcELm2GYo'
$dbPassword = 'Segura!01@@@'

# Headers para API
$headers = @{
    'apikey' = $serviceKey
    'Authorization' = "Bearer $serviceKey"
    'Content-Type' = 'application/json'
    'Prefer' = 'return=representation'
}

Write-Host "=== Testando metodos de execucao SQL ===" -ForegroundColor Cyan

# 1. Tentar listar funcoes RPC disponiveis
Write-Host "`n1. Verificando funcoes RPC disponiveis..." -ForegroundColor Yellow
try {
    $schemaUrl = "https://$projectRef.supabase.co/rest/v1/"
    $response = Invoke-RestMethod -Uri $schemaUrl -Headers $headers -Method Options
    Write-Host "Schema disponivel" -ForegroundColor Green
} catch {
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Tentar endpoint pg/query (Management API)
Write-Host "`n2. Testando Management API (pg/query)..." -ForegroundColor Yellow
try {
    $mgmtUrl = "https://api.supabase.com/v1/projects/$projectRef/database/query"
    $body = @{ query = "SELECT current_database()" } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri $mgmtUrl -Headers @{
        'Authorization' = "Bearer $serviceKey"
        'Content-Type' = 'application/json'
    } -Method Post -Body $body
    Write-Host "Sucesso! Resultado: $response" -ForegroundColor Green
} catch {
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Verificar conexao string para pooler
Write-Host "`n3. String de conexao PostgreSQL:" -ForegroundColor Yellow
$connString = "postgresql://postgres.${projectRef}:${dbPassword}@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
Write-Host "Transaction Mode: $connString" -ForegroundColor Blue

$connStringSession = "postgresql://postgres.${projectRef}:${dbPassword}@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
Write-Host "Session Mode: $connStringSession" -ForegroundColor Blue

Write-Host "`n4. Para usar com psql ou cliente postgres:" -ForegroundColor Yellow
Write-Host "Host: aws-0-us-east-1.pooler.supabase.com" -ForegroundColor White
Write-Host "Port: 6543 (transaction) ou 5432 (session)" -ForegroundColor White
Write-Host "Database: postgres" -ForegroundColor White
Write-Host "User: postgres.${projectRef}" -ForegroundColor White
Write-Host "Password: $dbPassword" -ForegroundColor White
