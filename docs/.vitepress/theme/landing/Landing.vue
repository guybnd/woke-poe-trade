<script setup>
// The landing page (index.md, layout: landing): the name, then one item tooltip
// per highlight, built from the game's own frame art, with name plates to step
// through its slides and a strip of their pictures under the shot, then a plain
// list of everything else. A slide with a `clip` plays it over its still.
import { reactive, ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { withBase } from 'vitepress'
import { MODULES } from '../../../../renderer/src/web/woke/modules.ts'
import { CREDIT_GROUPS } from '../../../../renderer/src/web/woke/settings/credits.ts'
import { REPO, DOWNLOAD, HIGHLIGHTS } from './content.js'

const shot = (name) => withBase(`/shots/${name}.webp`)
// Made by docs/scripts/phone-shots.mjs: the shot at 1280px wide, and the 4:5
// crop on its `focus` that phones show.
const sized = (name) => withBase(`/shots/1280/${name}.webp`)
const phoneShot = (name) => withBase(`/shots/phone/${name}.webp`)
const thumb = (name) => withBase(`/shots/thumb/${name}.webp`)
const clipFile = (name, ext) => withBase(`/clips/${name}.${ext}`)

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
// A plate's picture in the strip: a folder shows its open slide.
const thumbOf = (h, i) => h.slides[i].folder ? h.slides[i].folder[innerAt(`${h.id}/${i}`)] : h.slides[i]

// Clips: none in the page as built, and none for visitors who turned motion
// off, who get the still. Only the clip on show in a highlight that is on
// screen plays; it starts over each time its slide is picked.
const motion = ref(false)
const onScreen = new Set()
let watcher = null
function playClips () {
  for (const v of document.querySelectorAll('.landing .stage video')) {
    const want = v.classList.contains('on') && onScreen.has(v.closest('section')?.id)
    if (want && v.paused) v.play().catch(() => {})
    else if (!want && !v.paused) v.pause()
  }
}
// On a phone the clip fills the 4:5 crop where the still's crop is. For
// object-fit: cover, p% puts the left edge at p * (video width - shown width):
// a 16:9 clip in a 4:5 box shows 0.45 of its width, so a crop centred at c
// (a fraction of the width) needs p = (c - 0.225) / 0.55.
const clipAt = (s) => {
  const c = s.focus ? (s.focus[0] + s.focus[2] / 2) / 2560 : 0.5
  return `${Math.round(Math.max(0, Math.min(1, (c - 0.225) / 0.55)) * 1000) / 10}% 50%`
}
// The clip shows once it plays, fading over its still, so a slow load or its
// first frame never flashes a blank stage.
const playing = reactive({})

// Picking a plate, or a plate in the open folder (j).
function go (h, i, j = -1) {
  shown[h.id] = i
  if (j >= 0) inner[`${h.id}/${i}`] = j
  tip.value = null
  nextTick(() => {
    reveal(h)
    const v = document.querySelector(`#${h.id} .stage video.on`)
    if (v) v.currentTime = 0
    playClips()
  })
}
// Every slide in order, folders opened, for swiping through them.
const steps = (h) => h.slides.flatMap((s, i) => s.folder ? s.folder.map((_, j) => [i, j]) : [[i, -1]])
function step (h, by) {
  const all = steps(h)
  const at = all.findIndex(([i, j]) => i === current(h) && (j < 0 || j === innerAt(`${h.id}/${i}`)))
  const to = all[at + by]
  if (to) go(h, ...to)
}
// A swipe on the picture: a mostly sideways drag of 40px or more.
let touch = null
function touchStart (e) {
  const t = e.changedTouches[0]
  touch = { x: t.clientX, y: t.clientY }
}
function touchEnd (h, e) {
  if (!touch) return
  const t = e.changedTouches[0]
  const dx = t.clientX - touch.x
  const dy = t.clientY - touch.y
  touch = null
  if (Math.abs(dx) >= 40 && Math.abs(dx) > 2 * Math.abs(dy)) step(h, dx < 0 ? 1 : -1)
}
// On a phone the plates are one row that scrolls sideways: bring the picked one
// to the middle of it.
function reveal (h) {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
  for (const row of document.querySelectorAll(`#${h.id} .plates`)) {
    const on = row.querySelector('[aria-pressed="true"]')
    if (!on || row.scrollWidth <= row.clientWidth) continue
    row.scrollTo({ left: on.offsetLeft - (row.clientWidth - on.offsetWidth) / 2, behavior: still ? 'auto' : 'smooth' })
  }
}

// The "?" card beside a caption opens on a tap too, not only on hover.
const tip = ref(null)
// A press anywhere but on a "?" closes it. pointerdown, as iOS Safari doesn't
// pass taps on plain text up to a document click listener.
const closeTip = (e) => { if (!e.target.closest?.('.say-more')) tip.value = null }
const onKey = (e) => { if (e.key === 'Escape') tip.value = null }
onMounted(() => {
  document.addEventListener('pointerdown', closeTip)
  document.addEventListener('keydown', onKey)
  motion.value = !matchMedia('(prefers-reduced-motion: reduce)').matches
  watcher = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) onScreen.add(e.target.id)
      else onScreen.delete(e.target.id)
    }
    playClips()
  }, { threshold: 0.35 })
  for (const el of document.querySelectorAll('.landing section.highlight[id]')) watcher.observe(el)
  nextTick(playClips)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', closeTip)
  document.removeEventListener('keydown', onKey)
  watcher?.disconnect()
})

