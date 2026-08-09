param(
    [switch]$RemoveVolumes
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$composePath = Join-Path $projectRoot "compose.yaml"
$localEnvPath = Join-Path $projectRoot ".env.local"
$defaultEnvPath = Join-Path $projectRoot ".env"

function Import-DotEnv {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    foreach ($line in [System.IO.File]::ReadLines($Path)) {
        $trimmedLine = $line.Trim()
        if ([string]::IsNullOrWhiteSpace($trimmedLine) -or $trimmedLine.StartsWith("#")) {
            continue
        }

        $match = [regex]::Match($trimmedLine, '^([^=\s]+)\s*=\s*(.*)$')
        if (-not $match.Success) {
            continue
        }

        $name = $match.Groups[1].Value.Trim()
        $value = $match.Groups[2].Value.Trim()

        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

if (-not (Test-Path -LiteralPath $composePath)) {
    throw "Nu am gasit compose.yaml: $composePath"
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "docker nu este instalat sau nu este disponibil in PATH."
}

if (Test-Path -LiteralPath $localEnvPath) {
    Import-DotEnv -Path $localEnvPath
} else {
    Import-DotEnv -Path $defaultEnvPath
}

$composeArgs = @("compose", "-f", $composePath, "down")
if ($RemoveVolumes) {
    $composeArgs += "-v"
}

"Opresc AKADION"
& docker @composeArgs
if ($LASTEXITCODE -ne 0) {
    throw "docker compose down a esuat."
}

if ($RemoveVolumes) {
    "AKADION oprit. Volumele Docker au fost sterse."
} else {
    "AKADION oprit. Datele locale din volume au fost pastrate."
}
