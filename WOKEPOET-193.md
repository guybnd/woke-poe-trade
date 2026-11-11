---
id: WOKEPOET-193
title: 'Temple scanner: highlight important Temple of Atzoatl rooms'
status: Grooming
priority: High
effort: M
assignee: unassigned
tags:
  - woke
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-149
history:
  - type: activity
    user: Agent
    date: '2026-11-11T05:16:25.251Z'
    comment: Created as subtask of WOKEPOET-149.
---
> **TL;DR** New scan tool for the Incursion temple (Alva's temple view): read rooms by OCR, highlight the important T1/T2/T3 rooms. Room list configurable, all on by default. Use 3.30 names. Mocks first, Guy picks, then build.

## 3.30 facts (patch notes 4013680)
- Renames: Throne of Atziri → **Cradle of Creation**, Omnitect Forge → **Royal Forge**, Omnitect Reactor Plant → **Grand Reactor**. Xipocado → "Architect to the Queen".
- Cradle of Creation: temple becomes area level 84 with Uber Atziri; Vial uniques drop there. Vials removed.
- Surveyor's Study / Office of Cartography / Atlas of Worlds: device to double-corrupt maps.
- Glittering Halls: Sacrificial Heart / Tempered pieces. Museum of Artefacts: Soul Catcher.
- No new or removed rooms; no temple UI change mentioned.

## Constraints
- Nothing permanently on screen; reuse essence/map scan OCR (`main/src/woke/map-scan-vision.ts`, `scanTooltip`/`scanAllTooltips`).
- RAM budgets: memory.listeners 2300, bundle.allJs 4700.
- Need a real screenshot of the 3.30 temple view to tune detection (none in fixtures).
