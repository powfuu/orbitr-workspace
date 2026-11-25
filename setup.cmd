@echo off
rem Orbitr Workspace - one-click Windows setup. Double-click this file.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows-setup.ps1" %*
echo.
pause
