---
id: WOKEPOET-182
title: >-
  UI 2: move the picked game-look pieces into woke/ui as shared components and
  tokens
status: Done
priority: Medium
effort: L
assignee: unassigned
tags:
  - ui
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-169
history:
  - type: activity
    user: Agent
    date: '2026-11-10T02:56:15.642Z'
    comment: Created ticket.
    id: a-2026-11-10t02-56-15-642z
  - type: activity
    user: Agent
    date: '2026-11-10T02:56:15.642Z'
    comment: Created as subtask of WOKEPOET-169.
    id: a-2026-11-10t02-56-15-642z
  - type: comment
    user: Agent
    comment: >-
      Guy's pick in 181: S3 + T1 (mocks
      https://claude.ai/artifact/7K32ckPi6gY99EKvJs8Dtv; the starting CSS is in
      E:\Git\woke-ui-look\mock\css\s1.css, s2.css and s3.css, layered in that
      order).


      The build must do these things:

      - Turn poe-mode.css's 44 literal colours into --w-* tokens, set by the
      Hybrid and Native themes. Modern and Classic leave them unset or neutral.
      Use the existing item tokens (--w-r-magic, --w-mod-crafted,
      --w-mod-fractured) for the mod colours, not new hex values.

      - Give one owner for buttons (WButton). The Trades OfferRow, PriceDrivers,
      FilterBtnLogical and WCorruptedFilter each style their own .btn today.

      - Keep numbers in Inter everywhere (.w-num, prices, inputs, kbd). Fontin's
      old-style digits read badly ("22,431" in the Flips footer).

      - Keep a 13 px floor for small caps labels. The S2 mock made loot filter
      item chips 12 px small caps, which is too small.

      - Make settings hints Fontin upright, not italic. Italic Fontin was the
      hardest text to read in the S3 Settings mock.

      - Swap the old APT controls in Settings (radios, the Refresh pill, the
      link chips) for shared parts, so the look reaches them.

      - Rename the price check's Window style to "Filter layout" (Tooltip lines
      / Rows). The look itself follows the theme.

      - Scope .w-poe-line and .w-poe-qtag to the PoE window.

      - Charter edits that follow the pick: P5 allows the bronze bevel and the
      pressed-in active choice, and drops "read better than the game". P14
      changes the radii to 2 px for frames and controls, with the pill only for
      badges, and adds frame, bevel, pressed, well and gold-fade tokens. P19 is
      rewritten so that Fontin is the reading face at 13 px and up, and numbers
      always use Inter.
    date: '2026-11-10T04:27:41.759Z'
    selfAttested: true
    pin: true
    id: c-2026-11-10t04-27-41-759z
  - type: activity
    user: Agent
    date: '2026-11-10T04:36:04.219Z'
    comment: Updated description.
    id: a-2026-11-10t04-36-04-219z
  - type: status_change
    from: Grooming
    to: Todo
    user: Agent
    date: '2026-11-10T04:36:08.556Z'
  - type: activity
    user: claude-code@GUY-PC
    date: '2026-11-10T04:36:11.649Z'
    comment: Claimed by claude-code@GUY-PC
    id: a-2026-11-10t04-36-11-649z
  - type: status_change
    from: Todo
    to: In Progress
    user: claude-code@GUY-PC
    date: '2026-11-10T04:36:11.649Z'
  - type: activity
    user: Event Horizon
    date: '2026-11-10T05:07:22.669Z'
    comment: Claim by claude-code@GUY-PC expired (no heartbeat for 30 min)
    id: a-2026-11-10t05-07-22-669z
  - type: status_change
    from: In Progress
    to: Todo
    user: Event Horizon
    date: '2026-11-10T05:07:22.702Z'
  - type: comment
    user: Agent
    comment: >-
      **PR #296 is ready to merge**
      (https://github.com/guybnd/woke-poe-trade/pull/296, branch ui-game-look @
      1747bcb0, built in clone E:\Git\woke-ui-look) and is on the dev build.
      Hybrid and Native get the S3 game look through `data-woke-look="game"`.
      New `ui/controls.css` is the one owner of buttons, chips, segments, tabs,
      fields, the toggle and key caps. New `ui/game-look.css` holds fonts, rows,
      group labels and Settings hints. WPanel has the frame, corner marks, gold
      fade and centred title. The colours in poe-mode.css are now tokens, and
      Settings shows "Filter layout" (Tooltip lines / Rows). The old size tokens
      are retired and literal radii are on tokens. The README and the charter
      (P5, P14, P19) are updated. The adversarial review found 8 bugs; all are
      fixed. Checks: tsc, lint, vitest 2856 and build all pass. Playwright: 197
      passed. tab-rail drag fails on master too. **Left for 183:** verdict
      strips, the Settings nav and its APT radios, the Refresh pill and link
      chips, and dock cards.
    date: '2026-11-10T05:09:46.008Z'
    completionComment: true
    id: c-2026-11-10t05-09-46-008z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-10T05:09:46.009Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as e111fb70 and live on the dev build. Docs updated:
      woke/ui/README.md, plus the charter's P5, P14 and P19.
    completionComment: true
    date: '2026-11-10T05:17:32.924Z'
    id: c-2026-11-10t05-17-32-924z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-10T05:17:33.569Z'
