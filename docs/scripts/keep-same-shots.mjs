// After a retake: a picture that looks the same as the one in git goes back to
// the one in git, so a retake commits only pictures that changed (a new encode
// of the same screen differs in its bytes, not its pixels). Clips are kept
// as retaken. Run from docs/: node scripts/keep-same-shots.mjs
import { execFileSync } from 'node:child_process'
import sharp from 'sharp'

// Mean difference per channel, 0-255. Font smoothing and encoder noise stay
// well under it; a moved panel or a new number is far over.
const SAME = 1.5
const git = (...args) => execFileSync('git', args, { encoding: 'buffer', maxBuffer: 64 << 20 })
const changed = git('diff', '--name-only', '--', 'public/shots').toString().split('\n').filter(f => f.endsWith('.webp'))
let kept = 0
for (const file of changed) {
  const rel = file.replace(/^docs\//, '')
  let before
  try { before = git('show', `HEAD:${file}`) } catch { continue } // a new picture
  const [a, b] = await Promise.all([before, rel].map(src => sharp(src).raw().toBuffer({ resolveWithObject: true })))
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) continue
  let sum = 0
  for (let i = 0; i < a.data.length; i++) sum += Math.abs(a.data[i] - b.data[i])
  const diff = sum / a.data.length
  if (diff < SAME) { git('-C', '..', 'checkout', 'HEAD', '--', file); kept++ }
  else console.log(`changed: ${rel} (${diff.toFixed(1)})`)
}
console.log(`${changed.length - kept} of ${changed.length} retaken pictures changed; the rest stay as they were.`)
