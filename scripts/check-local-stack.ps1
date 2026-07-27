param()

$ErrorActionPreference = "Stop"

$targetScript = Join-Path $PSScriptRoot "check-local-services.ps1"

if (-not (Test-Path -LiteralPath $targetScript)) {
    throw "Scriptul check-local-services.ps1 lipseste."
}

& $targetScript
