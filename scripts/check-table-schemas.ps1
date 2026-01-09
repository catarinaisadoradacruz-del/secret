# Verificar schema das tabelas existentes
$projectRef = 'qlxabxhszpvetblvnfxl'
$serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseGFieGhzenB2ZXRibHZuZnhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzMyNSwiZXhwIjoyMDgzMzczMzI1fQ.8JOJnLml2uzDSLjUuWIprZpTADo_TnfqgblcELm2GYo'

$headers = @{
    'apikey' = $serviceKey
    'Authorization' = "Bearer $serviceKey"
    'Content-Type' = 'application/json'
    'Prefer' = 'return=representation'
}

Write-Host "=== Verificando schema das tabelas existentes ===" -ForegroundColor Cyan

# Buscar um registro de cada tabela para ver as colunas
$tables = @('documents', 'operations', 'forensic_analysis', 'rai_analysis', 'alvos')

foreach ($table in $tables) {
    Write-Host "`n=== $table ===" -ForegroundColor Yellow
    try {
        $url = "https://$projectRef.supabase.co/rest/v1/$table`?select=*&limit=0"
        # Headers de resposta mostram as colunas
        $response = Invoke-WebRequest -Uri $url -Headers $headers -Method Head -ErrorAction Stop
        $contentRange = $response.Headers['Content-Range']
        Write-Host "Tabela existe. Content-Range: $contentRange" -ForegroundColor Green

        # Buscar dados para ver estrutura
        $dataUrl = "https://$projectRef.supabase.co/rest/v1/$table`?select=*&limit=1"
        $data = Invoke-RestMethod -Uri $dataUrl -Headers $headers -Method Get
        if ($data -and $data.Count -gt 0) {
            $columns = $data[0].PSObject.Properties.Name
            Write-Host "Colunas: $($columns -join ', ')" -ForegroundColor Cyan
        } else {
            Write-Host "Tabela vazia, obtendo colunas via HEAD..." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
    }
}
