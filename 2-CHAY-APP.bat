@echo off
chcp 65001 >nul
title Oceanami Mua hang
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Chua cai Node.js - chay 1-CAI-DAT.bat truoc.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Chua cai dat - dang chay 1-CAI-DAT.bat...
  call "1-CAI-DAT.bat"
)

echo.
echo Dang mo app Oceanami...
echo Trinh duyet se mo: http://localhost:3000
echo.
echo GIU CUA SO NAY MO - dung app xong co the tat.
echo.

start "" "http://localhost:3000"
call npm run dev
