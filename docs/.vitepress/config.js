import { defineConfig } from 'vitepress'
import { readFileSync } from 'node:fs'
import { makePhoneShots } from '../scripts/phone-shots.mjs'

// The app's version, so download links name the right files.
const APP_VERSION = JSON.parse(readFileSync(new URL('../../main/package.json', import.meta.url), 'utf8')).version
const REPO = 'https://github.com/guybnd/woke-poe-trade'

const BASE = '/woke-poe-trade/'

// The landing page's phone crops and 1280px copies of its shots (not in git).
await makePhoneShots()

export default defineConfig({
  title: 'Woke PoE Trade',
  description: 'An overlay for Path of Exile 1: price check, maps, profit and trading, without leaving the game',
  base: BASE,
  // Not MPA: the landing page's story and presets need Vue running in the browser.
  mpa: false,
  // The landing page reads the module list from the app (renderer/).
  vite: { server: { fs: { allow: ['..'] } } },
  head: [
    ['link', { rel: 'shortcut icon', type: 'image/png', href: `${BASE}favicon.png` }],
    ['meta', { name: 'theme-color', content: '#0d0b09' }],
    ['meta', { property: 'og:image', content: `https://guybnd.github.io${BASE}shots/readme-banner.webp` }]
  ],
  markdown: {
    theme: 'light-plus',
    attrs: {
      leftDelimiter: '{:',
      rightDelimiter: '}'
    }
  },
  themeConfig: {
    // logo: 'TODO', https://github.com/vuejs/vitepress/issues/1401
    appVersion: APP_VERSION,
    github: {
      releasesUrl: `${REPO}/releases`
    },
    socialLinks: [
      {
        text: 'Home',
        color: '#8a6420',
        link: BASE
      },
      {
        text: 'GitHub',
        color: '#181717',
        link: REPO
      }
    ],
    sidebar: [
      {
        items: [{
          text: 'Download',
          link: '/download'
        }, {
          text: 'Quick Start',
          link: '/quick-start'
        }, {
          text: 'Tools',
          link: '/tools'
        }]
      },
      {
        items: [{
          text: 'Chat commands',
          link: '/chat-commands'
        }, {
          text: 'OCR Guide',
          link: '/ocr-guide'
        }]
      },
      {
        items: [{
          text: 'Common issues',
          link: '/issues'
        }, {
          text: 'FAQ',
          link: '/faq'
        }]
      }
    ]
  }
})
