---
id: WOKEPOET-215
title: >-
  Flaky perf.spec 'every module on': DisenchantPanel throws undefined reading
  'Testleague' + main bundle 'reading pos' at startup
status: Done
priority: Medium
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-12T10:15:13.049Z'
    comment: Created ticket.
    id: a-2026-11-12t10-15-13-049z
  - type: activity
    user: Agent
    date: '2026-11-13T01:45:18.177Z'
    comment: Updated implementation link.
    id: a-2026-11-13t01-45-18-177z
  - type: comment
    user: Agent
    comment: >-
      Fixed by #405 (takes over #404): pages skip the echo of their own config
      save, which caused the Widget anchor.pos and DisenchantPanel
      bought[league] startup crashes; DisenchantPanel also falls back when the
      league entry is missing. Board cleanup 2026-11-13.
    date: '2026-11-13T01:45:20.047Z'
    completionComment: true
    id: c-2026-11-13t01-45-20-047z
  - type: status_change
    from: Grooming
    to: Done
    user: Agent
    date: '2026-11-13T01:45:20.047Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/405'
needsAction: null
---
Seen on #388's first fake-game CI run of `testing/perf/perf.spec.ts` ("every module on: startup, a map, a price check, memory"). It passed when re-run.

Errors in the overlay page at startup:
- DisenchantPanel: `Cannot read properties of undefined (reading 'Testleague')`
- Main bundle: `... reading 'pos'`

Likely cause: a startup race where DisenchantPanel reads per-league data before it is loaded. The 'pos' error may come from a widget anchor read before the config is patched.

Done when: the cause is found, both reads are guarded or wait for the data, and the perf spec passes repeatedly (for example 10 runs in a row).
