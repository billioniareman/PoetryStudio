@echo off
echo ===================================================
echo   Poetry Studio - AI-First Writing Room (MVP v1.0)
echo ===================================================
echo.
echo Starting Python Backend Server...
start cmd /k "cd backend && .venv\Scripts\python run.py"

echo Starting React Frontend Dev Server...
start cmd /k "cd frontend && npm.cmd run dev"

echo.
echo Both servers are launching in separate windows!
echo - Backend API: http://127.0.0.1:8000
echo - Frontend Dashboard: http://localhost:5173 (usually)
echo.
echo Press any key to exit this launcher...
pause > nul
