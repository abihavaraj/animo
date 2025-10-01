@echo off
echo Building ANIMO Pilates Studio APK...
echo.

REM Check if we're in the right directory
if not exist "android\app\build.gradle" (
    echo Error: Not in project root directory
    pause
    exit /b 1
)

echo 1. Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Error installing npm dependencies
    pause
    exit /b 1
)

echo.
echo 2. Building Android APK...
cd android
call gradlew assembleDebug
if %errorlevel% neq 0 (
    echo Error building APK
    cd ..
    pause
    exit /b 1
)

cd ..

echo.
echo 3. APK Build Complete!
echo APK Location: android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo You can now install this APK on your device to test the fixes.
echo.
pause
