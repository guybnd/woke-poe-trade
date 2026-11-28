// Prints what poe.ninja answers for the pages the day-1 script can't read
// (cards, essences and the other exchange-only kinds), so the right URLs can
// be added to gen-day1-prices.mjs. Runs in day1-prices.yml with probe on.
const UA = { 'User-Agent': 'woke-poe-trade day1-prices (GitHub Actions)' }
const league = encodeURIComponent(process.argv[2] || 'Covens')
const shape = v => Array.isArray(v) ? `[${v.length}] ${v[0] ? shape(v[0]) : ''}` : v && typeof v === 'object' ? `{${Object.keys(v).slice(0, 25).join(',')}}` : JSON.stringify(v)

async function show (url) {
  try {
    const res = await fetch(url, { headers: UA })
    const text = await res.text()
    let body
    try { body = JSON.parse(text) } catch { body = null }
    console.log(`${res.status} ${url}\n  ${body ? shape(body) : text.slice(0, 120)}`)
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      for (const [k, v] of Object.entries(body)) if (Array.isArray(v) && v.length) console.log(`  ${k}[0]: ${JSON.stringify(v[0]).slice(0, 400)}`)
    }
    return body
  } catch (e) { console.log(`ERR ${url}: ${e.message}`) }
}

const N = 'https://poe.ninja/poe1/api/economy'
const dense = await show(`${N}/current/dense/overviews?league=${league}&language=en`)
if (dense) for (const k of ['currencyOverviews', 'itemOverviews']) console.log(`  ${k}: ${(dense[k] ?? []).map(o => o.type).join(', ')}`)
for (const type of ['DivinationCard', 'Essence', 'Omen']) {
  await show(`${N}/stash/current/item/overview?league=${league}&type=${type}`)
  await show(`${N}/stash/current/currency/overview?league=${league}&type=${type}`)
  const ex = await show(`${N}/exchange/current/overview?league=${league}&type=${type}`)
  const first = ex && (ex.lines?.[0] ?? ex.items?.[0])
  const id = first && (first.id ?? first.itemId ?? first.detailsId)
  if (id != null) {
    await show(`${N}/exchange/current/details?league=${league}&type=${type}&id=${id}`)
    await show(`${N}/exchange/current/history?league=${league}&type=${type}&id=${id}`)
    await show(`${N}/exchange/current/graph?league=${league}&type=${type}&id=${id}`)
  }
}
