param(
    [string]$DbPassword,
    [string]$KeycloakBackendLoginSecret,
    [string]$KeycloakAdminApiSecret,
    [string]$MinioAccessKey = "minioadmin",
    [string]$MinioSecretKey,
    [string]$RagServiceUsername = "akadion-spring-backend",
    [string]$RagServicePassword
)

if ([string]::IsNullOrWhiteSpace($DbPassword)) {
    $DbPassword = Read-Host "DB_PASSWORD"
}

if ([string]::IsNullOrWhiteSpace($KeycloakBackendLoginSecret)) {
    $KeycloakBackendLoginSecret = Read-Host "KEYCLOAK_BACKEND_LOGIN_SECRET"
}

if ([string]::IsNullOrWhiteSpace($KeycloakAdminApiSecret)) {
    $KeycloakAdminApiSecret = Read-Host "KEYCLOAK_ADMIN_API_SECRET"
}

if ([string]::IsNullOrWhiteSpace($MinioAccessKey)) {
    $MinioAccessKey = Read-Host "MINIO_ACCESS_KEY"
}

if ([string]::IsNullOrWhiteSpace($MinioSecretKey)) {
    $MinioSecretKey = Read-Host "MINIO_SECRET_KEY"
}

if ([string]::IsNullOrWhiteSpace($RagServiceUsername)) {
    $RagServiceUsername = Read-Host "RAG_SERVICE_USERNAME"
}

if ([string]::IsNullOrWhiteSpace($RagServicePassword)) {
    $RagServicePassword = Read-Host "RAG_SERVICE_PASSWORD"
}

$env:DB_PASSWORD = $DbPassword
$env:KEYCLOAK_BACKEND_LOGIN_SECRET = $KeycloakBackendLoginSecret
$env:KEYCLOAK_ADMIN_API_SECRET = $KeycloakAdminApiSecret
$env:MINIO_ACCESS_KEY = $MinioAccessKey
$env:MINIO_SECRET_KEY = $MinioSecretKey

$env:MINIO_ROOT_USER = $MinioAccessKey
$env:MINIO_ROOT_PASSWORD = $MinioSecretKey

$env:RAG_SERVICE_USERNAME = $RagServiceUsername
$env:RAG_SERVICE_PASSWORD = $RagServicePassword

Write-Host ""
Write-Host "Variabilele locale au fost setate in terminalul curent." -ForegroundColor Green
Write-Host "Porneste backendul in acelasi terminal." -ForegroundColor Yellow
