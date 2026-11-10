---
id: WOKEPOET-181
title: 'UI 1: audit the PoE mode kit and mock the game look on four panels'
status: Grooming
priority: High
effort: M
assignee: unassigned
tags:
  - ui
  - mocks
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-169
history:
  - type: activity
    user: Agent
    date: '2026-11-10T02:56:12.007Z'
    comment: Created ticket.
    id: a-2026-11-10t02-56-12-007z
  - type: activity
    user: Agent
    date: '2026-11-10T02:56:12.007Z'
    comment: Created as subtask of WOKEPOET-169.
    id: a-2026-11-10t02-56-12-007z
  - type: comment
    user: Agent
    comment: >-
      Mocks are up: https://claude.ai/artifact/7K32ckPi6gY99EKvJs8Dtv


      Pick one strength and one setting model, for example "S2 + T1":

      - S1 game frame only, S2 frame + game controls, S3 full game look (Fontin
      everywhere, near-black, centred titles).

      - T1 the look is part of the theme (Hybrid takes the pick, Native becomes
      S3, Window style becomes "Filter layout"), T2 one global Game look switch,
      T3 a Window style per panel.


      Recommendation: S2 + T1. Real headless renders of Flips, the Trades card,
      the loot filter and Settings, made with CSS layers in the clone
      E:\Git\woke-ui-look (mock/css, testing/e2e/zz-mock-look.spec.ts, not
      committed). The page lists the charter edits each strength needs (P5, P14,
      P19) and five build findings for WOKEPOET-182.
    date: '2026-11-10T03:25:38.581Z'
    id: c-2026-11-10t03-25-38-581z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-10T03:25:38.581Z'
    comment: >-
      Mocks are up: https://claude.ai/artifact/7K32ckPi6gY99EKvJs8Dtv


      Pick one strength and one setting model, for example "S2 + T1":

      - S1 game frame only, S2 frame + game controls, S3 full game look (Fontin
      everywhere, near-black, centred titles).

      - T1 the look is part of the theme (Hybrid takes the pick, Native becomes
      S3, Window style becomes "Filter layout"), T2 one global Game look switch,
      T3 a Window style per panel.


      Recommendation: S2 + T1. Real headless renders of Flips, the Trades card,
      the loot filter and Settings, made with CSS layers in the clone
      E:\Git\woke-ui-look (mock/css, testing/e2e/zz-mock-look.spec.ts, not
      committed). The page lists the charter edits each strength needs (P5, P14,
      P19) and five build findings for WOKEPOET-182.
swimlane: require-input
needsAction: null
---
First step of the epic; everything else waits on Guy's pick here.

1. Inventory what PoE mode added in the price check (`price-insight/poe-kit`, `poe-mode.css`, `window-style.ts`): frames, headers, separators, fonts, mod-line colours, buttons, chips. Note which pieces are generic and which are price-check only.
2. Mock the same language on four different panel types, from real screenshots of the current overlay: a list panel (Market or Flips), a card from the dock (Trades or Lab), the loot filter editor, and Settings. Two or three strengths each: game frame only, frame plus game controls, full game look.
3. Show how it sits with the four themes (hybrid, native, modern, classic) and the existing "Window style" setting: one global setting or per-panel.
4. List the charter edits each option needs (P5 "no bevels, Fontin for titles only", P14 tokens, P19 readable fonts).

Deliver as an artifact with options to pick by id. Headless shots only, nothing over PoE.
