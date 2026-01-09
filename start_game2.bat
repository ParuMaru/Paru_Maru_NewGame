@echo off
taskkill /F /IM chrome.exe >nul 2>&1

REM 一般的なChromeのインストール場所を指定
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --allow-file-access-from-files "%~dp0index.html"
) else (
    if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
        start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --allow-file-access-from-files "%~dp0index.html"
    ) else (
        echo Chromeが見つかりませんでした。
        pause
    )
)
exit