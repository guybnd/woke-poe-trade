// The copied gem's poe.ninja versions, for the versions table and the Vaal
// chip on the gem's name row. Reads only poe.ninja: nothing here searches.
import { computed, ref } from 'vue'
import type { ParsedItem } from '@/parser'
import { usePoeninja } from '@/web/background/Prices'
import { useInsight } from '@/web/woke/price-insight/useInsight'
import { gemForms, listVersions, type GemVersion, type NinjaGemRow } from './versions'

export function useGemVersions (item: () => ParsedItem, league: () => string) {
  const ninja = usePoeninja()
  const { divine } = useInsight(ref([]), computed(league))
  const forms = computed(() => gemForms(item()))

  const versions = computed<GemVersion[]>(() => {
    // poe.ninja's rows are for the league picked in settings only; updatedAt
    // also re-reads them each time poe.ninja loads.
    if (divine.value == null || ninja.updatedAt.value == null) return []
    const f = forms.value
    if (!f) return []
    const it = item()
    const ownVaal = !!it.info.gem?.vaal || !!it.vaalGem?.gem?.vaal
    return listVersions(
      ninja.findPricesByName('GEM', f.base.refName) as NinjaGemRow[],
      f.vaal ? ninja.findPricesByName('GEM', f.vaal.refName) as NinjaGemRow[] : [],
      {
        vaal: ownVaal,
        level: it.gemLevel ?? 1,
        quality: it.quality ?? 0,
        corrupted: !!it.isCorrupted
      })
  })

  const vaalOrb = computed(() => {
    if (ninja.updatedAt.value == null) return null
    return ninja.findPriceByQuery({ ns: 'ITEM', name: 'Vaal Orb', variant: undefined })?.chaos ?? null
  })

  return { forms, versions, divine, vaalOrb }
}