// Phones show a crop: "Whole screen" opens the full shot over the page.
const viewer = ref(null)
const viewing = ref(null)
function view (s) {
  viewing.value = s
  viewer.value.showModal()
}

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
        <p class="phone-note">On a phone? Open this page on your PC to install.</p>
      </div>
    </header>

    <main>
      <section v-for="h in HIGHLIGHTS" :id="h.id" :key="h.id" class="highlight" :aria-labelledby="`${h.id}-title`">
        <div class="item" :class="{ 'with-tray': open(h).folder, 'with-strip': h.slides.length > 1 }">
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
              :aria-expanded="s.folder ? i === current(h) : undefined" @click="go(h, i)">
              <i aria-hidden="true"></i>
              <span><b v-if="s.folder" class="folder-mark" aria-hidden="true"></b>{{ s.label }}<small v-if="s.folder" class="folder-count">{{ s.folder.length }}</small></span>
              <i aria-hidden="true"></i>
            </button>
          </div>
          <div v-if="open(h).folder" class="plates sub" role="group" :aria-label="open(h).label">
            <button v-for="(s, j) in open(h).folder" :key="s.label" type="button" class="plate"
              :aria-pressed="j === innerAt(folderKey(h))" @click="go(h, current(h), j)">
              <i aria-hidden="true"></i>
              <span>{{ s.label }}</span>
              <i aria-hidden="true"></i>
            </button>
          </div>
          <div class="sep" aria-hidden="true"></div>
          <p class="say" aria-live="polite">{{ slide(h).text }}<button v-if="slide(h).more" type="button" class="say-more" :class="{ open: tip === h.id }" :aria-label="slide(h).more" :aria-expanded="tip === h.id" @click.stop="tip = tip === h.id ? null : h.id">?<span class="say-card" aria-hidden="true">{{ slide(h).more }}</span></button></p>
          <div class="stage" @touchstart.passive="touchStart" @touchend.passive="touchEnd(h, $event)">
            <template v-for="s in pictures(h)" :key="s.shot">
              <picture :class="{ on: s === slide(h) }" :aria-hidden="s !== slide(h)">
                <source media="(max-width: 600px)" :srcset="phoneShot(s.shot)" width="720" height="900">
                <img :src="sized(s.shot)" :srcset="`${sized(s.shot)} 1280w, ${shot(s.shot)} 2560w`"
                  sizes="(max-width: 1312px) calc(100vw - 34px), 1280px" :alt="s.alt"
                  width="2560" height="1440" loading="lazy">
              </picture>
              <video v-if="motion && s.clip" :class="{ on: s === slide(h), playing: playing[s.clip] }" :style="{ objectPosition: clipAt(s) }"
                muted loop playsinline disablepictureinpicture preload="none" aria-hidden="true"
                @playing="playing[s.clip] = true">
                <source :src="clipFile(s.clip, 'webm')" type="video/webm">
                <source :src="clipFile(s.clip, 'mp4')" type="video/mp4">
              </video>
            </template>
            <button type="button" class="whole" @click="view(slide(h))">
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" /></svg>Whole screen
            </button>
          </div>
          <!-- The plates above already name these, for keyboards and screen readers. -->
          <div v-if="h.slides.length > 1" class="strip" aria-hidden="true">
            <button v-for="(s, i) in h.slides" :key="s.label" type="button" class="thumb" tabindex="-1"
              :class="{ clip: thumbOf(h, i).clip }" :aria-pressed="i === current(h)" :title="s.label" @click="go(h, i)">
              <img :src="thumb(thumbOf(h, i).shot)" alt="" width="320" height="180" loading="lazy">
            </button>
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
          <p class="end phone-note">On a phone? Open this page on your PC to install.</p>
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

    <dialog ref="viewer" class="viewer" aria-label="Whole screen" @click.self="viewer.close()" @close="viewing = null">
      <img v-if="viewing" :src="shot(viewing.shot)" :alt="viewing.alt" width="2560" height="1440">
      <p>Turn your phone sideways or pinch to zoom.</p>
      <button type="button" class="viewer-close" aria-label="Close" @click="viewer.close()">×</button>
    </dialog>

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
  --h: min(720px, max(280px, calc(100vh - var(--chrome) - var(--tray, 0px) - var(--strip, 0px))));
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
/* The strip of pictures under the shot. */
.item.with-strip { --strip: 84px; }

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

.plates { position: relative; display: flex; flex: none; flex-wrap: wrap; justify-content: center; gap: 2px; padding: 6px 6px 2px; }
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
.say-more.open .say-card, .say-more:focus-visible .say-card { display: block; }
@media (hover: hover) { .say-more:hover .say-card { display: block; } }

