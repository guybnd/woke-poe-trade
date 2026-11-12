---
id: WOKEPOET-208
title: 'Stash reader opt-in: hidden experimental Net worth toggle'
status: In Progress
priority: Medium
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-12T02:00:59.298Z'
    comment: Created ticket.
    id: a-2026-11-12t02-00-59-298z
  - type: activity
    user: Agent
    date: '2026-11-12T02:16:53.321Z'
    comment: >-
      Implemented on feat/stash-reader-optin (E:\Git\woke-stash-optin): main
      start/stop controller (personal-set / experimental-set, prefs in
      woke-app.json), renderer runtime add/remove of
      module/widget/page/editor/hotkey, hidden 5-click unlock + EXP row + W2
      confirm + warning, docs. Also fixed: reader's 'stash-read' op overwrote
      the OCR stash read Flips uses (now stash-reader-read). Running full
      checks.
    id: a-2026-11-12t02-16-53-321z
  - type: activity
    user: Agent
    date: '2026-11-12T02:22:25.550Z'
    comment: Updated implementation link.
    id: a-2026-11-12t02-22-25-550z
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/339'
---
Follow-up to #336. Hidden unlock (5 clicks on Economy heading in Settings > Modules), Net worth EXP row, confirm W2, warning box, runtime on/off (R1) in main + renderer, personal.flag stays as override, no code/listeners when off. Tests + SECURITY/README notes. Mockups: https://claude.ai/artifact/FW77Z6LYq4QH7hpoDDeJXi. Branch feat/stash-reader-optin in E:\Git\woke-stash-optin.
