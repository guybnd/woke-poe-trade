import { WebSocketServer, type WebSocket } from 'ws'
import { type AddressInfo } from 'net'
import { createServer, type IncomingMessage, type ServerResponse } from 'http'
import { EventEmitter } from 'events'
import { networkInterfaces } from 'os'
import * as path from 'path'
import { app } from 'electron'
import { IpcEvent, IpcEventPayload, HostState } from '../../ipc/types'
import { ConfigStore } from './host-files/ConfigStore'
import { addFileUploadRoutes } from './host-files/file-uploads'
import { isOwnPageRequest, sendFile } from './host-files/request-guard'
import { liveDataRoot } from './woke/live-data'
import type { AppUpdater } from './AppUpdater'
import type { Logger } from './RemoteLogger'

// woke: every route hangs off this, so none can be reached without the check.
export const httpRoutes = new EventEmitter()
const listenOpt = process.argv.find(arg => arg.startsWith('--listen'))

// With --listen, this PC's own addresses and the host named in the option.
function extraHosts (): Set<string> | undefined {
  if (!listenOpt) return undefined
  const hosts = new Set<string>()
  const named = listenOpt.split('=')[1]?.split(':')[0]
  if (named) hosts.add(named.toLowerCase())
  for (const addresses of Object.values(networkInterfaces())) {
    for (const a of addresses ?? []) hosts.add(a.family === 'IPv6' ? `[${a.address}]` : a.address)
  }
  return hosts
}

export const server = createServer((req, res) => {
  if (!isOwnPageRequest(req.headers, extraHosts())) {
    res.statusCode = 403
    res.end()
    return
  }
  httpRoutes.emit('request', req, res)
})
const websocketServer = new WebSocketServer({ noServer: true })
let lastActiveClient: WebSocket | undefined
let configStore: ConfigStore | undefined
let portWasBusy = false

// woke: resolves once every save asked for so far is on disk.
export async function configFlushed () {
  await configStore?.flushed()
}

// woke: the settings as they are now, for the setup window to merge its picks
// into. The overlay first saves what it holds (the same step as quitting;
// a page that doesn't answer within `waitMs` is skipped), then the file is
// read once every save is on disk.
export async function freshConfig (waitMs = 3000): Promise<string | null> {
  await new Promise<void>((resolve) => {
    const done = () => { clearTimeout(timer); evBus.off('CLIENT->MAIN::config-flushed', done); resolve() }
    const timer = setTimeout(done, Math.min(Math.max(0, waitMs), 10_000))
    evBus.on('CLIENT->MAIN::config-flushed', done)
    sendEventTo('broadcast', { name: 'MAIN->CLIENT::config-flush', payload: undefined })
  })
  if (!configStore) return null
  await configStore.flushed()
  return await configStore.load()
}

export function startConfigOver () {
  configStore?.startOver()
}

addFileUploadRoutes(httpRoutes)

// woke: item and stat data downloaded since the last release.
httpRoutes.addListener('request', (req: IncomingMessage, res: ServerResponse) => {
  if (req.method !== 'GET' || !req.url?.startsWith('/live-data/')) return
  sendFile(liveDataRoot(), req.url.slice('/live-data'.length), res)
})

