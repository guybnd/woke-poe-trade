// The stash reader's switch under Settings > Modules > Economy (StashReaderRow).
import { shallowRef } from 'vue'

// The switch's steps: turning on asks first (Cancel / Turn on), turning off
// doesn't. `setOn` is personal.ts's setStashReaderOn.
export function stashSwitch (setOn: (on: boolean) => Promise<void>) {
  const asking = shallowRef(false)
  const busy = shallowRef(false)
  const error = shallowRef<string | null>(null)

  async function run (fn: () => Promise<void>) {
    busy.value = true
    error.value = null
    try {
      await fn()
    } catch {
      error.value = "Couldn't change the stash reader. Try again."
    } finally {
      busy.value = false
    }
  }

  return {
    asking,
    busy,
    error,
    run,
    async flip (on: boolean) {
      if (busy.value) return
      if (on) {
        asking.value = true
        return
      }
      if (asking.value) {
        asking.value = false
        return
      }
      await run(async () => { await setOn(false) })
    },
    cancel () { asking.value = false },
    async confirm () {
      if (busy.value || !asking.value) return
      await run(async () => {
        await setOn(true)
        asking.value = false
      })
    }
  }
}

export const COPY = {
  confirmTitle: 'Turn on the stash reader?',
  confirmBody: "It uses a pathofexile.com page GGG doesn't support for tools. Their terms don't allow it. No bans are known, but it can stop working any time. Your login stays in the app and is never shared.",
  descOff: 'Reads your stash tabs. Unofficial, see the note when you turn it on.',
  descOn: 'Reads your stash tabs. Unofficial.'
}
