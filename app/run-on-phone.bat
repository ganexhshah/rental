@echo off
echo ===================================================
echo   Himalayan Rides - Run Mobile App on Phone
echo ===================================================
echo.

echo [1/3] Checking connected ADB devices...
adb devices
echo.

echo [2/3] Setting up port reverse (tcp:8080 -^> tcp:8080)...
adb reverse tcp:8080 tcp:8080
if %errorlevel% neq 0 (
    echo [WARNING] adb reverse failed. Make sure your phone is plugged in with USB debugging enabled.
)
echo.

echo [3/3] Launching Flutter app on phone...
cd /d "%~dp0"
flutter run -d android

pause

