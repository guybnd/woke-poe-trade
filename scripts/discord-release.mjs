#!/usr/bin/env node
// Posts a published GitHub release to a Discord channel through a webhook.
// Run by .github/workflows/discord-release.yml; see "Discord announcements" in DEVELOPING.md.
//
//   node scripts/discord-release.mjs <tag> [--dry-run]
//
// Env: DISCORD_WEBHOOK_URL (unset: prints the post and exits 0, so a repo
// without the secret never fails), GITHUB_REPOSITORY (default
// guybnd/woke-poe-trade), GH_TOKEN (optional, for the API rate limit),
// DISCORD_RELEASE_PING (optional text above the post, e.g. @everyone or <@&roleId>).
// The release must be published: a draft or pre-release is skipped.

import { pathToFileURL } from 'node:url'

const DESCRIPTION_MAX = 4096 // Discord's embed description limit
const COLOR = 0xaf6025 // PoE unique-item brown

export function cleanNotes (body) {
  let text = (body || '').replace(/\r\n/g, '\n').replace(/<!--[\s\S]*?-->/g, '')
  const paragraphs = text.split(/\n{2,}/).filter(p => {
    const t = p.trim()
    // The install how-to and the SmartScreen footer are for the GitHub page;
    // the post has its own download links.
    if (/^\*\*Install:\*\*/.test(t)) return false
    if (/^Windows SmartScreen may warn/.test(t)) return false
    return t.length > 0
  })
  text = paragraphs.join('\n\n')
  // Embed descriptions don't render # headings everywhere: make them bold lines.
  text = text.replace(/^#{1,6}[ \t]+(.+?)[ \t]*#*[ \t]*$/gm, (_, h) => `__**${h.replace(/\*\*/g, '')}**__`)
  return text.trim()
}

export function fitDescription (text, url, max = DESCRIPTION_MAX) {
  if (text.length <= max) return text
  const more = `\n\n…and more in the [full notes](${url}).`
  const room = max - more.length
  const lines = text.split('\n')
  let out = ''
  for (const line of lines) {
    const next = out ? `${out}\n${line}` : line
    if (next.length > room) break
    out = next
  }
  // A single giant line: cut it at a word.
  if (!out) out = text.slice(0, room).replace(/\s+\S*$/, '')
  return out.trimEnd() + more
}

export function buildPayload (release, { repo, ping } = {}) {
  const version = release.tag_name.replace(/^v/, '')
  const url = release.html_url
  const assets = release.assets || []
  const setup = assets.find(a => /Setup-.*\.exe$/.test(a.name))
  const portable = assets.find(a => /-portable\.exe$/.test(a.name))

  const notes = cleanNotes(release.body)
  const description = fitDescription(notes || `Version ${version} is out.`, url)

  const download = []
  if (setup) download.push(`[**Installer**](${setup.browser_download_url}) (updates itself)`)
  if (portable) download.push(`[Portable](${portable.browser_download_url})`)
  download.push(`[Release page](${url})`)

  const embed = {
    title: `Woke PoE Trade ${version} is out`,
    url,
    color: COLOR,
    description,
    fields: [
      { name: 'Download', value: download.join(' · '), inline: false },
      { name: 'Already installed?', value: 'It updates itself: the new version installs when you quit the app.', inline: false }
    ],
    thumbnail: { url: `https://raw.githubusercontent.com/${repo}/master/main/build/icons/128x128.png` },
    footer: { text: 'Windows may warn on first install (not code-signed): More info › Run anyway' },
    timestamp: release.published_at || new Date().toISOString()
  }

  ping = (ping || '').trim()
  /** @type {{ parse: string[], roles?: string[], users?: string[] }} */
  const allowedMentions = ping
    ? {
        parse: /@(everyone|here)/.test(ping) ? ['everyone'] : [],
        roles: [...ping.matchAll(/<@&(\d+)>/g)].map(m => m[1]),
        users: [...ping.matchAll(/<@!?(\d+)>/g)].map(m => m[1])
      }
    : { parse: [] }
  const payload = {
    username: 'Woke PoE Trade',
    content: ping || undefined,
    allowed_mentions: allowedMentions,
    embeds: [embed]
  }
  return payload
}

async function main () {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const tag = args.find(a => !a.startsWith('--'))
  if (!tag) {
    console.error('Usage: node scripts/discord-release.mjs <tag> [--dry-run]')
    process.exit(2)
  }
  const repo = process.env.GITHUB_REPOSITORY || 'guybnd/woke-poe-trade'
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'woke-release-announcer' }
  if (process.env.GH_TOKEN) headers.Authorization = `Bearer ${process.env.GH_TOKEN}`

  // Just after publishing, GitHub can still answer 404 for the new tag.
  let res
  for (let attempt = 1; ; attempt++) {
    res = await fetch(`https://api.github.com/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`, { headers })
    if (res.ok || attempt >= 4 || !(res.status === 404 || res.status >= 500)) break
    console.log(`GitHub said ${res.status} for ${tag}; retrying in ${attempt * 10}s.`)
    await new Promise(r => setTimeout(r, attempt * 10000))
  }
  if (!res.ok) throw new Error(`GitHub release ${tag}: ${res.status} ${await res.text()}`)
  const release = await res.json()
  if (release.draft || release.prerelease) {
    console.log(`${tag} is a ${release.draft ? 'draft' : 'pre-release'}: not announcing.`)
    return
  }

  const payload = buildPayload(release, { repo, ping: process.env.DISCORD_RELEASE_PING })
  const webhook = (process.env.DISCORD_WEBHOOK_URL || '').trim()
  if (dryRun || !webhook) {
    if (!webhook && !dryRun) console.log('DISCORD_WEBHOOK_URL is not set: printing the post instead of sending it.')
    console.log(JSON.stringify(payload, null, 2))
    return
  }

  for (let attempt = 1; ; attempt++) {
    const target = new URL(webhook)
    target.searchParams.set('wait', 'true')
    const post = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (post.ok) {
      console.log(`Announced ${tag} on Discord.`)
      return
    }
    const text = await post.text()
    // Only a rate limit is retried: after a 5xx the message may already be posted.
    if (post.status === 429 && attempt < 4) {
      const wait = Number(post.headers.get('retry-after')) || attempt * 5
      console.log(`Discord said ${post.status}; retrying in ${wait}s.`)
      await new Promise(r => setTimeout(r, wait * 1000))
      continue
    }
    throw new Error(`Discord webhook: ${post.status} ${text}`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(e => { console.error(e.message); process.exit(1) })
}
