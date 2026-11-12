// The pieces of a PoB build you can pin while you play (pick C, plus the
// short next-step card, pick B): the tree, one gear slot, one gem chain.
import type { Pin } from '../pins/pins'
import { gearLayout, loadoutOf, mainGroupOf, slotLabel } from './build-model'
import type { LoadoutPick, PobDetails, PobSkillGroup } from './widget'

export type BuildPiece = 'tree' | 'slot' | 'gems' | 'next'

type NewPin = Omit<Pin, 'opacity' | 'spots'>

// A chain by where it sits and its label, with a count for twins.
export function groupKey (groups: PobSkillGroup[], g: PobSkillGroup): string {
  const same = groups.filter(x => x.slot === g.slot && x.label === g.label)
  return `${g.slot}|${g.label}|${Math.max(0, same.indexOf(g))}`
}

export function findGroup (groups: PobSkillGroup[], key: string): PobSkillGroup | null {
  return groups.find(g => groupKey(groups, g) === key) ?? null
}

function groupTitle (g: PobSkillGroup): string {
  const main = g.gems.find(x => x.enabled && x.name && !/support/i.test(x.name))?.name
  return main || g.label || slotLabel(g.slot) || 'Gems'
}

export function treePin (relPath: string, build: string): NewPin {
  return { id: `pob-tree:${relPath}`, kind: 'pob-tree', title: `${build} · tree`, icon: 'fas fa-project-diagram', data: { relPath } }
}

export function nextPin (relPath: string, build: string): NewPin {
  return { id: `pob-next:${relPath}`, kind: 'pob-next', title: `${build} · next`, icon: 'fas fa-tasks', data: { relPath } }
}

export function slotPin (relPath: string, slot: string): NewPin {
  return { id: `pob-slot:${relPath}:${slot}`, kind: 'pob-slot', title: slotLabel(slot) || slot, icon: 'fas fa-tshirt', data: { relPath, slot } }
}

export function gemsPin (relPath: string, groups: PobSkillGroup[], g: PobSkillGroup): NewPin {
  const key = groupKey(groups, g)
  return { id: `pob-gems:${relPath}:${key}`, kind: 'pob-gems', title: groupTitle(g), icon: 'fas fa-gem', data: { relPath, group: key } }
}

// Everything of a build you can pin, for the icon's right-click menu: the
// tree, the next step, the main skill, then each item in the gear set in use.
export function buildPinChoices (relPath: string, build: string, d: PobDetails, level: number | null, act: number | null, pick?: LoadoutPick): Array<{ label: string, pin: NewPin }> {
  const out: Array<{ label: string, pin: NewPin }> = []
  if (d.trees.length) out.push({ label: 'Passive tree', pin: treePin(relPath, build) })
  out.push({ label: 'Next step', pin: nextPin(relPath, build) })
  const loadout = loadoutOf(d, level, act, pick)
  const groups = loadout.skillSet?.item.groups ?? []
  const main = mainGroupOf(groups)
  if (main) {
    const pin = gemsPin(relPath, groups, main)
    out.push({ label: `Main skill · ${pin.title}`, pin })
  }
  const layout = gearLayout(loadout.itemSet?.item.slots ?? [], groups)
  for (const r of [layout.main, ...layout.linked, ...layout.plain]) {
    if (!r?.item) continue
    out.push({ label: `${slotLabel(r.slot)} · ${r.item.name}`, pin: slotPin(relPath, r.slot) })
  }
  return out
}
