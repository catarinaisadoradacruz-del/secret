# Executar SQL no Supabase usando curl
$projectRef = 'qlxabxhszpvetblvnfxl'
$serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseGFieGhzenB2ZXRibHZuZnhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzMyNSwiZXhwIjoyMDgzMzczMzI1fQ.8JOJnLml2uzDSLjUuWIprZpTADo_TnfqgblcELm2GYo'
$dbPassword = 'Segura!01@@@'

Write-Host "=== PCGO Sistema - Executor SQL ===" -ForegroundColor Cyan

# Ler o arquivo SQL
$sqlPath = Join-Path $PSScriptRoot "setup-database-simples.sql"
$sql = Get-Content $sqlPath -Raw

# Separar em statements individuais (por ponto e virgula no final de linha)
$statements = $sql -split ';\s*\r?\n' | Where-Object { $_.Trim() -ne '' -and -not $_.Trim().StartsWith('--') }

Write-Host "Total de statements: $($statements.Count)" -ForegroundColor Yellow

# Headers
$headers = @{
    'apikey' = $serviceKey
    'Authorization' = "Bearer $serviceKey"
    'Content-Type' = 'application/json'
    'Prefer' = 'return=minimal'
}

# Tentar criar cada tabela diretamente via REST API (INSERT operation)
# Na verdade, vamos testar se uma funcao RPC exec existe

Write-Host "`nVerificando funcao exec_sql..." -ForegroundColor Yellow
try {
    $testBody = @{ query = "SELECT 1" } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "https://$projectRef.supabase.co/rest/v1/rpc/exec_sql" -Headers $headers -Method Post -Body $testBody
    Write-Host "Funcao exec_sql encontrada! Executando SQL..." -ForegroundColor Green

    # Executar cada statement
    $success = 0
    $failed = 0

    foreach ($stmt in $statements) {
        $stmt = $stmt.Trim()
        if ($stmt.Length -lt 10) { continue }

        $tableName = if ($stmt -match 'CREATE TABLE.*?(\w+)\s*\(') { $matches[1] } else { "statement" }

        Write-Host "Executando: $tableName..." -NoNewline
        try {
            $body = @{ query = "$stmt;" } | ConvertTo-Json -Depth 10
            $null = Invoke-RestMethod -Uri "https://$projectRef.supabase.co/rest/v1/rpc/exec_sql" -Headers $headers -Method Post -Body $body
            Write-Host " OK" -ForegroundColor Green
            $success++
        } catch {
            $errMsg = $_.Exception.Message
            if ($errMsg -match 'already exists') {
                Write-Host " [JA EXISTE]" -ForegroundColor Yellow
            } else {
                Write-Host " ERRO: $errMsg" -ForegroundColor Red
                $failed++
            }
        }
    }

    Write-Host "`nResultado: $success sucesso, $failed falhas" -ForegroundColor Cyan

} catch {
    Write-Host "Funcao exec_sql NAO encontrada." -ForegroundColor Red
    Write-Host ""
    Write-Host "=== CRIANDO FUNCAO exec_sql ===" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Execute o SQL abaixo no Supabase Dashboard:" -ForegroundColor White
    Write-Host "https://supabase.com/dashboard/project/$projectRef/sql/new" -ForegroundColor Blue
    Write-Host ""

    $createFunctionSQL = @"
-- Criar funcao para executar SQL via RPC
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS `$`$
BEGIN
  EXECUTE query;
END;
`$`$;
"@

    Write-Host $createFunctionSQL -ForegroundColor Green
    Write-Host ""

    # Copiar funcao para clipboard
    $createFunctionSQL | Set-Clipboard
    Write-Host "SQL da funcao copiado para clipboard!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Depois de criar a funcao, execute este script novamente." -ForegroundColor Yellow
}
