// PNG decode/encode without native modules (pngjs is pure JS).
import { PNG } from 'pngjs'

export function decodePng (buf: Buffer): { width: number, height: number, data: Uint8Array } {
  const png = PNG.sync.read(buf)
  return { width: png.width, height: png.height, data: new Uint8Array(png.data.buffer, png.data.byteOffset, png.data.byteLength) }
}

