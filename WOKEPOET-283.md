---
id: WOKEPOET-283
title: 'Price check: first check in PoE layout never searches'
status: Done
priority: High
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-14T05:00:11.076Z'
    comment: Created ticket.
    id: a-2026-11-14t05-00-11-076z
  - type: comment
    user: Agent
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/442: a search that
      started before the listing mounted now runs when it mounts. Review found
      one double-search case, which is fixed. Local checks and the new
      regression e2e pass. Waiting on merge.
    date: '2026-11-14T05:04:09.787Z'
    completionComment: true
    id: c-2026-11-14t05-04-09-787z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-14T05:04:09.787Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as a58fd463. The first price check in the PoE layout now searches
      once the trade listing mounts. A new item or a cancelled search drops a
      waiting search. Regression e2e: price-check-poe-first.spec.ts.
    completionComment: true
    date: '2026-11-14T05:13:48.265Z'
    id: c-2026-11-14t05-13-48-265z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-14T05:13:48.641Z'
needsAction: null
baselineCommit: ae072f60270fa58e9d206c73fab27bd78609319b
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/442'
swimlane: null
diffSummary:
  - file: renderer/src/web/woke/loot-filter/compose.ts
    additions: 1
    deletions: 1
  - file: renderer/src/web/woke/loot-filter/store.ts
    additions: 3
    deletions: 14
  - file: renderer/test/woke/filter-flows.test.ts
    additions: 11
    deletions: 0
  - file: renderer/test/woke/filter-price-flows.test.ts
    additions: 6
    deletions: 5
---
Guy priced Mortem Morsu from Ctrl+Space search (right-click > Price check) and the window sat at "Matched: ..." with no listings.

Cause: CheckedItem's body is `v-if="show && (!poeMode || poeOn)"`; in the Tooltip lines (PoE) layout poeOn waits for a code chunk, so the trade listing isn't mounted when the search watcher calls execSearch on nextTick. The search was dropped. Any item, any unique; it hits the first auto-searching check after the overlay starts. Empty mods / 0 DPS are normal for a unique priced by name.

Fix: remember a waiting search and run it when the trade listing mounts. Regression e2e testing/e2e/price-check-poe-first.spec.ts (fails before, passes after). Branch woke/virtual-unique-pc.
