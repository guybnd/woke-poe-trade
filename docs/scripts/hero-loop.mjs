// The landing page's hero: a 12 s muted loop cut from the highlight clips
// (docs/public/clips, recorded by landing-highlights.spec.ts), so the first
// thing on the page shows the overlay at work. Writes clips/hero-loop.mp4 and
// .webm, and its first frame as shots/hero-loop.webp (the still for visitors
// who turned motion off, and what shows while the clip loads).
//
//   node docs/scripts/hero-loop.mjs      (needs ffmpeg; rerun after new clips)
import { execFileSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const PUBLIC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public')
const clip = (name) => path.join(PUBLIC, 'clips', `${name}.mp4`)
// [clip, from, seconds]: the part of each where something happens. Price
// Check goes last: its own clip plays right under the hero.
const PARTS = [
  ['clip-filter', 1.2, 3.8],
  ['clip-search', 0.6, 4.4],
  ['clip-price-check', 1.2, 4.8]
]
const FADE = 0.5

const inputs = PARTS.flatMap(([name, from, len]) => ['-ss', String(from), '-t', String(len), '-i', clip(name)])
const norm = PARTS.map((_, i) => `[${i}:v]fps=30,scale=1920:1080,setsar=1,format=yuv420p[p${i}]`)
const fades = []
let last = 'p0'
let at = 0
for (let i = 1; i < PARTS.length; i++) {
  at += PARTS[i - 1][2] - FADE
  fades.push(`[${last}][p${i}]xfade=transition=fade:duration=${FADE}:offset=${at.toFixed(2)}[x${i}]`)
  last = `x${i}`
}
const ff = (...args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' })
const mp4 = path.join(PUBLIC, 'clips', 'hero-loop.mp4')
ff(...inputs, '-filter_complex', [...norm, ...fades].join(';'), '-map', `[${last}]`, '-an',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-movflags', '+faststart', '-pix_fmt', 'yuv420p', mp4)
ff('-i', mp4, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '40', '-row-mt', '1', '-an', path.join(PUBLIC, 'clips', 'hero-loop.webm'))
ff('-i', mp4, '-frames:v', '1', '-c:v', 'libwebp', '-quality', '85', path.join(PUBLIC, 'shots', 'hero-loop.webp'))
console.log('hero-loop written')
