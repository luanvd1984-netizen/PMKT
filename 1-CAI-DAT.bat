@echo off
chcp 65001 >nul
title Oceanami - Cai dat
cd /d "%~dp0"

echo ========================================
echo   OCEANAMI - CAI DAT APP MUA HANG
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [LOI] Chua cai Node.js
  echo Hay tai va cai tai: https://nodejs.org
  echo Chon ban LTS, cai xong mo lai file nay.
  echo.
  pause
  exit /b 1
)

echo [OK] Da co Node.js
node -v
echo.
echo Dang cai dat thu vien (lan dau co the mat 2-5 phut)...
echo.

call npm install
if errorlevel 1 (
  echo.
  echo [LOI] Cai dat that bai. Kiem tra mang roi thu lai.
  pause
  exit /b 1
)

echo.
echo ========================================
echo   CAI DAT XONG
echo   Bam file: 2-CHAY-APP.bat de mo app
echo ========================================
pause
