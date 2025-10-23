# Regenerate Lockfiles Script - BRUTAL FIX
Write-Host "🔥 BRUTAL FIX: Regenerating All Lockfiles" -ForegroundColor Red
Write-Host "=========================================" -ForegroundColor Red
Write-Host ""

# Step 1: Clean root directory
Write-Host "Step 1: Cleaning root directory..." -ForegroundColor Yellow
Remove-Item -Recurse -Force node_modules, package-lock.json -ErrorAction SilentlyContinue
Write-Host "✅ Root directory cleaned" -ForegroundColor Green

# Step 2: Install root dependencies
Write-Host "Step 2: Installing root dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Root dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Root dependencies installation failed" -ForegroundColor Red
    exit 1
}

# Step 3: Clean client directory
Write-Host "Step 3: Cleaning client directory..." -ForegroundColor Yellow
Remove-Item -Recurse -Force client/node_modules, client/package-lock.json -ErrorAction SilentlyContinue
Write-Host "✅ Client directory cleaned" -ForegroundColor Green

# Step 4: Install client dependencies
Write-Host "Step 4: Installing client dependencies..." -ForegroundColor Yellow
Set-Location client
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Client dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Client dependencies installation failed" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Set-Location ..

# Step 5: Verify lockfiles exist
Write-Host "Step 5: Verifying lockfiles..." -ForegroundColor Yellow
if (Test-Path "package-lock.json" -and Test-Path "client/package-lock.json") {
    Write-Host "✅ Both lockfiles generated successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Lockfiles missing" -ForegroundColor Red
    exit 1
}

# Step 6: Test npm ci
Write-Host "Step 6: Testing npm ci..." -ForegroundColor Yellow
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm ci
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ npm ci test passed" -ForegroundColor Green
} else {
    Write-Host "❌ npm ci test failed" -ForegroundColor Red
    exit 1
}

# Step 7: Test client npm ci
Write-Host "Step 7: Testing client npm ci..." -ForegroundColor Yellow
Remove-Item -Recurse -Force client/node_modules -ErrorAction SilentlyContinue
Set-Location client
npm ci
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Client npm ci test passed" -ForegroundColor Green
} else {
    Write-Host "❌ Client npm ci test failed" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Set-Location ..

Write-Host ""
Write-Host "🎉 BRUTAL FIX COMPLETE!" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host "✅ All lockfiles regenerated" -ForegroundColor Green
Write-Host "✅ npm ci tests passed" -ForegroundColor Green
Write-Host "✅ Ready for CI/CD pipeline" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. git add package-lock.json client/package-lock.json" -ForegroundColor White
Write-Host "2. git commit -m 'fix: regenerate lockfiles to resolve npm ci errors'" -ForegroundColor White
Write-Host "3. git push origin main" -ForegroundColor White
