// The Claude link's wire protocol: MCP (Model Context Protocol) over
// streamable HTTP, answered as plain JSON. Only what a tools-only server
// needs: initialize, ping, tools/list and tools/call. No SDK, so nothing
// heavy loads with the app. Pure: no Electron, so tests can run it.

export interface ToolDef {
  name: string
  // One or two short sentences: Claude reads these to pick a tool.
  description: string
  inputSchema: Record<string, unknown>
  // Reads only. The suggest tools add a row Guy approves, so they're not.
  readOnly: boolean
  run: (args: Record<string, unknown>) => Promise<unknown>
}

export interface ServerInfo {
  version: string
  instructions: string
}

export const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05']

interface RpcRequest { jsonrpc: '2.0', id?: string | number | null, method: string, params?: Record<string, unknown> }
type RpcReply = { jsonrpc: '2.0', id: string | number | null, result?: unknown, error?: { code: number, message: string } }

const PARSE_ERROR = -32700
const INVALID_REQUEST = -32600
const METHOD_NOT_FOUND = -32601
const INVALID_PARAMS = -32602

function isRequest (m: unknown): m is RpcRequest {
  return typeof m === 'object' && m !== null && (m as RpcRequest).jsonrpc === '2.0' && typeof (m as RpcRequest).method === 'string'
}

const error = (id: RpcReply['id'], code: number, message: string): RpcReply => ({ jsonrpc: '2.0', id, error: { code, message } })

// Answers one message. Null for a notification (no id) or a client's reply.
export async function handleMessage (
  msg: unknown,
  tools: ToolDef[],
  info: ServerInfo,
  onCall?: (tool: string, ok: boolean) => void
): Promise<RpcReply | null> {
  if (!isRequest(msg)) {
    // A response from the client (we never ask it anything) or junk.
    const id = typeof msg === 'object' && msg !== null && 'id' in msg ? (msg as { id: RpcReply['id'] }).id ?? null : null
    const isReply = typeof msg === 'object' && msg !== null && ('result' in msg || 'error' in msg)
    return isReply ? null : error(id, INVALID_REQUEST, 'Not a JSON-RPC 2.0 request')
  }
  const id = msg.id
  if (id === undefined) return null // notification: notifications/initialized, cancelled...
  const params = msg.params ?? {}
  switch (msg.method) {
    case 'initialize': {
      const asked = typeof params.protocolVersion === 'string' ? params.protocolVersion : ''
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'woke-poe-trade', title: 'Woke PoE Trade', version: info.version },
          instructions: info.instructions
        }
      }
    }
    case 'ping':
      return { jsonrpc: '2.0', id, result: {} }
    case 'tools/list':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          tools: tools.map(t => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
            annotations: { readOnlyHint: t.readOnly, destructiveHint: false, openWorldHint: false }
          }))
        }
      }
    case 'tools/call': {
      const name = params.name
      const tool = typeof name === 'string' ? tools.find(t => t.name === name) : undefined
      if (!tool) return error(id, INVALID_PARAMS, `Unknown tool: ${String(name)}`)
      const args = params.arguments
      if (args != null && (typeof args !== 'object' || Array.isArray(args))) return error(id, INVALID_PARAMS, 'arguments must be an object')
      try {
        const out = await tool.run((args ?? {}) as Record<string, unknown>)
        onCall?.(tool.name, true)
        const text = typeof out === 'string' ? out : JSON.stringify(out ?? null)
        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } }
      } catch (e) {
        onCall?.(tool.name, false)
        // A tool's own failure goes back as a result, so Claude can read it.
        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: e instanceof Error ? e.message : String(e) }], isError: true } }
      }
    }
    default:
      return error(id, METHOD_NOT_FOUND, `Method not found: ${msg.method}`)
  }
}

// A POST body: one message or a batch. Null body = nothing to send back (202).
export async function handleBody (
  text: string,
  tools: ToolDef[],
  info: ServerInfo,
  onCall?: (tool: string, ok: boolean) => void
): Promise<RpcReply | RpcReply[] | null> {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return error(null, PARSE_ERROR, 'Body is not JSON')
  }
  if (Array.isArray(parsed)) {
    if (!parsed.length) return error(null, INVALID_REQUEST, 'Empty batch')
    const out = (await Promise.all(parsed.map(async m => await handleMessage(m, tools, info, onCall)))).filter((r): r is RpcReply => r !== null)
    return out.length ? out : null
  }
  return await handleMessage(parsed, tools, info, onCall)
}

// Who may talk to the link: a request to this PC's own address, with no
// browser Origin (a web page can't reach it), carrying the key.
export function admit (headers: Record<string, string | string[] | undefined>, token: string, port: number): { ok: true } | { ok: false, status: number, message: string } {
  const host = String(headers.host ?? '').toLowerCase()
  if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) return { ok: false, status: 403, message: 'Wrong host' }
  const origin = headers.origin
  if (origin != null && origin !== '' && origin !== 'null') return { ok: false, status: 403, message: 'Browsers may not use the Claude link' }
  const auth = String(headers.authorization ?? '')
  const given = /^Bearer\s+(.+)$/i.exec(auth)?.[1]?.trim() ?? ''
  if (!token || !sameText(given, token)) return { ok: false, status: 401, message: 'Missing or wrong key' }
  return { ok: true }
}

// Compares in time that doesn't depend on where the first difference is.
function sameText (a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
