import type { ServerEvents } from '../server'
import { app } from 'electron'
import fs from 'fs/promises'
import path from 'path'

export class ConfigStore {
  private isTmpFile = false
  private cfgPath = path.join(app.getPath('userData'), 'apt-data', 'config.json')

  constructor (server: ServerEvents) {
    server.onEventAnyClient('CLIENT->MAIN::save-config', (cfg) => {
      this.save(cfg.contents, cfg.isTemporary)
      server.sendEventTo('broadcast', {
        name: 'MAIN->CLIENT::config-changed',
        payload: { contents: cfg.contents }
      })
    })
  }

  async load (): Promise<string | null> {
    let contents: string | null = null
    try {
      contents = await fs.readFile(this.cfgPath, 'utf8')
    } catch {}
    return contents
  }

  // woke: saves come in bursts (the run timer catching up on Client.txt saves
  // once per line). Overlapping fs.writeFile calls on one file could leave it
  // as a mix of two saves, invalid JSON, and the next start then fell back to
  // default settings. Writes now run one at a time, newest contents only, and
  // replace the file in one step (write a temp file, then rename).
  private pending: string | null = null
  private writing: Promise<void> = Promise.resolve()

  private save (contents: string, tmp: boolean) {
    // woke: scripts/woke-dev.ps1 opts in, so its dev copy keeps the player's
    // settings. A plain `npm run dev` still can't touch them.
    if (process.env.VITE_DEV_SERVER_URL && !process.env.WOKE_DEV_SAVE_CONFIG) return

    if (tmp && !this.isTmpFile) {
      this.cfgPath += '.tmp'
      this.isTmpFile = true
    }
    this.pending = contents
    this.writing = this.writing.then(() => this.flush())
  }

  private async flush () {
    const contents = this.pending
    if (contents == null) return
    this.pending = null
    const target = this.cfgPath
    try {
      await fs.mkdir(path.dirname(target), { recursive: true })
      const partial = `${target}.writing`
      await fs.writeFile(partial, contents)
      try {
        await fs.rename(partial, target)
      } catch {
        // Windows can refuse the rename while something (antivirus, backup)
        // has the file open; a plain write is still one writer at a time.
        await fs.writeFile(target, contents)
        await fs.rm(partial, { force: true })
      }
    } catch {
      app.exit(1)
    }
  }
}
