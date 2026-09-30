@echo off
REM =====================================================================
REM setup-local-pg.cmd — install PostgreSQL 16 local SANS admin/Docker
REM   1. Telecharge les binaires officiels EDB (~340 Mo) dans .local-pg/
REM   2. initdb : role postgres/postgres (dev local uniquement)
REM   3. Demarre le serveur sur localhost:5432
REM   4. prisma db push (aucune migration versionnee — /prisma/migrations)
REM   5. npm run db:check (SELECT 1 via le client de l'app)
REM   6. npm run db:seed:dev (donnees de developpement)
REM Journalise tout dans le fichier LOG. Long : ~5-15 min (340 Mo).
REM =====================================================================
setlocal
cd /d "%~dp0"

set PGVER=16.4-1
set PGURL=https://get.enterprisedb.com/postgresql/postgresql-%PGVER%-windows-x64-binaries.zip
set PGROOT=%CD%\.local-pg\pgsql
set PGDATA=%PGROOT%\data
set LOG=C:\Users\excel\AppData\Local\Temp\cmp-db-setup\08-setup.log
del /q "%LOG%" 2>nul

echo [%DATE% %TIME%] === 1/6 TELECHARGEMENT (%PGURL%) === >> "%LOG%"
if exist "%PGROOT%\bin\postgres.exe" (
  echo binaires deja presents — telechargement ignore >> "%LOG%"
) else (
  if not exist "%CD%\.local-pg" mkdir "%CD%\.local-pg"
  curl -L --retry 3 --retry-delay 10 --max-time 1800 -o "%CD%\.local-pg\pg.zip" "%PGURL%" >> "%LOG%" 2>&1
  echo [exit=%ERRORLEVEL%] fin telechargement >> "%LOG%"
  echo [%DATE% %TIME%] extraction... >> "%LOG%"
  powershell -NoProfile -Command "Expand-Archive -LiteralPath '%CD%\.local-pg\pg.zip' -DestinationPath '%CD%\.local-pg\tmp' -Force" >> "%LOG%" 2>&1
  echo [exit=%ERRORLEVEL%] fin extraction >> "%LOG%"
  for /d %%D in ("%CD%\.local-pg\tmp\pgsql") do (
    if exist "%%D\bin\postgres.exe" (
      if not exist "%PGROOT%" mkdir "%PGROOT%"
      xcopy "%%D" "%PGROOT%\" /E /I /Q /Y >> "%LOG%" 2>&1
    )
  )
  dir "%PGROOT%\bin\postgres.exe" >> "%LOG%" 2>&1
  del /q "%CD%\.local-pg\pg.zip" 2>nul
  rmdir /s /q "%CD%\.local-pg\tmp" 2>nul
)

set PATH=%PGROOT%\bin;%PATH%
echo [%DATE% %TIME%] === postgres.exe / initdb === >> "%LOG%"
"%PGROOT%\bin\postgres.exe" --version >> "%LOG%" 2>&1
if not exist "%PGDATA%\PG_VERSION" (
  echo initdb role=postgres auth=scram-sha-256... >> "%LOG%"
  echo postgres> "%CD%\.local-pg\pw.txt"
  "%PGROOT%\bin\initdb.exe" -D "%PGDATA%" -U postgres --pwfile="%CD%\.local-pg\pw.txt" -E UTF8 --auth=scram-sha-256 >> "%LOG%" 2>&1
  echo [exit=%ERRORLEVEL%] fin initdb >> "%LOG%"
  del /q "%CD%\.local-pg\pw.txt" 2>nul
  echo host all all 127.0.0.1/32 scram-sha-256>> "%PGDATA%\pg_hba.conf"
  echo host all all ::1/128 scram-sha-256>> "%PGDATA%\pg_hba.conf"
) else (
  echo cluster deja initialise >> "%LOG%"
)

echo [%DATE% %TIME%] === 2/6 DEMARRAGE === >> "%LOG%"
"%PGROOT%\bin\pg_ctl.exe" status -D "%PGDATA%" >nul 2>&1
if %ERRORLEVEL%==0 (
  echo serveur deja en cours >> "%LOG%"
) else (
  "%PGROOT%\bin\pg_ctl.exe" -D "%PGDATA%" -l "%PGROOT%\server.log" -w -t 60 start >> "%LOG%" 2>&1
  echo [exit=%ERRORLEVEL%] fin demarrage >> "%LOG%"
)
"%PGROOT%\bin\pg_isready.exe" -h 127.0.0.1 -p 5432 >> "%LOG%" 2>&1

echo [%DATE% %TIME%] === 3/6 PRISMA DB PUSH (schema vers base vide) === >> "%LOG%"
set PGPASSWORD=postgres
call npx prisma db push >> "%LOG%" 2>&1
echo [exit=%ERRORLEVEL%] fin db push >> "%LOG%"

echo [%DATE% %TIME%] === 4/6 DB:CHECK (SELECT 1) === >> "%LOG%"
call npm run db:check >> "%LOG%" 2>&1
echo [exit=%ERRORLEVEL%] fin db:check >> "%LOG%"

echo [%DATE% %TIME%] === 5/6 SEED DEV === >> "%LOG%"
call npm run db:seed:dev >> "%LOG%" 2>&1
echo [exit=%ERRORLEVEL%] fin seed >> "%LOG%"

echo [%DATE% %TIME%] === 6/6 TERMINE === >> "%LOG%"
