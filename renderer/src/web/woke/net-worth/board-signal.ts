// The run board as last saved this session (run-store.ts saveBoard), so open
// windows (Atlas strategies) follow a finished run without reading the file again.
import { shallowRef } from 'vue'
import type { RunBoard } from './runs'

export const savedRunBoard = shallowRef<RunBoard | null>(null)
