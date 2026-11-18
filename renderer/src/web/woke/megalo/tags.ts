// The build tags the Megalomaniac searcher scores notables with. Each tag says
// which notable lines it lights (`notable`, on lower-cased stat text) and,
// when the overlay can spot it in a build by itself, which gem names give it
// away (`gem`). A tag that lights no notable is hidden in the panel.
// No app imports here: the tests load it on its own.

export type TagGroup =
  'Damage type' | 'Skill kind' | 'Minions' | 'Weapon' | 'Ailments & DoT' | 'Crit & speed' |
  'Buffs & debuffs' | 'Charges' | 'Defence' | 'Recovery' | 'Flasks & other'

export interface TagDef {
  id: string
  group: TagGroup
  notable: RegExp
  gem?: RegExp
  // A kind of damage or hit: on a minion build it's worth little unless the
  // notable's line is about minions (your fire damage doesn't help them).
  damage?: boolean
  // Yours only: a line about minions doesn't light it ("Minions have 10%
  // increased maximum Life" isn't Life for you).
  self?: boolean
}

export const TAG_GROUPS: readonly TagGroup[] = [
  'Damage type', 'Skill kind', 'Minions', 'Weapon', 'Ailments & DoT', 'Crit & speed',
  'Buffs & debuffs', 'Charges', 'Defence', 'Recovery', 'Flasks & other'
]

const t = (id: string, group: TagGroup, notable: RegExp, gem?: RegExp, damage?: boolean, self?: boolean): TagDef => ({ id, group, notable, gem, damage, self })

