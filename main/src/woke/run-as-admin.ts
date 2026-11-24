// Running the app with administrator rights, for players who run Path of
// Exile as admin. Windows then stops a normal app from sending the game keys
// or reading what it copies (Ctrl+D finds no item), so the app has to run
// elevated too. Nothing here shows for anyone else: the offer appears only
// when the game window reports no access (OverlayWindow), and "Always start as
// admin" only does something once a player ticked it there.
//
// Starting elevated means a UAC prompt each time: Windows asks, the app can't
// skip that without a scheduled task, which this doesn't set up.
import { app, dialog } from 'electron'
import { spawn, spawnSync } from 'child_process'
import { appPrefs, canRestartApp, preparePlainQuit, setAppPrefs } from './app-prefs'
import { AFTER_PID_ARG, relaunchArgs } from './update-install'

// The elevated copy waits for the copy that started it to quit (AFTER_PID_ARG),
// so only one runs and the old one's last config write lands before the new
// one reads it.

// High (12288) or System (16384) mandatory level in `whoami /groups`.
export function groupsAreElevated (stdout: string): boolean {
  return /S-1-16-(12288|16384)\b/.test(stdout)
}

let elevated: boolean | null = null
export function isElevated (): boolean {
  if (process.platform !== 'win32') return false
  if (elevated == null) {
    try {
      const out = spawnSync('whoami', ['/groups'], { encoding: 'utf8', windowsHide: true, timeout: 5000 })
      elevated = groupsAreElevated(out.stdout ?? '')
    } catch {
      elevated = false
    }
  }
  return elevated
}

export function afterPid (argv: string[]): number | null {
  const arg = argv.find(a => a.startsWith(AFTER_PID_ARG))
  const pid = arg ? Number(arg.slice(AFTER_PID_ARG.length)) : NaN
  return Number.isInteger(pid) && pid > 0 ? pid : null
}

// The arguments the elevated copy starts with: this run's (one-run flags and
// an older wait flag dropped) plus who to wait for.
export function elevatedArgs (argv: string[], pid: number): string[] {
  return [...relaunchArgs(argv, false), `${AFTER_PID_ARG}${pid}`]
}

// PowerShell's Start-Process -Verb RunAs shows the UAC prompt; it fails
// (exit code 1) when the player says no. Single-quoted strings take '' for '.
export function runAsCommand (exe: string, args: string[]): string {
  const q = (s: string) => `'${s.replace(/'/g, "''")}'`
  // Start-Process joins the list with spaces, so an argument with a space
  // needs its own double quotes to arrive whole.
  const list = args.map(a => q(/\s/.test(a) ? `"${a}"` : a)).join(',')
  return `$ErrorActionPreference='Stop'; Start-Process -FilePath ${q(exe)}` +
    (args.length ? ` -ArgumentList @(${list})` : '') + ' -Verb RunAs'
}

// Before the single-instance lock: an elevated copy started by
// relaunchAsAdmin waits (up to 20 s) for the copy that started it to quit.
export function waitForStarter () {
  const pid = afterPid(process.argv)
  if (pid == null) return
  const sleeper = new Int32Array(new SharedArrayBuffer(4))
  const until = Date.now() + 20_000
  while (Date.now() < until) {
    try {
      process.kill(pid, 0)
    } catch (e) {
      // EPERM: it's there but not ours to signal, so still running.
      if ((e as NodeJS.ErrnoException).code !== 'EPERM') return
    }
    Atomics.wait(sleeper, 0, 0, 100)
  }
}

export function canRunAsAdmin () {
  return process.platform === 'win32' && canRestartApp()
}

let starting = false
// Starts an elevated copy and quits this one. False when the player said no
// to the UAC prompt, or it couldn't start: this copy keeps running.
export function relaunchAsAdmin (): Promise<boolean> {
  if (!canRunAsAdmin() || starting) return Promise.resolve(false)
  starting = true
  const command = runAsCommand(process.execPath, elevatedArgs(process.argv, process.pid))
  return new Promise((resolve) => {
    const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command], { windowsHide: true, stdio: 'ignore' })
    ps.on('error', () => { starting = false; resolve(false) })
    ps.on('exit', (code) => {
      starting = false
      if (code === 0) {
        preparePlainQuit()
        app.quit()
      }
      resolve(code === 0)
    })
  })
}

// At start: a player who ticked "Always start as admin" gets the UAC prompt
// now, before the game, instead of the no-access popup later. Saying no keeps
// this copy running as before.
export async function startElevatedIfChosen (): Promise<boolean> {
  if (!appPrefs().alwaysAdmin || !canRunAsAdmin() || isElevated()) return false
  return await relaunchAsAdmin()
}

let asking = false
// The popup when Path of Exile runs as admin. With no way to restart (dev
// build, portable exe) it only says what to do, as before.
export async function showNeedsAdmin () {
  if (asking) return
  if (!canRunAsAdmin()) {
    dialog.showErrorBox(
      'PoE window - No access',
      'Path of Exile is running with administrator rights.\n' +
      '\n' +
      'You need to restart Woke PoE Trade with administrator rights.'
    )
    return
  }
  asking = true
  try {
    const { response, checkboxChecked } = await dialog.showMessageBox({
      type: 'warning',
      title: 'PoE window - No access',
      message: 'Path of Exile is running as admin',
      detail: 'Windows blocks this app from reading items and sending keys to the game until it runs as admin too.',
      buttons: ['Restart as admin', 'Not now'],
      defaultId: 0,
      cancelId: 1,
      checkboxLabel: 'Always start as admin',
      checkboxChecked: appPrefs().alwaysAdmin,
      noLink: true
    })
    if (checkboxChecked !== appPrefs().alwaysAdmin) setAppPrefs({ alwaysAdmin: checkboxChecked })
    if (response === 0) await relaunchAsAdmin()
  } finally {
    asking = false
  }
}
