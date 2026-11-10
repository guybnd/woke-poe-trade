---
id: WOKEPOET-182
title: >-
  UI 2: move the picked game-look pieces into woke/ui as shared components and
  tokens
status: Grooming
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
---
After UI 1 is picked. Lift the chosen pieces out of `price-insight/` into `renderer/src/web/woke/ui/` (WPanel frame variant, header, separators, buttons, chips), driven by `--w-*` tokens so all four themes still work, then make the price check use the shared ones.

Fold in the token leftovers from the review while here: one size family (retire `--w-text`, `--w-text-sm`, `--w-head-size`, used in 12 files), the ~15 literal font sizes, and the 48 literal corner radii (`poe-mode.css` has 11). Update `woke/ui/README.md` and the charter.
