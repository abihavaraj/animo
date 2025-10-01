Write-Host "Building ANIMO Pilates Studio APK..." -ForegroundColor Green
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "android\app\build.gradle")) {
    Write-Host "Error: Not in project root directory" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "1. Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error installing npm dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "2. Building Android APK..." -ForegroundColor Yellow
Set-Location android
& .\gradlew assembleDebug
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error building APK" -ForegroundColor Red
    Set-Location ..
    Read-Host "Press Enter to exit"
    exit 1
}

Set-Location ..

Write-Host ""
Write-Host "3. APK Build Complete!" -ForegroundColor Green
Write-Host "APK Location: android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now install this APK on your device to test the fixes." -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to continue"
