@echo off
REM DB Visualizer Setup Script - Windows

echo 🚀 DB Visualizer - Automated Setup
echo ====================================

REM Backend Setup
echo.
echo Setting up Backend...

cd backend

REM Create virtual environment
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
)

REM Activate and install
call venv\Scripts\activate.bat
echo Installing Python dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt

echo ✓ Backend setup complete
echo Start backend with: cd backend ^& venv\Scripts\activate.bat ^& python main.py

REM Frontend Setup
echo.
echo Setting up Frontend...

cd ..\frontend

echo Installing Node dependencies...
call npm install

echo ✓ Frontend setup complete
echo Start frontend with: cd frontend ^& npm run dev

echo.
echo ✅ Setup Complete!
echo.
echo Next steps:
echo 1. Open terminal 1: cd backend ^& venv\Scripts\activate.bat ^& python main.py
echo 2. Open terminal 2: cd frontend ^& npm run dev
echo 3. Open http://localhost:3000 in your browser
echo 4. Upload a database file to get started
