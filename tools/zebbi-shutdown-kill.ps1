$ErrorActionPreference = 'SilentlyContinue'

# Edit this list to match the distractions you want gone during shutdown.
$targets = @(
  'Discord',
  'Slack',
  'Telegram',
  'WhatsApp',
  'Spotify',
  'Steam',
  'Notion',
  'Obsidian'
)

Write-Host 'Zebbi shutdown kill helper'
Write-Host 'Closing distraction processes...'

foreach ($name in $targets) {
  Get-Process -Name $name | Stop-Process -Force
}

Write-Host 'Done.'
Write-Host 'Tip: add or remove process names in tools/zebbi-shutdown-kill.ps1'
