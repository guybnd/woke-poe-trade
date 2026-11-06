<script setup>
// The landing page (index.md, layout: landing): the name, then one full-width
// picture per highlight with gem sockets to step through its slides, then a
// plain list of everything else.
import { reactive } from 'vue'
import { withBase } from 'vitepress'
import { MODULES } from '../../../../renderer/src/web/woke/modules.ts'
import { CREDIT_GROUPS } from '../../../../renderer/src/web/woke/settings/credits.ts'
import { REPO, DOWNLOAD, HIGHLIGHTS } from './content.js'

const shot = (name) => withBase(`/shots/${name}.webp`)

const shown = reactive({})
const current = (h) => shown[h.id] ?? 0

const COLOURS = ['red', 'green', 'blue', 'white']
const colourOf = (i) => COLOURS[i % COLOURS.length]

const withSlide = new Set(HIGHLIGHTS.flatMap(h => h.slides.map(s => s.module)))
const more = MODULES.filter(m => !withSlide.has(m.id))
</script>

<template>
  <div class="landing">
    <header class="hero">
      <img class="hero-art" :src="shot('tour-market')" alt="" width="1600" height="900">
      <div class="hero-text">
        <h1>Woke PoE Trade</h1>
        <p class="lead">Your toolkit, in the game.</p>
        <p class="facts">An overlay for Path of Exile 1. Free, for Windows 10 and up.</p>
        <a class="btn" :href="DOWNLOAD">Download for Windows</a>
      </div>
    </header>

    <main>
      <section v-for="h in HIGHLIGHTS" :id="h.id" :key="h.id" class="highlight" :aria-labelledby="`${h.id}-title`">
        <div class="head">
          <h2 :id="`${h.id}-title`">{{ h.name }}</h2>
          <p>{{ h.tag }}</p>
        </div>
        <div class="stage">
          <img v-for="(s, i) in h.slides" :key="s.shot" :src="shot(s.shot)" :alt="s.alt"
            :class="{ on: i === current(h) }" :aria-hidden="i !== current(h)"
            width="1600" height="900" loading="lazy">
        </div>
        <div class="under">
          <p class="say" aria-live="polite">{{ h.slides[current(h)].text }}</p>
          <div class="sockets" role="group" :aria-label="`${h.name} slides`">
            <button v-for="(s, i) in h.slides" :key="s.label" type="button" class="socket"
              :aria-pressed="i === current(h)" @click="shown[h.id] = i">
              <span class="gem" :class="colourOf(i)" aria-hidden="true"></span>
              <span>{{ s.label }}</span>
            </button>
          </div>
        </div>
      </section>

      <section class="highlight" aria-labelledby="more-title">
        <div class="head"><h2 id="more-title">And Many More</h2></div>
        <ul class="more">
          <li v-for="m in more" :key="m.id"><b>{{ m.name }}</b>{{ m.description }}</li>
        </ul>
        <p class="end">Switch off any tool and it doesn't load, take hotkeys or poll.</p>
        <p class="end"><a class="btn" :href="DOWNLOAD">Download for Windows</a></p>
      </section>
    </main>

    <section class="credits" aria-labelledby="credits-title">
      <h2 id="credits-title">Credits</h2>
      <p v-for="g in CREDIT_GROUPS" :key="g.id">
        <b>{{ g.title }}:</b>
        <template v-for="(c, i) in g.credits" :key="c.name">
          {{ ' ' }}<a :href="c.url">{{ c.name }}</a>{{ i < g.credits.length - 1 ? ',' : '' }}
        </template>
      </p>
    </section>

    <footer class="foot">
      <span>Built on <a href="https://github.com/SnosMe/awakened-poe-trade">Awakened PoE Trade</a> by SnosMe. Not affiliated with or endorsed by Grinding Gear Games.</span>
      <span class="foot-links">
        <a :href="withBase('/quick-start')">Help</a>
        <a :href="withBase('/faq')">FAQ</a>
        <a :href="REPO">GitHub</a>
        <a :href="`${REPO}/blob/master/LICENSE`">MIT licence</a>
      </span>
    </footer>
  </div>
</template>

<style>
/* The game's own type, as the overlay ships it. */
@font-face { font-family: 'Fontin SmallCaps'; src: url('../../../../renderer/src/assets/font/Fontin-SmallCaps-Hinted.ttf') format('truetype'); font-display: swap; }
@font-face { font-family: 'Fontin'; src: url('../../../../renderer/src/assets/font/Fontin-Regular-Hinted.ttf') format('truetype'); font-display: swap; }
@font-face { font-family: 'Fontin'; font-style: italic; src: url('../../../../renderer/src/assets/font/Fontin-Italic-Hinted.ttf') format('truetype'); font-display: swap; }
</style>

