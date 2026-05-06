@echo off
title Help Desk System
echo ========================================
echo    HELP DESK SYSTEM - FULL STARTUP
echo ========================================
echo Starting Django Server and Email Watcher...
echo.

start "Django Server" cmd /k "python manage.py runserver 0.0.0.0:8000"
timeout /t 3 /nobreak > nul
start "Email Watcher" cmd /k "python run_realtime_email_watcher.py"

echo.
echo ========================================
echo System Started Successfully!
echo ========================================
echo Django Server: http://localhost:8000
echo Frontend: http://localhost:3000
echo Email Watcher: Running in background
echo ========================================
echo.
echo Close this window to stop all services?
echo Press any key to stop...
pause > nul

taskkill /f /im cmd.exe /fi "windowtitle eq Django Server*"
taskkill /f /im cmd.exe /fi "windowtitle eq Email Watcher*"
echo All services stopped.