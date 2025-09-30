@echo off
echo Starting Electron App with GPU disabled...
start "Next.js Server" cmd /k "npm run dev"
timeout /t 5 /nobreak >nul
start "Electron App" cmd /k "electron . --disable-gpu --disable-software-rasterizer --disable-web-security"
echo Both processes started!
pause



