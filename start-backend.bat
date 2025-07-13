@echo off
echo 🚀 Starting PennyWise FastAPI Backend...
echo.
echo Please make sure you have Python installed on your system.
echo If you don't have Python, download it from: https://www.python.org/downloads/
echo.

cd backend

REM echo 📦 Installing dependencies...
REM pip install -r requirements.txt

if %errorlevel% neq 0 (
    echo.
    echo ❌ Failed to install dependencies. Please check if Python and pip are installed.
    echo.
    echo Try these commands manually:
    echo   1. cd backend
    echo   2. pip install -r requirements.txt
    echo   3. python start.py
    echo.
    pause
    exit /b 1
)

echo.
echo 🚀 Starting server...
echo 📊 API Documentation: http://localhost:8000/docs
echo 🔄 Auto-reload enabled
echo ⚡ Press Ctrl+C to stop
echo.

python start.py

if %errorlevel% neq 0 (
    echo.
    echo ❌ Failed to start server. Trying alternative Python commands...
    echo.
    
    python3 start.py
    if %errorlevel% neq 0 (
        py start.py
        if %errorlevel% neq 0 (
            echo.
            echo ❌ Could not start the server with any Python command.
            echo Please ensure Python is installed and try running manually:
            echo   cd backend
            echo   python start.py
            echo.
        )
    )
)

pause
