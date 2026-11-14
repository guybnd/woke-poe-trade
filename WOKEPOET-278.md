---
id: WOKEPOET-278
title: 'Loot filter card: drop old-league moves, no false broken change'
status: Ready
priority: High
effort: S
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-149
history:
  - type: activity
    user: Agent
    date: '2026-11-14T04:35:50.351Z'
    comment: Created ticket.
    id: a-2026-11-14t04-35-50-351z
  - type: activity
    user: Agent
    date: '2026-11-14T04:35:50.351Z'
    comment: Created as subtask of WOKEPOET-149.
    id: a-2026-11-14t04-35-50-351z
  - type: comment
    user: Agent
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/439: old-league moves
      notice removed (moves kept in config, out of the file, replaced by the
      first Apply in the league); safety-net edits wait for their rule while the
      net is on; broken-change notice reworded. Adversarial review fixes in
      commit 2. vitest 3703/3703, eslint, vue-tsc, build. Open for Guy: keep his
      4 Nov edit hiding the net's items rule?
    date: '2026-11-14T04:44:30.912Z'
    completionComment: true
    id: c-2026-11-14t04-44-30-912z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-14T04:44:30.912Z'
  - type: activity
    user: Agent
    date: '2026-11-14T05:54:17.680Z'
    comment: >-
      Guy chose to remove the 4 Nov edit hiding the safety net's items rule.
      Checked the live overlay over CDP: it's already gone (6 edits, none on
      woke->safety), saved, not dirty; net on, empty until 3.30 prices.
    id: a-2026-11-14t05-54-17-680z
needsAction: null
---
> **TL;DR** Guy's dock card showed two notices that didn't need him. Old-league price moves now drop silently, and a safety-net edit waiting for its rule no longer counts as broken. PR https://github.com/guybnd/woke-poe-trade/pull/439.

- "125 price moves from Standard are off": moves made on Standard prices before launch. Now dropped on league change, no notice.
- "1 change needs a new home": Guy's 4 Nov edit hiding the safety net's items rule. The net is empty with no 3.30 prices, so the rule didn't exist and the edit read as failed, which also blocked auto-save. Net edits now wait.
- Broken-change notice reworded, button "Fix it".
- Open for Guy: keep the edit that hides the net's items rule?
