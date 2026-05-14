@echo off
cd /d "C:\Users\hp\Desktop\Projects\Context Keeper\backend"
".venv\Scripts\python" -m uvicorn main:app --host 0.0.0.0 --port 8000
pause
