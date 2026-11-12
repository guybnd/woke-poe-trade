import { shallowRef } from 'vue'
import { dockCardOwner } from '../dock/dock'

// The overlay layer (TreeOverlay.vue) registers here, so the dock icon, its
// card and its menu can draw the tree as the hotkey does.
interface TreeDrawer {
  isOn: () => boolean
  // quiet: no note when the tree isn't open. Whether it drew.
  start: (quiet?: boolean) => Promise<boolean>
  stop: () => void
}
let drawer: TreeDrawer | null = null

// Whether the build is drawn on the tree now, for the card and menu.
export const treeOn = shallowRef(false)

// Until it is first used (or the tip closed), the card marks the button New
// and the tree panel shows a one-time tip. Per PC; nothing else depends on it.
const SEEN_KEY = 'woke-tree-overlay-seen'
export const treeOverlaySeen = shallowRef(readSeen())
function readSeen (): boolean {
  try { return localStorage.getItem(SEEN_KEY) === '1' } catch { return true }
}
export function markTreeOverlaySeen () {
  if (treeOverlaySeen.value) return
  treeOverlaySeen.value = true
  try { localStorage.setItem(SEEN_KEY, '1') } catch {}
}

export function registerTreeDrawer (d: TreeDrawer): () => void {
  drawer = d
  return () => { if (drawer === d) drawer = null }
}

// Draws the build over the game's tree, or hides it when it shows.
// Whether the tree is drawn now (or was just hidden).
export async function toggleBuildTree (quiet = false): Promise<boolean> {
  if (!drawer) return false
  if (drawer.isOn()) { drawer.stop(); return true }
  // A dock card or menu over the tree would be in the screenshot.
  dockCardOwner.value = -1
  // Let it close (and fade) before the screen is read.
  await new Promise(resolve => setTimeout(resolve, 200))
  const drew = await drawer.start(quiet)
  if (drew) markTreeOverlaySeen()
  return drew
}