<style scoped>
.landing {
  --ground: #070605;
  --title: #e0c78f;
  --text: #e8dcc2;
  --dim: #b0a48e;
  --edge: #6b4a24;
  --link: #e8c47a;
  --caps: 'Fontin SmallCaps', Georgia, serif;
  min-height: 100vh;
  background: var(--ground);
  color: var(--dim);
  font: 19px/1.4 'Fontin', Georgia, serif;
  overflow-x: clip;
  color-scheme: dark;
}
.landing a { color: var(--link); }
.landing a:hover { color: #fff3cf; }
.landing :focus-visible { outline: 3px solid var(--link); outline-offset: 3px; }
:where(.landing) :where(h1, h2, p, ul) { margin: 0; padding: 0; }
:where(.landing) :where(ul) { list-style: none; }

.btn {
  display: inline-block;
  padding: 12px 28px;
  border: 1px solid var(--link);
  background: linear-gradient(#a8742f, #7a4f1c);
  color: #1a0f05 !important;
  font: 21px var(--caps);
  text-decoration: none;
}
.btn:hover { background: linear-gradient(#c28a3b, #8c5c22); }

/* ---------- hero ---------- */
.hero { position: relative; overflow: hidden; }
.hero-art { display: block; width: 100%; height: 620px; object-fit: cover; object-position: center top; opacity: 0.42; }
.hero-text {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px;
  text-align: center;
}
.hero h1 { font: 92px/1 var(--caps); color: var(--title); text-shadow: 0 2px 18px #000; }
.lead { font-size: 26px; font-style: italic; color: var(--text); text-shadow: 0 1px 8px #000; }
.facts { color: var(--text); text-shadow: 0 1px 8px #000; margin-bottom: 8px; }

/* ---------- a highlight ---------- */
.highlight { padding-top: 72px; }
.head { text-align: center; padding: 0 16px 26px; }
.head h2 { font: 54px/1.05 var(--caps); color: var(--title); }
.head p { font-style: italic; font-size: 22px; }
/* As wide as the page, but never taller than the window: a shot is no use cropped. */
.stage {
  position: relative;
  width: min(100%, 160vh);
  margin: 0 auto;
  aspect-ratio: 16 / 9;
  background: #0a0907;
}
.stage img { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; pointer-events: none; transition: opacity 250ms ease; }
.stage img.on { opacity: 1; pointer-events: auto; }
.under { display: flex; flex-direction: column; align-items: center; gap: 14px; max-width: 900px; margin: 0 auto; padding: 22px 16px 0; text-align: center; }
.say { color: var(--text); min-height: 56px; }

/* ---------- the slide buttons: linked gem sockets ---------- */
.sockets { display: flex; justify-content: center; flex-wrap: wrap; }
.socket {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 112px;
  min-height: 66px;
  padding: 0 2px;
  border: 0;
  background: none;
  color: #a2967f;
  font: 15px/1.15 var(--caps);
  cursor: pointer;
}
.socket:hover { color: #f1e6cd; }
.socket[aria-pressed='true'] { color: #fff3cf; }
/* The link to the socket before it. */
.socket + .socket::before {
  content: '';
  position: absolute;
  top: 12px;
  right: calc(50% + 15px);
  width: calc(100% - 30px);
  height: 6px;
  background: linear-gradient(#8a5f2d, #4a3218);
}
.gem {
  width: 30px;
  height: 30px;
  box-sizing: border-box;
  border-radius: 50%;
  border: 3px solid #2a2118;
  box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.9);
  opacity: 0.6;
}
.socket:hover .gem { opacity: 0.85; }
.socket[aria-pressed='true'] .gem { opacity: 1; border-color: var(--link); box-shadow: 0 0 14px rgba(255, 240, 190, 0.6), inset 0 0 6px rgba(0, 0, 0, 0.5); }
.red { background: #c0392f; }
.green { background: #4f9e3f; }
.blue { background: #3f6fc4; }
.white { background: #d8d4c8; }

/* ---------- and many more ---------- */
.more { columns: 2; column-gap: 48px; max-width: 1040px; margin: 0 auto; padding: 0 16px; }
.more li { break-inside: avoid; margin-bottom: 14px; }
.more b { display: block; font: 21px var(--caps); color: var(--text); }
.end { text-align: center; padding: 28px 16px 0; }

/* ---------- credits ---------- */
.credits { max-width: 1040px; margin: 72px auto 0; padding: 0 16px; font-size: 15px; text-align: center; }
.credits h2 { font: 24px var(--caps); color: var(--title); margin-bottom: 10px; }
.credits p { margin-bottom: 8px; }
.credits b { font-weight: 400; color: var(--text); }

/* ---------- footer ---------- */
.foot {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 10px 24px;
  margin-top: 40px;
  padding: 24px 16px;
  border-top: 1px solid var(--edge);
  font-size: 15px;
}
.foot-links { display: flex; flex-wrap: wrap; gap: 6px 18px; }

@media (max-width: 860px) {
  .hero h1 { font-size: 54px; }
  .hero-art { height: 480px; }
  .head h2 { font-size: 38px; }
  .highlight { padding-top: 56px; }
  .more { columns: 1; }
  /* Sockets wrap here, so their links would point at nothing. */
  .socket + .socket::before { display: none; }
  .socket { width: 66px; padding: 0; font-size: 13px; }
}
@media (prefers-reduced-motion: reduce) {
  .stage img { transition: none; }
}
</style>