export const TAGS: readonly TagDef[] = [
  // Damage type
  t('Physical', 'Damage type', /physical|bleed|impale/, /boneshatter|cyclone|lacerate|sunder|earthquake|ground slam|split arrow|tornado shot|puncture|pride|exsanguinate|reap|perforate|bladestorm|blade (vortex|flurry|blast)|ethereal knives|shrapnel|galvanic|splitting steel|shattering steel|lancing steel|bladefall|tectonic slam|rage vortex|frenzy|ice crash|double strike|dual strike|reave|cleave|heavy strike|flicker strike/i, true),
  t('Fire', 'Damage type', /\bfire\b|burning|ignite/, /fire|flame|burn|ignit|incinerat|scorch|cremat|volcan|infernal|combust|immolat|magma|explosive|blaz|\banger\b|herald of ash|raging spirit|molten|searing|cremation|detonate dead|righteous|armageddon|elemental hit/i, true),
  t('Cold', 'Damage type', /\bcold\b|freez|chill|frozen/, /\bcold\b|\bice\b|frost|freez|glacial|hatred|winter|arctic|(?<!rage )vortex|blizzard|hypothermia|bonechill|creeping frost|eye of winter|frostbite|herald of ice|ice crash|ice nova|ice spear|ice shot|ice trap|cold snap|elemental hit/i, true),
  t('Lightning', 'Damage type', /lightning|shock/, /lightning|shock(?!wave)|spark|\barc\b|\bstorms?\b|stormblast|\bwrath\b|thunder|crackling|galvanic|conductivity|static|herald of thunder|orb of storms|stormbind|elemental hit/i, true),
  t('Chaos', 'Damage type', /\bchaos\b|poison|wither/, /chaos|poison|blight|essence drain|contagion|\bbane\b|toxic|caustic|viper|despair|soulrend|herald of agony|malevolence|venom|wither|forbidden rite|dark pact/i, true),
  t('Elemental', 'Damage type', /elemental/, undefined, true),
  t('Conversion', 'Damage type', /converted|gained as extra/),
  t('Penetration', 'Damage type', /penetrat|-\d+% to .*resistance/),
  t('Exposure', 'Damage type', /exposure/),
  // Skill kind
  t('Attacks', 'Skill kind', /attack|with hits/, /(?<!critical )\bstrike\b|slam|shot|arrow|attack|cleave|lacerate|sunder|boneshatter|cyclone|reave|blade flurry|bladestorm|flicker|frenzy|puncture|barrage|rain of arrows|toxic rain|kinetic|power siphon/i, true),
  t('Spells', 'Skill kind', /\bspells?\b|cast speed/, /spell echo|spell cascade|controlled destruction|unleash|arcane surge|elemental focus|concentrated effect|added (fire|cold|lightning|chaos)|infused channelling|intensify|fireball|arc\b|freezing pulse|ball lightning|spark|ice nova|incinerate|essence drain|bane|blight|(?<!rage )vortex|cold snap|storm brand|penance brand|armageddon brand|wintertide brand|soulrend|forbidden rite/i, true),
  t('Melee', 'Skill kind', /melee/, /melee|(?<!critical )\bstrike\b|slam|cleave|cyclone|lacerate|sunder|boneshatter|reave|flicker|bladestorm|ground slam|earthquake/i),
  t('Projectiles', 'Skill kind', /projectile|arrow/, /arrow|shot|barrage|projectile|spark|fireball|ball lightning|ethereal knives|kinetic|freezing pulse|ice spear|tornado shot|power siphon|toxic rain|caustic arrow|galvanic arrow|lancing steel|shattering steel|splitting steel/i, true),
  t('Area', 'Skill kind', /area of effect|\barea\b/, /slam|earthquake|cyclone|vortex|nova|blight|righteous fire|detonate|explosive|armageddon|volcanic|increased area|concentrated effect/i),
  t('Channelling', 'Skill kind', /channel/, /cyclone|blight|incinerate|scorching ray|winter orb|blade flurry|flameblast|divine ire|lightning tendrils|wild strike|infused channelling/i),
  t('Slams', 'Skill kind', /\bslams?\b/, /slam|earthquake|sunder|ground|tectonic|ancestral warchief|boneshatter/i),
  t('Strikes', 'Skill kind', /(?<!critical |culling )\bstrikes?\b/, /(?<!critical )\bstrike\b/i),
  t('Brands', 'Skill kind', /\bbrands?\b/, /brand/i),
  t('Totems', 'Skill kind', /totem/, /totem|ancestral (warchief|protector)|holy flame|searing bond|shockwave totem|siege ballista|artillery ballista|spell totem/i),
  t('Traps', 'Skill kind', /\btraps?\b/, /trap/i),
  t('Mines', 'Skill kind', /\bmines?\b/, /mine/i),
  t('Triggered spells', 'Skill kind', /trigger/, /cast on|cast when|trigger|arcanist brand|kinetic instability|cast while channelling/i),
  t('Warcries', 'Skill kind', /warcr|\bshouts?\b/, /\bcry\b|shout|warcry/i),
  t('Movement skills', 'Skill kind', /movement skill|travel skill/, /dash|leap slam|whirling blades|flame dash|shield charge|frostblink|blink arrow|lightning warp|bodyswap|withering step|smoke mine|charged dash/i),
  t('Vaal skills', 'Skill kind', /vaal|soul/, /^vaal /i),
  t('Cooldowns', 'Skill kind', /cooldown/),
  t('Skill duration', 'Skill kind', /skill effect duration|\bduration\b/),
  // Minions
  t('Minions', 'Minions', /minion|zombie|spectre|skeleton|golem|raging spirit/, /summon|raise|animate|minion|golem|dominating blow|absolution|blink arrow|mirror arrow|holy relic|spectre|zombie|skeleton|raging spirit|carrion|offering/i),
  t('Spectres', 'Minions', /spectre/, /raise spectre/i),
  t('Golems', 'Minions', /golem/, /golem/i),
  t('Skeletons', 'Minions', /skeleton/, /skeleton/i),
  t('Zombies', 'Minions', /zombie/, /raise zombie/i),
  t('Raging Spirits', 'Minions', /raging spirit/, /raging spirit/i),
  t('Offerings', 'Minions', /offering/, /offering/i),
  t('Corpses', 'Minions', /corpse/, /desecrate|detonate dead|volatile dead|unearth|corpse|raise spectre|raise zombie/i),
  t('Minion life', 'Minions', /minions? .*(maximum life|regenerate|recover|leech|cannot be damaged|resistances)/),
  t('Minion damage', 'Minions', /minions? .*(damage|critical strike|attack speed|cast speed|impale|double damage)/),
  // Weapon
  t('Bows', 'Weapon', /\bbows?\b|arrow|quiver/),
  t('Wands', 'Weapon', /\bwands?\b/),
  t('Staves', 'Weapon', /\bstaff|staves/),
  t('Two-handed', 'Weapon', /two handed/),
  t('One-handed', 'Weapon', /one handed/),
  t('Dual wield', 'Weapon', /dual wield/),
  t('Shield', 'Weapon', /(?<!energy )\bshields?\b/),
  t('Axes', 'Weapon', /\baxes?\b/),
  t('Swords', 'Weapon', /\bswords?\b/),
  t('Maces & sceptres', 'Weapon', /\bmaces?\b|sceptre/),
  t('Claws & daggers', 'Weapon', /\bclaws?\b|dagger/),
  t('Unarmed', 'Weapon', /unarmed/),
  // Ailments & DoT
  t('Damage over time', 'Ailments & DoT', /damage over time|over time multiplier/, /essence drain|contagion|blight|bane|righteous fire|toxic rain|caustic arrow|scorching ray|vortex|wither|soulrend|forbidden rite|death aura|exsanguinate|reap|corrupting fever|vaal ra?in/i, true),
  t('Bleed', 'Ailments & DoT', /bleed/, /bleed|lacerate|puncture|exsanguinate|reap|crimson dance|chance to bleed/i, true),
  t('Poison', 'Ailments & DoT', /poison/, /poison|toxic rain|viper strike|pestilent|cobra lash|venom/i, true),
  t('Ignite', 'Ailments & DoT', /ignite/, /ignit|immolat|combustion|burning damage/i, true),
  t('Burning', 'Ailments & DoT', /burning/, /righteous fire|scorching ray|fire trap|flameblast|burning/i, true),
  t('Impale', 'Ailments & DoT', /impale/, /impale/i, true),
  t('Freeze', 'Ailments & DoT', /freez|frozen/, /freez|hypothermia|ice bite/i),
  t('Chill', 'Ailments & DoT', /chill/, /chill|frostbite|bonechill|hypothermia/i),
  t('Shock', 'Ailments & DoT', /shock/, /shock|conductivity/i),
  t('Non-damaging ailments', 'Ailments & DoT', /non-damaging ailment|effect of (cold|lightning) ailments|scorch|brittle|sap/),
  t('Ailment avoidance', 'Ailments & DoT', /avoid .*(ignite|freez|chill|shock|bleed|poison|ailment)|cannot be (ignited|frozen|chilled|shocked|poisoned)/),
  // Crit & speed
  t('Crit', 'Crit & speed', /critical strike/, /increased critical|power charge on critical|assassin's mark/i, true),
  t('Non-crit', 'Crit & speed', /never deal critical|non-critical/),
  t('Accuracy', 'Crit & speed', /accuracy/),
  t('Attack speed', 'Crit & speed', /attack speed/),
  t('Cast speed', 'Crit & speed', /cast speed/),
  t('Projectile speed', 'Crit & speed', /projectile speed/),
  t('Area of effect', 'Crit & speed', /area of effect/),
  // Buffs & debuffs
  t('Auras', 'Buffs & debuffs', /\bauras?\b|reservation|\bpresence\b/, /\bpride\b|\bhatred\b|\bwrath\b|\banger\b|\bgrace\b|\bdetermination\b|\bdiscipline\b|\bmalevolence\b|\bzealotry\b|\bhaste\b|\bvitality\b|\bclarity\b|purity of|precision|defiance banner|war banner|dread banner/i),
  t('Heralds', 'Buffs & debuffs', /herald/, /herald of/i),
  t('Curses', 'Buffs & debuffs', /\bcurses?\b|\bhex/, /despair|vulnerability|elemental weakness|flammability|frostbite|conductivity|temporal chains|enfeeble|punishment|hextouch|curse on hit|bane|blasphemy/i),
  t('Marks', 'Buffs & debuffs', /\bmarks?\b/, /'s mark|mark on hit/i),
  t('Banners', 'Buffs & debuffs', /banner/, /banner/i),
  t('Guards', 'Buffs & debuffs', /guard skill|steelskin|molten shell|immortal call/, /steelskin|molten shell|immortal call|vaal molten shell/i),
  t('Reservation', 'Buffs & debuffs', /reservation/),
  t('Onslaught', 'Buffs & debuffs', /onslaught/),
  t('Fortify', 'Buffs & debuffs', /fortif/, /fortify/i),
  t('Rage', 'Buffs & debuffs', /\brage\b/, /\brage\b|berserk/i),
  t('Intimidate', 'Buffs & debuffs', /intimidat/),
  t('Blind', 'Buffs & debuffs', /blind/),
  t('Hinder & maim', 'Buffs & debuffs', /hinder|maim/),
  t('Taunt', 'Buffs & debuffs', /taunt/),
  t('Elusive', 'Buffs & debuffs', /elusive/),
  // Charges
  t('Endurance charges', 'Charges', /endurance charge/),
  t('Frenzy charges', 'Charges', /frenzy charge/),
  t('Power charges', 'Charges', /power charge/),
  // Defence
  t('Life', 'Defence', /\blife\b/, undefined, false, true),
  t('Energy shield', 'Defence', /energy shield/),
  t('Low life', 'Defence', /low life/),
  t('Chaos Inoculation', 'Defence', /chaos inoculation|while on full energy shield/),
  t('Armour', 'Defence', /armour/),
  t('Evasion', 'Defence', /evasion/),
  t('Ward', 'Defence', /\bward\b/),
  t('Block', 'Defence', /chance to block attack|block chance|\bblock\b(?! spell)/),
  t('Spell block', 'Defence', /block spell/),
  t('Spell suppression', 'Defence', /suppress/),
  t('Max resistances', 'Defence', /maximum .*resistance/),
  t('Stun avoidance', 'Defence', /\bstun/),
  t('Damage taken as', 'Defence', /damage taken as|taken from mana before life/),
  // Recovery
  t('Leech', 'Recovery', /leech/),
  t('Regeneration', 'Recovery', /regenerat/),
  t('Recoup', 'Recovery', /recoup/),
  t('On kill', 'Recovery', /on kill|killed recently|when you kill/),
  t('Mana', 'Recovery', /\bmana\b/),
  t('Mana cost', 'Recovery', /mana cost/),
  t('Life cost', 'Recovery', /life cost/),
  // Flasks & other
  t('Flasks', 'Flasks & other', /flask/),
  t('Movement speed', 'Flasks & other', /movement speed/),
  t('Strength', 'Flasks & other', /strength/),
  t('Dexterity', 'Flasks & other', /dexterity/),
  t('Intelligence', 'Flasks & other', /intelligence/),
  t('Attribute stacking', 'Flasks & other', /attributes|per \d+ (strength|dexterity|intelligence)/)
]

export const TAG_BY_ID: ReadonlyMap<string, TagDef> = new Map(TAGS.map(x => [x.id, x]))

// A line about minions: on a minion build, its damage tags count in full.
// A line about your defences ("+20% to Cold Resistance", "Avoid Bleeding",
// "Chance to Block Attack Damage"): it doesn't make a notable a fit for a
// kind of damage or skill.
export const DEFENCE_LINE = /^\+?\d+% to [a-z ]*resistances?$|maximum [a-z ]*resistance|\bavoid|cannot be|unaffected|damage reduction|\bremove|damage taken|\bblock\b|suppress/

// Movement skills say nothing about what a build hits with (Flame Dash,
// Frostblink): only the Movement skills tag reads them.
export const MOVEMENT_GEM = /flame dash|frostblink|\bdash\b|leap slam|whirling blades|shield charge|blink arrow|lightning warp|bodyswap|withering step|smoke mine|charged dash/i

export const MINION_LINE = /minion|zombie|spectre|skeleton|golem|raging spirit/
