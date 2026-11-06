import { shallowRef, watch, readonly } from 'vue'
import { createGlobalState } from '@vueuse/core'
import { Host } from '@/web/background/IPC'
import { useLeagues } from './Leagues'
import { emitWokePricesLoaded } from '@/web/woke/market/hook'
import { isListedType, namespaceForType, slugForType } from '@/web/woke/market/types'

interface NinjaDenseInfo {
  chaos: number
  graph: Array<number | null>
  name: string
  variant?: string
}

type PriceDatabase = Array<{ ns: string, url: string, lines: string }>
const RETRY_INTERVAL_MS = 4 * 60 * 1000
const UPDATE_INTERVAL_MS = 31 * 60 * 1000
const INTEREST_SPAN_MS = 20 * 60 * 1000
// woke: after a failure, price checks don't each download 1.7 MB again.
const FAILED_RETRY_MS = 60 * 1000
const STUCK_DOWNLOAD_MS = 2 * 60 * 1000

interface DbQuery {
  ns: string
  name: string
  variant: string | undefined
}

export interface CurrencyValue {
  min: number
  max: number
  currency: 'chaos' | 'div'
}

export const usePoeninja = createGlobalState(() => {
  const leagues = useLeagues()

  const xchgRate = shallowRef<number | undefined>(undefined)
  // woke: when prices last loaded, so the verdict can say how old they are.
  const updatedAt = shallowRef<number | null>(null)

  const isLoading = shallowRef(false)
  let PRICES_DB: PriceDatabase = []
  let lastUpdateTime = 0
  let lastFailureTime = 0
  let downloadController: AbortController | undefined
  let downloadStartTime = 0
  let lastInterestTime = 0

  async function load (force: boolean = false) {
    const league = leagues.selected.value
    if (!league || !league.isPopular || league.realm !== 'pc-ggg') {
      // woke: a download for the previous league must not keep the spinner up.
      downloadController?.abort()
      downloadController = undefined
      isLoading.value = false
      return
    }

    if (!force && (
      (Date.now() - lastUpdateTime) < UPDATE_INTERVAL_MS ||
      (Date.now() - lastInterestTime) > INTEREST_SPAN_MS ||
      (Date.now() - lastFailureTime) < FAILED_RETRY_MS ||
      // woke: asking for prices joins a running download. Only a league change
      // or a stuck download starts over.
      (downloadController && (Date.now() - downloadStartTime) < STUCK_DOWNLOAD_MS)
    )) return
    if (downloadController) downloadController.abort()

    const controller = new AbortController()
    downloadController = controller
    downloadStartTime = Date.now()
    try {
      isLoading.value = true
      const response = await Host.proxy(`poe.ninja/poe1/api/economy/current/dense/overviews?league=${league.id}&language=en`, {
        signal: controller.signal
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const jsonBlob = await response.text()
      // Replaced by a newer download, or the league changed to one without prices.
      if (downloadController !== controller || leagues.selected.value?.id !== league.id) return

      PRICES_DB = readOverviews(jsonBlob)
      emitWokePricesLoaded(league.id, PRICES_DB)
      const divine = findPriceByQuery({ ns: 'ITEM', name: 'Divine Orb', variant: undefined })
      lastUpdateTime = Date.now()
      if (divine && divine.chaos >= 30) {
        xchgRate.value = divine.chaos
        updatedAt.value = lastUpdateTime
      }
      lastFailureTime = 0
    } catch (err) {
      if (downloadController !== controller) return
      // woke: the last good prices stay; the retry timer tries again.
      lastFailureTime = Date.now()
      console.warn('[Prices] poe.ninja:', err)
    } finally {
      if (downloadController === controller) {
        downloadController = undefined
        isLoading.value = false
      }
    }
  }

  function queuePricesFetch () {
    lastInterestTime = Date.now()
    load()
  }

  function selectedLeagueToUrl (): string {
    // woke: prices can arrive before the league list does; selectedId is
    // undefined until then (found by the fake-game tests).
    const league = leagues.selected.value?.id ?? leagues.selectedId.value ?? ''
    switch (league) {
      case 'Standard': return 'standard'
      case 'Hardcore': return 'hardcore'
      default: {
        let ninjaId = league.replace('Hardcore ', '').toLowerCase()
        if (league.startsWith('Hardcore ')) {
          ninjaId += 'hc'
        }
        return ninjaId
      }
    }
  }

  function findPriceByQuery (query: DbQuery) {
    // NOTE: order of keys is important
    const searchString = JSON.stringify({
      name: query.name,
      variant: query.variant,
      chaos: 0
    }).replace(':0}', ':')

    for (const { ns, url, lines } of PRICES_DB) {
      if (ns !== query.ns) continue

      const startPos = lines.indexOf(searchString)
      if (startPos === -1) continue
      const endPos = lines.indexOf('}', startPos)

      const info: NinjaDenseInfo = JSON.parse(lines.slice(startPos, endPos + 1))

      return {
        ...info,
        url: `https://poe.ninja/poe1/economy/${selectedLeagueToUrl()}/${url}/${denseInfoToDetailsId(info)}`
      }
    }
    return null
  }

  // Any variant of an item (the first listed), for when only its name is known.
  function findPriceByName (ns: string, name: string) {
    const searchString = JSON.stringify({ name, variant: '' }).replace('""}', '"')
    for (const { ns: rowNs, lines } of PRICES_DB) {
      if (rowNs !== ns) continue
      const startPos = lines.indexOf(searchString)
      if (startPos === -1) continue
      const info: NinjaDenseInfo = JSON.parse(lines.slice(startPos, lines.indexOf('}', startPos) + 1))
      return info
    }
    return null
  }

  function autoCurrency (value: number | [number, number]): CurrencyValue {
    if (Array.isArray(value)) {
      if (value[1] > (xchgRate.value || 9999)) {
        return { min: chaosToStable(value[0]), max: chaosToStable(value[1]), currency: 'div' }
      }
      return { min: value[0], max: value[1], currency: 'chaos' }
    }
    if (value > ((xchgRate.value || 9999) * 0.94)) {
      if (value < ((xchgRate.value || 9999) * 1.06)) {
        return { min: 1, max: 1, currency: 'div' }
      } else {
        return { min: chaosToStable(value), max: chaosToStable(value), currency: 'div' }
      }
    }
    return { min: value, max: value, currency: 'chaos' }
  }

  function chaosToStable (count: number) {
    return count / (xchgRate.value || 9999)
  }

  setInterval(() => {
    load()
  }, RETRY_INTERVAL_MS)

  watch(leagues.selectedId, () => {
    // woke: a load still running is for the old league.
    downloadController?.abort()
    xchgRate.value = undefined
    updatedAt.value = null
    PRICES_DB = []
    // woke: the old league's update time mustn't delay the new league's retry.
    lastUpdateTime = 0
    lastFailureTime = 0
    load(true)
  })

  // woke: every variant of an item, for when only its name is known.
  function findPricesByName (ns: string, name: string): NinjaDenseInfo[] {
    const searchString = JSON.stringify({ name, variant: '' }).replace('""}', '"')
    const out: NinjaDenseInfo[] = []
    for (const { ns: rowNs, lines } of PRICES_DB) {
      if (rowNs !== ns) continue
      let at = lines.indexOf(searchString)
      while (at !== -1) {
        const end = lines.indexOf('}', at)
        out.push(JSON.parse(lines.slice(at, end + 1)))
        at = lines.indexOf(searchString, end)
      }
    }
    return out
  }

  return {
    xchgRate: readonly(xchgRate),
    updatedAt: readonly(updatedAt),
    isLoading: readonly(isLoading),
    findPriceByQuery,
    findPriceByName,
    findPricesByName,
    autoCurrency,
    queuePricesFetch,
    initialLoading: () => isLoading.value && !PRICES_DB.length
  }
})

function denseInfoToDetailsId (info: NinjaDenseInfo): string {
  return ((info.variant) ? `${info.name}, ${info.variant}` : info.name)
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9:\- ]/g, '')
    .toLowerCase()
    .replace(/ /g, '-')
}

