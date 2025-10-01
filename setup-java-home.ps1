Write-Host "Setting up JAVA_HOME environment variable..." -ForegroundColor Green
Write-Host ""

# Find the Java installation directory
$javaPaths = @(
    "C:\Program Files\Eclipse Adoptium\jdk-17*",
    "C:\Program Files\Java\jdk-17*",
    "C:\Program Files\OpenJDK\jdk-17*"
)

$javaHome = $null
foreach ($path in $javaPaths) {
    $found = Get-ChildItem $path -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        $javaHome = $found.FullName
        break
    }
}

if (-not $javaHome) {
    Write-Host "Could not find Java installation automatically." -ForegroundColor Red
    Write-Host "Please set JAVA_HOME manually:" -ForegroundColor Yellow
    Write-Host "1. Find your Java installation (usually in C:\Program Files\Eclipse Adoptium\)" -ForegroundColor White
    Write-Host "2. Set JAVA_HOME to that directory" -ForegroundColor White
    Write-Host "3. Add %JAVA_HOME%\bin to your PATH" -ForegroundColor White
    Read-Host "Press Enter to continue"
    exit 1
}

Write-Host "Found Java installation at: $javaHome" -ForegroundColor Green

# Set JAVA_HOME for current session
$env:JAVA_HOME = $javaHome
$env:PATH = "$javaHome\bin;$env:PATH"

Write-Host "JAVA_HOME set to: $env:JAVA_HOME" -ForegroundColor Cyan
Write-Host ""

# Verify Java is working
try {
    $javaVersion = & java -version 2>&1
    Write-Host "Java version:" -ForegroundColor Yellow
    Write-Host $javaVersion[0] -ForegroundColor White
    Write-Host ""
    Write-Host "Java setup complete! Now you can build the APK." -ForegroundColor Green
    Write-Host ""
    Write-Host "Run: .\build-apk.ps1" -ForegroundColor Cyan
} catch {
    Write-Host "Error verifying Java installation" -ForegroundColor Red
}

Read-Host "Press Enter to continue"
