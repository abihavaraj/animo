Write-Host "Setting up Android SDK for development..." -ForegroundColor Green
Write-Host ""

# Check if ANDROID_HOME is already set
if ($env:ANDROID_HOME) {
    Write-Host "ANDROID_HOME is already set to: $env:ANDROID_HOME" -ForegroundColor Yellow
    if (Test-Path $env:ANDROID_HOME) {
        Write-Host "Android SDK found at ANDROID_HOME" -ForegroundColor Green
        Read-Host "Press Enter to continue with build"
        exit 0
    }
}

Write-Host "Android SDK is required for building Android apps." -ForegroundColor Cyan
Write-Host ""
Write-Host "Please follow these steps:" -ForegroundColor Yellow
Write-Host "1. Download Android Studio from: https://developer.android.com/studio" -ForegroundColor White
Write-Host "2. Install Android Studio with default settings" -ForegroundColor White
Write-Host "3. Open Android Studio and go through the setup wizard" -ForegroundColor White
Write-Host "4. Install Android SDK (usually in C:\Users\%USERNAME%\AppData\Local\Android\Sdk)" -ForegroundColor White
Write-Host "5. Run this script again after installation" -ForegroundColor White
Write-Host ""
Write-Host "Alternative: Install Android SDK Command Line Tools only:" -ForegroundColor Yellow
Write-Host "1. Download from: https://developer.android.com/studio#command-tools" -ForegroundColor White
Write-Host "2. Extract to C:\Android\Sdk" -ForegroundColor White
Write-Host "3. Set ANDROID_HOME=C:\Android\Sdk" -ForegroundColor White
Write-Host "4. Add %ANDROID_HOME%\cmdline-tools\latest\bin to PATH" -ForegroundColor White
Write-Host ""
Write-Host "Alternative: Use Android SDK via Chocolatey (if you have it):" -ForegroundColor Yellow
Write-Host "choco install android-sdk" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter after installing Android SDK"
