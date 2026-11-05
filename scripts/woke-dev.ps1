# Runs the app in dev mode (Vite hot reload + Electron) from a dedicated clone.
# See "Dev preview" in DEVELOPING.md. Install: copy woke-dev.cmd and this file
# next to the clone, so that switching branches never touches the running script.
#
#   woke-dev                restart on the current branch
#   woke-dev <branch>       switch to the branch (fetched from origin) and restart
#   woke-dev status         show what is running
#   woke-dev stop           stop the dev copy
#   woke-dev packaged       stop the dev copy and start the packaged build
param([string]$Target = '')

$ErrorActionPreference = 'Stop'

$Root = $PSScriptRoot
$Repo = Join-Path $Root 'woke-poe-trade-dev'
$MainClone = Join-Path $Root 'woke-poe-trade'
$PackagedExe = Join-Path $Root 'woke-poe-trade-build\main\dist\win-unpacked\Woke PoE Trade.exe'
$State = Join-Path $Root '.woke-dev'
$VitePort = 5173
$HostPort = 8584
$DebugPort = 9333
# Other builds of the app that hold the same hotkeys and data folder.
$OtherBuilds = @('Woke PoE Trade.exe', 'Woke-Tauri-Test.exe')

function Fail ($msg) { Write-Host "woke-dev: $msg"; exit 1 }

function Git {
  $line = 'git -C "' + $Repo + '" ' + ($args -join ' ') + ' 2>&1'
  $out = & cmd /c $line
  if ($LASTEXITCODE -ne 0) { throw "git $($args -join ' ') failed:`n$($out -join "`n")" }
  return $out
}

function GitOk {
  $line = 'git -C "' + $Repo + '" ' + ($args -join ' ') + ' >nul 2>&1'
  & cmd /c $line
  return $LASTEXITCODE -eq 0
}

function Listener ($port) {
  $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($conn) { return $conn.OwningProcess }
  return $null
}

function Find-Electrons {
  # Dev Electrons of any clone of this repo, started as `electron .`. Matching on
  # both keeps other Electron apps and test scripts run with this Electron safe.
  Get-CimInstance Win32_Process -Filter "Name='electron.exe'" |
    Where-Object { $_.ExecutablePath -like '*woke-poe-trade*\main\node_modules\electron\*' -and $_.CommandLine -match '\s\.$' }
}

function Kill-Tree ($procId) {
  & cmd /c "taskkill /T /F /PID $procId >nul 2>&1"
}

function Stop-Dev {
  foreach ($name in 'vite', 'main') {
    $pidFile = Join-Path $State "$name.pid"
    if (Test-Path $pidFile) {
      Kill-Tree ([int](Get-Content $pidFile))
      Remove-Item $pidFile -Force
    }
  }
  foreach ($proc in @(Find-Electrons)) {
    # The watcher restarts Electron on a rebuild, so it has to go too.
    $parent = Get-CimInstance Win32_Process -Filter "ProcessId=$($proc.ParentProcessId)"
    if ($parent -and $parent.CommandLine -like '*build?script.mjs*') { Kill-Tree $parent.ProcessId }
    Kill-Tree $proc.ProcessId
  }
  $holder = Listener $VitePort
  if ($holder) {
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$holder"
    if ($proc.CommandLine -like '*woke-poe-trade*' -or $proc.CommandLine -like '*vite*') {
      Kill-Tree $holder
    } else {
      Fail "port $VitePort is held by process $holder ($($proc.Name)), which does not look like this app. Stop it and run again."
    }
  }
}

function Stop-OtherBuilds {
  foreach ($exe in $OtherBuilds) {
    Get-CimInstance Win32_Process -Filter "Name='$exe'" | ForEach-Object {
      Write-Host "Stopping $exe (process $($_.ProcessId))"
      Kill-Tree $_.ProcessId
    }
  }
}

function Start-Detached ($commandLine, $dir) {
  # Started through WMI so the process outlives the shell or session that ran
  # this script (a plain child dies with a Claude session), with a clean
  # environment (no ELECTRON_RUN_AS_NODE from a parent Electron app).
  $startup = New-CimInstance -ClassName Win32_ProcessStartup -ClientOnly -Property @{ ShowWindow = [uint16]0 }
  $result = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
    CommandLine = $commandLine
    CurrentDirectory = $dir
    ProcessStartupInformation = $startup
  }
  if ($result.ReturnValue -ne 0) { throw "could not start: $commandLine (code $($result.ReturnValue))" }
  return $result.ProcessId
}

function Switch-Branch ($branch) {
  if ($branch -notmatch '^[\w./-]+$' -or -not (GitOk check-ref-format --branch $branch)) {
    Fail "'$branch' is not a branch name."
  }
  if (Git status --porcelain) {
    Fail "the dev copy has uncommitted changes. Commit or stash them in $Repo, or run woke-dev with no branch to restart without switching. Nothing was changed."
  }

  $upstream = "origin/$branch"
  if (GitOk fetch -q origin "+refs/heads/${branch}:refs/remotes/origin/$branch") {
  } elseif (GitOk fetch -q "`"$MainClone`"" "+refs/heads/${branch}:refs/remotes/local/$branch") {
    $upstream = "local/$branch"
    Write-Host "$branch is not on origin, using the local clone's copy."
  } else {
    Fail "branch '$branch' is on neither origin nor $MainClone."
  }

  # Keep commits that only exist in the dev copy; a force-pushed branch without
  # any of those just moves to the new tip.
  $action = 'reset'
  if (GitOk rev-parse -q --verify "refs/heads/$branch") {
    if (GitOk merge-base --is-ancestor $upstream $branch) {
      $action = 'keep'
    } elseif (Git log --oneline -1 $branch --not --remotes) {
      Fail "local branch $branch has commits that are not on any remote and has diverged from $upstream. Push or delete them in $Repo. Nothing was changed."
    }
  }
  return @{ Branch = $branch; Upstream = $upstream; Action = $action }
}

