$ErrorActionPreference = 'Stop'

$dir = Join-Path $env:LOCALAPPDATA 'Zebbi'
New-Item -ItemType Directory -Force -Path $dir | Out-Null

$bat = Join-Path $dir 'Zebbi-kill.bat'
@'
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
) do taskkill /F /IM %%P /T >nul 2>&1
echo Done.
timeout /t 2 /nobreak >nul
'@ | Set-Content -Path $bat -Encoding ASCII

$command = 'cmd.exe /D /C "' + $bat + '"'
$base = 'HKCU:\Software\Classes\zebbi'
New-Item -Path $base -Force | Out-Null
Set-ItemProperty -Path $base -Name '(default)' -Value 'URL:Zebbi Protocol'
New-ItemProperty -Path $base -Name 'URL Protocol' -Value '' -PropertyType String -Force | Out-Null
New-Item -Path "$base\shell\open\command" -Force | Out-Null
Set-ItemProperty -Path "$base\shell\open\command" -Name '(default)' -Value $command

Write-Host "Installed one-click kill."
Write-Host "Helper: $bat"
Write-Host "Site button can now open zebbi://kill"
