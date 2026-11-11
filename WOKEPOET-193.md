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
    comment: Created ticket.
    id: a-2026-11-11t05-16-25-251z
  - type: activity
    user: Agent
    date: '2026-11-11T05:16:25.251Z'
    comment: Created as subtask of WOKEPOET-149.
    id: a-2026-11-11t05-16-25-251z
  - type: comment
    user: Agent
    comment: >-
      **Pick a layout** from the mocks:
      https://claude.ai/artifact/T6SUHyMaVhjVFMNUws5Yzv. A = hover card on each
      room (reuses essence scan OCR, cheapest). B = one read rings every ticked
      room (needs icon matching from 3.30 screenshots, riskiest before launch).
      C = dock "this temple" card, goes with A or B. **Default if no answer: A +
      C.** A screenshot of the temple view with a room hovered would help either
      way.
    date: '2026-11-11T05:19:42.933Z'
    id: c-2026-11-11t05-19-42-933z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-11T05:19:42.933Z'
    comment: >-
      **Pick a layout** from the mocks:
      https://claude.ai/artifact/T6SUHyMaVhjVFMNUws5Yzv. A = hover card on each
      room (reuses essence scan OCR, cheapest). B = one read rings every ticked
      room (needs icon matching from 3.30 screenshots, riskiest before launch).
      C = dock "this temple" card, goes with A or B. **Default if no answer: A +
      C.** A screenshot of the temple view with a room hovered would help either
      way.
  - type: activity
    user: Agent
    date: '2026-11-11T05:23:09.547Z'
    comment: Updated description.
    id: a-2026-11-11t05-23-09-547z
  - type: comment
    user: Agent
    comment: 'Guy picked B; build it, hold release until real screenshots.'
    date: '2026-11-11T05:23:10.344Z'
    id: c-2026-11-11t05-23-10-344z
  - type: swimlane_change
    swimlane: require-input
    action: cleared
    user: Agent
    date: '2026-11-11T05:23:10.344Z'
    comment: 'Guy picked B; build it, hold release until real screenshots.'
  - type: comment
    user: Agent
    comment: >-
      Parked 2026-11-11 on Guy's word ("ticket and put aside for now"), waiting
      on real 3.30 temple screenshots (coordinator reminder in 3 days). No code
      written yet; empty clone at E:\Git\woke-temple-scan on branch
      woke/temple-scan (from master 786c1174). Needed from Guy: screenshots of
      Alva's temple view at his resolution, ideally several temples covering
      T1/T2/T3 icons, plus one with a room hovered. Build order when resumed:
      room data (3.30 names + old aliases), widget/settings, icon atlas from
      screenshots, template matcher in vision worker (stick to shipped opencv
      functions), pin overlay cleared on close/next read.
    date: '2026-11-11T05:23:40.565Z'
    selfAttested: true
    pin: true
    id: c-2026-11-11t05-23-40-565z
swimlane: null
needsAction: null
---
> **TL;DR** Guy picked **B** (2026-11-11): one hotkey read of Alva's temple view, ring + short name on every ticked room, coloured by tier (orange T3, blue T2, grey T1), cleared on Esc/close. Room list configurable, all on. **Do not release until the icon atlas is built from real 3.30 screenshots.**

## 3.30 facts (patch notes 4013680)
- Renames: Throne of Atziri → Cradle of Creation, Omnitect Forge → Royal Forge, Omnitect Reactor Plant → Grand Reactor.
- No new or removed rooms.

## Plan
1. Room data: 23 lines × 3 tiers, 3.30 names + old aliases.
2. Widget + settings (rooms grid, hotkey), dock icon only.
3. Main-side capture → vision worker template-matches room icons against an atlas (empty until screenshots).
4. Pin overlay layer, cleared on Esc / panel close / next read.
5. Hidden from release until the atlas exists.

Mocks: https://claude.ai/artifact/T6SUHyMaVhjVFMNUws5Yzv
