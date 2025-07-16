# ANIMO Pilates Studio Backend Deployment Script
Write-Host "Deploying ANIMO Pilates Studio Backend to Fly.io..." -ForegroundColor Green

# Set Fly CLI path
$env:PATH += ";C:\Users\User\.fly\bin"

# Check if flyctl is available
try {
    $version = & flyctl.exe version
    Write-Host "Fly CLI found: $version" -ForegroundColor Green
} catch {
    Write-Host "Fly CLI not found. Please install it first." -ForegroundColor Red
Write-Host "Run: iwr https://fly.io/install.ps1 -useb | iex" -ForegroundColor Yellow
    exit 1
}

# Check if logged in
try {
    $auth = & flyctl.exe auth whoami
    Write-Host "Logged in as: $auth" -ForegroundColor Green
} catch {
    Write-Host "Not logged in. Please run: flyctl auth login" -ForegroundColor Red
    exit 1
}

# Deploy the application
Write-Host "Deploying to Fly.io..." -ForegroundColor Yellow
try {
    & flyctl.exe deploy
    Write-Host "Deployment successful!" -ForegroundColor Green
Write-Host "Your backend is now live!" -ForegroundColor Green
} catch {
    Write-Host "Deployment failed. Check the error messages above." -ForegroundColor Red
    exit 1
}

Write-Host "Backend deployment complete!" -ForegroundColor Green 