param()

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$composePath = Join-Path $projectRoot "akadion-backend-modificat\akadion-backend-modificat\proiect\compose.yaml"

if (-not $composePath) {
    throw "Nu am gasit compose.yaml pentru PostgreSQL in proiect."
}

if (-not (Test-Path -LiteralPath $composePath)) {
    throw "Nu am gasit compose.yaml pentru PostgreSQL: $composePath"
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker nu este instalat sau nu este disponibil in PATH."
}

if ([string]::IsNullOrWhiteSpace($env:DB_PASSWORD)) {
    throw "Lipseste variabila de mediu DB_PASSWORD. Ruleaza mai intai . .\scripts\set-local-secrets.ps1"
}

$services = @(docker compose -f "$composePath" config --services)
if ($LASTEXITCODE -ne 0) {
    throw "Nu am putut citi serviciile din $composePath. Verifica Docker Desktop si sintaxa fisierului compose."
}

if ($services -notcontains "postgres") {
    throw "Serviciul 'postgres' lipseste din $composePath"
}

docker compose -f "$composePath" up -d postgres
if ($LASTEXITCODE -ne 0) {
    throw "Pornirea serviciului 'postgres' a esuat."
}

$portMapping = @(docker compose -f "$composePath" port postgres 5432 2>$null)
if ($LASTEXITCODE -ne 0 -or $portMapping.Count -eq 0) {
    throw "Serviciul 'postgres' nu expune portul 5432."
}

if (-not ($portMapping[0] -match ':5432\s*$')) {
    throw "Serviciul 'postgres' nu este mapat pe portul local 5432. Mapping curent: $($portMapping[0])"
}

docker compose -f "$composePath" ps postgres
"PostgreSQL este pornit prin $composePath si expune localhost:5432"
