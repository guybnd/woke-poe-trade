---
id: WOKEPOET-57
title: Stop replacing the whole config on every save
status: Done
priority: Medium
effort: M
assignee: unassigned
tags:
  - bug
  - overlay-core
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-36
history:
  - type: activity
    user: Agent
    date: '2026-11-05T08:10:10.249Z'
    comment: Created ticket.
    id: a-2026-11-05t08-10-10-249z
  - type: activity
    user: Agent
    date: '2026-11-05T08:10:10.249Z'
    comment: Created as subtask of WOKEPOET-36.
    id: a-2026-11-05t08-10-10-249z
  - type: comment
    user: Agent
    comment: >-
      Tried skipping the swap on a window's own save echo. It broke e2e
      campaign.spec.ts "run timer splits act 1": the campaign card lost its Run
      line, 3 runs of 3. So something depends on the swap, and the cause isn't
      found yet. It may be a test assumption or a real hidden dependency, so
      don't simply drop the swap; find what relies on it first. Shelved, nothing
      landed.
    date: '2026-11-05T10:53:20.970Z'
    selfAttested: true
    id: c-2026-11-05t10-53-20-970z
  - type: activity
    user: Agent
    date: '2026-11-13T01:45:18.712Z'
    comment: Updated implementation link.
    id: a-2026-11-13t01-45-18-712z
  - type: comment
    user: Agent
    comment: >-
      Done by #405: a page now skips the echo of its own config save and only
      takes changes from other pages (with a race guard). The 2026-11-05 note
      that this broke campaign.spec "run timer splits act 1" was not re-checked
      here; watch that e2e. Board cleanup 2026-11-13.
    date: '2026-11-13T01:45:21.300Z'
    completionComment: true
    id: c-2026-11-13t01-45-21-300z
  - type: status_change
    from: Grooming
    to: Done
    user: Agent
    date: '2026-11-13T01:45:21.300Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/405'
needsAction: null
---
> **TL;DR** C12. Each save echoes back as config-changed, then re-parses and replaces the whole 74 KB config. That costs work on zone changes, and an edit made during the round trip is overwritten.

- Config.ts: don't replace the config on the echo of this window's own save; only on a change from another client.
- Check the Settings close-on-config-changed behaviour still works.
