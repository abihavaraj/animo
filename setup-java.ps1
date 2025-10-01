Write-Host "Setting up Java for Android development..." -ForegroundColor Green
Write-Host ""

# Check if Java is already installed
try {
    $javaVersion = java -version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Java is already installed:" -ForegroundColor Yellow
        Write-Host $javaVersion
        Write-Host ""
        Read-Host "Press Enter to continue with build"
        exit 0
    }
} catch {
    Write-Host "Java not found. Let's install it..." -ForegroundColor Yellow
}

Write-Host "Java JDK is required for Android development." -ForegroundColor Cyan
Write-Host ""
Write-Host "Please follow these steps:" -ForegroundColor Yellow
Write-Host "1. Download OpenJDK 17 from: https://adoptium.net/temurin/releases/?version=17" -ForegroundColor White
Write-Host "2. Install it to default location (usually C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot\)" -ForegroundColor White
Write-Host "3. Run this script again after installation" -ForegroundColor White
Write-Host ""
Write-Host "Alternative: Install using Chocolatey (if you have it):" -ForegroundColor Yellow
Write-Host "choco install openjdk17" -ForegroundColor White
Write-Host ""
Write-Host "Alternative: Install using winget:" -ForegroundColor Yellow
Write-Host "winget install EclipseAdoptium.Temurin.17.JDK" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter after installing Java"