function Apply-Branch ($plan) {
  if ($plan.Action -eq 'keep') {
    Git checkout -q $plan.Branch | Out-Null
  } else {
    Git checkout -q -B $plan.Branch $plan.Upstream | Out-Null
  }
}

function Ensure-Deps {
  foreach ($part in 'renderer', 'main') {
    $dir = Join-Path $Repo $part
    $files = @(Join-Path $dir 'package-lock.json') + @(Get-ChildItem (Join-Path $dir 'build\*.patch') -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName })
    $hash = ($files | Sort-Object | ForEach-Object { (Get-FileHash $_).Hash }) -join ''
    $stamp = Join-Path $State "deps-$part.txt"
    $installed = Test-Path (Join-Path $dir 'node_modules')
    if ($installed -and (Test-Path $stamp) -and (Get-Content $stamp) -eq $hash) { continue }
    Write-Host "Installing $part dependencies (lockfile changed)..."
    & cmd /c "cd /d `"$dir`" && npm ci --no-audit --no-fund > `"$State\npm-$part.log`" 2>&1"
    if ($LASTEXITCODE -ne 0) { Fail "npm ci failed in $part, see $State\npm-$part.log" }
    Set-Content -Path $stamp -Value $hash
  }
}

function Ensure-DataIndexes {
  # Vite lists public files before its plugins run, so on a fresh clone it would
  # answer for these generated files with index.html and the overlay would crash
  # on startup. They have to exist before Vite starts.
  $renderer = Join-Path $Repo 'renderer'
  if (Test-Path (Join-Path $renderer 'public\data\en\items-name.index.bin')) { return }
  & cmd /c "cd /d `"$renderer`" && node src\assets\make-index-files.mjs 2>&1"
  if ($LASTEXITCODE -ne 0) { Fail 'could not generate the data index files.' }
}

function Backup-Config {
  # The dev copy saves to the real settings, and a preview branch can change
  # them, so each start keeps a copy. The newest 20 are kept.
  # The copy runs detached too: a sandboxed session (a Claude thread) can see a
  # stale snapshot of AppData, and the app itself reads the real file.
  $dir = Join-Path $State 'config-backups'
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $dest = Join-Path $dir ('config-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.json')
  Start-Detached "cmd.exe /c copy /y `"%APPDATA%\woke-poe-trade\apt-data\config.json`" `"$dest`"" $dir | Out-Null
  $deadline = (Get-Date).AddSeconds(3)
  while (-not (Test-Path $dest) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 100 }
  Get-ChildItem $dir -Filter 'config-*.json' | Sort-Object Name -Descending | Select-Object -Skip 20 | Remove-Item -Force
}

