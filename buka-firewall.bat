@echo off
title Buka Firewall untuk Fitcal
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Meminta izin Administrator...
  powershell -Command "Start-Process -FilePath \"%~f0\" -Verb RunAs"
  exit /b
)
netsh advfirewall firewall delete rule name="Fitcal 3000" >nul 2>&1
netsh advfirewall firewall add rule name="Fitcal 3000" dir=in action=allow protocol=TCP localport=3000 profile=any remoteip=localsubnet
echo.
echo Selesai. Port 3000 dibuka hanya untuk perangkat di WiFi yang sama.
echo Jalankan start.bat lalu buka alamat 192.168.x.x:3000 dari HP.
echo.
echo Untuk menutup lagi, jalankan di CMD Administrator:
echo netsh advfirewall firewall delete rule name="Fitcal 3000"
pause
