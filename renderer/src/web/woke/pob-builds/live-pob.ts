// Your character as a Path of Building build: its gear, socketed gems,
// passive tree and jewels from the last read, written into the builds folder
// as Live/<name>.xml each time it is read (main's saveLiveBuild). PoB opens it
// like any build, with its own numbers. The build you picked is never touched.
import { baseClass } from './gems'
import type { CharacterSnapshot } from './character'
import type { PobItem } from './widget'

const RARITY: Record<string, string> = { 'NORMAL': 'NORMAL', 'MAGIC': 'MAGIC', 'RARE': 'RARE', 'UNIQUE': 'UNIQUE', 'RELIC': 'RELIC', '': 'NORMAL' }

// The live file's path in the builds folder, as main names it (saveLiveBuild).
export function liveBuildPath (name: string): string {
  return `Live/${name.replace(/[^\w -]/g, '_').trim().slice(0, 60) || 'character'}.xml`
}

// PoB's class numbers, the same as the game's; the read normally has them.
const CLASS_ID: Record<string, number> = { Scion: 0, Marauder: 1, Ranger: 2, Witch: 3, Duelist: 4, Templar: 5, Shadow: 6 }

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// PoB's own item text, as it keeps items in a build file.
export function pobNativeText (item: PobItem): string {
  const lines = [`Rarity: ${RARITY[item.rarity] ?? 'NORMAL'}`]
  if (item.rarity === 'RARE' || item.rarity === 'UNIQUE' || item.rarity === 'RELIC') {
    lines.push(item.name, item.base || item.name)
  } else {
    lines.push(item.name || item.base)
  }
  if (item.quality) lines.push(`Quality: ${item.quality}`)
  if (item.sockets) lines.push(`Sockets: ${item.sockets}`)
  if (item.itemLevel) lines.push(`Item Level: ${item.itemLevel}`)
  if (item.levelReq) lines.push(`LevelReq: ${item.levelReq}`)
  for (const inf of item.influences ?? []) lines.push(`${inf} Item`)
  // PoB counts lines, and one implicit can span two.
  const implicitLines = item.implicits.flatMap((line, i) => line.split('\n').map(part => `${item.implicitKinds?.[i] === 'crafted' ? '{crafted}' : ''}${part}`))
  lines.push(`Implicits: ${implicitLines.length}`, ...implicitLines)
  item.mods.forEach((line, i) => {
    const kind = item.modKinds?.[i]
    for (const part of line.split('\n')) lines.push(`${kind === 'crafted' ? '{crafted}' : kind === 'fractured' ? '{fractured}' : ''}${part}`)
  })
  if (item.corrupted) lines.push('Corrupted')
  if (item.mirrored) lines.push('Mirrored')
  return lines.join('\n')
}

// jewelSlots: the game's jewel socket order (passiveTreeJewelSlots), to place jewels.
export function liveBuildXml (s: CharacterSnapshot, jewelSlots: number[], now = Date.now()): string {
  const items: string[] = []
  const slots: string[] = []
  let id = 0
  const add = (item: PobItem) => {
    id++
    items.push(`<Item id="${id}">\n${esc(pobNativeText(item))}\n</Item>`)
    return id
  }
  for (const g of s.gear) slots.push(`<Slot name="${esc(g.slot)}" itemId="${add(g.item)}"/>`)
  const sockets: string[] = []
  for (const j of s.tree.jewels) {
    const node = jewelSlots[j.x]
    const itemId = add(j.item)
    if (node != null) sockets.push(`<Socket nodeId="${node}" itemId="${itemId}"/>`)
  }

  const skills = s.gems.map((g) => {
    const gems = g.gems.map(x => `<Gem nameSpec="${esc(x.name.replace(/ Support$/, ''))}" level="${x.level ?? 1}" quality="${x.quality ?? 0}" enabled="true"/>`)
    return `<Skill slot="${esc(g.slot)}" enabled="true" mainActiveSkill="1">${gems.join('')}</Skill>`
  })

  const masteries = Object.entries(s.tree.masteries).map(([node, effect]) => `{${node},${effect}}`).join(',')
  // Cluster jewel passives in the site's ids: PoB reads them as such with
  // clusterHashFormatVersion 2, as its own importer writes.
  const nodes = [...s.tree.nodes, ...s.tree.clusterNodes].join(',')
  const ascendancy = s.character.class
  const className = baseClass(ascendancy) || ascendancy
  const ascendClassName = className === ascendancy ? 'None' : ascendancy
  const read = new Date(s.readAt).toISOString().replace('T', ' ').slice(0, 16)

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<PathOfBuilding>',
    `<Build level="${s.character.level ?? 1}" targetVersion="3_0" className="${esc(className)}" ascendClassName="${esc(ascendClassName)}" mainSocketGroup="1" viewMode="ITEMS" characterLevelAutoMode="false"/>`,
    '<Tree activeSpec="1">',
    `<Spec title="${esc(s.character.name)}" treeVersion="latest" classId="${s.tree.classId ?? CLASS_ID[className] ?? 0}" ascendClassId="${s.tree.ascendClassId ?? 0}" clusterHashFormatVersion="2" masteryEffects="${masteries}" nodes="${nodes}">`,
    `<Sockets>${sockets.join('')}</Sockets>`,
    '</Spec>',
    '</Tree>',
    `<Items activeItemSet="1">${items.join('\n')}<ItemSet id="1" title="Worn">${slots.join('')}</ItemSet></Items>`,
    `<Skills activeSkillSet="1"><SkillSet id="1" title="Socketed">${skills.join('')}</SkillSet></Skills>`,
    `<Notes>${esc(`${s.character.name}, ${s.character.class} ${s.character.level ?? ''}, as pathofexile.com showed it at ${read} (UTC). Woke PoE Trade writes this file again on each read: edits here don't last. Saved ${new Date(now).toISOString().slice(0, 16)}.`)}</Notes>`,
    '</PathOfBuilding>'
  ].join('\n')
}
