<template>
  <div class="max-w-xl p-2 flex flex-col gap-3">
    <SearchGroups v-model="groups" :done="false" />
  </div>
</template>

<script lang="ts">
// Settings > Search: which result groups the palette shows (the same list as its cog).
import { computed, defineComponent } from 'vue'
import { configProp } from '@/web/settings/utils'
import SearchGroups from './SearchGroups.vue'
import type { GroupMode } from './groups'
import type { SearchWidget } from './widget'

export default defineComponent({
  name: 'Search',
  components: { SearchGroups },
  props: configProp<SearchWidget>(),
  setup (props) {
    return {
      groups: computed({
        get: () => props.configWidget.groups ?? {},
        set: (v: Record<string, GroupMode>) => { props.configWidget.groups = Object.keys(v).length ? v : undefined }
      })
    }
  }
})
</script>
