@echo off
set "DIR=%LOCALAPPDATA%\Zebbi"
mkdir "%DIR%" >nul 2>&1

(
echo @echo off
echo title Zebbi kill
echo echo Closing distractions...
echo for %%%%P in (
echo   Discord.exe
echo   Slack.exe
echo   slack.exe
echo   Telegram.exe
echo   WhatsApp.exe
echo   Spotify.exe
echo   steam.exe
echo   Steam.exe
echo   Notion.exe
echo   Obsidian.exe
echo   Messenger.exe
echo ^) do taskkill /F /IM %%%%P /T ^>nul 2^>^&1
echo echo Done.
echo timeout /t 2 /nobreak ^>nul
) > "%DIR%\Zebbi-kill.bat"

reg add "HKCU\Software\Classes\zebbi" /ve /d "URL:Zebbi Protocol" /f >nul
reg add "HKCU\Software\Classes\zebbi" /v "URL Protocol" /d "" /f >nul
reg add "HKCU\Software\Classes\zebbi\shell\open\command" /ve /d "cmd.exe /D /C \"%DIR%\Zebbi-kill.bat\"" /f >nul

echo One-click kill is installed.
echo Next: in Zebbi, click Kill distractions. Chrome may ask once to open Zebbi.
pause
