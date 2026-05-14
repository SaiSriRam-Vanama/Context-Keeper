# Context Keeper - Unified Execution Script (v2 - Robust Edition)
# Usage: .\run.ps1 [-TestOnly] [-SkipTests]

param (
    [switch]$TestOnly,
    [switch]$SkipTests
)

$PSScriptRoot = Get-Location
$BackendDir = Join-Path $PSScriptRoot "backend"
$FrontendDir = Join-Path $PSScriptRoot "frontend"
$PythonPath = Join-Path $PSScriptRoot "backend\.venv\Scripts\python.exe"

# 1. Environment Check
Write-Host "`n[1/4] Checking Environment..." -ForegroundColor Cyan
if (-not (Test-Path $PythonPath)) {
    $PythonPath = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
    if (-not (Test-Path $PythonPath)) {
        Write-Error "Python virtual environment not found in 'backend\.venv' or '.venv'."
        exit 1
    }
}

# Check Ollama
Write-Host "Checking Ollama..." -ForegroundColor Gray
$ollamaCheck = Get-Process ollama -ErrorAction SilentlyContinue
if (-not $ollamaCheck) {
    Write-Warning "Ollama is not running. AI features will not work. Please start Ollama."
}

# 2. Run Tests
if (-not $SkipTests) {
    Write-Host "`n[2/4] Running Backend Tests..." -ForegroundColor Cyan
    Set-Location $BackendDir
    & $PythonPath -m pytest tests/ -v
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n❌ Tests Failed! Fix errors before running servers." -ForegroundColor Red
        Set-Location $PSScriptRoot
        exit 1
    }
    Write-Host "✅ Tests Passed!" -ForegroundColor Green
}

if ($TestOnly) {
    Set-Location $PSScriptRoot
    exit 0
}

# 3. Start Backend
Write-Host "`n[3/4] Starting Backend..." -ForegroundColor Cyan

# Kill existing processes on ports
Write-Host "Cleaning up ports 8000 and 3000..."
$ports = @(8000, 3000)
foreach ($port in $ports) {
    $proc = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -First 1
    if ($proc) { 
        Stop-Process -Id $proc -Force -ErrorAction SilentlyContinue 
        Start-Sleep -Seconds 1
    }
}

Write-Host "Launching Backend (http://localhost:8000)..." -ForegroundColor Gray
$BackendJob = Start-Process -FilePath $PythonPath -ArgumentList "main.py" -WorkingDirectory $BackendDir -PassThru

# Wait for backend health
Write-Host "Waiting for Backend to initialize model and API..." -NoNewline
for ($i=0; $i -lt 30; $i++) {
    try {
        $resp = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get -ErrorAction SilentlyContinue
        if ($resp.status -eq "ok") {
            Write-Host " OK!" -ForegroundColor Green
            break
        }
    } catch {}
    Write-Host "." -NoNewline
    Start-Sleep -Seconds 2
}

# 4. Start Frontend
Write-Host "`n[4/4] Starting Frontend..." -ForegroundColor Cyan
Write-Host "Launching Frontend (http://localhost:3000)..." -ForegroundColor Gray
Set-Location $FrontendDir
$FrontendJob = Start-Process -FilePath "npm.cmd" -ArgumentList "run dev" -WorkingDirectory $FrontendDir -PassThru

Set-Location $PSScriptRoot

Write-Host "`n🚀 Context Keeper is ready!" -ForegroundColor Green
Write-Host "------------------------------------------------"
Write-Host "Backend:  http://localhost:8000"
Write-Host "Frontend: http://localhost:3000"
Write-Host "------------------------------------------------"
Write-Host "To stop, use: Stop-Process -Id $($BackendJob.Id),$($FrontendJob.Id)"
