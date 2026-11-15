// The Claude link: a small MCP server on this PC's own address that lets
// Claude Code or Claude Desktop read the app's records and leave suggestions
// on a dock card. Off by default; nothing listens until it's turned on in
// Settings › Experimental.
import { app } from 'electron'
import { createServer, type Server } from 'http'
import { randomBytes } from 'crypto'
import fs, { promises as fsp } from 'fs'
import path from 'path'
import { appPrefs, setAppPrefs } from '../app-prefs'
import { dataDir, readJson, readJsonStrict, writeAtomic, writeQueue } from '../data-files'
import { admit, handleBody, type ServerInfo, type ToolDef } from './rpc'
import { buildTools, INSTRUCTIONS, type AppConfigLike, type CharacterLike, type LinkDeps, type TreeNodeInfo } from './tools'
import { makeSuggestion, trimList, MAX_OPEN } from './suggestions'
import { readCache } from '../personal/stash-reader'
import { lastItemText } from './last-item'
import type { ServerEvents } from '../../server'
import type { Logger } from '../../RemoteLogger'
import type { ClaudeLinkState, ClaudeSuggestion, SuggestionKind } from '../../../../ipc/claude-link'
import type { WokeHandler, WokeOp } from '../../../../ipc/woke-ops'

export const FIRST_PORT = 8586
const PORT_TRIES = 10
const MAX_BODY = 512 * 1024
const ASK_TIMEOUT_MS = 8000

// ---- key file ----

const keyFile = () => path.join(app.getPath('userData'), 'apt-data', 'woke-claude-link.json')

function readKey (): string {
  try {
    const k = (JSON.parse(fs.readFileSync(keyFile(), 'utf8')) as { token?: unknown }).token
    if (typeof k === 'string' && k.length >= 20) return k
  } catch {}
  return newKey()
}

function newKey (): string {
  const token = randomBytes(24).toString('base64url')
  try {
    fs.mkdirSync(path.dirname(keyFile()), { recursive: true })
    fs.writeFileSync(keyFile(), JSON.stringify({ token }, null, 2))
  } catch {}
  return token
}

// ---- suggestions file ----

const suggestionsFile = () => path.join(dataDir('woke-claude'), 'suggestions.json')
const queued = writeQueue()

async function readSuggestions (): Promise<ClaudeSuggestion[]> {
  const v = await readJsonStrict<unknown>(suggestionsFile(), [])
  return Array.isArray(v) ? v as ClaudeSuggestion[] : []
}

// ---- the link ----

interface Deps {
  server: ServerEvents
  logger: Logger
  op: (name: string, args: unknown) => Promise<unknown>
  register: <K extends WokeOp>(op: K, handler: WokeHandler<K>) => void
}

