@echo off
REM Copy the release APK to the app folder

set SOURCE="C:\Projects\lnreader\android\app\build\outputs\apk\release\app-release.apk"
set DEST="C:\Projects\lnreader\android\app\app-release.apk"

echo Copying APK...
copy /Y %SOURCE% %DEST%

if %ERRORLEVEL% EQU 0 (
    echo Copy successful!
) else (
    echo Copy failed!
)

pause
