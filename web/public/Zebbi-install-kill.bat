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
echo   chrome.exe
echo   Cursor.exe
echo ^) do taskkill /F /IM %%%%P /T ^>nul 2^>^&1
echo timeout /t 1 /nobreak ^>nul
echo set "URL=https://zebbi-os.vercel.app/shutdown"
echo set "CHROME="
echo if exist "%%ProgramFiles%%\Google\Chrome\Application\chrome.exe" set "CHROME=%%ProgramFiles%%\Google\Chrome\Application\chrome.exe"
echo if exist "%%ProgramFiles^(x86^)%%\Google\Chrome\Application\chrome.exe" set "CHROME=%%ProgramFiles^(x86^)%%\Google\Chrome\Application\chrome.exe"
echo if exist "%%LOCALAPPDATA%%\Google\Chrome\Application\chrome.exe" set "CHROME=%%LOCALAPPDATA%%\Google\Chrome\Application\chrome.exe"
echo if defined CHROME (
echo   start "" "%%CHROME%%" "%%URL%%"
echo ^) else (
echo   start "" "%%URL%%"
echo ^)
echo echo Done.
echo timeout /t 1 /nobreak ^>nul
) > "%DIR%\Zebbi-kill.bat"

reg add "HKCU\Software\Classes\zebbi" /ve /d "URL:Zebbi Protocol" /f >nul
reg add "HKCU\Software\Classes\zebbi" /v "URL Protocol" /d "" /f >nul
reg add "HKCU\Software\Classes\zebbi\shell\open\command" /ve /d "cmd.exe /D /C \"%DIR%\Zebbi-kill.bat\"" /f >nul

echo One-click kill is installed.
pause