export function initClaudeLink ({ server, logger, op, register }: Deps): void {
  let token = ''
  let http: Server | null = null
  let port: number | null = null
  let error: string | null = null
  const calls: ClaudeLinkState['calls'] = []
  const asks = new Map<string, { resolve: (v: unknown) => void, reject: (e: Error) => void, timer: NodeJS.Timeout }>()
  let askSeq = 0

  const broadcast = (topic: string, data: unknown) => {
    server.sendEventTo('broadcast', { name: 'MAIN->CLIENT::woke-event', payload: { topic, data } })
  }

  const state = (): ClaudeLinkState => ({
    on: appPrefs().claudeLink,
    running: http != null && port != null,
    url: port != null ? `http://127.0.0.1:${port}/mcp` : null,
    token: appPrefs().claudeLink ? (token || (token = readKey())) : '',
    error,
    calls: calls.slice(0, 20)
  })

  const suggestions = {
    list: readSuggestions,
    add: async (kind: SuggestionKind, args: Record<string, unknown>, check: (key: string, value: unknown) => string | null) => {
      return await queued(async () => {
        const list = await readSuggestions()
        if (list.filter(s => s.status === 'new').length >= MAX_OPEN) throw new Error(`${MAX_OPEN} suggestions are already waiting. Wait until the player answers some.`)
        const s = makeSuggestion(kind, args, randomBytes(8).toString('hex'), Date.now(), check)
        const next = trimList([...list, s])
        await writeAtomic(suggestionsFile(), JSON.stringify(next))
        broadcast('claude-suggestions', next)
        return s
      })
    }
  }

  const linkDeps: LinkDeps = {
    appVersion: app.getVersion(),
    config: readConfig,
    op,
    lastItem: lastItemText,
    passiveTree: readPassiveTree,
    stashCache: async (league) => await readCache(league),
    // Written by the character sync (personal/character-sync.ts) once it's merged.
    character: async () => await readJson<CharacterLike>(path.join(dataDir('woke-character'), 'current.json')),
    askOverlay: async (kind, args, timeoutMs = ASK_TIMEOUT_MS) => await new Promise((resolve, reject) => {
      const id = `${Date.now()}-${++askSeq}`
      const timer = setTimeout(() => {
        asks.delete(id)
        reject(new Error('The overlay did not answer. Is the app\'s overlay running?'))
      }, timeoutMs)
      asks.set(id, { resolve, reject, timer })
      broadcast('claude-ask', { id, kind, args })
    }),
    suggestions
  }

  let tools: ToolDef[] | null = null
  const info: ServerInfo = { version: app.getVersion(), instructions: INSTRUCTIONS }
  const noteCall = (tool: string, ok: boolean) => {
    calls.unshift({ at: Date.now(), tool, ok })
    calls.length = Math.min(calls.length, 20)
  }

  const start = async (): Promise<void> => {
    if (http) return
    token = token || readKey()
    tools = tools ?? buildTools(linkDeps)
    error = null
    const srv = createServer((req, res) => {
      const url = (req.url ?? '').split('?')[0]
      if (url !== '/mcp') { res.statusCode = 404; res.end(); return }
      const ok = admit(req.headers, token, port ?? 0)
      if (!ok.ok) {
        res.statusCode = ok.status
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify({ error: ok.message }))
        return
      }
      // No server-to-client stream and no sessions: POST only.
      if (req.method !== 'POST') { res.statusCode = 405; res.setHeader('allow', 'POST'); res.end(); return }
      const chunks: Buffer[] = []
      let size = 0
      req.on('data', (c: Buffer) => {
        size += c.length
        if (size > MAX_BODY) { res.statusCode = 413; res.end(); req.destroy(); return }
        chunks.push(c)
      })
      req.on('end', () => {
        if (res.writableEnded) return
        handleBody(Buffer.concat(chunks).toString('utf8'), tools!, info, noteCall)
          .then(reply => {
            if (reply == null) { res.statusCode = 202; res.end(); return }
            res.statusCode = 200
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify(reply))
          })
          .catch(e => {
            logger.write(`error [claude-link] ${String(e)}`)
            res.statusCode = 500
            res.end()
          })
      })
    })
    for (let p = FIRST_PORT; p < FIRST_PORT + PORT_TRIES; p++) {
      const opened = await new Promise<boolean>(resolve => {
        const onError = () => { srv.removeListener('listening', onListening); resolve(false) }
        const onListening = () => { srv.removeListener('error', onError); resolve(true) }
        srv.once('error', onError)
        srv.once('listening', onListening)
        srv.listen(p, '127.0.0.1')
      })
      if (opened) {
        http = srv
        port = p
        logger.write(`info [claude-link] listening on 127.0.0.1:${p}`)
        return
      }
    }
    error = `Ports ${FIRST_PORT} to ${FIRST_PORT + PORT_TRIES - 1} are all taken.`
  }

  const stop = async (): Promise<void> => {
    const srv = http
    http = null
    port = null
    if (srv) await new Promise<void>(resolve => { srv.close(() => resolve()); srv.closeAllConnections() })
  }

  const changed = () => { broadcast('claude-link', state()) }

  register('claude-link-state', async () => state())
  register('claude-link-set', async (args) => {
    const on = args?.on === true
    setAppPrefs({ claudeLink: on })
    if (on) await start()
    else await stop()
    changed()
    return state()
  })
  register('claude-link-new-key', async () => {
    token = newKey()
    // Clients holding the old key get 401 from the next request on.
    changed()
    return state()
  })
  register('claude-answer', async (args) => {
    const ask = typeof args?.id === 'string' ? asks.get(args.id) : undefined
    if (!ask) return false
    asks.delete(args.id)
    clearTimeout(ask.timer)
    if (args.ok) ask.resolve(args.data)
    else ask.reject(new Error(typeof args.error === 'string' ? args.error : 'The overlay could not answer.'))
    return true
  })
  register('suggestions-list', async () => await readSuggestions())
  register('suggestion-resolve', async (args) => {
    const id = typeof args?.id === 'string' ? args.id : ''
    const status = args?.status === 'applied' || args?.status === 'dismissed' ? args.status : null
    if (!id || !status) throw new Error('Bad suggestion answer')
    return await queued(async () => {
      const list = await readSuggestions()
      const s = list.find(x => x.id === id)
      if (!s) return false
      const next = list.map(x => x.id === id ? { ...x, status, resolvedAt: Date.now() } : x)
      await writeAtomic(suggestionsFile(), JSON.stringify(next))
      broadcast('claude-suggestions', next)
      return true
    })
  })

  if (appPrefs().claudeLink) {
    start().then(changed).catch(e => { error = String(e); logger.write(`error [claude-link] ${String(e)}`) })
  }
  app.on('before-quit', () => { stop().catch(() => {}) })
}

// ---- data the tools read ----

async function readConfig (): Promise<AppConfigLike | null> {
  return await readJson<AppConfigLike>(path.join(app.getPath('userData'), 'apt-data', 'config.json'))
}

type TreeRow = [number, number, number, string, string, string[], ...unknown[]]

// Read on demand and not kept: the file is ~0.8 MB and calls are rare.
async function readPassiveTree (): Promise<{ nodes: Map<number, TreeNodeInfo>, masteryEffects: Record<string, string[]> } | null> {
  const candidates = [
    path.join(__dirname, 'data/tree/passive-tree.json'),
    path.join(__dirname, '../../renderer/public/data/tree/passive-tree.json')
  ]
  for (const file of candidates) {
    try {
      const data = JSON.parse(await fsp.readFile(file, 'utf8')) as { nodes: TreeRow[], masteryEffects?: Record<string, string[]> }
      const nodes = new Map<number, TreeNodeInfo>()
      for (const r of data.nodes) nodes.set(r[0], { kind: r[3], name: r[4], stats: r[5] ?? [], asc: typeof r[11] === 'string' ? r[11] : undefined })
      return { nodes, masteryEffects: data.masteryEffects ?? {} }
    } catch {}
  }
  return null
}
