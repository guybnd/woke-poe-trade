// Short names for the crafting bench recipes the route picks up, for the
// chip after a step ("⚒ DoT 1"). The full name shows on hover.

const SHORT: Array<[RegExp, string]> = [
  [/^Damage over Time/, 'DoT'],
  [/^Accuracy/, 'Acc'],
  [/^Ailment, Stun and Curse/, 'Ailment'],
  [/^(All )?Attributes/, 'Attr'],
  [/^All Resistances/, 'All res'],
  [/^Double Resistances/, 'Dbl res'],
  [/^Elemental Resistances/, 'Ele res'],
  [/^Attack(,| and) Cast/, 'Speed'],
  [/^Elemental Damage with Attacks/, 'Ele atk'],
  [/^Life and Mana Regeneration/, 'Regen'],
  [/^Life and Mana/, 'Life'],
  [/^Mana Regen/, 'Mana regen'],
  [/^Movement Speed/, 'MS'],
  [/^Flask Duration/, 'Flask'],
  [/^Physical Damage/, 'Phys'],
  [/^Lightning Damage/, 'Light'],
  [/^Spell Damage/, 'Spell'],
  [/^Traps and Mines/, 'Traps'],
  [/^Vaal Skill/, 'Vaal'],
  [/^Socket Colours/, 'Colours'],
  [/^Socket Links/, 'Links'],
  [/^Socket Numbers/, 'Sockets'],
  [/^Trigger a Socketed Spell/, 'Trigger'],
  [/^Minions/, 'Minion'],
  [/^Defences/, 'Def'],
  [/^(\w+) Damage/, '$1']
]

export function shortRecipe (name: string): string {
  const rank = / - Rank (\d+)$/.exec(name)?.[1]
  const base = rank ? name.slice(0, name.length - ` - Rank ${rank}`.length) : name
  let short = base
  for (const [re, to] of SHORT) {
    const m = re.exec(base)
    if (m) { short = to.replace('$1', m[1] ?? ''); break }
  }
  return rank ? `${short} ${rank}` : short
}

// The chip's hover text: each recipe's full name.
export function craftTitle (recipes: readonly string[]): string {
  return recipes.map(r => `Crafting recipe: ${r}`).join('\n')
}

// "⚒ DoT 1 · Fire 2" for the chip, or '' with no recipes.
export function craftChip (recipes: readonly string[]): string {
  return recipes.length ? `⚒ ${recipes.map(shortRecipe).join(' · ')}` : ''
}
