@echo off
title Zebbi kill
echo Closing distractions...

for %%P in (
  Discord.exe
  Slack.exe
  slack.exe
  Telegram.exe
  WhatsApp.exe
  Spotify.exe
  steam.exe
  Steam.exe
  Notion.exe
  Obsidian.exe
  Messenger.exe
  chrome.exe
  Cursor.exe
  cursor-agent.exe
) do taskkill /F /IM %%P /T >nul 2>&1

powershell -NoProfile -ExecutionPolicy Bypass -Command "try { (New-Object -ComObject Shell.Application).Windows() | ForEach-Object { if ($_.FullName -match 'explorer\.exe') { $_.Quit() } } } catch {}" >nul 2>&1

timeout /t 1 /nobreak >nul
set "URL=https://zebbi-os.vercel.app/shutdown"
set "CHROME="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
if defined CHROME (
  start "" "%CHROME%" "%URL%"
) else (
  start "" "%URL%"
)
echo Done.
timeout /t 1 /nobreak >nul
