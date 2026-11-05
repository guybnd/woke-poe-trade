// Every outside project the toolkit forks, ports from, reads data from or took
// an idea from. Shown on the Credits page in settings; add a row when a new
// source comes in. `license` is only for projects that publish one.
export interface Credit {
  name: string
  url: string
  use: string
  license?: string
}

export interface CreditGroup {
  id: string
  title: string
  credits: Credit[]
}

export const CREDIT_GROUPS: CreditGroup[] = [
  {
    id: 'built-on',
    title: 'Built on',
    credits: [
      { name: 'Awakened PoE Trade', url: 'https://github.com/SnosMe/awakened-poe-trade', use: 'The app this toolkit forks: overlay, price check, item parsing and screen reading.', license: 'MIT' }
    ]
  },
  {
    id: 'code-data',
    title: 'Code and data we use',
    credits: [
      { name: 'Exile-UI', url: 'https://github.com/Lailloken/Exile-UI', use: 'Source for ported features: betrayal rewards, plus town and map tracker rules.', license: 'MIT' },
      { name: 'exile-leveling', url: 'https://github.com/HeartofPhos/exile-leveling', use: 'The campaign route, area data and gem sources.', license: 'MIT' },
      { name: 'GemCheck', url: 'https://github.com/Lebedevsd/GemCheck', use: 'Transfigured gem colours and the Divine Font maths.', license: 'MIT' },
      { name: 'NeverSink filter', url: 'https://github.com/NeverSinkDev/NeverSink-Filter', use: 'The loot filter base and its alert sounds.', license: 'MIT' },
      { name: 'Path of Building Community', url: 'https://github.com/PathOfBuildingCommunity/PathOfBuilding', use: 'The build files and codes the PoB builds panel reads.', license: 'MIT' },
      { name: 'RePoE', url: 'https://github.com/brather1ng/RePoE', use: 'Game data behind item parsing, through Awakened PoE Trade.', license: 'MIT' },
      { name: 'Sidekick', url: 'https://github.com/Sidekick-Poe/Sidekick', use: 'The copy of the game\'s item header and divider art in tooltips.', license: 'MIT' },
      { name: 'Atlas tree export', url: 'https://github.com/grindinggear/atlastree-export', use: 'The Atlas passive tree data, published by Grinding Gear Games.' }
    ]
  },
  {
    id: 'websites',
    title: 'Websites we use',
    credits: [
      { name: 'Path of Exile website', url: 'https://www.pathofexile.com/trade', use: 'Listings for price checks, saved and live searches, and the Atlas tree page.' },
      { name: 'poe.ninja', url: 'https://poe.ninja/', use: 'Prices, market trackers and league investment history.' },
      { name: 'poeprices.info', url: 'https://www.poeprices.info/', use: 'Price predictions for rare items.' },
      { name: 'PoELab', url: 'https://www.poelab.com/', use: 'The daily Labyrinth layouts in the Lab panel, for your lab runs.' },
      { name: "CraniumCarnage's challenge guide", url: 'https://craniumviolence.github.io/', use: 'The guide for the achievements window we are building.' },
      { name: 'poe.how', url: 'https://poe.how/economy/bosses/', use: 'Boss drop lists and community drop rates.' },
      { name: 'poe.re', url: 'https://poe.re/', use: 'Stash search strings to save in the Regex library, and the idea for our map search strings.' },
      { name: 'pobb.in', url: 'https://pobb.in/', use: 'Shared build links you can import.' },
      { name: 'Pastebin', url: 'https://pastebin.com/', use: 'Shared build links you can import.' },
      { name: 'poedb', url: 'https://poedb.tw/', use: 'Item lookups from the item info hotkeys.' },
      { name: 'Craft of Exile', url: 'https://www.craftofexile.com/', use: 'Crafting lookups from the item info hotkeys.' },
      { name: 'Path of Exile Wiki', url: 'https://www.poewiki.net/', use: 'Item lookups from the item info hotkeys.' }
    ]
  },
  {
    id: 'inspiration',
    title: 'Inspiration',
    credits: [
      { name: 'Wealthy Exile', url: 'https://wealthyexile.com/', use: 'The idea behind the farming session tracker.' }
    ]
  },
  {
    id: 'libraries',
    title: 'Libraries',
    credits: [
      { name: 'Electron', url: 'https://www.electronjs.org/', use: 'Runs the app.', license: 'MIT' },
      { name: 'Vue', url: 'https://vuejs.org/', use: 'Draws the interface.', license: 'MIT' },
      { name: 'electron-overlay-window', url: 'https://github.com/SnosMe/electron-overlay-window', use: 'Keeps the overlay on top of the game.', license: 'MIT' },
      { name: 'uiohook-napi', url: 'https://github.com/SnosMe/uiohook-napi', use: 'Global hotkeys, from Node.', license: 'MIT' },
      { name: 'libuiohook', url: 'https://github.com/kwhat/libuiohook', use: 'The keyboard and mouse hook underneath uiohook-napi.', license: 'LGPL-3.0' },
      { name: 'OpenCV', url: 'https://opencv.org/', use: 'Finds things on screen for scans.', license: 'Apache-2.0' },
      { name: 'Tesseract', url: 'https://github.com/tesseract-ocr/tesseract', use: 'Reads text on screen for scans.', license: 'Apache-2.0' },
      { name: 'Font Awesome Free', url: 'https://fontawesome.com/', use: 'Interface icons.', license: 'CC BY 4.0, OFL-1.1, MIT' },
      { name: 'Inter', url: 'https://rsms.me/inter/', use: 'The interface font.', license: 'OFL-1.1' },
      { name: 'JetBrains Mono', url: 'https://www.jetbrains.com/lp/mono/', use: 'The font for regex and code.', license: 'OFL-1.1' }
    ]
  }
]

export const CREDIT_NAMES = CREDIT_GROUPS.flatMap(g => g.credits.map(c => c.name))
