# Woke UI

Shared look for every woke module. Build widgets from these pieces instead of
hand-rolled Tailwind greys, so a theme change restyles everything at once.

## Themes

`theme.css` defines `--w-*` tokens on `:root`; `<html data-woke-theme>` picks a
set: `hybrid` (default), `native`, `modern`, `classic`. Users switch in
Settings → Appearance (stored in localStorage `woke.theme`).

Unless the theme is `classic`, a skin layer also recolours APT's own windows
(`.widget-default-style` and the Tailwind `gray-*` utilities inside
`#overlay-window`). Only colours change, never APT logic or layout.

## Principles

Every screen is judged against the Poetools UI charter (P1-P19):
https://claude.ai/artifact/CB65QcY78n6ztJvbEbFK4j. The short version: nothing
on screen during combat unless asked, never cover globes/flasks/skills/minimap,
verdict first, every key shown, undo instead of confirm, show data age, game
art wherever the game has it, readable fonts (nothing under 11px).

## Tokens

| Group | Tokens |
| --- | --- |
| Text size | `--w-fs-xs` 11, `--w-fs-sm` 11.5, `--w-fs-md` 13, `--w-fs-lg` 15, `--w-fs-xl` 18. No other sizes. |
| Fonts | `--w-body` Inter (bundled), `--w-num` same family with tabular digits (use `.w-num`), `--w-mono` JetBrains Mono for regex/code, `--w-head` Fontin small caps for titles ≥15px only. |
| Spacing | `--w-s1`…`--w-s6` = 4, 8, 12, 16, 20, 24 px. `--w-pad` 12 is the panel's side padding. |
| Radius | `--w-r-sm` 4, `--w-r-md` 6, `--w-r-pill`. (`--w-radius`/`--w-radius-sm` are aliases.) |
| Density | `--w-row-h` 28, 24 when `<html data-woke-density="compact">`. |
| Motion | `--w-dur-in` 120ms, `--w-dur-out` 80ms, `--w-ease`, `--w-rise`; all zero under reduced motion. `.w-enter` plays the open animation, `.w-flash` flashes a changed value once. |
| Icons | `--w-icon-sm/md/lg` = 16, 20, 24 px. |

## Components

| Component | Use |
| --- | --- |
| `WPanel` | Widget shell. Slots: `title`, `actions`, `banner`, `tabs`, `toolbar`, `meta`, default body (scrolls), `footer`. Props: `title`, `width`, `maxHeight`, `scroll`, `icon` (game art id/path), `updated` (ms, shows data age), `hotkey`, `busy` (refresh bar), `stale` (dims body). Arrow keys move between rows, `/` focuses the search field. Inside a `Widget`, the first titled panel carries the window buttons (settings, delete, minimize, hide) and drags the widget; double-clicking its title minimizes, and right-clicking gives the same options plus Choose anchor corner and Reset size. |
| `WTabs` | Underlined tabs, `v-model` + `options: { value, label, count? }[]`. |
| `WSegmented` | Small segmented control (periods, modes). |
| `WField` | Text/number/search input with optional `icon` and `suffix`; Esc clears. |
| `WSelect` | Select with `options: { value, label }[]`. |
| `WButton` | `variant`: default, primary, ghost, danger; `size`: md, sm; `icon`; `href` renders a link. |
| `WListItem` | Clickable list row with `sub` line and trailing `actions`; `active` highlights. |
| `WPrice` | Chaos value with the chaos/divine icon; switches to divines at 1 div unless `unit` is forced. |
| `WDelta` | Ratio change as a coloured percentage (`0.12` → `+12%`). |
| `WSpark` | Sparkline with area fill and endpoint, coloured by direction. |
| `WChip` | Tag or toggle pill (`clickable`, `active`). |
| `WKbd` | Renders an APT shortcut string (`"Alt + M"`). |
| `WEmpty` | Empty or failed state: icon or game `art`, text, optional `actions` slot with the fix. |
| `WIcon` | Game art: `currency`, `item` (+`ns`), `mechanic` (see `MECHANIC_ICONS`) or `src`; `size` sm/md/lg; FA `fallback`. |
| `WToggle` | On/off switch, `v-model` boolean. |
| `WSkeleton` | Grey placeholder rows for a first load (`rows`, `value`). |
| `WBanner` | One-line error/warn/info above a panel's content with a fix button in `actions`. |

## Overlay layer

`OverlayLayer.vue` is mounted once (via `WokeOverlay`). Use it through:

- `openMenu(event, items)` for every right-click menu. Items: `{ label, action, icon?, gameIcon?, keys?, danger?, disabled? }` or `{ separator: true }`. Put destructive items last after a separator. Arrow keys, Enter and Esc work.
- `toast(text, { undo?, anchor? })` after an action instead of asking "are you sure?". Shows at the bottom of `anchor` (pass the panel element) for 5 s; Ctrl+Z also undoes.
- `useCopy()` gives `{ copied, copy }` so a copy button can say "Copied" in place.

Helpers: `ago(ts)` / `freshness(ts)` (one shared clock), `gameIcon(name, ns)`.

## Utility classes

`w-row` (grid row; set `grid-template-columns` yourself), `w-row--head`,
`w-group-label`, `w-num` (tabular mono digits), `w-dim`, `w-faint`, `w-up`,
`w-down`, `w-mono`, `w-stale`, `w-enter`, `w-flash`, `w-focusable` (keyboard-reachable row), `w-accent`, `w-trunc`, `w-icon-btn`, `w-surface`, and item colours
`w-rarity-{normal,magic,rare,unique,gem,currency,divination}`; gem names by
attribute `w-gem-{r,g,b,w}`.

## Rules

- Colours only from `--w-*` tokens; no `text-gray-*`/`bg-gray-*` in woke code.
- Prices go through `WPrice`, changes through `WDelta`.
- Hotkeys are shown with `WKbd`.
