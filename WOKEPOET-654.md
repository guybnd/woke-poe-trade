---
id: WOKEPOET-654
title: Risky consolidations left out
status: Todo
priority: None
effort: None
assignee: unassigned
tags:
  - refactor
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-621
history:
  - type: activity
    user: Agent
    date: '2026-11-27T04:51:42.883Z'
    comment: Created as subtask of WOKEPOET-621.
---
Follow-up from the consolidation audit (PRs 945, 947). Left out on purpose because each is risky:

1. Four differing writeAtomic copies in main (data-files, neversink, pob-builds, loot-filter), plus the character-sync retry. Needs its own careful PR.
2. hotkeyTarget / parse logic copied about 8 times.
3. Trade links in unid-prices, scry and GearRowHead hardcode www.pathofexile.com instead of getTradeEndpoint(). Needs a check on a non-English client.
