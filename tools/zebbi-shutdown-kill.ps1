$ErrorActionPreference = 'SilentlyContinue'
Set-Location -LiteralPath $PSScriptRoot

$targets = @(
  'Discord',
  'Slack',
  'Telegram',
  'WhatsApp',
  'Spotify',
  'Steam',
  'Notion',
  'Obsidian',
  'Messenger',
  'chrome',
  'Cursor',
  'cursor-agent'
)

Write-Host 'Zebbi shutdown kill helper'
Write-Host 'Closing distraction processes...'

foreach ($name in $targets) {
  Get-Process -Name $name | Stop-Process -Force
}

try {
  (New-Object -ComObject Shell.Application).Windows() | ForEach-Object {
    if ($_.FullName -match 'explorer\.exe') { $_.Quit() }
  }
} catch {}

Start-Sleep -Seconds 1
$chrome = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($chrome) {
  Start-Process -FilePath $chrome -ArgumentList 'https://zebbi-os.vercel.app/shutdown'
} else {
  Start-Process 'https://zebbi-os.vercel.app/shutdown'
}

Write-Host 'Done. Prefer double-clicking Zebbi-kill.bat on your Desktop.'
