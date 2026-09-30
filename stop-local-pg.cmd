@echo off
REM =====================================================================
REM stop-local-pg.cmd — arrete PostgreSQL local portable (.local-pg/)
REM =====================================================================
setlocal
cd /d "%~dp0"
set PGBIN=%CD%\.local-pg\pgsql\bin
set PGDATA=%CD%\.local-pg\pgsql\data
set PATH=%PGBIN%;%PATH%

if not exist "%PGBIN%\pg_ctl.exe" (
  echo Pas de PostgreSQL local installe.
  exit /b 0
)

"%PGBIN%\pg_ctl.exe" stop -D "%PGDATA%" -m fast
