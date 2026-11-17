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

// Pure, so main can run it inline where the worker can't start.
export function readPicture (job: PictureJob): PictureResult {
  const { px, width, height, pts, tone } = job
  const { fit, bare } = fitPicture(px, width, height, pts, job.kind, job.snip)
  if (!fit) return { ok: false, reason: 'no-tree' }
  const lit = litProbes(px, width, height, fit, job.probes.map(p => Float32Array.from(p)), tone)
  const extraLit = litLines(px, width, height, fit, job.extra.map(p => Float32Array.from(p)), pts, tone, bare)
  return { ok: true, lit, extraLit, width, height, bare }
}

parentPort?.once('message', (job: PictureJob) => {
  parentPort!.postMessage(readPicture(job))
})
