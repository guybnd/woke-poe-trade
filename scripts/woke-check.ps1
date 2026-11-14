# Runs a branch's checks without loading the PC while Path of Exile is open.
# See "Checks while playing" in DEVELOPING.md.
#
#   woke-check            auto: local if PoE is closed, cloud if it is open
#   woke-check local      lint, type checks, unit tests on this PC (low priority)
#   woke-check local -E2e also builds the overlay and runs the fake-game tests
#   woke-check cloud      push the branch and wait for the Tests workflow on GitHub
#
# WOKE_CHECKS=local or WOKE_CHECKS=cloud overrides the automatic choice.
# Run it from anywhere inside a clone or worktree of the repo.
param(
  [string]$Mode = '',
  [switch]$E2e,
  [int]$TimeoutMinutes = 60
)

# Native commands write progress to stderr; with 'Stop' Windows PowerShell 5.1
# turns that into errors. Exit codes are checked by hand instead.
$ErrorActionPreference = 'Continue'

$Slug = 'guybnd/woke-poe-trade'
$Workflow = 'test.yml'

function Say ($msg) { Write-Host "woke-check: $msg" }
function Fail ($msg) { Say $msg; exit 1 }

$Root = (& git rev-parse --show-toplevel 2>$null)
if ($LASTEXITCODE -ne 0 -or -not $Root) { Fail 'run this inside a clone of woke-poe-trade' }
$Root = $Root.Trim()

function Test-PoeRunning {
  # PathOfExile.exe, PathOfExileSteam.exe, PathOfExile_x64*.exe, the Epic and
  # Kakao builds, and PoE 2, which uses the same names.
  return [bool](Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -match '^PathOfExile' })
}

if (-not $Mode) { $Mode = $env:WOKE_CHECKS }
if (-not $Mode) { $Mode = 'auto' }
$Mode = $Mode.ToLower()
if ($Mode -eq 'auto') {
  if (Test-PoeRunning) {
    $Mode = 'cloud'
    Say 'Path of Exile is running, so the checks run on GitHub'
  } else {
    $Mode = 'local'
  }
}
if ($Mode -notin @('local', 'cloud')) { Fail "unknown mode '$Mode' (auto, local or cloud)" }

# ---------------------------------------------------------------- local

function Invoke-Local {
  # Children inherit this, so the checks give way to anything else running.
  try { (Get-Process -Id $PID).PriorityClass = 'BelowNormal' } catch {}

  $steps = @(
    @{ Name = 'Lint'; Dir = 'renderer'; Cmd = 'npm run lint' },
    @{ Name = 'Type check (app + tests)'; Dir = 'renderer'; Cmd = 'npm run typecheck:test' },
    @{ Name = 'Unit tests'; Dir = 'renderer'; Cmd = 'npm test' },
    @{ Name = 'Type check (main)'; Dir = 'main'; Cmd = 'npx tsc --noEmit' }
  )
  if ($E2e) {
    $steps += @{ Name = 'Build the overlay'; Dir = 'renderer'; Cmd = 'npx vite build' }
    $steps += @{ Name = 'Fake-game tests'; Dir = 'testing'; Cmd = 'npx playwright test --trace off' }
  }

  foreach ($dir in ($steps | ForEach-Object { $_.Dir } | Select-Object -Unique)) {
    if (-not (Test-Path (Join-Path $Root "$dir\node_modules"))) {
      Fail "$($dir) has no node_modules: run npm ci there first"
    }
  }

  $failed = @()
  foreach ($s in $steps) {
    Say "$($s.Name) (in $($s.Dir)): $($s.Cmd)"
    Push-Location (Join-Path $Root $s.Dir)
    & cmd /c $s.Cmd
    $code = $LASTEXITCODE
    Pop-Location
    if ($code -ne 0) { $failed += $s.Name }
  }

  if ($failed.Count) { Fail "failed: $($failed -join ', ')" }
  Say 'all local checks passed'
  exit 0
}

# ---------------------------------------------------------------- cloud

function Gh {
  # gh with the fork named every time: in clones of a fork, gh defaults to upstream.
  $out = & gh @args --repo $Slug
  return @{ Code = $LASTEXITCODE; Out = ($out -join "`n") }
}

function Find-Runs ($branch, $sha) {
  $r = Gh run list --workflow $Workflow --branch $branch --limit 30 --json 'databaseId,event,status,conclusion,headSha,createdAt,url'
  if ($r.Code -ne 0 -or -not $r.Out) { return @() }
  return @(($r.Out | ConvertFrom-Json) | Where-Object { $_.headSha -eq $sha } | Sort-Object createdAt -Descending)
}

