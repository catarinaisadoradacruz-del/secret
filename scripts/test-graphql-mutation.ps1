# Testar se GraphQL permite criar tabelas
$projectRef = 'qlxabxhszpvetblvnfxl'
$serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseGFieGhzenB2ZXRibHZuZnhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzMyNSwiZXhwIjoyMDgzMzczMzI1fQ.8JOJnLml2uzDSLjUuWIprZpTADo_TnfqgblcELm2GYo'

$headers = @{
    'apikey' = $serviceKey
    'Authorization' = "Bearer $serviceKey"
    'Content-Type' = 'application/json'
}

Write-Host "=== Explorando GraphQL Schema ===" -ForegroundColor Cyan

# Introspection query para ver tipos disponiveis
$introspectionQuery = @{
    query = @'
{
  __schema {
    queryType { name }
    mutationType { name }
    types {
      name
      kind
    }
  }
}
'@
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://$projectRef.supabase.co/graphql/v1" -Headers $headers -Method Post -Body $introspectionQuery
    Write-Host "Query Type: $($response.data.__schema.queryType.name)" -ForegroundColor Green
    Write-Host "Mutation Type: $($response.data.__schema.mutationType.name)" -ForegroundColor Green

    Write-Host "`nTipos disponiveis:" -ForegroundColor Yellow
    $response.data.__schema.types | Where-Object { $_.kind -eq 'OBJECT' -and -not $_.name.StartsWith('__') } | ForEach-Object {
        Write-Host "  - $($_.name)" -ForegroundColor White
    }
} catch {
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
}

# Tentar ver se existe tabela alvo_telefones
Write-Host "`n=== Verificando tabelas existentes via GraphQL ===" -ForegroundColor Cyan

$checkTables = @(
    'alvo_telefonesCollection',
    'alvo_enderecosCollection',
    'documentosCollection',
    'chat_sessionsCollection'
)

foreach ($table in $checkTables) {
    $query = @{
        query = "{ $table(first: 1) { edges { node { id } } } }"
    } | ConvertTo-Json

    Write-Host "Verificando $table..." -NoNewline
    try {
        $response = Invoke-RestMethod -Uri "https://$projectRef.supabase.co/graphql/v1" -Headers $headers -Method Post -Body $query
        if ($response.errors) {
            Write-Host " NAO EXISTE" -ForegroundColor Red
        } else {
            Write-Host " OK" -ForegroundColor Green
        }
    } catch {
        Write-Host " ERRO" -ForegroundColor Red
    }
}
