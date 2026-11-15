import { promises as fs } from 'fs'
import path from 'path'
import { execFile } from 'child_process'
import { app } from 'electron'

// Path of Building has no "open this file" argument: whatever it gets on the
// command line goes to its pob:// web importer, and a file path just opens an
// empty build. What it does do on start is reopen the build named in the
// <Mode> element of its Settings.xml. So to open a build we point that element
// at the file, then start PoB with no arguments.

const EXE_NAME = 'Path of Building.exe'

// PoB Community registers pob:// for itself; its open command names the exe.
async function exeFromRegistry (): Promise<string | null> {
  if (process.platform !== 'win32') return null
  for (const key of ['HKCU\\Software\\Classes\\pob\\shell\\Open\\command', 'HKCR\\pob\\shell\\Open\\command']) {
    const out = await new Promise<string>(resolve => {
      execFile('reg', ['query', key, '/ve'], { windowsHide: true, timeout: 5000 }, (err, stdout) => resolve(err ? '' : stdout))
    })
    const exe = exeFromCommand(out)
    if (exe) return exe
  }
  return null
}

// `reg query` prints `(Default)    REG_SZ    C:\...\Path of Building.exe %1`,
// the path quoted or not.
export function exeFromCommand (regOutput: string): string | null {
  const m = /REG_(?:EXPAND_)?SZ\s+(.+)$/m.exec(regOutput)
  if (!m) return null
  const cmd = m[1].trim()
  const quoted = /^"([^"]+)"/.exec(cmd)
  if (quoted) return quoted[1]
  const at = cmd.toLowerCase().indexOf('.exe')
  return at === -1 ? null : cmd.slice(0, at + 4)
}

async function exists (file: string): Promise<boolean> {
  try { return (await fs.stat(file)).isFile() } catch { return false }
}

// The user's own pick wins, then what PoB registered, then its usual folders.
export async function findPobExe (configured?: string): Promise<string | null> {
  // Explorer's "Copy as path" wraps the path in quotes.
  if (configured) configured = configured.replace(/^"(.*)"$/, '$1')
  if (configured) return (await exists(configured)) ? configured : null
  const candidates = [
    await exeFromRegistry(),
    path.join(app.getPath('appData'), 'Path of Building Community', EXE_NAME),
    process.env['ProgramFiles(x86)'] ? path.join(process.env['ProgramFiles(x86)'], 'Path of Building Community', EXE_NAME) : null,
    process.env.ProgramFiles ? path.join(process.env.ProgramFiles, 'Path of Building Community', EXE_NAME) : null
  ]
  for (const c of candidates) {
    if (c && await exists(c)) return c
  }
  return null
}

// An installed PoB (installed.cfg next to the exe) keeps Settings.xml in
// Documents\Path of Building; a portable copy keeps it next to the exe.
export async function pobSettingsPath (exe: string): Promise<string> {
  const dir = path.dirname(exe)
  return (await exists(path.join(dir, 'installed.cfg')))
    ? path.join(app.getPath('documents'), 'Path of Building', 'Settings.xml')
    : path.join(dir, 'Settings.xml')
}

function escapeAttr (text: string): string {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Settings.xml with its <Mode> pointing at the build; everything else kept.
export function withBuildMode (settingsXml: string | null, buildFile: string, buildName: string): string {
  const mode = '<Mode mode="BUILD">\n' +
    `\t\t<Arg string="${escapeAttr(buildFile.replace(/\\/g, '/'))}"/>\n` +
    `\t\t<Arg string="${escapeAttr(buildName)}"/>\n` +
    '\t</Mode>'
  if (settingsXml && /<PathOfBuilding\b[^>]*>/.test(settingsXml)) {
    if (/<Mode\b[^>]*\/>|<Mode\b[^>]*>[\s\S]*?<\/Mode>/.test(settingsXml)) {
      return settingsXml.replace(/<Mode\b[^>]*\/>|<Mode\b[^>]*>[\s\S]*?<\/Mode>/, () => mode)
    }
    return settingsXml.replace(/<PathOfBuilding\b[^>]*>/, open => `${open}\n\t${mode}`)
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<PathOfBuilding>\n\t${mode}\n</PathOfBuilding>\n`
}

export async function pointPobAtBuild (exe: string, buildFile: string): Promise<void> {
  const settings = await pobSettingsPath(exe)
  let xml: string | null = null
  try {
    xml = await fs.readFile(settings, 'utf8')
  } catch (e) {
    // Only a missing file starts fresh: a locked or unreadable one would lose PoB's settings.
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error(`Couldn't read PoB's Settings.xml: ${(e as Error).message}`)
  }
  if (xml != null && xml.trim() && !/<PathOfBuilding\b/.test(xml)) throw new Error(`PoB's Settings.xml at ${settings} doesn't look like PoB's; left as it is.`)
  const name = path.basename(buildFile).replace(/\.xml$/i, '')
  await fs.mkdir(path.dirname(settings), { recursive: true })
  await fs.writeFile(settings, withBuildMode(xml, buildFile, name), 'utf8')
}
