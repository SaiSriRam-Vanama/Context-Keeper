$ErrorActionPreference = "Stop"
try {
    & "C:\Users\hp\Desktop\Projects\Context Keeper\backend\.venv\Scripts\python" -m uvicorn main:app --host 0.0.0.0 --port 8000
} catch {
    $_ | Out-File -FilePath "C:\Users\hp\Desktop\Projects\Context Keeper\backend\server_error.log" -Append
}
Start-Sleep -Seconds 9999
