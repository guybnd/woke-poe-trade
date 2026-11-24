// Restart as admin (main/src/woke/run-as-admin.ts), for players who run Path
// of Exile as admin: the elevated copy's arguments, the UAC command and
// reading what rights this process has.
import { describe, it, expect } from 'vitest'
import { afterPid, elevatedArgs, readRights, runAsCommand } from '../../main/src/woke/run-as-admin'
import { AFTER_PID_ARG, NO_AUTO_INSTALL_ARG, relaunchArgs } from '../../main/src/woke/update-install'

describe('run as admin', () => {
  it('reads elevation and Administrators membership from whoami /groups', () => {
    const adminNotElevated = 'BUILTIN\\Administrators Alias S-1-5-32-544 Group used for deny only\nMandatory Label\\Medium Mandatory Level Label S-1-16-8192'
    expect(readRights(adminNotElevated)).toEqual({ elevated: false, admin: true })
    expect(readRights('BUILTIN\\Administrators Alias S-1-5-32-544\nMandatory Label\\High Mandatory Level Label S-1-16-12288')).toEqual({ elevated: true, admin: true })
    expect(readRights('BUILTIN\\Users Alias S-1-5-32-545\nMandatory Label\\Medium Mandatory Level Label S-1-16-8192')).toEqual({ elevated: false, admin: false })
  })

  it('treats no answer as not known, never as "not elevated"', () => {
    expect(readRights('')).toEqual({ elevated: null, admin: null })
  })

  it('passes this run\'s arguments on and waits for this process', () => {
    const args = elevatedArgs(['app.exe', '--foo', `${AFTER_PID_ARG}12`], 345)
    expect(args).toEqual(['--foo', `${AFTER_PID_ARG}345`])
    expect(afterPid(['app.exe', ...args])).toBe(345)
  })

  it('keeps "installer failed" for the elevated copy, only when this run has it', () => {
    expect(elevatedArgs(['app.exe', NO_AUTO_INSTALL_ARG], 9)).toEqual([NO_AUTO_INSTALL_ARG, `${AFTER_PID_ARG}9`])
  })

  it('a normal restart never waits for an old process', () => {
    expect(relaunchArgs(['app.exe', `${AFTER_PID_ARG}12`, '--foo'], false)).toEqual(['--foo'])
  })

  it('ignores a missing or malformed wait flag', () => {
    expect(afterPid(['app.exe'])).toBeNull()
    expect(afterPid(['app.exe', `${AFTER_PID_ARG}abc`])).toBeNull()
    expect(afterPid(['app.exe', `${AFTER_PID_ARG}-3`])).toBeNull()
  })

  it('builds a Start-Process RunAs command with quotes escaped, curly ones too', () => {
    const cmd = runAsCommand('C:\\Users\\O\'Ne\u2019il\\Woke PoE Trade.exe', ['--a', 'two words'])
    expect(cmd).toContain('-FilePath \'C:\\Users\\O\'\'Ne\u2019\u2019il\\Woke PoE Trade.exe\'')
    expect(cmd).toContain('-ArgumentList @(\'--a\',\'"two words"\')')
    expect(cmd).toContain('-Verb RunAs')
    expect(cmd).toContain('1223) { exit 2 }')
    expect(runAsCommand('x.exe', [])).not.toContain('ArgumentList')
  })
})
