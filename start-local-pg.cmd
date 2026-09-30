@echo off
REM =====================================================================
REM start-local-pg.cmd — demarre PostgreSQL local portable (sans admin)
REM Binaires + donnees dans .local-pg/ — execute setup-local-pg.cmd une
REM premiere fois si absent. Ne pas committer (.gitignore).
REM =====================================================================
setlocal
cd /d "%~dp0"
set PGROOT=%CD%\.local-pg\pgsql

if not exist "%PGROOT%\bin\postgres.exe" (
  echo [ERREUR] Binaires absents. Lance d'abord : setup-local-pg.cmd
  exit /b 1
)

set PGBIN=%PGROOT%\bin
set PGDATA=%PGROOT%\data
set PATH=%PGBIN%;%PATH%

"%PGBIN%\pg_ctl.exe" status -D "%PGDATA%" >nul 2>&1
if %ERRORLEVEL%==0 (
  echo PostgreSQL local deja en cours sur localhost:5432.
  exit /b 0
)

echo Demarrage de PostgreSQL local...
start "boutiquecogi3-postgres" /min "%PGBIN%\pg_ctl.exe" -D "%PGDATA%" -l "%PGROOT%\server.log" -w -t 60 start
if %ERRORLEVEL%==0 (
  echo PostgreSQL local demarre sur localhost:5432.
) else (
  echo [ERREUR] Echec du demarrage — voir .local-pg\server.log
  exit /b 1
)