// woke: a cut-off body, an error page or a feed with no prices must not replace
// good prices. JSON.parse is only the check; lookups keep searching the text.
function readOverviews (jsonBlob: string): PriceDatabase {
  JSON.parse(jsonBlob)
  const database = splitJsonBlob(jsonBlob)
  if (!database.some(({ lines }) => lines.includes('{"name":'))) {
    throw new Error('No prices in the reply')
  }
  return database
}

const MAX_UNLISTED_ENTRIES = 500

function entryCount (lines: string): number {
  let count = 0
  for (let at = lines.indexOf('{"name":'); at !== -1; at = lines.indexOf('{"name":', at + 1)) count++
  return count
}

function splitJsonBlob (jsonBlob: string): PriceDatabase {
  const NINJA_OVERVIEW = '{"type":"'

  const database: PriceDatabase = []
  const unlisted: PriceDatabase = []
  const seenBlocks = new Set<string>()
  let startPos = jsonBlob.indexOf(NINJA_OVERVIEW)
  if (startPos === -1) return []

  while (true) {
    const endPos = jsonBlob.indexOf(NINJA_OVERVIEW, startPos + 1)

    const type = jsonBlob.slice(
      startPos + NINJA_OVERVIEW.length,
      jsonBlob.indexOf('"', startPos + NINJA_OVERVIEW.length)
    )
    const lines = jsonBlob.slice(startPos, (endPos === -1) ? jsonBlob.length : endPos)

    // woke: every category, including one poe.ninja adds for a new league.
    const isSupported = type ? { ns: namespaceForType(type), url: slugForType(type) } : undefined
    // woke: poe.ninja sends Currency and Fragment twice, in currencyOverviews
    // and in itemOverviews, so skip a copy of a block already kept. What follows
    // the block's last bracket differs, so it isn't part of the comparison.
    const block = lines.slice(0, lines.lastIndexOf(']}'))
    if (isSupported && !seenBlocks.has(block)) {
      seenBlocks.add(block)
      // A category we don't list yet is searched after the ones we do, so it
      // can't take over a name they share.
      if (isListedType(type)) {
        database.push({ ns: isSupported.ns, url: isSupported.url, lines })
      } else if (entryCount(lines) <= MAX_UNLISTED_ENTRIES) {
        // A big category we don't list (enchants, cluster jewels) isn't a
        // league's new currency, and would fill the market tracker.
        unlisted.push({ ns: isSupported.ns, url: isSupported.url, lines })
      }
    }

    if (endPos === -1) break
    startPos = endPos
  }
  return [...database, ...unlisted]
}

export function displayRounding (value: number, fraction: boolean = false): string {
  if (fraction && Math.abs(value) < 1) {
    if (value === 0) return '0'
    const r = `1\u200A/\u200A${displayRounding(1 / value)}`
    return r === '1\u200A/\u200A1' ? '1' : r
  }
  if (Math.abs(value) < 10) {
    return Number(value.toFixed(1)).toString().replace('.', '\u200A.\u200A')
  }
  return Math.round(value).toString()
}
