# Supabase Migration Script for Windows
# This script helps you migrate your Pilates Studio app to Supabase

Write-Host "🚀 Starting Supabase Migration for Pilates Studio App" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if we're in the right directory
if (-not (Test-Path "backend")) {
    Write-Host "❌ Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Navigate to backend directory
Set-Location backend

Write-Host "📦 Installing Supabase dependencies..." -ForegroundColor Yellow
npm install @supabase/supabase-js @supabase/postgrest-js

Write-Host ""
Write-Host "🔧 Setting up Supabase configuration..." -ForegroundColor Yellow
Write-Host "Please run the setup script:" -ForegroundColor Cyan
Write-Host "npm run setup-supabase" -ForegroundColor White

Write-Host ""
Write-Host "📋 Migration Steps:" -ForegroundColor Cyan
Write-Host "1. Create a Supabase project at https://supabase.com" -ForegroundColor White
Write-Host "2. Get your project URL and API keys" -ForegroundColor White
Write-Host "3. Run: npm run setup-supabase" -ForegroundColor White
Write-Host "4. Run: npm run migrate-supabase" -ForegroundColor White
Write-Host "5. Test your application" -ForegroundColor White

Write-Host ""
Write-Host "📖 For detailed instructions, see: SUPABASE_MIGRATION_GUIDE.md" -ForegroundColor Cyan

Write-Host ""
Write-Host "🎯 Ready to start? Run: npm run setup-supabase" -ForegroundColor Green 