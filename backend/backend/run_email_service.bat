@echo off
title HelpDesk Email Auto-Processor
echo ========================================
echo HelpDesk Email Auto-Processor Service
echo ========================================
echo Starting email processor...
echo.

cd /d C:\Users\nyash\Downloads\helpdesk-system\helpdesk-system\backend
call venv\Scripts\activate
python auto_email_processor.py --interval 30

pause