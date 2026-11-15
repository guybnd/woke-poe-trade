---
id: WOKEPOET-315
title: Wickerman Ledger league module (3.30 Viscera drops + Wickerman planner)
status: Ready
priority: None
effort: None
assignee: unassigned
tags:
  - league-3.30
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-15T06:27:38.402Z'
    comment: Created ticket.
    id: a-2026-11-15t06-27-38-402z
  - type: activity
    user: Agent
    date: '2026-11-15T06:31:54.582Z'
    comment: >-
      Mocks A-D with picks: https://claude.ai/artifact/PMvnyzjUvoHDi7oXGVzDa5
      (db picks/A..D). Building A+B meanwhile on woke/wickerman-ledger.
    id: a-2026-11-15t06-31-54-582z
  - type: activity
    user: Agent
    date: '2026-11-15T06:41:24.864Z'
    comment: >-
      Guy's picks: C yes ("should be able to see what the mods are"), D later
      ("maybe on pob section"); A/B blank, kept as built. C built: campaign card
      shows zone boss's Viscera with every version.
    id: a-2026-11-15t06-41-24-864z
  - type: activity
    user: Agent
    date: '2026-11-15T06:52:56.842Z'
    comment: Updated implementation link.
    id: a-2026-11-15t06-52-56-842z
  - type: comment
    user: Agent
    comment: >-
      PR #509: Wickerman (3.30) module, with A price check strip, B Ctrl+Space
      cards and C campaign card line. Data v16 (league/viscera.json is live
      data). Review fixes are in, and all local checks are green. Sent to the
      coordinator to merge. D (planner) comes later, in PoB.
    date: '2026-11-15T06:53:02.621Z'
    completionComment: true
    id: c-2026-11-15t06-53-02-621z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-15T06:53:02.622Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/509'
needsAction: null
---
Bring wickermanledger.site's info into the app as a self-contained, switchable league module (woke/ module registry), removable at league end.

Site: 163 Viscera with Low/Med/High effect text (from 3.30 datamine), campaign boss/zone (133), map/pinnacle/guardian/conqueror/nightmare bosses; best-in-slot DPS/Tanky picks (site's own curation). No licence, no API: data is a literal in app.js.

Open: licensing of the site's curated data (BiS picks) — coordinator asking Guy. Prefer sourcing facts (effects, drops) independently; credit the site.

Plan: snapshot JSON under public/data (bump-data-version), lazy-loaded; mocks in PoE 1 look first, picks artifact; build recommended option on branch woke/wickerman-ledger (worktree E:\Git\woke-wickerman).