function Invoke-Cloud {
  $branch = (& git -C $Root rev-parse --abbrev-ref HEAD).Trim()
  if ($branch -eq 'HEAD') { Fail 'detached HEAD: check out a branch first' }
  if ($branch -in @('master', 'main')) { Fail "won't push $($branch): use a branch" }

  $dirty = & git -C $Root status --porcelain --untracked-files=no
  if ($dirty) { Fail "uncommitted changes would not be checked: commit them first`n$($dirty -join "`n")" }
  $untracked = @(& git -C $Root status --porcelain --untracked-files=normal | Where-Object { $_ -like '`?`? *' })
  if ($untracked.Count) { Say "note: $($untracked.Count) untracked file(s) are not part of the check" }

  $sha = (& git -C $Root rev-parse HEAD).Trim()

  # Push, retrying network errors. A rejected push (the remote moved) is not retried.
  $pushed = $false
  foreach ($try in 1..4) {
    $out = & git -C $Root push -u origin $branch 2>&1
    if ($LASTEXITCODE -eq 0) { $pushed = $true; break }
    $text = $out -join "`n"
    if ($text -match 'rejected|non-fast-forward|fetch first') { Fail "push rejected, pull or rebase first:`n$text" }
    if ($try -lt 4) { $wait = [math]::Pow(2, $try); Say "push failed (try $try), retrying in $wait s"; Start-Sleep -Seconds $wait }
    else { Fail "push failed:`n$text" }
  }
  Say "pushed $branch at $($sha.Substring(0, 8))"

  # Pull requests run the workflow on every push. Without one, start it by hand.
  $pr = Gh pr list --head $branch --state open --json 'number,url'
  $prs = @()
  if ($pr.Code -eq 0 -and $pr.Out) { $prs = @($pr.Out | ConvertFrom-Json) }
  if ($prs.Count) { Say "PR: $($prs[0].url)" }

  $run = $null
  $dispatched = $false
  $deadline = (Get-Date).AddMinutes(4)
  while (-not $run) {
    $runs = Find-Runs $branch $sha
    $run = $runs | Where-Object { $_.status -ne 'completed' -or $_.conclusion -ne 'cancelled' } | Select-Object -First 1
    if ($run) { break }
    if (-not $prs.Count -and -not $dispatched) {
      $d = Gh workflow run $Workflow --ref $branch
      if ($d.Code -ne 0) { Fail "couldn't start the $Workflow workflow:`n$($d.Out)" }
      $dispatched = $true
      Say 'no open PR, so the workflow was started by hand (this also builds the Windows package)'
    }
    if ((Get-Date) -gt $deadline) { Fail "no $Workflow run showed up for $($sha.Substring(0, 8)) in 4 minutes" }
    Start-Sleep -Seconds 15
  }
  Say "run: $($run.url)"

  # Poll gently and print only what changed.
  $seen = @{}
  $deadline = (Get-Date).AddMinutes($TimeoutMinutes)
  while ($true) {
    $v = Gh run view $run.databaseId --json 'status,conclusion,jobs'
    if ($v.Code -eq 0 -and $v.Out) {
      $info = $v.Out | ConvertFrom-Json
      foreach ($j in $info.jobs) {
        $state = if ($j.status -eq 'completed') { $j.conclusion } else { $j.status }
        if ($seen[$j.name] -ne $state) { $seen[$j.name] = $state; Say "  $($j.name): $state" }
      }
      if ($info.status -eq 'completed') { break }
    }
    if ((Get-Date) -gt $deadline) { Fail "still running after $TimeoutMinutes minutes: $($run.url)" }
    Start-Sleep -Seconds 30
  }

  switch ($info.conclusion) {
    'success' { Say "all cloud checks passed: $($run.url)"; exit 0 }
    'cancelled' { Say "the run was cancelled, usually by a newer push to the branch: $($run.url)"; exit 2 }
    default {
      Say "checks failed ($($info.conclusion)): $($run.url)"
      $log = & gh run view $run.databaseId --repo $Slug --log-failed
      if ($log) { $log | Select-Object -Last 150 | ForEach-Object { Write-Host $_ } }
      exit 1
    }
  }
}

if ($Mode -eq 'local') { Invoke-Local } else { Invoke-Cloud }
