$ErrorActionPreference = 'SilentlyContinue'
Set-Location -LiteralPath $PSScriptRoot

# Edit this list to match the distractions you want gone during shutdown.
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
  'Cursor'
)

Write-Host 'Zebbi shutdown kill helper'
Write-Host 'Closing distraction processes...'

foreach ($name in $targets) {
  Get-Process -Name $name | Stop-Process -Force
}

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
