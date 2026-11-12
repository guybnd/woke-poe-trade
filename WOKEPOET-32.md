---
id: WOKEPOET-32
title: 'Campaign tracker: dock icon only, sleep on endgame characters'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - ui
  - campaign
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-05T06:01:42.517Z'
    comment: Created ticket.
    id: a-2026-11-05t06-01-42-517z
  - type: comment
    user: Agent
    comment: >-
      Pick A (quiet icon), B (live icon: act ring, badge coloured against best
      run) or C (whole-act checklist card). Recommendation: B. Mocks:
      https://claude.ai/artifact/6tMUj9A4ss2A1RZLxsAhdr
    date: '2026-11-05T06:01:53.079Z'
    id: c-2026-11-05t06-01-53-079z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-05T06:01:53.079Z'
    comment: >-
      Pick A (quiet icon), B (live icon: act ring, badge coloured against best
      run) or C (whole-act checklist card). Recommendation: B. Mocks:
      https://claude.ai/artifact/6tMUj9A4ss2A1RZLxsAhdr
  - type: comment
    user: Agent
    comment: >-
      Guy picked B and asked for a card shortcut to settings for optional pinned
      readouts; mocking that next.
    date: '2026-11-05T06:09:12.756Z'
    id: c-2026-11-05t06-09-12-756z
  - type: swimlane_change
    swimlane: require-input
    action: cleared
    user: Agent
    date: '2026-11-05T06:09:12.756Z'
    comment: >-
      Guy picked B and asked for a card shortcut to settings for optional pinned
      readouts; mocking that next.
  - type: status_change
    from: Grooming
    to: In Progress
    user: Agent
    date: '2026-11-05T06:10:00.963Z'
  - type: activity
    user: Agent
    date: '2026-11-05T06:45:21.267Z'
    comment: Updated implementation link.
    id: a-2026-11-05t06-45-21-267z
  - type: comment
    user: Agent
    comment: >-
      Merged in abf3143 (PR #117) and live on the dev build: live dock icon,
      panel removed, sleep past the campaign, optional pins in the icon. Checked
      by review, unit and headless end-to-end tests; not yet tried in the real
      game.
    date: '2026-11-05T06:45:37.562Z'
    completionComment: true
    id: c-2026-11-05t06-45-37-562z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-05T06:45:37.562Z'
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-12T00:16:53.634Z'
swimlane: null
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/117'
reviewState: null
---
Tracker panel showed in Guy's hideout on an endgame character with the overlay open, and its header disagreed with its steps (A1 vs Act 4).

Causes:
- Route only counts as done at its end, the Epilogue, or a finished run, so endgame characters never hide it.
- `state.act` is the last campaign area seen; `config.step` is a separate route position that town hops advance on any character.

All options: remove the strip and guide panel; route sleeps after a map entry and wakes on a non-town campaign zone; sleeping route doesn't advance; badge and heading use the route step's act.

Mocks: https://claude.ai/artifact/6tMUj9A4ss2A1RZLxsAhdr
