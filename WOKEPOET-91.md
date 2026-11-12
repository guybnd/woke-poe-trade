---
id: WOKEPOET-91
title: 'Gameplay helpers: remaining critique gaps'
status: Done
priority: Low
effort: None
assignee: unassigned
tags:
  - feature
  - ui
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-05T10:54:38.085Z'
    comment: Created ticket.
    id: a-2026-11-05t10-54-38-085z
  - type: comment
    user: Agent
    comment: >-
      Shipped in 0.4.3 (#371): regex lint, patch stamps, the challenges count
      per league, and a log-language note in Settings. The truncated Client.txt
      reread already existed. Abyss/Allflame coverage moved to WOKEPOET-156. Guy
      said no to map thresholds, route import and lab room tracking.
    date: '2026-11-12T08:23:42.036Z'
    completionComment: true
    id: c-2026-11-12t08-23-42-036z
  - type: status_change
    from: Grooming
    to: Done
    user: Agent
    date: '2026-11-12T08:23:42.036Z'
needsAction: null
---
Step 9 of the [gameplay helpers critique](https://claude.ai/artifact/NjdEZhrQZBmKwRB56yTsoj). Split into subtasks when groomed; mocks for each new piece.

- Regex library lint: loose spaces, unbalanced quotes
- Patch stamps on saved strings; fix the Syndicate "3.24 sheet" footer
- Rare map names in the token collision check
- Map mods: roll thresholds, deadly combinations, T17 preset defaults
- Mechanics coverage (Abyss, Allflame) and league stamps
- Challenges: warn at league change, tie the dock count to a league
- Warn on non-English clients; re-read a truncated Client.txt
- Import your own route
- Lab room tracking
