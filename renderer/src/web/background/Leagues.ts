import { computed, shallowRef, readonly } from 'vue'
import { createGlobalState } from '@vueuse/core'
import { AppConfig, poeWebApi } from '@/web/Config'
import { Host } from './IPC'
import { ensureWokeConfig } from '@/web/woke/modules'
import { leagueRetryDelay, newLeagueOffer, rememberLeagues } from '@/web/woke/shared/league-pick'

// pc-ggg, pc-garena
export const PERMANENT_SC = ['Standard', '標準模式']
const PERMANENT_HC = ['Hardcore', '專家模式']

interface ApiLeague {
  id: string
  event?: boolean
  startAt?: string | null
  rules: Array<{ id: string }>
}

interface League {
  id: string
  isPopular: boolean
  // woke: from this launch's read only, not last launch's list.
  startAt?: number
}

export const useLeagues = createGlobalState(() => {
  const isLoading = shallowRef(false)
  const error = shallowRef<string | null>(null)
  const tradeLeagues = shallowRef<League[]>([])
  // woke: a league that opened since the last launch, offered in the price check.
  const offer = shallowRef<string | null>(null)
  let failures = 0
  let retryTimer: ReturnType<typeof setTimeout> | undefined

  const selectedId = computed<string | undefined>({
    get () {
      return (tradeLeagues.value.length)
        ? AppConfig().leagueId
        : undefined
    },
    set (id) {
      AppConfig().leagueId = id
    }
  })

  const selected = computed(() => {
    const { leagueId } = AppConfig()
    if (!tradeLeagues.value || !leagueId) return undefined
    const listed = tradeLeagues.value.find(league => league.id === leagueId)
    return {
      id: leagueId,
      realm: AppConfig().realm,
      isPopular: !isPrivateLeague(leagueId) && Boolean(listed?.isPopular)
    }
  })

  // woke: when the picked league opened, for the item data checks.
  const startedAt = computed(() => tradeLeagues.value.find(league => league.id === selectedId.value)?.startAt ?? null)

  // woke: read once at launch. Only a failed read is tried again, after 1, 2,
  // then every 5 minutes, and that stops at the first answer.
  async function load () {
    clearTimeout(retryTimer)
    retryTimer = undefined
    // woke: last launch's list until this launch's read answers, so a failed
    // read at a league's launch hour still has a league to price in. Read here,
    // not when this is first used: that can be before the settings load.
    if (!tradeLeagues.value.length) {
      tradeLeagues.value = (AppConfig().woke?.leagues?.list ?? []).map(id => ({ id, isPopular: true }))
    }
    isLoading.value = true
    error.value = null

    try {
      const response = await Host.proxy(`${poeWebApi()}/api/leagues?type=main&realm=pc`)
      if (!response.ok) throw new Error(JSON.stringify(Object.fromEntries(response.headers)))
      const leagues: ApiLeague[] = await response.json()

      const listed = leagues
        .filter(league =>
          !PERMANENT_HC.includes(league.id) &&
          !league.rules.some(rule => rule.id === 'NoParties' ||
            (rule.id === 'HardMode' && !league.event)))
        .map(league => {
          const startAt = league.startAt ? Date.parse(league.startAt) : NaN
          return { id: league.id, isPopular: true, ...(Number.isFinite(startAt) ? { startAt } : {}) }
        })
      // woke: an empty answer would leave no league at all.
      if (!listed.length) throw new Error('The league list came back empty')
      tradeLeagues.value = listed
      failures = 0

      const leagueIsAlive = tradeLeagues.value.some(league => league.id === selectedId.value)
      if (!leagueIsAlive && !isPrivateLeague(selectedId.value ?? '')) {
        if (tradeLeagues.value.length > 1) {
          const TMP_CHALLENGE = 1
          selectedId.value = tradeLeagues.value[TMP_CHALLENGE].id
        } else {
          const STANDARD = 0
          selectedId.value = tradeLeagues.value[STANDARD].id
        }
      }
      rememberList()
    } catch (e) {
      error.value = (e as Error).message
      failures++
      retryTimer = setTimeout(() => { load().catch(() => {}) }, leagueRetryDelay(failures))
    } finally {
      isLoading.value = false
    }
  }

  function rememberList () {
    const ids = tradeLeagues.value.map(league => league.id)
    const woke = ensureWokeConfig(AppConfig()).woke
    const known = woke.leagues?.known
    offer.value = newLeagueOffer(ids, known, selectedId.value)
    // A league offered stays unknown until it's picked or turned down.
    const remembered = rememberLeagues(ids.filter(id => id !== offer.value), known)
    woke.leagues = { list: ids, known: remembered }
  }

  function settleOffer (pick: boolean) {
    const id = offer.value
    if (!id) return
    if (pick) selectedId.value = id
    offer.value = null
    const woke = ensureWokeConfig(AppConfig()).woke
    woke.leagues = {
      list: woke.leagues?.list ?? tradeLeagues.value.map(league => league.id),
      known: rememberLeagues([id], woke.leagues?.known)
    }
  }

  return {
    isLoading,
    error,
    selectedId,
    selected,
    list: readonly(tradeLeagues),
    load,
    offer: readonly(offer),
    startedAt,
    settleOffer
  }
})

function isPrivateLeague (id: string) {
  if (id.includes('Ruthless')) {
    return true
  }
  return /\(PL\d+\)$/.test(id)
}
