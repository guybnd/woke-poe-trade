---
id: WOKEPOET-166
title: 'Price check: "PoE mode" window style (Settings > Prices: Standard / PoE)'
status: In Progress
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
