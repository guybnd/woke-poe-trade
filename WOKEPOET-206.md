---
id: WOKEPOET-206
title: Personal stash reader (POESESSID)
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
    date: '2026-11-12T00:30:36.612Z'
    comment: Created ticket.
---
Personal-only stash reader via legacy character-window/get-stash-items with Guy's own POESESSID. Gated by personal.flag in userData. Mockups: https://claude.ai/artifact/FYYuDFZxMptKQJCA38ykAC — picks A1 B1 C1 D2.

- C1 gate: personal.flag in app.getPath('userData'); without it nothing registers.
- A1 login: Settings > Game "Stash reader" section; sign-in window on default session; cookie never leaves main.
- Reading in main: tabs=1 then each tab; respect X-Rate-Limit headers; stop on 401/403/429; per-tab cache.
- B1 Net worth widget: total div, change since yesterday, per hour, category bars, item drill-down; poe.ninja prices; daily snapshot.
- D2 refresh: manual button + hideout entry via Client.txt, max every 10 min.
