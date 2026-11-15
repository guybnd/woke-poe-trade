// Only the fields the editor knows for the edit's kind, so nothing extra a
// suggestion carries ends up saved in the loot filter's config.
const EDIT_FIELDS: Record<string, string[]> = {
  move: ['base', 'from', 'to'],
  style: ['tier', 'patch'],
  visibility: ['tier', 'visibility'],
  group: ['hidden'],
  stack: ['tier', 'size'],
  item: ['tier', 'base', 'visibility', 'patch', 'anchor', 'pin']
}
export function cleanEdit (raw: Record<string, unknown>): Record<string, unknown> {
  const fields = EDIT_FIELDS[String(raw.kind)] ?? []
  const out: Record<string, unknown> = { kind: raw.kind, type: raw.type }
  for (const f of fields) if (raw[f] !== undefined) out[f] = raw[f]
  return out
}
