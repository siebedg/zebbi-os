@echo off
title Zebbi kill
echo Closing distractions...

rem Self-contained: double-click from Desktop. Does not need the git repo.
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
