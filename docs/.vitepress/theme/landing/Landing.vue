<script setup>
// The landing page (index.md, layout: landing): the name, then one item tooltip
// per highlight, built from the game's own frame art, with name plates to step
// through its slides, then a plain list of everything else.
import { reactive } from 'vue'
import { withBase } from 'vitepress'
import { MODULES } from '../../../../renderer/src/web/woke/modules.ts'
import { CREDIT_GROUPS } from '../../../../renderer/src/web/woke/settings/credits.ts'
import { REPO, DOWNLOAD, HIGHLIGHTS } from './content.js'

const shot = (name) => withBase(`/shots/${name}.webp`)

const shown = reactive({})
const current = (h) => shown[h.id] ?? 0
// A plate can be a folder, like one in the stash: picking it opens a row of its
// own plates under the others. It remembers which of them was open.
const inner = reactive({})
const innerAt = (key) => inner[key] ?? 0
const open = (h) => h.slides[current(h)]
const folderKey = (h) => `${h.id}/${current(h)}`
// What is on show: the plate's slide, or the open one in its folder.
const slide = (h) => open(h).folder ? open(h).folder[innerAt(folderKey(h))] : open(h)
// Every picture a highlight can show, folders included, for the stage.
const pictures = (h) => h.slides.flatMap(s => s.folder ?? [s])

const withSlide = new Set(HIGHLIGHTS.flatMap(h => h.slides.map(s => s.module)))
const more = MODULES.filter(m => !withSlide.has(m.id))
</script>

<template>
  <div class="landing">
    <header class="hero">
      <img class="hero-art" :src="shot('hero-plaza')" alt="" width="1720" height="617">
      <div class="hero-text">
        <h1>Woke PoE Trade</h1>
        <p class="lead">trade macro with extra chromosomes</p>
        <p class="facts">An overlay for Path of Exile 1. Free, for Windows 10 and up.</p>
        <p class="actions">
          <a class="btn" :href="DOWNLOAD">Download for Windows</a>
          <a class="btn btn-quiet" :href="REPO">View on GitHub</a>
        </p>
      </div>
    </header>

    <main>
      <section v-for="h in HIGHLIGHTS" :id="h.id" :key="h.id" class="highlight" :aria-labelledby="`${h.id}-title`">
        <div class="item" :class="{ 'with-tray': open(h).folder }">
          <div class="head">
            <i aria-hidden="true"></i>
            <div>
              <h2 :id="`${h.id}-title`">{{ h.name }}</h2>
              <p>{{ h.tag }}</p>
            </div>
            <i aria-hidden="true"></i>
          </div>
          <div class="plates" role="group" :aria-label="`${h.name} slides`">
            <button v-for="(s, i) in h.slides" :key="s.label" type="button" class="plate"
              :class="{ folder: s.folder }" :aria-pressed="i === current(h)"
              :aria-expanded="s.folder ? i === current(h) : undefined" @click="shown[h.id] = i">
              <i aria-hidden="true"></i>
              <span><b v-if="s.folder" class="folder-mark" aria-hidden="true"></b>{{ s.label }}<small v-if="s.folder" class="folder-count">{{ s.folder.length }}</small></span>
              <i aria-hidden="true"></i>
            </button>
          </div>
          <div v-if="open(h).folder" class="plates sub" role="group" :aria-label="open(h).label">
            <button v-for="(s, j) in open(h).folder" :key="s.label" type="button" class="plate"
              :aria-pressed="j === innerAt(folderKey(h))" @click="inner[folderKey(h)] = j">
              <i aria-hidden="true"></i>
              <span>{{ s.label }}</span>
              <i aria-hidden="true"></i>
            </button>
          </div>
          <div class="sep" aria-hidden="true"></div>
          <p class="say" aria-live="polite">{{ slide(h).text }}<button v-if="slide(h).more" type="button" class="say-more" :aria-label="slide(h).more">?<span class="say-card" aria-hidden="true">{{ slide(h).more }}</span></button></p>
          <div class="stage">
            <img v-for="s in pictures(h)" :key="s.shot" :src="shot(s.shot)" :alt="s.alt"
              :class="{ on: s === slide(h) }" :aria-hidden="s !== slide(h)"
              width="2560" height="1440" loading="lazy">
          </div>
        </div>
      </section>

      <section class="highlight" aria-labelledby="more-title">
        <div class="item wide">
          <div class="head">
            <i aria-hidden="true"></i>
            <div><h2 id="more-title">And Many More</h2></div>
            <i aria-hidden="true"></i>
          </div>
          <ul class="more">
            <li v-for="m in more" :key="m.id"><b>{{ m.name }}</b>{{ m.description }}</li>
          </ul>
          <div class="sep" aria-hidden="true"></div>
          <p class="end">Switch off any tool and it doesn't load, take hotkeys or poll.</p>
          <p class="end"><a class="btn" :href="DOWNLOAD">Download for Windows</a></p>
        </div>
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
  --unique: #af6025;
  --unique-on: #e8924a;
  --magic: #8888ff;
  --title: #e0c78f;
  --text: #e8dcc2;
  --dim: #b0a48e;
  --edge: #6b4a24;
  --link: #e8c47a;
  --caps: 'Fontin SmallCaps', Georgia, serif;
  min-height: 100vh;
  /* Empty stash panel from the game, tiled. */
  background: var(--ground) url('./stone.jpg');
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
.btn-quiet { background: rgba(7, 6, 5, 0.6); color: var(--link) !important; }
.btn-quiet:hover { background: rgba(7, 6, 5, 0.85); color: #fff3cf !important; }
.actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; }