if (!process.env.VITE_DEV_SERVER_URL) {
  httpRoutes.addListener('request', (req: IncomingMessage, res: ServerResponse) => {
    if (req.url?.startsWith('/config') || req.url?.startsWith('/uploads') || req.url?.startsWith('/proxy') || req.url?.startsWith('/live-data/')) return

    const urlPath = req.url!.split(/[?#]/, 1)[0]
    const filePath = (urlPath === '/') ? '/index.html' : urlPath
    switch (path.extname(filePath)) {
      case '.html': res.setHeader('content-type', 'text/html'); break;
      case '.js': res.setHeader('content-type', 'text/javascript'); break;
      case '.json': res.setHeader('content-type', 'application/json'); break;
      case '.svg': res.setHeader('content-type', 'image/svg+xml'); break;
    }

    sendFile(__dirname, filePath, res)
  })
}

const evBus = new EventEmitter()

export function onEventAnyClient<Name extends IpcEvent['name']> (
  name: Name,
  cb: (payload: IpcEventPayload<Name>) => void
) {
  evBus.on(name, cb)
}

export function sendEventTo (
  target: 'last-active' | 'any' | 'broadcast',
  event: IpcEvent
) {
  const msg = JSON.stringify(event)
  if (target === 'broadcast') {
    for (const client of websocketServer.clients) {
      client.send(msg)
    }
  } else {
    // woke: a hotkey can fire before the page has connected.
    lastActiveClient?.send(msg)
  }
}

export interface ServerEvents {
  onEventAnyClient: typeof onEventAnyClient
  sendEventTo: typeof sendEventTo
}
export const eventPipe = {
  onEventAnyClient,
  sendEventTo
}

server.on('upgrade', (req, socket, head) => {
  if ((req.url !== '/events' && req.url !== '/events?role=setup') || !isOwnPageRequest(req.headers, extraHosts())) {
    return req.destroy()
  }
  websocketServer.handleUpgrade(req, socket, head, (ws) => {
    websocketServer.emit('connection', ws, req)
  })
})

export async function startServer (
  appUpdater: AppUpdater,
  logger: Logger
): Promise<number> {
  const store = new ConfigStore(eventPipe, logger)
  configStore = store

  websocketServer.on('connection', (socket, req) => {
    // woke: the setup window is never where item checks should go.
    const isSetupWindow = Boolean((req as { url?: string } | undefined)?.url?.includes('role=setup'))
    if (!isSetupWindow || !lastActiveClient) lastActiveClient = socket
    socket.on('message', (bytes) => {
      let event: IpcEvent
      try {
        event = JSON.parse(bytes.toString('utf-8')) as IpcEvent
      } catch {
        event = null as unknown as IpcEvent
      }
      // 'error' is special on an EventEmitter: it throws with no listener.
      if (typeof event?.name !== 'string' || event.name as string === 'error') {
        logger.write('warn [server] Ignored a message it couldn\'t read.')
        return
      }
      if (event.name === 'CLIENT->MAIN::used-recently') {
        lastActiveClient = socket
      }
      evBus.emit(event.name, event.payload)
    })
    socket.on('close', () => {
      const clients = websocketServer.clients
      if (clients.size === 1) {
        lastActiveClient = clients.values().next().value!
        evBus.emit('CLIENT->MAIN::used-recently', { isOverlay: true })
      }
    })
    socket.send(JSON.stringify({
      name: 'MAIN->CLIENT::log-entry',
      payload: { message: logger.history }
    } satisfies IpcEvent))
  })

  httpRoutes.addListener('request', async (req: IncomingMessage, res: ServerResponse) => {
    if (req.url === '/config') {
      res.setHeader('content-type', 'application/json')
      const resBody: HostState = {
        version: app.getVersion(),
        updater: appUpdater.info,
        contents: await store.load(),
        configNotice: store.notice ?? (portWasBusy ? 'port-busy' : null)
      }
      res.end(JSON.stringify(resBody))
    }
  })

  // woke: a fixed port, because the overlay's saved data (market history) is
  // tied to its address. Falls back to any free port if something else has it.
  let port = (process.env.VITE_DEV_SERVER_URL) ? 8584 : 8585
  let host = '127.0.0.1'
  // --listen=[host][:port]
  if (listenOpt) {
    const [hostArg, portArg] = listenOpt.split('=')[1].split(':')
    if (hostArg) host = hostArg
    if (portArg) port = parseInt(portArg, 10)
  }

  return new Promise((resolve, reject) => {
    server.once('listening', () => {
      resolve((server.address() as AddressInfo).port)
    })
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE' && !listenOpt && !process.env.VITE_DEV_SERVER_URL && port !== 0) {
        // woke: browser storage belongs to the address, so it looks empty on another port.
        logger.write('warn [server] Port 8585 is in use, so saved window settings will look reset this run.')
        portWasBusy = true
        port = 0
        server.listen({ port, host })
      } else {
        reject(err)
      }
    })
    server.listen({ port, host })
  })
}