.stage { position: relative; width: 100%; aspect-ratio: 16 / 9; border-top: 1px solid #3a2412; background: #000; }
.stage picture { position: absolute; inset: 0; opacity: 0; pointer-events: none; transition: opacity 250ms ease; }
.stage picture.on { opacity: 1; pointer-events: auto; }
.stage video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; pointer-events: none; transition: opacity 250ms ease; }
.stage video.on.playing { opacity: 1; }

/* The strip: every slide's picture under the shot, as the plates above are
   its names, so it shows there is more to see. A clip's has a play mark. */
.strip { display: flex; flex: none; gap: 6px; padding: 7px 8px; overflow-x: auto; scrollbar-width: none; border-top: 1px solid #3a2412; background: #000; }
.strip::-webkit-scrollbar { display: none; }
.strip > :first-child { margin-left: auto; }
.strip > :last-child { margin-right: auto; }
.thumb { position: relative; flex: 0 1 116px; min-width: 76px; aspect-ratio: 16 / 9; padding: 0; border: 1px solid #3a2412; background: #000; opacity: 0.55; cursor: pointer; transition: opacity 150ms ease; }
.thumb img { display: block; width: 100%; height: 100%; object-fit: cover; }
.thumb:hover { opacity: 0.85; }
.thumb[aria-pressed='true'] { opacity: 1; border-color: var(--unique-on); box-shadow: 0 0 0 1px var(--unique-on); }
.thumb.clip::after { content: ''; position: absolute; right: 5px; bottom: 5px; border-style: solid; border-width: 6px 0 6px 10px; border-color: transparent transparent transparent #fff; filter: drop-shadow(0 0 2px #000); }
.stage img { display: block; width: 100%; height: 100%; object-fit: cover; }
/* Phones only: the crop's way back to the whole shot. */
.whole { display: none; position: absolute; right: 8px; bottom: 8px; align-items: center; gap: 7px; min-height: 36px; padding: 0 12px; background: rgba(7, 6, 5, 0.85); border: 1px solid var(--unique); color: var(--text); font: 15px var(--caps); cursor: pointer; }
.whole svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.6; }
/* Its window: the whole shot, as big as the screen allows. */
.viewer { width: 100vw; height: 100dvh; max-width: none; max-height: none; margin: 0; padding: 0; border: 0; background: rgba(0, 0, 0, 0.94); color: var(--dim); }
.viewer[open] { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; }
.viewer::backdrop { background: #000; }
.viewer img { display: block; max-width: 100%; max-height: calc(100dvh - 90px); object-fit: contain; }
.viewer p { padding: 0 16px; font-size: 15px; text-align: center; }
.viewer-close { position: absolute; top: max(8px, env(safe-area-inset-top)); right: max(8px, env(safe-area-inset-right)); width: 44px; height: 44px; padding: 0; background: none; border: 0; color: var(--text); font: 32px/1 'Fontin', Georgia, serif; cursor: pointer; }
.phone-note { display: none; }

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
/* Phones held upright. Landscape phones are wide enough for the layout above. */
@media (max-width: 600px) {
  .hero-art { height: 430px; }
  .hero h1 { font-size: 46px; }
  .lead { font-size: 21px; }
  /* Plates: one row that slides sideways, like the stash's tab row, faded at the
     edge so it shows there's more. Thumb-sized. */
  .plates { flex-wrap: nowrap; justify-content: flex-start; overflow-x: auto; overscroll-behavior-x: contain; scrollbar-width: none; padding: 6px 12px 2px; }
  .plates::-webkit-scrollbar { display: none; }
  .plates:not(.sub) { mask-image: linear-gradient(90deg, transparent, #000 12px, #000 calc(100% - 28px), transparent); }
  /* Centred while they fit, from the start once they don't. */
  .plates > :first-child { margin-left: auto; }
  .plates > :last-child { margin-right: auto; }
  .plate, .plates.sub .plate { flex: none; height: 44px; font-size: 16px; }
  .plate i, .plates.sub .plate i { width: 28px; background-size: auto 44px; }
  .plate span, .plates.sub .plate span { background-size: auto 44px; }
  .plates.sub { margin: 4px 8px 2px; padding: 5px 8px 4px; }
  /* The picture: the crop on the window, swiped sideways for the next slide. */
  .stage { aspect-ratio: 4 / 5; touch-action: pan-y pinch-zoom; }
  .strip { mask-image: linear-gradient(90deg, transparent, #000 10px, #000 calc(100% - 24px), transparent); }
  .thumb { flex: none; width: 92px; }
  .whole { display: flex; }
  .foot-links a { padding: 10px 0; }
}
/* Phones and tablets can't install it: say so beside the Download buttons. */
@media (hover: none) and (pointer: coarse) {
  .phone-note { display: block; color: var(--text); font-size: 16px; text-shadow: 0 1px 8px #000; }
}
@media (prefers-reduced-motion: reduce) {
  .stage picture, .thumb { transition: none; }
}
</style>
