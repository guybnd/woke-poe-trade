<template>
  <span :class="[$style.icon, $style[node.kind]]" :style="box" aria-hidden="true">
    <span v-if="sprite" :class="$style.art" :style="sprite" />
  </span>
</template>

<script setup lang="ts">
// A passive's own art from the tree's sprite sheet, at a list's size.
import { computed } from 'vue'
import { passiveTreeArt } from './passive-tree'
import type { TreeNode } from './passive-tree'

const props = withDefaults(defineProps<{ node: TreeNode, size?: number }>(), { size: 20 })

const SHEETS = ['notableActive', 'keystoneActive', 'normalActive']

const box = computed(() => ({ width: `${props.size}px`, height: `${props.size}px` }))

const sprite = computed(() => {
  const art = passiveTreeArt()
  if (!art || !props.node.icon) return null
  const order = props.node.kind === 'key' ? ['keystoneActive', ...SHEETS] : props.node.kind === 'small' ? ['normalActive', ...SHEETS] : SHEETS
  for (const kind of order) {
    const sheet = art.sprites[kind]
    const c = sheet?.coords[props.node.icon]
    if (!c) continue
    return {
      width: `${c[2]}px`,
      height: `${c[3]}px`,
      backgroundImage: `url("${sheet.url}")`,
      backgroundPosition: `-${c[0]}px -${c[1]}px`,
      zoom: String(props.size / Math.max(c[2], c[3]))
    }
  }
  return null
})
</script>

<style module>
.icon {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 50%;
  background: var(--w-panel-2);
  box-shadow: 0 0 0 1px var(--w-line);
  vertical-align: middle;
}
.notable, .jewel { box-shadow: 0 0 0 1px #b49a5e; }
.key { box-shadow: 0 0 0 1px #d8b867; }
.asc, .ascstart { box-shadow: 0 0 0 1px #c9a45a; }
.art { display: block; background-repeat: no-repeat; flex: none; }
</style>