/* ---------- hero ---------- */
.hero { position: relative; overflow: hidden; background: var(--ground); }
.hero-art { display: block; width: 100%; height: 620px; object-fit: cover; object-position: center top; opacity: 0.7; }
.hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(rgba(7, 6, 5, 0.25), rgba(7, 6, 5, 0.45) 55%, var(--ground));
}
.hero-text {
  z-index: 1;
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

/* ---------- a highlight: an item tooltip, frame art from the game ---------- */
.highlight { padding: 20px 16px; }
/* --chrome is everything in a highlight's screen but the shot, so the name, the
   plates and the shot fit in one window. The shot never goes above 1280x720,
   well under its real size, so it stays sharp. */
.item {
  --chrome: 180px;
  --h: min(720px, max(280px, calc(100vh - var(--chrome) - var(--tray, 0px))));
  display: flex;
  flex-direction: column;
  width: min(calc(var(--h) * 16 / 9), 100%);
  margin: 0 auto;
  background: rgba(0, 0, 0, 0.93);
  border: 1px solid var(--unique);
  box-shadow: 0 0 30px #000;
}
/* The plates wrap to two rows here. */
@media (max-width: 1180px), (max-height: 830px) { .item { --chrome: 220px; } }
/* And the caption to two lines. */
@media (max-width: 860px), (max-height: 680px) { .item { --chrome: 246px; } }
/* And Path of Building's many plates to three rows. */
@media (max-height: 600px) { .item { --chrome: 290px; } }
/* An open folder's row of plates. */
.item.with-tray { --tray: 44px; }
/* It wraps to two rows here. */
@media (max-width: 1000px) { .item.with-tray { --tray: 78px; } }
.item.wide { width: min(1280px, 100%); }

.head { display: flex; flex: none; height: 54px; }
.head i { flex: none; width: 44px; background: no-repeat; }
.head i:first-child { background-image: url('../../../../renderer/public/images/item-frame/header-double-unique-left.png'); }
.head i:last-child { background-image: url('../../../../renderer/public/images/item-frame/header-double-unique-right.png'); }
.head > div {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: url('../../../../renderer/public/images/item-frame/header-double-unique-middle.png') repeat-x;
  color: var(--unique);
  white-space: nowrap;
}
.head h2 { font: 24px/25px var(--caps); }
.head p { font: 16px/19px var(--caps); }

.plates { display: flex; flex: none; flex-wrap: wrap; justify-content: center; gap: 2px; padding: 6px 6px 2px; }
.plate { display: flex; height: 34px; padding: 0; border: 0; background: none; color: #c8c8c8; font: 16px var(--caps); white-space: nowrap; cursor: pointer; }
.plate i { flex: none; width: 24px; background: no-repeat; }
.plate i:first-child { background-image: url('../../../../renderer/public/images/item-frame/header-normal-left.png'); }
.plate i:last-child { background-image: url('../../../../renderer/public/images/item-frame/header-normal-right.png'); background-position: right; }
.plate span { display: flex; align-items: center; padding: 0 2px; background: url('../../../../renderer/public/images/item-frame/header-normal-middle.png') repeat-x; }
.plate:hover { color: #fff; }
.plate[aria-pressed='true'] { color: var(--unique-on); }
.plate[aria-pressed='true'] i:first-child { background-image: url('../../../../renderer/public/images/item-frame/header-unique-left.png'); }
.plate[aria-pressed='true'] i:last-child { background-image: url('../../../../renderer/public/images/item-frame/header-unique-right.png'); }
.plate[aria-pressed='true'] span { background-image: url('../../../../renderer/public/images/item-frame/header-unique-middle.png'); }

/* A folder plate: a small folder drawn before the name, the count after. */
.folder-mark { position: relative; flex: none; width: 13px; height: 10px; margin: 2px 6px 0 2px; border: 1.5px solid currentColor; border-radius: 1px; }
.folder-mark::before { content: ''; position: absolute; left: -1.5px; top: -4px; width: 5px; height: 2px; border: 1.5px solid currentColor; border-bottom: 0; border-radius: 1px 1px 0 0; }
.folder-count { margin-left: 6px; font-size: 13px; color: var(--dim); }
.plate[aria-pressed='true'] .folder-count { color: var(--unique); }
/* Its row: smaller plates in a tray hung from the row above, like an open
   stash folder. */
.plates.sub { margin: 4px 14px 2px; padding: 5px 6px 4px; border: 1px solid #4a3218; border-top-color: var(--unique); background: linear-gradient(rgba(175, 96, 37, 0.12), transparent 70%); }
.plates.sub .plate { height: 28px; font-size: 14.5px; }
.plates.sub .plate i { width: 20px; background-size: auto 28px; }
.plates.sub .plate span { background-size: auto 28px; }

.sep { flex: none; height: 8px; background: url('../../../../renderer/public/images/item-frame/separator-unique.png') center no-repeat; }

.say { position: relative; flex: none; min-height: 30px; padding: 2px 12px; color: var(--magic); font-size: 17px; line-height: 26px; text-align: center; }
@media (max-width: 860px), (max-height: 680px) { .say { min-height: 56px; } }
@media (max-width: 480px) { .say { min-height: 82px; } }
.say-more { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; margin-left: 8px; vertical-align: 1px; padding: 0; background: none; border: 1px solid currentColor; border-radius: 50%; color: var(--dim); font-size: 12px; line-height: 1; cursor: help; }
.say-more:hover, .say-more:focus-visible { color: var(--title); outline: none; }
.say-card { display: none; position: absolute; z-index: 5; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%); width: min(300px, 76vw); padding: 8px 10px; background: var(--ground); border: 1px solid var(--unique); color: var(--text); font-size: 14px; line-height: 1.45; text-align: left; }
.say-more:hover .say-card, .say-more:focus .say-card { display: block; }

.stage { position: relative; width: 100%; aspect-ratio: 16 / 9; border-top: 1px solid #3a2412; background: #000; }
.stage img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; pointer-events: none; transition: opacity 250ms ease; }
.stage img.on { opacity: 1; pointer-events: auto; }

/* ---------- and many more ---------- */
.more { columns: 2; column-gap: 48px; padding: 18px 28px 6px; }
.more li { break-inside: avoid; margin-bottom: 14px; }
.more b { display: block; font: 21px var(--caps); color: var(--text); }
.end { text-align: center; padding: 10px 16px; }
.end:last-child { padding-bottom: 22px; }

/* ---------- credits ---------- */
.credits { max-width: 1040px; margin: 52px auto 0; padding: 0 16px; font-size: 15px; text-align: center; }
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
  .more { columns: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .stage img { transition: none; }
}
</style>
