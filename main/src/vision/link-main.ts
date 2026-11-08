import { Worker } from 'worker_threads'
import * as Comlink from 'comlink'
import nodeEndpoint from 'comlink/dist/umd/node-adapter'
import type { WorkerAPI } from './link-worker'
import type { ImageData } from './utils'
import type { ScanOptions, LineImage } from '../woke/map-scan-vision'
import { ocrDir } from '../woke/ocr-dir'
import { perfTime } from '../woke/perf'

export class OcrWorker {
  // woke: how many are loaded now (each holds 100-200 MB); for the perf tests.
  static live = 0

  // woke: the installer ships the OCR files; the config folder copy still wins.
  private binDir = ocrDir()
  private api: Comlink.Remote<WorkerAPI>
  private lang = ''
  private worker: Worker
  // opencv + tesseract load in the background (about a second), so startup
  // doesn't wait for them; every call waits for this first.
  private ready: Promise<void> = Promise.resolve()

  private constructor () {
    this.worker = new Worker(__dirname + '/vision.js')
    OcrWorker.live++
    this.worker.once('exit', () => { OcrWorker.live-- })
    this.api = Comlink.wrap<WorkerAPI>(nodeEndpoint(this.worker))
  }

  static async create () {
    const worker = new OcrWorker()
    worker.ready = perfTime('OCR worker load', worker.api.init(worker.binDir)).catch(() => {})
    return worker
  }

  // Frees the worker's memory (opencv + tesseract heaps); the object is unusable after.
  async terminate () {
    await this.worker.terminate()
  }

  async updateOptions (lang: string) {
    await this.ready
    try {
      if (lang !== this.lang) {
        await this.api.changeLanguage(lang, this.binDir)
      }
    } catch {} finally {
      this.lang = lang
    }
  }

  // Switches this worker to a model of our own; `lang` stays as it was, so
  // a later updateOptions call with the same language won't undo it.
  async loadModel (data: Uint8Array, name: string) {
    await this.ready
    await this.api.loadModel(data, name)
  }

  async scanMapTooltip (image: ImageData, opts: ScanOptions) {
    await this.ready
    return await this.api.scanMapTooltip(
      Comlink.transfer(image, [image.data.buffer]), opts)
  }

  async scanAreaModList (corner: ImageData, refH: number) {
    await this.ready
    return await this.api.scanAreaModList(Comlink.transfer(corner, [corner.data.buffer]), refH)
  }

  async ocrLines (lines: LineImage[]) {
    await this.ready
    return await this.api.ocrLines(
      Comlink.transfer(lines, lines.map(l => l.data.buffer)))
  }

  async scanAllEssenceLabels (image: ImageData) {
    await this.ready
    return await this.api.scanAllEssenceLabels(
      Comlink.transfer(image, [image.data.buffer]))
  }

  async scanEssenceLabel (image: ImageData, opts: ScanOptions) {
    await this.ready
    return await this.api.scanEssenceLabel(
      Comlink.transfer(image, [image.data.buffer]), opts)
  }
}
