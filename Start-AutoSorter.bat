@echo off
title Auto Downloads Sorter Launcher
cd /d "%~dp0"
echo Starting Auto Downloads Sorter in System Tray...
cmd /c npx electron . --hidden
