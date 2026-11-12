---
title: Download
---

<script setup>
import { useData } from 'vitepress'

const { theme } = useData()
</script>

Download Woke PoE Trade from its <a :href="theme.github.releasesUrl">GitHub releases</a> only. Other mirrors are not
known to the developer, and downloading from them may be unsafe.

| Download link | Automatic updates | Startup time |
|---------------|-------------------|--------------|
| <a :href="`${theme.github.releasesUrl}/download/v${theme.appVersion}/Woke-PoE-Trade-Setup-${theme.appVersion}.exe`">Windows 10+ (installer)</a> | ✔ | Fast |
| <a :href="`${theme.github.releasesUrl}/download/v${theme.appVersion}/Woke-PoE-Trade-${theme.appVersion}-portable.exe`">Windows 10+ (portable)</a> | ❌ | Slower |

Latest version is <span class="bg-gray-100 border rounded px-1">{{ theme.appVersion }}</span>. If the links above don't work yet, take the files from the <a :href="`${theme.github.releasesUrl}/latest`">latest release</a>.

*The app is unsigned, which means you'll have to bypass the security warning on Windows to open it.{:.text-sm}

---

### Requirements

- PoE display mode
  - ✔ Windowed Fullscreen, Windowed
  - ❌ Fullscreen
- PoE language
  - ✔ English, Russian, Korean, Traditional Chinese
  - ❌ Portuguese, Thai, French, German, Spanish
- The price check and settings follow your game's language; the newer tools are in English only for now

No Administrator rights required, but\
⚠ **If you run PoE client as Admin, OS security boundaries take effect.
In order for Woke PoE Trade to have access to the PoE window, it must be started with Administrator rights.**

❌ **Not compatible with "GeForce Now" or any other cloud gaming service that do not forward clipboard data.**
