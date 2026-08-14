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
  'Messenger'
)

Write-Host 'Zebbi shutdown kill helper'
Write-Host 'Closing distraction processes...'

foreach ($name in $targets) {
  Get-Process -Name $name | Stop-Process -Force
}

Write-Host 'Done. Prefer double-clicking Zebbi-kill.bat on your Desktop.'
