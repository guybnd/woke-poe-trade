import { parentPort } from 'worker_threads'
import * as Comlink from 'comlink'
import nodeEndpoint from 'comlink/dist/umd/node-adapter'
import * as Bindings from './wasm-bindings'
import { ImageData } from './utils'
import { scanTooltip, scanAreaModList, ocrLine } from '../woke/map-scan-vision'
import type { ScanOptions, LineImage } from '../woke/map-scan-vision'
import { scanEssenceLabel, scanAllEssenceLabels } from '../woke/essence-scan-vision'

let _changeLangPromise = Promise.resolve()
// woke: the language to fall back to when our own model fails to load.
let _lastLang: { lang: string, binDir: string } | null = null

const WorkerBody = {
  async init (binDir: string) {
    await Bindings.init(binDir)
  },
  async changeLanguage (lang: string, binDir: string) {
    await _changeLangPromise
    _lastLang = { lang, binDir }
    _changeLangPromise = Bindings.changeLanguage(lang, binDir)
    await _changeLangPromise
  },
  // woke scans: read with our own model (trained on the game's font)
  async loadModel (data: Uint8Array, name: string) {
    await _changeLangPromise
    const load = Promise.resolve().then(() => { Bindings.loadModelData(data, name) })
    // A model that fails to load leaves tesseract without one: go back to the
    // game language, and don't leave every later scan waiting on a rejection.
    _changeLangPromise = load.catch(async () => {
      if (_lastLang) await Bindings.changeLanguage(_lastLang.lang, _lastLang.binDir)
    }).catch(() => {})
    await load
  },
  // woke map scan mode
  async scanMapTooltip (screenshot: ImageData, opts: ScanOptions) {
    await _changeLangPromise
    return scanTooltip(screenshot, opts)
  },
  // woke map scan: OCR some of a tooltip's lines (main splits them across workers)
  async ocrLines (lines: LineImage[]) {
    await _changeLangPromise
    return lines.map(ocrLine)
  },
  // woke death recap: the game's list of the area's mods
  async scanAreaModList (corner: ImageData, refH: number) {
    await _changeLangPromise
    return scanAreaModList(corner, refH)?.map(ocrLine) ?? null
  },
  // woke essence scan mode
  async scanEssenceLabel (screenshot: ImageData, opts: ScanOptions) {
    await _changeLangPromise
    return scanEssenceLabel(screenshot, opts)
  },
  // woke essence scan: one pass over the whole screen
  async scanAllEssenceLabels (screenshot: ImageData) {
    await _changeLangPromise
    return scanAllEssenceLabels(screenshot)
  }
}
Comlink.expose(WorkerBody, nodeEndpoint(parentPort!))

export type WorkerAPI = Comlink.Remote<typeof WorkerBody>