function Start-Dev {
  $node = (Get-Command node.exe).Source
  $viteCmd = "cmd.exe /s /c `"`"$node`" node_modules\vite\bin\vite.js --strictPort > `"$State\vite.log`" 2>&1`""
  Set-Content (Join-Path $State 'vite.pid') (Start-Detached $viteCmd (Join-Path $Repo 'renderer'))

  $deadline = (Get-Date).AddSeconds(60)
  while (-not (Listener $VitePort)) {
    if ((Get-Date) -gt $deadline) {
      Get-Content "$State\vite.log" -Tail 20 -ErrorAction SilentlyContinue | Write-Host
      Fail "Vite did not start, see $State\vite.log"
    }
    Start-Sleep -Milliseconds 300
  }

  # WOKE_ELECTRON_ARGS: lets a thread inspect the overlay over the debug port
  # without touching hotkeys. Branches older than this script ignore it.
  # WOKE_DEV_BRANCH: shown in the tray tooltip.
  # WOKE_DEV_SAVE_CONFIG: save settings to the real config, as the packaged build does.
  $branch = Git rev-parse --abbrev-ref HEAD
  $mainCmd = "cmd.exe /s /c `"set `"WOKE_ELECTRON_ARGS=--remote-debugging-port=$DebugPort`" && set `"WOKE_DEV_BRANCH=$branch`" && set `"WOKE_DEV_SAVE_CONFIG=1`" && `"$node`" build\script.mjs > `"$State\main.log`" 2>&1`""
  Set-Content (Join-Path $State 'main.pid') (Start-Detached $mainCmd (Join-Path $Repo 'main'))

  $deadline = (Get-Date).AddSeconds(60)
  while (-not (Listener $HostPort)) {
    if ((Get-Date) -gt $deadline) {
      Get-Content "$State\main.log" -Tail 20 -ErrorAction SilentlyContinue | Write-Host
      Fail "the app did not start, see $State\main.log. Another copy may hold the single-instance lock."
    }
    Start-Sleep -Milliseconds 300
  }
}

function Show-Status {
  $electrons = @(Find-Electrons | Where-Object { $_.ExecutablePath -like "$Repo\*" })
  $running = $electrons.Count -gt 0 -and (Listener $VitePort) -and (Listener $HostPort)
  $what = (Git rev-parse --abbrev-ref HEAD) + ' @ ' + (Git log -1 --oneline)
  if ($running) { Write-Host "Dev copy RUNNING: $what" } else { Write-Host "Dev copy not running (checkout: $what)" }
  foreach ($exe in $OtherBuilds) {
    if (Get-CimInstance Win32_Process -Filter "Name='$exe'") { Write-Host "Also running: $exe" }
  }
  Write-Host "Folder: $Repo"
  Write-Host "Logs:   $State\vite.log, $State\main.log"
  if ($running) { Write-Host "Debug:  http://127.0.0.1:$DebugPort" }
}

New-Item -ItemType Directory -Force -Path $State | Out-Null

switch ($Target) {
  'status' { Show-Status; exit 0 }
  'stop' { Stop-Dev; Write-Host 'Dev copy stopped.'; exit 0 }
  'packaged' {
    Stop-Dev
    Stop-OtherBuilds
    if (-not (Test-Path $PackagedExe)) { Fail "no packaged build at $PackagedExe" }
    Start-Detached "`"$PackagedExe`"" (Split-Path $PackagedExe) | Out-Null
    Write-Host 'Packaged build started.'
    exit 0
  }
}

# Checked before anything is stopped, so a refused switch leaves the app running.
$plan = $null
if ($Target) { $plan = Switch-Branch $Target }

Stop-Dev
Stop-OtherBuilds
if ($plan) { Apply-Branch $plan }
Ensure-Deps
Ensure-DataIndexes
Backup-Config
Start-Dev
Show-Status
