// Reads a picture of a tree (a pasted or picked screenshot) off the main
// thread: fitting a 1440p picture takes about a fifth of a second, a 4K one
// longer, and main must keep the overlay and the input hooks moving. One job
// per worker: started for a picture, gone after it (no memory kept).
import { parentPort } from 'worker_threads'
import { fitPicture, litLines, litProbes } from './tree-fit'
import type { FitKind, LitTone, TreePoints } from './tree-fit'

export interface PictureJob {
  px: Uint8Array
  width: number
  height: number
  pts: TreePoints
  kind: FitKind
  snip?: FitKind
  tone: LitTone
  probes: number[][]
  extra: number[][]
}

export type PictureResult =
  | { ok: true, lit: boolean[], extraLit: boolean[], width: number, height: number, bare: boolean }
  | { ok: false, reason: 'no-tree' }

// A picture smaller than this is scaled up to it first: the node finder is
// tuned to 1440p screens, and a shrunk tree's nodes are a few pixels across
// (a 660 px wide tree didn't fit at all, and fitted once at 1440).
const SMALL = 1100
const UP_TO = 1440

// Bilinear, BGRA.
export function scaleUp (px: Uint8Array, w: number, h: number, f: number): { px: Uint8Array, width: number, height: number } {
  const W = Math.round(w * f)
  const H = Math.round(h * f)
  const out = new Uint8Array(W * H * 4)
  for (let y = 0; y < H; y++) {
    const sy = Math.min(h - 1, Math.max(0, (y + 0.5) / f - 0.5))
    const y0 = Math.min(h - 2, Math.floor(sy))
    const ay = sy - y0
    for (let x = 0; x < W; x++) {
      const sx = Math.min(w - 1, Math.max(0, (x + 0.5) / f - 0.5))
      const x0 = Math.min(w - 2, Math.floor(sx))
      const ax = sx - x0
      const i = (y0 * w + x0) * 4
      const j = (y * W + x) * 4
      for (let c = 0; c < 4; c++) {
        const top = px[i + c] * (1 - ax) + px[i + 4 + c] * ax
        const bot = px[i + w * 4 + c] * (1 - ax) + px[i + w * 4 + 4 + c] * ax
        out[j + c] = top * (1 - ay) + bot * ay
      }
    }
  }
  return { px: out, width: W, height: H }
}

// Pure, so main can run it inline where the worker can't start.
export function readPicture (job: PictureJob): PictureResult {
  let { px, width, height } = job
  const { pts } = job
  let tone = job.tone
  // Not past 8K by 4K, whatever its shape.
  if (height < SMALL && width >= 2 && height >= 2 && width * (UP_TO / height) * UP_TO <= 7680 * 4320) {
    ;({ px, width, height } = scaleUp(px, width, height, UP_TO / height))
    // Its lines were shrunk with it: paler.
    if (tone === 'blue') tone = 'pale'
  }
  const { fit, bare } = fitPicture(px, width, height, pts, job.kind, job.snip)
  if (!fit) return { ok: false, reason: 'no-tree' }
  const lit = litProbes(px, width, height, fit, job.probes.map(p => Float32Array.from(p)), tone)
  const extraLit = litLines(px, width, height, fit, job.extra.map(p => Float32Array.from(p)), pts, tone, bare)
  return { ok: true, lit, extraLit, width, height, bare }
}

parentPort?.once('message', (job: PictureJob) => {
  parentPort!.postMessage(readPicture(job))
})
