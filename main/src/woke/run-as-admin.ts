// Running the app with administrator rights, for players who run Path of
// Exile as admin. Windows then stops a normal app from sending the game keys
// or reading what it copies (Ctrl+D finds no item), so the app has to run
// elevated too. Nothing here shows for anyone else: the offer appears only
// when the game window reports no access (OverlayWindow), and "Always start as
// admin" only does something once a player ticked it there.
//
// Starting elevated means a UAC prompt each time: Windows asks, the app can't
// skip that without a scheduled task, which this doesn't set up. Offered only
// to an account in Administrators: for anyone else Windows asks for another
// account's password and the app would run as that account, with its data.
import { app, dialog } from 'electron'
import { execFile, spawn } from 'child_process'
import { appPrefs, canRestartApp, preparePlainQuit, setAppPrefs } from './app-prefs'
import { AFTER_PID_ARG, NO_AUTO_INSTALL_ARG, relaunchArgs } from './update-install'
import { afterPid } from './wait-starter'

export { afterPid }

export interface Rights {
  // Null: whoami didn't answer, so not known.
  elevated: boolean | null
  admin: boolean | null
}

// From `whoami /groups`: High (12288) or System (16384) mandatory level, and
// BUILTIN\Administrators (S-1-5-32-544, listed "for deny only" while not
// elevated). Matched by SID, so any Windows language reads the same.
export function readRights (stdout: string): Rights {
  if (!/S-1-16-\d+/.test(stdout)) return { elevated: null, admin: null }
  return {
    elevated: /S-1-16-(12288|16384)\b/.test(stdout),
    admin: /S-1-5-32-544\b/.test(stdout)
  }
}

let rights: Promise<Rights> | null = null
let known: Rights | null = null
export function probeRights (): Promise<Rights> {
  if (process.platform !== 'win32') return Promise.resolve({ elevated: false, admin: false })
  rights ??= new Promise((resolve) => {
    execFile('whoami', ['/groups'], { windowsHide: true, timeout: 10_000 }, (err, stdout) => {
      const r = err ? { elevated: null, admin: null } : readRights(String(stdout))
      known = r
      // A failed read can be tried again later.
      if (r.elevated == null) rights = null
      resolve(r)
    })
  })
  return rights
}

// What the last probe found, without waiting (the tray's menu is built at once).
export function knownRights (): Rights | null { return known }

// Restart as admin makes sense: Windows, a build that can start itself, an
// account that can elevate, and not elevated yet.
export function canOffer (r: Rights | null): boolean {
  return process.platform === 'win32' && canRestartApp() && r?.admin === true && r.elevated === false
}

// The arguments the elevated copy starts with: this run's (one-run flags kept
// only as this run has them) plus who to wait for.
export function elevatedArgs (argv: string[], pid: number): string[] {
  return [...relaunchArgs(argv, argv.includes(NO_AUTO_INSTALL_ARG)), `${AFTER_PID_ARG}${pid}`]
}

// PowerShell's Start-Process -Verb RunAs shows the UAC prompt. Exit 0: the
// copy started. 2: the player said no (ERROR_CANCELLED, 1223). 3: it failed.
// Single-quoted strings double each quote, and PowerShell counts the curly
// ones as quotes too.
export function runAsCommand (exe: string, args: string[]): string {
  const q = (s: string) => `'${s.replace(/['‘’‚‛]/g, m => m + m)}'`
  // Start-Process joins the list with spaces, so an argument with a space
  // needs its own double quotes to arrive whole.
  const list = args.map(a => q(/\s/.test(a) ? `"${a}"` : a)).join(',')
  return 'try { Start-Process -ErrorAction Stop -FilePath ' + q(exe) +
    (args.length ? ` -ArgumentList @(${list})` : '') + ' -Verb RunAs; exit 0 } ' +
    'catch { $e = $_.Exception; while ($e) { if ($e.NativeErrorCode -eq 1223) { exit 2 }; $e = $e.InnerException }; exit 3 }'
}

export type RelaunchResult = 'started' | 'declined' | 'failed'

let log: (line: string) => void = () => {}
export function setRunAsAdminLog (fn: (line: string) => void) { log = fn }

let starting = false
let quitting = false
// Starts an elevated copy and quits this one. 'declined' when the player said
// no to the UAC prompt, 'failed' when it couldn't start: this copy keeps
// running either way.
export function relaunchAsAdmin (): Promise<RelaunchResult> {
  if (quitting || starting) return Promise.resolve('declined')
  starting = true
  const command = runAsCommand(process.execPath, elevatedArgs(process.argv, process.pid))
  return new Promise((resolve) => {
    const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command], { windowsHide: true, stdio: 'ignore' })
    ps.on('error', (err) => {
      starting = false
      log(`error [RunAsAdmin] PowerShell didn't start: ${err.message}`)
      resolve('failed')
    })
    ps.on('exit', (code) => {
      if (code === 0) {
        quitting = true
        log('info [RunAsAdmin] Elevated copy started; quitting this one.')
        preparePlainQuit()
        app.quit()
        resolve('started')
        return
      }
      starting = false
      if (code === 2) {
        resolve('declined')
      } else {
        log(`error [RunAsAdmin] Start-Process failed (exit ${String(code)})`)
        resolve('failed')
      }
    })
  })
}

// At start: a player who ticked "Always start as admin" gets the UAC prompt
// now, before the game, instead of the no-access popup later. Saying no keeps
// this copy running. A copy that was itself started this way never starts
// another, so nothing can loop.
export async function startElevatedIfChosen (): Promise<boolean> {
  if (!appPrefs().alwaysAdmin || process.platform !== 'win32' || !canRestartApp()) return false
  const r = await probeRights()
  if (afterPid(process.argv) != null) {
    if (r.elevated === false) log('error [RunAsAdmin] Restarted as admin but still not elevated (UAC off?).')
    return false
  }
  if (!canOffer(r)) return false
  return (await relaunchAsAdmin()) === 'started'
}

function showManual (r: Rights | null) {
  dialog.showErrorBox(
    'PoE window - No access',
    r?.elevated
      ? 'Path of Exile is running with rights this app doesn\'t have, though it runs as admin too.\n\nStart both from the same Windows account.'
      : 'Path of Exile is running with administrator rights.\n' +
        '\n' +
        'You need to restart Woke PoE Trade with administrator rights.'
  )
}

// The tray's Restart as admin: says what to do by hand if it couldn't.
export async function restartAsAdmin () {
  if ((await relaunchAsAdmin()) === 'failed') showManual(knownRights())
}

let asking = false
let dismissed = false
// The popup when Path of Exile runs as admin. Where restarting can't help
// (dev build, portable exe, an account that can't elevate, already elevated)
// it only says what to do, as before. After "Not now" it stays away for this
// run; the tray still offers it.
export async function showNeedsAdmin () {
  if (asking || dismissed || quitting) return
  asking = true
  try {
    const r = await probeRights()
    if (!canOffer(r)) {
      showManual(r)
      return
    }
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
    if (response === 0) {
      if ((await relaunchAsAdmin()) === 'failed') showManual(r)
    } else {
      dismissed = true
    }
  } finally {
    asking = false
  }
}
