param()

$ErrorActionPreference = "Stop"

function Get-JavaMajorVersion {
    # In Windows PowerShell 5.1, `java -version` writes to stderr even on success.
    $versionOutput = & cmd /d /c 'java -version 2>&1'
    if ($LASTEXITCODE -ne 0) {
        throw "Java nu a putut fi executat."
    }

    if (-not $versionOutput) {
        return $null
    }

    $firstLine = [string]$versionOutput[0]
    $match = [regex]::Match($firstLine, 'version\s+"(?<version>\d+)(?:\.[^\"]*)?')
    if (-not $match.Success) {
        return $null
    }

    return [int]$match.Groups['version'].Value
}

function Assert-RequiredEnvironmentVariable {
    param(
        [string]$Name,
        [string]$Hint
    )

    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($Name, 'Process'))) {
        throw "Lipseste variabila de mediu $Name. $Hint"
    }
}

function Test-TcpPort {
    param(
        [string]$ComputerName,
        [int]$Port
    )

    $client = [System.Net.Sockets.TcpClient]::new()

    try {
        $asyncResult = $client.BeginConnect($ComputerName, $Port, $null, $null)
        if (-not $asyncResult.AsyncWaitHandle.WaitOne(3000, $false)) {
            return $false
        }

        $client.EndConnect($asyncResult)
        return $true
    } catch {
        return $false
    } finally {
        $client.Dispose()
    }
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $projectRoot "akadion-backend-modificat\proiect"
$mavenWrapper = Join-Path $backendDir "mvnw.cmd"
$keycloakWellKnownUrl = "http://localhost:8080/realms/Akadion/.well-known/openid-configuration"

if (-not (Test-Path -LiteralPath $backendDir)) {
    throw "Folderul backend nu exista: $backendDir"
}

if (-not (Test-Path -LiteralPath $mavenWrapper)) {
    throw "Nu am gasit Maven Wrapper-ul proiectului: $mavenWrapper"
}

if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
    throw "Java nu este instalat sau nu este disponibil in PATH. Backend-ul cere Java 21."
}

$javaMajorVersion = Get-JavaMajorVersion
if ($null -eq $javaMajorVersion) {
    throw "Nu am putut determina versiunea Java. Backend-ul cere Java 21 sau mai nou."
}

if ($javaMajorVersion -lt 21) {
    throw "Versiunea Java detectata este $javaMajorVersion. Backend-ul cere Java 21 sau mai nou."
}

if ([string]::IsNullOrWhiteSpace($env:MINIO_ACCESS_KEY) -and -not [string]::IsNullOrWhiteSpace($env:MINIO_ROOT_USER)) {
    $env:MINIO_ACCESS_KEY = $env:MINIO_ROOT_USER
}

if ([string]::IsNullOrWhiteSpace($env:MINIO_SECRET_KEY) -and -not [string]::IsNullOrWhiteSpace($env:MINIO_ROOT_PASSWORD)) {
    $env:MINIO_SECRET_KEY = $env:MINIO_ROOT_PASSWORD
}

Assert-RequiredEnvironmentVariable -Name "DB_PASSWORD" -Hint "Ruleaza mai intai . .\scripts\set-local-secrets.ps1"
Assert-RequiredEnvironmentVariable -Name "KEYCLOAK_BACKEND_LOGIN_SECRET" -Hint "Ruleaza mai intai . .\scripts\set-local-secrets.ps1"
Assert-RequiredEnvironmentVariable -Name "KEYCLOAK_ADMIN_API_SECRET" -Hint "Ruleaza mai intai . .\scripts\set-local-secrets.ps1"
Assert-RequiredEnvironmentVariable -Name "MINIO_ACCESS_KEY" -Hint "Ruleaza mai intai . .\scripts\set-local-secrets.ps1"
Assert-RequiredEnvironmentVariable -Name "MINIO_SECRET_KEY" -Hint "Ruleaza mai intai . .\scripts\set-local-secrets.ps1"

try {
    $null = Invoke-WebRequest -UseBasicParsing -Uri $keycloakWellKnownUrl -TimeoutSec 5
} catch {
    throw "Keycloak nu raspunde la $keycloakWellKnownUrl. Porneste instanta locala din ZIP inainte de backend."
}

if (-not (Test-TcpPort -ComputerName "localhost" -Port 5432)) {
    throw "PostgreSQL nu asculta pe localhost:5432. Porneste mai intai .\scripts\start-postgres.ps1"
}

if (-not (Test-TcpPort -ComputerName "localhost" -Port 9000)) {
    throw "MinIO nu asculta pe localhost:9000. Porneste mai intai .\scripts\start-minio.ps1"
}

$env:SPRING_PROFILES_ACTIVE = "local"

Push-Location $backendDir
try {
    "Pornesc backendul din $backendDir pe http://localhost:8081 cu profilul local"
    & cmd /d /c "`"$mavenWrapper`" spring-boot:run `"-Dspring-boot.run.profiles=local`" `"-Dspring-boot.run.arguments=--server.port=8081`" 2>&1"
    if ($LASTEXITCODE -ne 0) {
        throw "Pornirea backendului prin Maven Wrapper a esuat."
    }
} finally {
    Pop-Location
}
