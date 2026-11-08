export interface ImageData {
  width: number
  height: number
  data: Uint8Array
}

export function hsvToU8 (h: number, s: number, v: number) {
  return [
    Math.round(h * 255 / 360),
    Math.round(s * 255 / 100),
    Math.round(v * 255 / 100),
  ]
}

export function timeIt (syncFn: () => void): number {
  const startTime = performance.now()
  syncFn()
  return performance.now() - startTime
}
