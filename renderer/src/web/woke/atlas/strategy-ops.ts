// What keeps a strategy's regexes with it in the Regex library as it's made,
// renamed, moved or copied.
import { addRegex, moveRegexCategory, regexesIn } from '../regex-library/folders'
import { freeRegexFolder, regexFolderOf } from './strategies'
import type { AtlasStrategy } from './strategies'

// A new strategy takes a folder no strategy holds and nothing is filed in,
// so it never inherits a removed strategy's regexes.
export function claimNewRegexFolder (s: AtlasStrategy, strategies: AtlasStrategy[]) {
  s.regexFolder = freeRegexFolder(s, strategies, f => regexesIn(f).length > 0)
}

// After a rename or move: its regexes go to the folder its new name calls for.
export function refileRegexes (s: AtlasStrategy, strategies: AtlasStrategy[]) {
  const old = regexFolderOf(s)
  const next = freeRegexFolder(s, strategies, f => f !== old && regexesIn(f).length > 0)
  if (next !== old) moveRegexCategory(old, next)
  s.regexFolder = next
}

// A copy gets its own folder with the same regexes.
export function copyRegexes (from: AtlasStrategy, to: AtlasStrategy, strategies: AtlasStrategy[]) {
  claimNewRegexFolder(to, strategies)
  for (const r of regexesIn(regexFolderOf(from))) addRegex(regexFolderOf(to), r.name, r.text)
}
