# Tentar varias formas de executar SQL no Supabase
$projectRef = 'qlxabxhszpvetblvnfxl'
$serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseGFieGhzenB2ZXRibHZuZnhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzMyNSwiZXhwIjoyMDgzMzczMzI1fQ.8JOJnLml2uzDSLjUuWIprZpTADo_TnfqgblcELm2GYo'

Write-Host "=== Tentando diferentes endpoints SQL ===" -ForegroundColor Cyan

# Endpoints para testar
$endpoints = @(
    @{ name = "pg (sql)"; url = "https://$projectRef.supabase.co/pg/sql"; method = "POST"; body = @{ query = "SELECT 1 as test" } },
    @{ name = "pg/query"; url = "https://$projectRef.supabase.co/pg/query"; method = "POST"; body = @{ query = "SELECT 1" } },
    @{ name = "rest/v1/rpc/query"; url = "https://$projectRef.supabase.co/rest/v1/rpc/query"; method = "POST"; body = @{ sql = "SELECT 1" } },
    @{ name = "graphql"; url = "https://$projectRef.supabase.co/graphql/v1"; method = "POST"; body = @{ query = "{ __typename }" } }
)

$headers = @{
    'apikey' = $serviceKey
    'Authorization' = "Bearer $serviceKey"
    'Content-Type' = 'application/json'
}

foreach ($ep in $endpoints) {
    Write-Host "`nTestando $($ep.name)..." -ForegroundColor Yellow
    Write-Host "URL: $($ep.url)" -ForegroundColor Gray

    try {
        $body = $ep.body | ConvertTo-Json
        $response = Invoke-RestMethod -Uri $ep.url -Headers $headers -Method $ep.method -Body $body -ErrorAction Stop
        Write-Host "SUCESSO! Resposta: $($response | ConvertTo-Json -Compress)" -ForegroundColor Green
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorBody = ""
        try {
            $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
            $errorBody = $reader.ReadToEnd()
            $reader.Close()
        } catch {}
        Write-Host "ERRO ($statusCode): $($_.Exception.Message)" -ForegroundColor Red
        if ($errorBody) {
            Write-Host "Detalhes: $errorBody" -ForegroundColor DarkRed
        }
    }
}

# Testar endpoint de funcoes disponiveis
Write-Host "`n=== Listando funcoes RPC disponiveis ===" -ForegroundColor Cyan
try {
    $schemaUrl = "https://$projectRef.supabase.co/rest/v1/?apikey=$serviceKey"
    Write-Host "Buscando schema..." -ForegroundColor Yellow
    # Note: Este endpoint nao existe no Supabase publico
} catch {
    Write-Host "Nao foi possivel listar funcoes" -ForegroundColor Red
}

Write-Host "`n=== CONCLUSAO ===" -ForegroundColor Cyan
Write-Host "O Supabase REST API nao permite executar DDL diretamente." -ForegroundColor Yellow
Write-Host ""
Write-Host "SOLUCAO: Voce precisa acessar o Dashboard do Supabase e:" -ForegroundColor White
Write-Host "1. Ir para: https://supabase.com/dashboard/project/$projectRef/sql/new" -ForegroundColor Blue
Write-Host "2. Colar o conteudo de: scripts/setup-database-simples.sql" -ForegroundColor White
Write-Host "3. Clicar em 'Run'" -ForegroundColor White
