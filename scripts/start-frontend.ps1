param()

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$frontendDir = Join-Path $projectRoot "frontend"
$packageJson = Join-Path $frontendDir "package.json"
$nodeModules = Join-Path $frontendDir "node_modules"

if (-not (Test-Path -LiteralPath $frontendDir)) {
    throw "Folderul frontend nu exista: $frontendDir"
}

if (-not (Test-Path -LiteralPath $packageJson)) {
    throw "package.json lipseste din frontend."
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js nu este instalat sau nu este disponibil in PATH."
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "npm nu este instalat sau nu este disponibil in PATH."
}

Push-Location $frontendDir
try {
    if (-not (Test-Path -LiteralPath $nodeModules)) {
        npm.cmd install
    }

    npm.cmd run dev -- --host localhost --port 5173
} finally {
    Pop-Location
}
