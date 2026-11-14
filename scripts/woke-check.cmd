@echo off
rem Branch checks, local or on GitHub while Path of Exile is open. See woke-check.ps1.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0woke-check.ps1" %*
exit /b %ERRORLEVEL%
