// Smaller copies of the landing page's shots, made when the site builds or the
// dev server starts (docs/.vitepress/config.js runs this), so they aren't kept
// in git:
//   shots/1280/<name>.webp   the whole shot at 1280px wide, for most screens
//   shots/phone/<name>.webp  a 4:5 crop on the slide's `focus` (content.js) at
//                            720x900, so a phone shows the window, not a dot
//   shots/thumb/<name>.webp  the whole shot at 320px wide, for the picture strip
// A copy is remade when its shot or its focus changes.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { HIGHLIGHTS } from '../.vitepress/theme/landing/content.js'

const SHOTS = fileURLToPath(new URL('../public/shots/', import.meta.url))
// What was made from what, kept with VitePress's own cache (not in git).
const MANIFEST = fileURLToPath(new URL('../.vitepress/cache/phone-shots.json', import.meta.url))

export const PHONE = { width: 720, height: 900 }
const WIDE = 1280
const THUMB = 320
// Bump when the way copies are made changes, so old ones are remade.
const RECIPE = 3

// The slide's focus, [x, y, width] as if the shot were 2560x1440 (some are
// smaller, all 16:9), as a 4:5 box inside the shot. A slide without one gets
// the middle.
export function focusBox ([x, y, w], shot = { width: 2560, height: 1440 }) {
  const scale = shot.width / 2560
  x *= scale
  y *= shot.height / 1440
  w = Math.min(Math.round(w * scale), shot.width, Math.floor(shot.height * 4 / 5))
  const h = Math.round(w * 5 / 4)
  return {
    left: Math.max(0, Math.min(Math.round(x), shot.width - w)),
    top: Math.max(0, Math.min(Math.round(y), shot.height - h)),
    width: w,
    height: h
  }
}

const MIDDLE = [780, 0, 1000]

export async function makePhoneShots () {
  const focus = new Map()
  for (const s of HIGHLIGHTS.flatMap(h => h.slides.flatMap(s => s.folder ?? [s]))) {
    if (!s.focus) console.warn(`landing: slide "${s.label}" has no focus, its phone crop is the middle of ${s.shot}`)
    focus.set(s.shot, s.focus ?? MIDDLE)
  }
  let made = {}
  try { made = JSON.parse(readFileSync(MANIFEST, 'utf8')) } catch {}
  const next = {}
  mkdirSync(fileURLToPath(new URL('../.vitepress/cache/', import.meta.url)), { recursive: true })
  mkdirSync(`${SHOTS}1280`, { recursive: true })
  mkdirSync(`${SHOTS}phone`, { recursive: true })
  mkdirSync(`${SHOTS}thumb`, { recursive: true })
  const jobs = []
  for (const file of readdirSync(SHOTS)) {
    if (!file.endsWith('.webp')) continue
    const name = file.slice(0, -5)
    const src = `${SHOTS}${file}`
    const key = `${RECIPE}|${statSync(src).mtimeMs}|${focus.get(name) ?? ''}`
    next[name] = key
    const wide = `${SHOTS}1280/${file}`
    const phone = `${SHOTS}phone/${file}`
    const small = `${SHOTS}thumb/${file}`
    if (made[name] === key && existsSync(wide) && existsSync(small) && (!focus.has(name) || existsSync(phone))) continue
    jobs.push((async () => {
      const meta = await sharp(src).metadata()
      await sharp(src).resize({ width: Math.min(WIDE, meta.width) }).webp({ quality: 82 }).toFile(wide)
      await sharp(src).resize({ width: THUMB }).webp({ quality: 78 }).toFile(small)
      if (focus.has(name)) {
        await sharp(src).extract(focusBox(focus.get(name), meta)).resize(PHONE.width, PHONE.height).webp({ quality: 84 }).toFile(phone)
      }
    })())
  }
  await Promise.all(jobs)
  writeFileSync(MANIFEST, JSON.stringify(next, null, 1))
  if (jobs.length) console.log(`landing: made phone, 1280px and thumbnail copies of ${jobs.length} shots`)
}
