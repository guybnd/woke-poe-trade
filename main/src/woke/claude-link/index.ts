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
import { dataDir, readJson, readJsonStrict, safeName, writeAtomic, writeQueue } from '../data-files'
import { admit, handleBody, type ServerInfo, type ToolDef } from './rpc'
import { buildTools, INSTRUCTIONS, type AppConfigLike, type CharacterLike, type LinkDeps, type PassiveTreeInfo, type TreeNodeInfo } from './tools'
import { makeSuggestion, trimList, MAX_OPEN } from './suggestions'
import { readCache } from '../personal/stash-reader'
import { lastItemText } from './last-item'
import type { ServerEvents } from '../../server'
import type { Logger } from '../../RemoteLogger'
import type { ClaudeLinkState, ClaudeSuggestion, SuggestionKind } from '../../../../ipc/claude-link'
import type { WokeHandler, WokeOp } from '../../../../ipc/woke-ops'

export const PORT = 8586
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

export function initClaudeLink ({ server, logger, op, register }: Deps): { turnOff: () => Promise<void> } {
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

  const changed = () => { broadcast('claude-link', state()) }

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
    dailyHistory: readDailyHistory,
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
    changed()
  }

  // One start at a time; stop() waits for it, and a start that finds the
  // setting turned off meanwhile closes again.
  let starting: Promise<void> | null = null
  const start = async (): Promise<void> => {
    if (http) return
    if (starting) return await starting
    starting = open().finally(() => { starting = null })
    return await starting
  }

  const open = async (): Promise<void> => {
    token = token || readKey()
    tools = tools ?? buildTools(linkDeps)
    error = null
    const srv = createServer((req, res) => {
      const url = (req.url ?? '').split('?')[0]
      if (url !== '/mcp') { res.statusCode = 404; res.end(); return }
      const ok = admit(req.headers, token, PORT)
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
    // One fixed port: saved Claude setups point at it, so moving to another
    // would send the key to whatever holds this one.
    const opened = await new Promise<boolean>(resolve => {
      const onError = () => { srv.removeListener('listening', onListening); resolve(false) }
      const onListening = () => { srv.removeListener('error', onError); resolve(true) }
      srv.once('error', onError)
      srv.once('listening', onListening)
      srv.listen(PORT, '127.0.0.1')
    })
    if (!opened) {
      error = `Port ${PORT} is taken by another program. Close it and turn the link off and on.`
      return
    }
    srv.on('error', (e) => { logger.write(`error [claude-link] ${String(e)}`) })
    if (!appPrefs().claudeLink) {
      srv.close()
      return
    }
    http = srv
    port = PORT
    logger.write(`info [claude-link] listening on 127.0.0.1:${PORT}`)
  }

  const stop = async (): Promise<void> => {
    if (starting) await starting.catch(() => {})
    const srv = http
    http = null
    port = null
    if (srv) await new Promise<void>(resolve => { srv.close(() => resolve()); srv.closeAllConnections() })
  }

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

  // Locking Experimental hides the switch, so the link goes off with it.
  return {
    turnOff: async () => {
      if (!appPrefs().claudeLink && !http) return
      setAppPrefs({ claudeLink: false })
      await stop()
      changed()
    }
  }
}

// ---- data the tools read ----

async function readConfig (): Promise<AppConfigLike | null> {
  return await readJson<AppConfigLike>(path.join(app.getPath('userData'), 'apt-data', 'config.json'))
}

type TreeRow = [number, number, number, string, string, string[], ...unknown[]]

// Read on demand and not kept: the file is ~0.8 MB and calls are rare.
async function readPassiveTree (): Promise<PassiveTreeInfo | null> {
  const candidates = [
    path.join(__dirname, 'data/tree/passive-tree.json'),
    path.join(__dirname, '../../renderer/public/data/tree/passive-tree.json')
  ]
  for (const file of candidates) {
    try {
      const data = JSON.parse(await fsp.readFile(file, 'utf8')) as { nodes: TreeRow[], masteryEffects?: Record<string, string[]>, jewelSlots?: unknown }
      const nodes = new Map<number, TreeNodeInfo>()
      for (const r of data.nodes) nodes.set(r[0], { kind: r[3], name: r[4], stats: r[5] ?? [], asc: typeof r[11] === 'string' ? r[11] : undefined })
      const jewelSlots = Array.isArray(data.jewelSlots) ? data.jewelSlots.filter((n): n is number => typeof n === 'number') : undefined
      return { nodes, masteryEffects: data.masteryEffects ?? {}, jewelSlots }
    } catch {}
  }
  return null
}

// Same layout as market-store.ts: <userData>/woke-market/<league>/daily/<date>.json.
async function readDailyHistory (league: string, item: { type: string, name: string, variant: string }, days: number): Promise<Array<{ date: string, chaos: number }>> {
  const dir = path.join(dataDir('woke-market'), safeName(league), 'daily')
  let names: string[]
  try {
    names = (await fsp.readdir(dir)).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().slice(-days)
  } catch {
    return []
  }
  const out: Array<{ date: string, chaos: number }> = []
  for (const f of names) {
    const rows = await readJson<Array<{ type: string, name: string, variant: string, chaos: number }>>(path.join(dir, f))
    const r = Array.isArray(rows) ? rows.find(x => x.type === item.type && x.name === item.name && (x.variant ?? '') === (item.variant ?? '')) : undefined
    if (r && typeof r.chaos === 'number') out.push({ date: f.slice(0, 10), chaos: r.chaos })
  }
  return out
}
