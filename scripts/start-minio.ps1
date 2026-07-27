param()

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$composePath = Join-Path $projectRoot "compose.yaml"
$dotenvPath = Join-Path $projectRoot ".env"

function Get-DotEnvValue {
    param(
        [string]$Name
    )

    if (-not (Test-Path -LiteralPath $dotenvPath)) {
        return $null
    }

    foreach ($line in Get-Content -LiteralPath $dotenvPath) {
        if ($line -match '^\s*#' -or $line -match '^\s*$') {
            continue
        }

        $parts = $line -split '=', 2
        if ($parts.Count -ne 2) {
            continue
        }

        if ($parts[0].Trim() -eq $Name) {
            return $parts[1].Trim()
        }
    }

    return $null
}

if (-not (Test-Path -LiteralPath $composePath)) {
    throw "Nu am gasit compose.yaml pentru MinIO: $composePath"
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker nu este instalat sau nu este disponibil in PATH."
}

if ([string]::IsNullOrWhiteSpace($env:MINIO_ROOT_USER)) {
    $env:MINIO_ROOT_USER = Get-DotEnvValue -Name "MINIO_ROOT_USER"
}

if ([string]::IsNullOrWhiteSpace($env:MINIO_ROOT_PASSWORD)) {
    $env:MINIO_ROOT_PASSWORD = Get-DotEnvValue -Name "MINIO_ROOT_PASSWORD"
}

if ([string]::IsNullOrWhiteSpace($env:MINIO_ROOT_USER)) {
    throw "Lipseste MINIO_ROOT_USER. Pune valoarea in .env sau seteaz-o in sesiunea curenta de PowerShell."
}

if ([string]::IsNullOrWhiteSpace($env:MINIO_ROOT_PASSWORD)) {
    throw "Lipseste MINIO_ROOT_PASSWORD. Pune valoarea in .env sau seteaz-o in sesiunea curenta de PowerShell."
}

$services = @(docker compose -f "$composePath" config --services)
if ($LASTEXITCODE -ne 0) {
    throw "Nu am putut citi serviciile din $composePath. Verifica Docker Desktop si sintaxa fisierului compose."
}

if ($services -notcontains "minio") {
    throw "Serviciul 'minio' lipseste din $composePath"
}

docker compose -f "$composePath" up -d minio
if ($LASTEXITCODE -ne 0) {
    throw "Pornirea serviciului 'minio' a esuat."
}

$apiPortMapping = @(docker compose -f "$composePath" port minio 9000 2>$null)
if ($LASTEXITCODE -ne 0 -or $apiPortMapping.Count -eq 0) {
    throw "Serviciul 'minio' nu expune portul 9000."
}

if (-not ($apiPortMapping[0] -match ':9000\s*$')) {
    throw "Serviciul 'minio' nu este mapat pe portul local 9000. Mapping curent: $($apiPortMapping[0])"
}

$consolePortMapping = @(docker compose -f "$composePath" port minio 9001 2>$null)
if ($LASTEXITCODE -ne 0 -or $consolePortMapping.Count -eq 0) {
    throw "Serviciul 'minio' nu expune portul 9001."
}

if (-not ($consolePortMapping[0] -match ':9001\s*$')) {
    throw "Serviciul 'minio' nu este mapat pe portul local 9001. Mapping curent: $($consolePortMapping[0])"
}

docker compose -f "$composePath" ps minio
"MinIO este pornit prin $composePath si expune localhost:9000 si localhost:9001"
