param(
    [switch]$NoBuild,
    [switch]$NoOpen,
    [switch]$Logs
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$composePath = Join-Path $projectRoot "compose.yaml"
$localEnvPath = Join-Path $projectRoot ".env.local"
$defaultEnvPath = Join-Path $projectRoot ".env"
$sharedNetworkName = "akadion_shared"

function Import-DotEnv {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Lipseste fisierul .env din radacina proiectului: $Path"
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

    if ([string]::IsNullOrWhiteSpace($env:MINIO_ACCESS_KEY) -and -not [string]::IsNullOrWhiteSpace($env:MINIO_ROOT_USER)) {
        $env:MINIO_ACCESS_KEY = $env:MINIO_ROOT_USER
    }

    if ([string]::IsNullOrWhiteSpace($env:MINIO_SECRET_KEY) -and -not [string]::IsNullOrWhiteSpace($env:MINIO_ROOT_PASSWORD)) {
        $env:MINIO_SECRET_KEY = $env:MINIO_ROOT_PASSWORD
    }
}

function Assert-Command {
    param([string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "$Name nu este instalat sau nu este disponibil in PATH."
    }
}

function Assert-EnvironmentVariable {
    param([string]$Name)

    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($Name, "Process"))) {
        throw "Lipseste variabila $Name din .env."
    }
}

function Ensure-DockerNetwork {
    param([string]$Name)

    & docker network inspect $Name *> $null
    if ($LASTEXITCODE -eq 0) {
        return
    }

    "Creez reteaua Docker externa $Name"
    & docker network create $Name | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Nu am putut crea reteaua Docker $Name."
    }
}

function Get-DockerPortOwners {
    param([int]$Port)

    $owners = @()
    $containerRows = @(& docker ps --format "{{.Names}}|{{.Ports}}")
    foreach ($row in $containerRows) {
        $parts = $row.Split("|", 2)
        if ($parts.Count -ne 2) {
            continue
        }

        $name = $parts[0]
        $ports = $parts[1]
        foreach ($mapping in $ports -split ',\s*') {
            $match = [regex]::Match($mapping, '^(?:[^:]+:)?(?<start>\d+)(?:-(?<end>\d+))?->')
            if (-not $match.Success) {
                continue
            }

            $start = [int]$match.Groups['start'].Value
            $end = if ($match.Groups['end'].Success) { [int]$match.Groups['end'].Value } else { $start }
            if ($Port -ge $start -and $Port -le $end) {
                $owners += $name
                break
            }
        }
    }

    return $owners
}

function Assert-HostPortAvailable {
    param([int]$Port)

    $dockerOwners = @(Get-DockerPortOwners -Port $Port)
    $blockingDockerOwners = @($dockerOwners | Where-Object { $_ -notmatch '^akadion-' })
    if ($blockingDockerOwners.Count -gt 0) {
        throw "Portul $Port este ocupat de containerul Docker $($blockingDockerOwners -join ', '). Opreste containerul conflictual si ruleaza din nou launcherul."
    }

    if ($dockerOwners.Count -gt 0) {
        return
    }

    $listeners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
    if ($listeners.Count -gt 0) {
        $processIds = @($listeners | Select-Object -ExpandProperty OwningProcess -Unique)
        throw "Portul $Port este ocupat de procesul/procesele PID $($processIds -join ', '). Opreste procesul conflictual si ruleaza din nou launcherul."
    }
}

function Wait-HttpStatus {
    param(
        [string]$Name,
        [string]$Url,
        [int[]]$AcceptedStatusCodes = @(200),
        [int]$TimeoutSeconds = 90
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 5
            $statusCode = [int]$response.StatusCode
            if ($AcceptedStatusCodes -contains $statusCode) {
                Write-Host "UP   - $Name ($Url)"
                return $true
            }
        } catch {
            if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
                $statusCode = [int]$_.Exception.Response.StatusCode
                if ($AcceptedStatusCodes -contains $statusCode) {
                    Write-Host "UP   - $Name ($Url)"
                    return $true
                }
            }
        }

        Start-Sleep -Seconds 3
    }

    Write-Host "WAIT - $Name inca nu raspunde dupa $TimeoutSeconds secunde ($Url)"
    return $false
}

if (-not (Test-Path -LiteralPath $composePath)) {
    throw "Nu am gasit compose.yaml: $composePath"
}

if (Test-Path -LiteralPath $localEnvPath) {
    $envPath = $localEnvPath
} else {
    $envPath = $defaultEnvPath
}

"Incarc secrete locale din $envPath"
Import-DotEnv -Path $envPath

$requiredVariables = @(
    "DB_PASSWORD",
    "MINIO_ROOT_USER",
    "MINIO_ROOT_PASSWORD",
    "KEYCLOAK_BACKEND_LOGIN_SECRET",
    "KEYCLOAK_ADMIN_API_SECRET",
    "RAG_SERVICE_USERNAME",
    "RAG_SERVICE_PASSWORD"
)

foreach ($variableName in $requiredVariables) {
    Assert-EnvironmentVariable -Name $variableName
}

Assert-Command -Name "docker"

"Verific Docker Desktop"
& docker info *> $null
if ($LASTEXITCODE -ne 0) {
    throw "Docker nu raspunde. Porneste Docker Desktop si ruleaza din nou launcherul."
}

Ensure-DockerNetwork -Name $sharedNetworkName

$requiredHostPorts = @(5432, 9000, 9001, 8080, 8081, 5173)
foreach ($port in $requiredHostPorts) {
    Assert-HostPortAvailable -Port $port
}

$composeArgs = @("compose", "-f", $composePath, "up", "-d")
if (-not $NoBuild) {
    $composeArgs += "--build"
}

"Pornesc AKADION cu Docker Compose"
& docker @composeArgs
if ($LASTEXITCODE -ne 0) {
    throw "docker compose up a esuat."
}

""
"Status containere:"
& docker compose -f $composePath ps

""
"Verific servicii principale:"
$null = Wait-HttpStatus -Name "Frontend" -Url "http://localhost:5173" -TimeoutSeconds 90
$null = Wait-HttpStatus -Name "Backend health" -Url "http://localhost:8081/actuator/health" -TimeoutSeconds 90
$null = Wait-HttpStatus -Name "Keycloak" -Url "http://localhost:8080/realms/Akadion/.well-known/openid-configuration" -TimeoutSeconds 90

if (-not $NoOpen) {
    Start-Process "http://localhost:5173"
}

""
"AKADION pornit. Frontend: http://localhost:5173"
"Pentru loguri: docker compose -f `"$composePath`" logs -f"

if ($Logs) {
    & docker compose -f $composePath logs -f
}
