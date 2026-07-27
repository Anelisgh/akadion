param()

$ErrorActionPreference = "Stop"

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

function Get-HttpStatus {
    param(
        [string]$Url,
        [int[]]$AcceptedStatusCodes = @(200)
    )

    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec 5 -UseBasicParsing
        $statusCode = [int]$response.StatusCode
        return @{ Up = ($AcceptedStatusCodes -contains $statusCode); Message = "HTTP $statusCode" }
    } catch {
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
            $statusCode = [int]$_.Exception.Response.StatusCode
            return @{ Up = ($AcceptedStatusCodes -contains $statusCode); Message = "HTTP $statusCode" }
        }

        return @{ Up = $false; Message = "fara raspuns" }
    }
}

$checks = @(
    @{ Name = "PostgreSQL"; Type = "tcp"; Host = "localhost"; Port = 5432; Hint = "baza Docker pentru backend" },
    @{ Name = "Keycloak"; Type = "http"; Url = "http://localhost:8080/realms/Akadion/.well-known/openid-configuration"; Hint = "realm-ul Akadion din instanta ZIP" },
    @{ Name = "Backend"; Type = "http"; Url = "http://localhost:8081/actuator/health"; Hint = "healthcheck Spring Boot" },
    @{ Name = "Backend auth"; Type = "http"; Url = "http://localhost:8081/api/auth/me"; AcceptedStatusCodes = @(200, 401, 403); Hint = "endpoint BFF /api/auth/me" },
    @{ Name = "Frontend"; Type = "http"; Url = "http://localhost:5173"; Hint = "dev server Vite" },
    @{ Name = "MinIO API"; Type = "tcp"; Host = "localhost"; Port = 9000; Hint = "S3 API" },
    @{ Name = "MinIO Console"; Type = "tcp"; Host = "localhost"; Port = 9001; Hint = "console web" }
)

foreach ($check in $checks) {
    if ($check.Type -eq "tcp") {
        if (Test-TcpPort -ComputerName $check.Host -Port $check.Port) {
            "UP   - $($check.Name): $($check.Host):$($check.Port) ($($check.Hint))"
        } else {
            "DOWN - $($check.Name): $($check.Host):$($check.Port) ($($check.Hint))"
        }

        continue
    }

    $acceptedStatusCodes = @(200)
    if ($check.ContainsKey("AcceptedStatusCodes") -and $check.AcceptedStatusCodes -and $check.AcceptedStatusCodes.Count -gt 0) {
        $acceptedStatusCodes = $check.AcceptedStatusCodes
    }

    $result = Get-HttpStatus -Url $check.Url -AcceptedStatusCodes $acceptedStatusCodes

    if ($result.Up) {
        "UP   - $($check.Name): $($check.Url) ($($result.Message); $($check.Hint))"
    } else {
        "DOWN - $($check.Name): $($check.Url) ($($result.Message); $($check.Hint))"
    }
}
