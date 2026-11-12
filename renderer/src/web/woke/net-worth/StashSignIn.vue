<template>
  <w-setting-section title="Stash reader">
    <w-setting-row label="pathofexile.com" hint="Signs in inside the app. The login stays in the app's own cookie store and is never shown or copied.">
      <span v-if="checking" class="w-dim">Checking…</span>
      <template v-else-if="auth.signedIn">
        <span :class="$style.ok">● Signed in as {{ auth.account }}</span>
        <w-button size="sm" @click="signOut">Sign out</w-button>
      </template>
      <template v-else>
        <span class="w-dim">Not signed in</span>
        <w-button size="sm" variant="primary" :disabled="opening" @click="signIn">{{ opening ? 'Waiting for sign-in…' : 'Sign in' }}</w-button>
      </template>
    </w-setting-row>
  </w-setting-section>
</template>

<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'
import WButton from '../ui/WButton.vue'
import WSettingRow from '../ui/WSettingRow.vue'
import WSettingSection from '../ui/WSettingSection.vue'
import { hostRequest } from '../shared/host'
import type { AuthStatus } from './widget'

const auth = shallowRef<AuthStatus>({ signedIn: false, account: null })
const checking = shallowRef(true)
const opening = shallowRef(false)

onMounted(async () => {
  try {
    auth.value = await hostRequest<AuthStatus>('stash-auth-status', { verify: true })
  } catch {} finally {
    checking.value = false
  }
})

async function signIn () {
  opening.value = true
  try {
    // Waits until the sign-in window closes.
    auth.value = await hostRequest<AuthStatus>('stash-sign-in', null, 30 * 60_000)
  } catch {} finally {
    opening.value = false
  }
}

async function signOut () {
  try { auth.value = await hostRequest<AuthStatus>('stash-sign-out', null) } catch {}
}
</script>

<style module>
.ok { color: var(--w-up); }
</style>
