CreateObject("WScript.Shell").Run "cmd.exe /c cd /d C:\Users\hp\Desktop\Projects\CONTEX~1\backend && .venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000", 0, False
