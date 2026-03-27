@echo off
echo ========================================
echo NDVI Analysis Pipeline - Quick Launch
echo ========================================
echo.

echo [1/2] Processing latest images...
python generate_ndvi.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Image processing failed!
    pause
    exit /b 1
)

echo.
echo [2/2] Starting dashboard server...
echo.
echo Dashboard will open automatically...
timeout /t 2 /nobreak >nul

start http://localhost:8000/dashboard.html
python server.py
