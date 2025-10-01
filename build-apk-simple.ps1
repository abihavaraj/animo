Write-Host "Building ANIMO Pilates Studio APK (Simplified Approach)..." -ForegroundColor Green
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "android\app\build.gradle")) {
    Write-Host "Error: Not in project root directory" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "1. Setting up environment variables..." -ForegroundColor Yellow
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.16.8-hotspot"
$env:ANDROID_HOME = "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

Write-Host "2. Building Android APK with pre-built bundle..." -ForegroundColor Yellow
Set-Location android

# Try to build with a simpler approach
& .\gradlew assembleDebug -x bundleDebugJsAndAssets
if ($LASTEXITCODE -ne 0) {
    Write-Host "Standard build failed, trying alternative approach..." -ForegroundColor Yellow
    
    # Alternative: Build without Reanimated
    Write-Host "Attempting build without React Native Reanimated..." -ForegroundColor Cyan
    & .\gradlew assembleDebug -x bundleDebugJsAndAssets -PnewArchEnabled=false
}

Set-Location ..

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "3. APK Build Complete!" -ForegroundColor Green
    Write-Host "APK Location: android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "You can now install this APK on your device to test the fixes." -ForegroundColor Green
    Write-Host "The app should now work without the Hermes crash!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Build failed. Let's try a different approach..." -ForegroundColor Red
    Write-Host "You can test the fixes by running the app directly:" -ForegroundColor Yellow
    Write-Host "npx expo run:android" -ForegroundColor White
}

Write-Host ""
Read-Host "Press Enter to continue"
