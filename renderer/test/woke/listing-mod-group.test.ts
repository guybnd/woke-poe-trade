// The listing tooltip draws an eldritch implicit's mark, and a mod's mechanic icon by its name.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'
import ListingModGroup from '@/web/woke/ui/tooltip/ListingModGroup.vue'
import { implicitTable } from '@/web/woke/price-insight/eldritch-listing'
import type { ModGroup } from '@/web/woke/price-insight/listing-tip-detail'

implicitTable.value = JSON.parse(readFileSync(resolve(__dirname, '../../public/data/implicit-sources.json'), 'utf-8'))

const render = (group: ModGroup) => renderToString(createSSRApp({ render: () => h(ListingModGroup, { group }) }))

describe('listing mod group', () => {
  it('draws the eldritch mark in place of tier tags', async () => {
    const html = await render({
      heading: '',
      lines: [{ parts: [{ text: '12% increased effect of Non-Curse Auras from your Skills' }], tags: [], kind: '', quality: 100, eldritch: { stat: '1880071428', low: 11, high: 12, altars: ['exarch', 'eater'] } }]
    })
    expect(html).toContain('Greater Searing Exarch implicit')
  })

  it('puts a mechanic icon before the mod name', async () => {
    const html = await render({
      heading: 'Prefix "Essences"',
      lines: [{ parts: [{ text: '+89 to maximum Energy Shield' }], tags: ['P0'], kind: '', quality: 14, source: { icon: '/images/essence.png', label: 'Essence modifier' } }]
    })
    expect(html.indexOf('/images/essence.png')).toBeLessThan(html.indexOf('Prefix'))
    expect(html.match(/essence\.png/g)).toHaveLength(1)
  })
})
