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
  return await drawer.start(quiet)
}
