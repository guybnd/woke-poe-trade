import type { IpcEvent, IpcEventPayload, UpdateInfo, HostState, ConfigNotice } from '@ipc/types'
import { shallowRef } from 'vue'
import Sockette from 'sockette'

const MAX_LOG_CHARS = 256 * 1024

class HostTransport {
  private evBus = new EventTarget()
  private socket!: Sockette
  logs = shallowRef('')
  version = shallowRef('0.0.00000')
  updateInfo = shallowRef<UpdateInfo>({ state: 'initial' })
  configNotice = shallowRef<ConfigNotice | null>(null)
  // woke: modules can ask main for things while the page is still loading,
  // before init() has connected (sending then threw, and the request failed).
  connected = false
  private markConnected!: () => void
  readonly whenConnected = new Promise<void>((resolve) => { this.markConnected = resolve })

  async init () {
    this.onEvent('MAIN->CLIENT::log-entry', (entry) => {
      // woke: logs last as long as the app does, so they can't grow for ever.
      const logs = this.logs.value + entry.message
      this.logs.value = logs.length > MAX_LOG_CHARS
        ? logs.slice(logs.indexOf('\n', logs.length - MAX_LOG_CHARS / 2) + 1)
        : logs
    })
    this.onEvent('MAIN->CLIENT::updater-state', (info) => {
      this.updateInfo.value = info
    })
    await new Promise((resolve) => {
      const protocol = (window.location.protocol === 'https:') ? 'wss:' : 'ws:'
      const role = window.location.hash === '#setup' ? '?role=setup' : ''
      this.socket = new Sockette(`${protocol}//${window.location.host}/events${role}`, {
        onmessage: (e) => {
          this.selfDispatch(JSON.parse(e.data))
        },
        onopen: resolve
      })
    })
    this.connected = true
    this.markConnected()
  }

  selfDispatch (event: IpcEvent) {
    this.evBus.dispatchEvent(new CustomEvent(event.name, {
      detail: event.payload
    }))
  }

  sendEvent (event: IpcEvent) {
    this.socket.send(JSON.stringify(event))
  }

  onEvent<Name extends IpcEvent['name']> (
    name: Name,
    cb: (payload: IpcEventPayload<Name>) => void
  ): AbortController {
    const controller = new AbortController()
    if (!this.isElectron && name.startsWith('MAIN->OVERLAY')) {
      return controller
    }

    this.evBus.addEventListener(name, (e) => {
      cb((e as CustomEvent<IpcEventPayload<Name>>).detail)
    }, { signal: controller.signal })
    return controller
  }

  async getConfig (): Promise<string | null> {
    const response = await fetch('/config')
    const config = await response.json() as HostState
    // TODO: refactor this
    this.version.value = config.version
    this.updateInfo.value = config.updater
    this.configNotice.value = config.configNotice ?? null
    return config.contents
  }

  async importFile (file: File): Promise<string> {
    const response = await fetch(`/uploads/${file.name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: file
    })
    const body = await response.json() as { name: string }
    return body.name
  }

  proxy: typeof window['fetch'] = async (url, init) => {
    return await window.fetch(`/proxy/${url as string}`, init)
  }

  get isElectron () {
    return navigator.userAgent.includes('Electron')
  }
}

export const MainProcess = new HostTransport()
export const Host = MainProcess