needsAction: null
baselineCommit: e67d6ec4dad47efdb249e0afdf27705a03528309
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/296'
swimlane: null
diffSummary:
  - file: renderer/src/web/woke/loot-filter/RuleBuilder.vue
    additions: 11
    deletions: 1
  - file: renderer/src/web/woke/loot-filter/rules.ts
    additions: 20
    deletions: 3
  - file: renderer/test/woke/filter-rules.test.ts
    additions: 12
    deletions: 1
---
> **TL;DR** Turn the price check's PoE look into theme tokens and shared parts in `woke/ui`, so Hybrid and Native get the game look (S3 + T1) everywhere and Modern and Classic stay as they are. The price check's Window style becomes a layout-only "Filter layout".

After UI 1 is picked. Lift the chosen pieces out of `price-insight/` into `renderer/src/web/woke/ui/` (WPanel frame variant, header, separators, buttons, chips), driven by `--w-*` tokens so all four themes still work, then make the price check use the shared ones.

Fold in the token leftovers from the review while here: one size family (retire `--w-text`, `--w-text-sm`, `--w-head-size`, used in 12 files), the ~15 literal font sizes, and the 48 literal corner radii (`poe-mode.css` has 11). Update `woke/ui/README.md` and the charter.

## Plan
- `theme.ts` sets `data-woke-look="game"` for Hybrid and Native; game-look tokens (frame, bevel, pressed, well, gold fade, label face) live in `theme.css`.
- WPanel (frame, corner marks, header, centred title with diamonds, gold fade), WButton, WTabs, WSegmented, WChip, WField, WSelect, WToggle, WKbd, `.w-row` separators and group labels take the look under that attribute.
- `poe-mode.css`: look rules move to the theme (both filter layouts), literal colours become tokens; layout rules stay under `.w-poe`.
- Settings: "Window style" becomes "Filter layout" (Tooltip lines / Rows).

## Acceptance criteria
- [ ] Hybrid and Native panels show the S3 look; Modern and Classic render as before.
- [ ] Numbers, prices, inputs and key caps stay Inter; small caps labels are at least 13 px; settings hints upright.
- [ ] Price check look follows the theme in both filter layouts; `.w-poe-line` and `.w-poe-qtag` scoped to the price window.
- [ ] No literal colours left in `poe-mode.css` look rules; `--w-text`, `--w-text-sm`, `--w-head-size` retired.
- [ ] README and charter (P5, P14, P19) updated.

## Test plan
- Typecheck, lint, unit tests, build.
- Existing e2e price check and panel specs pass.
- Headless shots of Flips, Trades card, loot filter, Settings and price check under all four themes, compared with the S3 mock.
