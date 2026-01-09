# Executar SQL diretamente no Supabase usando Npgsql (.NET)
# Instalar Npgsql se nao existir

$projectRef = 'qlxabxhszpvetblvnfxl'
$dbPassword = 'Segura!01@@@'

# Connection strings
$host = "aws-0-us-east-1.pooler.supabase.com"
$port = 6543
$database = "postgres"
$user = "postgres.$projectRef"

Write-Host "=== PCGO Sistema - Executor SQL Direto ===" -ForegroundColor Cyan
Write-Host ""

# Verificar se Npgsql esta disponivel
$npgsqlPath = $null
$possiblePaths = @(
    "$env:USERPROFILE\.nuget\packages\npgsql\*\lib\net*\Npgsql.dll",
    "C:\Program Files\PackageManagement\NuGet\Packages\Npgsql*\lib\net*\Npgsql.dll"
)

foreach ($pattern in $possiblePaths) {
    $found = Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        $npgsqlPath = $found.FullName
        break
    }
}

if (-not $npgsqlPath) {
    Write-Host "Npgsql nao encontrado. Tentando instalar via NuGet..." -ForegroundColor Yellow

    # Tentar baixar Npgsql diretamente
    $nugetUrl = "https://www.nuget.org/api/v2/package/Npgsql/8.0.1"
    $downloadPath = Join-Path $PSScriptRoot "npgsql.zip"
    $extractPath = Join-Path $PSScriptRoot "npgsql"

    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $nugetUrl -OutFile $downloadPath
        Expand-Archive -Path $downloadPath -DestinationPath $extractPath -Force
        $npgsqlPath = Get-ChildItem -Path "$extractPath\lib\net*\Npgsql.dll" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($npgsqlPath) {
            $npgsqlPath = $npgsqlPath.FullName
        }
    } catch {
        Write-Host "Erro ao baixar Npgsql: $($_.Exception.Message)" -ForegroundColor Red
    }
}

if ($npgsqlPath) {
    Write-Host "Usando Npgsql: $npgsqlPath" -ForegroundColor Green
    Add-Type -Path $npgsqlPath

    $connString = "Host=$host;Port=$port;Database=$database;Username=$user;Password=$dbPassword;SSL Mode=Require;Trust Server Certificate=true"

    try {
        $conn = New-Object Npgsql.NpgsqlConnection($connString)
        $conn.Open()
        Write-Host "Conexao estabelecida!" -ForegroundColor Green

        # Executar SQL de criacao de tabelas
        $sqlPath = Join-Path $PSScriptRoot "setup-database-simples.sql"
        if (Test-Path $sqlPath) {
            $sql = Get-Content $sqlPath -Raw
            $cmd = $conn.CreateCommand()
            $cmd.CommandText = $sql
            $cmd.ExecuteNonQuery()
            Write-Host "SQL executado com sucesso!" -ForegroundColor Green
        }

        $conn.Close()
    } catch {
        Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host ""
    Write-Host "=== METODO ALTERNATIVO ===" -ForegroundColor Yellow
    Write-Host "Nao foi possivel usar conexao direta. Use o Supabase Dashboard:" -ForegroundColor White
    Write-Host ""
    Write-Host "1. Abra: https://supabase.com/dashboard/project/$projectRef/sql/new" -ForegroundColor Blue
    Write-Host "2. Cole o SQL do arquivo: scripts/setup-database-simples.sql" -ForegroundColor White
    Write-Host "3. Clique em Run" -ForegroundColor White
    Write-Host ""

    # Copiar SQL para clipboard
    $sqlPath = Join-Path $PSScriptRoot "setup-database-simples.sql"
    if (Test-Path $sqlPath) {
        Get-Content $sqlPath -Raw | Set-Clipboard
        Write-Host "SQL copiado para a area de transferencia!" -ForegroundColor Green
    }
}
