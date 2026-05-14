$ErrorActionPreference = "Stop"
$backendDir = "C:\Users\hp\Desktop\Projects\Context Keeper\backend"
$frontendDir = "C:\Users\hp\Desktop\Projects\Context Keeper\frontend"

Write-Host "Starting backend..."
$backend = Start-Process -WindowStyle Hidden -FilePath "$backendDir\.venv\Scripts\python.exe" -ArgumentList "-m uvicorn main:app --host 0.0.0.0 --port 8000" -WorkingDirectory $backendDir -PassThru
Write-Host "Backend PID: $($backend.Id)"

Write-Host "Starting frontend..."
$frontend = Start-Process -WindowStyle Hidden -FilePath "node" -ArgumentList "node_modules\next\dist\bin\next", "dev" -WorkingDirectory $frontendDir -PassThru
Write-Host "Frontend PID: $($frontend.Id)"

Write-Host "Servers started. Waiting for ports..."
Start-Sleep -Seconds 5

if (Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue) {
    Write-Host "Backend OK on :8000"
} else {
    Write-Host "Backend FAILED to start"
}

if (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue) {
    Write-Host "Frontend OK on :3000"
} else {
    Write-Host "Frontend FAILED to start"
}
