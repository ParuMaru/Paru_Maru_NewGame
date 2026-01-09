@echo off
echo ゲームを起動しています...

REM Chromeを一度完全に終了させる（これがないと設定が適用されないため）
taskkill /F /IM chrome.exe >nul 2>&1

REM セキュリティ制限を解除してChromeで今のフォルダのindex.htmlを開く
start "" "chrome.exe" --allow-file-access-from-files "%~dp0index.html"

exit