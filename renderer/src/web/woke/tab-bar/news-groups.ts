import type { NewsItem } from './news'

// The dock's What's new card lists lines by tool (and Price check by topic),
// so a long list folds into a few headings. Its own file: only the lazy dock
// card uses it, so it stays out of the startup JS (perf budget).
export interface NewsGroup {
  key: string
  wmType: string
  name: string
  topic?: string
  lines: NewsItem[]
}

// In NEWS order (newest first), so the group with the newest line leads.
export function groupNews (lines: readonly NewsItem[]): NewsGroup[] {
  const byKey = new Map<string, NewsGroup>()
  for (const n of lines) {
    const key = n.topic ? `${n.wmType}:${n.topic}` : n.wmType
    let g = byKey.get(key)
    if (!g) {
      g = { key, wmType: n.wmType, name: n.name, topic: n.topic, lines: [] }
      byKey.set(key, g)
    }
    g.lines.push(n)
  }
  return [...byKey.values()]
}
