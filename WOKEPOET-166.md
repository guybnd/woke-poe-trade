---
id: WOKEPOET-166
title: 'Price check: "PoE mode" window style (Settings > Prices: Standard / PoE)'
status: Ready
priority: Medium
effort: L
assignee: Agent
tags:
  - price-check
  - ui
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-09T15:40:10.197Z'
    comment: Created ticket.
    id: a-2026-11-09t15-40-10-197z
  - type: activity
    user: Agent
    date: '2026-11-09T15:56:21.354Z'
    comment: >-
      Built on claude/price-check-poe-mode (worktree
      E:\Git\.eh-worktrees\woke-poe-mode, from master + ninja-chip-labels).
      Setting, tooltip lines, picked rows, pseudo split (coordinator's revised
      design: quiet square tag, split = old toggleSplit), Fractured only, number
      chips with sideways drag, header grid, PoE parts CSS, Enter/Esc.
      Typecheck/lint clean; new unit + 6 e2e tests pass. Running full suites and
      an adversarial review now.
    id: a-2026-11-09t15-56-21-354z
  - type: activity
    user: claude-code@guy-pc
    date: '2026-11-09T15:56:27.279Z'
    comment: Claimed by claude-code@guy-pc
    id: a-2026-11-09t15-56-27-279z
  - type: activity
    user: Agent
    date: '2026-11-09T16:09:25.778Z'
    comment: Updated implementation link.
    id: a-2026-11-09t16-09-25-778z
  - type: comment
    user: Agent
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/290 (branch
      claude/price-check-poe-mode, on master + #288). Typecheck/lint clean, unit
      all pass, e2e full suite passes except pre-existing tab-rail:280 (fails on
      base too). Adversarial review done, findings fixed. Not merged:
      coordinator merges after #288.
    date: '2026-11-09T16:09:27.094Z'
    completionComment: true
    id: c-2026-11-09t16-09-27-094z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-09T16:09:27.094Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/290'
needsAction: null
---
Guy approved 2026-11-09. Design: branch claude/project-thread-c5mri8, design-mocks/price-check-poe-mode/ (PoeParts.dc.html = A4 main, Scen*.dc.html, HISTORY.md). Canvas https://claude.ai/artifact/MYHd5nhtF1dvB6vE243m9n.

Build:
- Setting "Window style: Standard / PoE" under Settings > Prices, default Standard (Standard unchanged).
- PoE mode filters: unpicked mods as tooltip lines (game colours, Fontin SC, kind icons, red diamond corruption implicit, kind on hover, gold-faded separators); click picks → original-style row (tick, text, min/max, roll line, Low/≈/High); Fractured only chip; text wraps, no ellipsis; tier gutter (T1 gold).
- Pseudo, ⇄ swap, Flip tab, right-click menu kept.
- Number chips (Links/iLvl/gem Lvl/Q/map tier/stack): label toggles, hover arrows, wheel/type/drag.
- PoE parts: bronze bevel buttons, pressed segments, recessed wells, square chips, 2px corners, ≈ in Inter.
- Header 2x2: name | ninja chip; Generic/Base + Corrupted | number chips.
- Keep Improved verdict/drivers, poeprices, Collapse, stack value. Enter search / Esc close / Tab.
- Fall back to Standard for item types the mocks don't cover if they look wrong.
- No extra trade searches; ninja chip only where ninja prices the exact item (reuse #288).

Branch claude/price-check-poe-mode from master + claude/ninja-chip-labels. Don't touch dev build. PR, no merge.
