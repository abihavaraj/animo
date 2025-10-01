# Android SDK Setup Script for Local Development
Write-Host "🔍 Searching for Android SDK..." -ForegroundColor Yellow

# Common Android SDK locations on Windows
$possiblePaths = @(
    "$env:LOCALAPPDATA\Android\Sdk",
    "$env:USERPROFILE\AppData\Local\Android\Sdk", 
    "C:\Android\Sdk",
    "$env:PROGRAMFILES\Android\Android Studio\sdk",
    "${env:PROGRAMFILES(X86)}\Android\android-sdk"
)

$sdkPath = $null
foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        Write-Host "✅ Found Android SDK at: $path" -ForegroundColor Green
        $sdkPath = $path
        break
    }
}

if (-not $sdkPath) {
    Write-Host "❌ Android SDK not found in common locations." -ForegroundColor Red
    Write-Host "Please find your Android SDK path in Android Studio:" -ForegroundColor Yellow
    Write-Host "1. Open Android Studio" -ForegroundColor Cyan
    Write-Host "2. Go to File → Settings → Appearance & Behavior → System Settings → Android SDK" -ForegroundColor Cyan
    Write-Host "3. Copy the 'Android SDK Location' path" -ForegroundColor Cyan
    Write-Host "4. Run this script again with: .\setup-android-local.ps1 -SdkPath 'YOUR_SDK_PATH'" -ForegroundColor Cyan
    exit 1
}

# Create local.properties file
$localPropertiesPath = "android\local.properties"
$content = "sdk.dir=$($sdkPath -replace '\\', '/')"

Write-Host "📝 Creating $localPropertiesPath..." -ForegroundColor Yellow
Set-Content -Path $localPropertiesPath -Value $content

# Set environment variable for current session
$env:ANDROID_HOME = $sdkPath
Write-Host "🔧 Set ANDROID_HOME for current session: $sdkPath" -ForegroundColor Green

# Check if tools exist
$platformToolsPath = Join-Path $sdkPath "platform-tools"
if (Test-Path $platformToolsPath) {
    Write-Host "✅ Platform tools found at: $platformToolsPath" -ForegroundColor Green
    
    # Add to PATH for current session
    if ($env:PATH -notlike "*$platformToolsPath*") {
        $env:PATH += ";$platformToolsPath"
        Write-Host "🔧 Added platform-tools to PATH for current session" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  Platform tools not found. You may need to install Android SDK Platform-Tools." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Android SDK setup complete!" -ForegroundColor Green
Write-Host "📁 SDK Path: $sdkPath" -ForegroundColor Cyan
Write-Host "📄 local.properties created with: $content" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Try running: npx expo run:android" -ForegroundColor Cyan
Write-Host "2. Connect an Android device or start an emulator" -ForegroundColor Cyan
Write-Host "3. Test push notifications with the new fixes!" -ForegroundColor Cyan
