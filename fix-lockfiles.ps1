# PowerShell script to fix lockfile issues and ensure clean CI/CD
# This script addresses common CI/CD pipeline failures

Write-Host "🔧 Fixing Lockfile Issues for Clean CI/CD" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

# Remove conflicting yarn.lock files
Write-Host "`n📦 Removing conflicting yarn.lock files..." -ForegroundColor Yellow
if (Test-Path "yarn.lock") {
    Remove-Item "yarn.lock" -Force
    Write-Host "✅ Removed root yarn.lock" -ForegroundColor Green
}
if (Test-Path "client/yarn.lock") {
    Remove-Item "client/yarn.lock" -Force
    Write-Host "✅ Removed client/yarn.lock" -ForegroundColor Green
}

# Regenerate root package-lock.json
Write-Host "`n🔄 Regenerating root package-lock.json..." -ForegroundColor Yellow
if (Test-Path "package-lock.json") {
    Remove-Item "package-lock.json" -Force
    Write-Host "✅ Removed old package-lock.json" -ForegroundColor Green
}

Write-Host "📥 Installing root dependencies with legacy peer deps..." -ForegroundColor Yellow
npm install --legacy-peer-deps
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Root dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "⚠️ Root dependencies installation had issues, but continuing..." -ForegroundColor Yellow
}

# Regenerate client package-lock.json
Write-Host "`n🔄 Regenerating client package-lock.json..." -ForegroundColor Yellow
Push-Location "client"
if (Test-Path "package-lock.json") {
    Remove-Item "package-lock.json" -Force
    Write-Host "✅ Removed old client package-lock.json" -ForegroundColor Green
}

Write-Host "📥 Installing client dependencies with legacy peer deps..." -ForegroundColor Yellow
npm install --legacy-peer-deps
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Client dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "⚠️ Client dependencies installation had issues, but continuing..." -ForegroundColor Yellow
}
Pop-Location

# Verify installations
Write-Host "`n🔍 Verifying installations..." -ForegroundColor Yellow
if (Test-Path "package-lock.json") {
    Write-Host "✅ Root package-lock.json exists" -ForegroundColor Green
} else {
    Write-Host "❌ Root package-lock.json missing" -ForegroundColor Red
}

if (Test-Path "client/package-lock.json") {
    Write-Host "✅ Client package-lock.json exists" -ForegroundColor Green
} else {
    Write-Host "❌ Client package-lock.json missing" -ForegroundColor Red
}

# Check for remaining yarn.lock files
$yarnFiles = Get-ChildItem -Recurse -Name "yarn.lock" -ErrorAction SilentlyContinue
if ($yarnFiles) {
    Write-Host "⚠️ Warning: Found remaining yarn.lock files:" -ForegroundColor Yellow
    $yarnFiles | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
} else {
    Write-Host "✅ No yarn.lock files found" -ForegroundColor Green
}

Write-Host "`n🎉 Lockfile fix completed!" -ForegroundColor Green
Write-Host "Your CI/CD pipeline should now be more resilient to common errors." -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Commit the updated package-lock.json files" -ForegroundColor White
Write-Host "2. Push to trigger the CI/CD pipeline" -ForegroundColor White
Write-Host "3. Monitor the pipeline for any remaining issues" -ForegroundColor White
