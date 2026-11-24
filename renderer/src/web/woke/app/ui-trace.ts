// A UI step written to the app log (main's Logger: Settings › Debug, and the
// log in Report an issue), so "what did I click?" can be read back afterwards.
// Main caps it at 30 lines a minute.
import { hostRequest } from '../shared/host'

export function uiTrace (text: string): void {
  console.info(`[ui] ${text}`)
  hostRequest('ui-trace', { text }).catch(() => {})
}
