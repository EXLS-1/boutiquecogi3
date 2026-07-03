param(
    [string]$Action = 'help'
)

function Get-RepoRoot {
    return Split-Path -Parent $PSScriptRoot
}

function Get-PostgresServiceName {
    $svc = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($svc) { return $svc.Name }
    return $null
}

function Show-Help {
    Write-Output "Usage: manage-postgres.ps1 [status|start|stop|restart|seed|help]"
    Write-Output "  status  - affiche l'état du service PostgreSQL et la version psql"
    Write-Output "  start   - démarre le service PostgreSQL"
    Write-Output "  stop    - arrête le service PostgreSQL"
    Write-Output "  restart - redémarre le service PostgreSQL"
    Write-Output "  seed    - exécute 'npm run db:seed' depuis la racine du dépôt"
    Write-Output "  help    - affiche cette aide"
}

function Do-Status {
    $svcName = Get-PostgresServiceName
    if (-not $svcName) {
        Write-Output "PostgreSQL service not found on this machine."
    } else {
        Get-Service -Name $svcName | Format-Table -AutoSize
    }

    $psqlPath = Get-ChildItem "C:\Program Files\PostgreSQL" -Recurse -Filter psql.exe -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
    if ($psqlPath) {
        try {
            & $psqlPath --version
        } catch {
            Write-Warning "Unable to execute psql at $psqlPath"
        }
    } else {
        Write-Output "psql executable not found in 'C:\Program Files\PostgreSQL'."
    }
}

function Do-Start {
    $svcName = Get-PostgresServiceName
    if (-not $svcName) {
        Write-Output "No PostgreSQL service found to start."
        return
    }
    Write-Output "Starting service $svcName..."
    Start-Service -Name $svcName -ErrorAction Stop
    Start-Sleep -Seconds 1
    Get-Service -Name $svcName | Format-Table -AutoSize
}

function Do-Stop {
    $svcName = Get-PostgresServiceName
    if (-not $svcName) {
        Write-Output "No PostgreSQL service found to stop."
        return
    }
    Write-Output "Stopping service $svcName..."
    Stop-Service -Name $svcName -ErrorAction Stop
    Start-Sleep -Seconds 1
    Get-Service -Name $svcName | Format-Table -AutoSize
}

function Do-Restart {
    $svcName = Get-PostgresServiceName
    if (-not $svcName) {
        Write-Output "No PostgreSQL service found to restart."
        return
    }
    Write-Output "Restarting service $svcName..."
    Restart-Service -Name $svcName -Force -ErrorAction Stop
    Start-Sleep -Seconds 1
    Get-Service -Name $svcName | Format-Table -AutoSize
}

function Do-Seed {
    $repoRoot = Get-RepoRoot
    if (-not (Test-Path (Join-Path $repoRoot 'package.json'))) {
        Write-Error "Cannot find package.json in repository root: $repoRoot"
        return
    }

    Push-Location $repoRoot
    try {
        Write-Output "Running 'npm run db:seed' in $repoRoot"

        # Load .env into the process environment so the seed can read required variables
        $envFile = Join-Path $repoRoot '.env'
        if (Test-Path $envFile) {
            Get-Content $envFile | ForEach-Object {
                $line = $_.Trim()
                if ($line -and -not $line.StartsWith('#')) {
                    $parts = $line -split '=',2
                    if ($parts.Length -eq 2) {
                        $key = $parts[0].Trim()
                        $val = $parts[1].Trim().Trim('"')
                        [System.Environment]::SetEnvironmentVariable($key, $val, 'Process')
                    }
                }
            }
        }

        # Use cmd.exe to ensure npm/.cmd wrappers are resolved correctly on Windows
        $proc = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','npm run db:seed' -NoNewWindow -Wait -PassThru -WorkingDirectory $repoRoot
        if ($proc.ExitCode -eq 0) { Write-Output "Seed completed successfully." } else { Write-Warning "Seed process exited with code $($proc.ExitCode)" }
    } catch {
        Write-Error "Failed to run seed: $_"
    } finally {
        Pop-Location
    }
}

switch ($Action.ToLower()) {
    'status' { Do-Status }
    'start'  { Do-Start }
    'stop'   { Do-Stop }
    'restart'{ Do-Restart }
    'seed'   { Do-Seed }
    'help'   { Show-Help }
    default  { Show-Help }
}
