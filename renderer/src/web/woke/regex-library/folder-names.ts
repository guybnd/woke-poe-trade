// Where other tools file their regexes in the Regex library. No app state here.

export const ATLAS_FOLDER = 'Atlas strategies'
export const POB_FOLDER = 'PoB builds'

// A name as one folder: a "/" in it would nest.
function part (name: string): string {
  return name.replace(/[/\\]+/g, '-').trim()
}

export function joinFolder (...parts: string[]): string {
  return parts.flatMap(p => p.split('/')).map(p => p.trim()).filter(Boolean).join('/')
}

export function strategyRegexFolder (s: { folder?: string, name: string }): string {
  return joinFolder(ATLAS_FOLDER, s.folder ?? '', part(s.name || 'Untitled'))
}

// A build file's folder: its path under the builds folder, less ".xml".
export function buildRegexFolder (relPath: string): string {
  return joinFolder(POB_FOLDER, relPath.replace(/\.xml$/i, ''))
}
