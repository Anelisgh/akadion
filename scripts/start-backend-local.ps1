param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ForwardedArgs
)

$ErrorActionPreference = "Stop"

$targetScript = Join-Path $PSScriptRoot "start-backend.ps1"

if (-not (Test-Path -LiteralPath $targetScript)) {
    throw "Scriptul start-backend.ps1 lipseste."
}

& $targetScript @ForwardedArgs
