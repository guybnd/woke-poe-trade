import { shallowRef } from 'vue'

// The atlas tree drawing (AtlasOverlay.vue) registers here, so the tree
// hotkey (TreeOverlay.vue) can draw the selected atlas strategy when the
// game's atlas tree is open rather than the passive tree.
export interface AtlasDrawer {
  isOn: () => boolean
  // A strategy with a tree is selected: there's something to draw.
  ready: () => boolean
  // quiet: no note when the atlas tree isn't open. Whether it drew.
  start: (quiet?: boolean) => Promise<boolean>
  stop: () => void
}
let drawer: AtlasDrawer | null = null

// Whether the strategy is drawn on the atlas tree now.
export const atlasOn = shallowRef(false)

export function registerAtlasDrawer (d: AtlasDrawer): () => void {
  drawer = d
  return () => { if (drawer === d) drawer = null }
}

export function atlasDrawer (): AtlasDrawer | null {
  return drawer
}
