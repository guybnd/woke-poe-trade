---
id: WOKEPOET-278
title: 'Loot filter card: drop old-league moves, no false broken change'
status: Grooming
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
    comment: Created as subtask of WOKEPOET-149.
---
> **TL;DR** Guy's dock card showed two notices that didn't need him. Old-league price moves now drop silently, and a safety-net edit waiting for its rule no longer counts as broken. PR https://github.com/guybnd/woke-poe-trade/pull/439.

- "125 price moves from Standard are off": moves made on Standard prices before launch. Now dropped on league change, no notice.
- "1 change needs a new home": Guy's 4 Nov edit hiding the safety net's items rule. The net is empty with no 3.30 prices, so the rule didn't exist and the edit read as failed, which also blocked auto-save. Net edits now wait.
- Broken-change notice reworded, button "Fix it".
- Open for Guy: keep the edit that hides the net's items rule?
