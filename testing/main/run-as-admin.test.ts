// Restart as admin (main/src/woke/run-as-admin.ts), for players who run Path
// of Exile as admin: the elevated copy's arguments, the UAC command and
// telling an elevated process apart.
import { describe, it, expect } from 'vitest'
import { afterPid, elevatedArgs, groupsAreElevated, runAsCommand } from '../../main/src/woke/run-as-admin'
import { AFTER_PID_ARG, NO_AUTO_INSTALL_ARG, relaunchArgs } from '../../main/src/woke/update-install'

describe('run as admin', () => {
  it('reads the mandatory level from whoami /groups', () => {
    expect(groupsAreElevated('Mandatory Label\\High Mandatory Level Label S-1-16-12288 ')).toBe(true)
    expect(groupsAreElevated('Mandatory Label\\Medium Mandatory Level Label S-1-16-8192 ')).toBe(false)
    expect(groupsAreElevated('')).toBe(false)
  })

  it('passes this run\'s arguments on, waits for this process, and drops one-run flags', () => {
    const args = elevatedArgs(['app.exe', '--foo', NO_AUTO_INSTALL_ARG, `${AFTER_PID_ARG}12`], 345)
    expect(args).toEqual(['--foo', `${AFTER_PID_ARG}345`])
    expect(afterPid(['app.exe', ...args])).toBe(345)
  })

  it('a normal restart never waits for an old process', () => {
    expect(relaunchArgs(['app.exe', `${AFTER_PID_ARG}12`, '--foo'], false)).toEqual(['--foo'])
  })

  it('ignores a missing or malformed wait flag', () => {
    expect(afterPid(['app.exe'])).toBeNull()
    expect(afterPid(['app.exe', `${AFTER_PID_ARG}abc`])).toBeNull()
    expect(afterPid(['app.exe', `${AFTER_PID_ARG}-3`])).toBeNull()
  })

  it('builds a Start-Process RunAs command with quotes escaped', () => {
    const cmd = runAsCommand("C:\\Users\\O'Neil\\Woke PoE Trade.exe", ['--a', 'two words'])
    expect(cmd).toContain("-FilePath 'C:\\Users\\O''Neil\\Woke PoE Trade.exe'")
    expect(cmd).toContain("-ArgumentList @('--a','\"two words\"')")
    expect(cmd).toContain('-Verb RunAs')
    expect(runAsCommand('x.exe', [])).not.toContain('ArgumentList')
  })
})
