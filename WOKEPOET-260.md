---
id: WOKEPOET-260
title: 'Download page: SmartScreen warning line'
status: Done
priority: Low
effort: XS
assignee: unassigned
tags:
  - docs
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-53
history:
  - type: activity
    user: Agent
    date: '2026-11-13T03:02:32.978Z'
    comment: Created ticket.
    id: a-2026-11-13t03-02-32-978z
  - type: activity
    user: Agent
    date: '2026-11-13T03:02:32.978Z'
    comment: Created as subtask of WOKEPOET-53.
    id: a-2026-11-13t03-02-32-978z
  - type: comment
    user: Agent
    comment: >-
      Merged in #408 (af34d082): SmartScreen line on README, download page,
      landing page and release notes.
    date: '2026-11-13T03:29:13.742Z'
    completionComment: true
    id: c-2026-11-13t03-29-13-742z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-13T03:29:13.742Z'
  - type: comment
    user: Agent
    comment: >-
      SmartScreen "More info > Run anyway" on README, download page, landing
      hero (hidden on phones) and every release's notes. Merged in #408
      (af34d082).
    completionComment: true
    date: '2026-11-13T03:29:20.978Z'
    id: c-2026-11-13t03-29-20-978z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-13T03:29:21.441Z'
needsAction: null
reviewState: approved
baselineCommit: 9747783386088b67140c621fed5865bf72798b69
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/408'
swimlane: null
diffSummary:
  - file: renderer/src/web/woke/mechanics/covens.ts
    additions: 79
    deletions: 0
  - file: renderer/src/web/woke/mechanics/data.ts
    additions: 17
    deletions: 0
  - file: renderer/src/web/woke/mechanics/guide.ts
    additions: 6
    deletions: 0
  - file: renderer/src/web/woke/ui/game-icons.ts
    additions: 2
    deletions: 0
  - file: renderer/test/woke/economy.test.ts
    additions: 3
    deletions: 0
  - file: renderer/test/woke/mechanics-guide.test.ts
    additions: 15
    deletions: 0
---
From WOKEPOET-53: Guy chose 2026-11-13 not to buy code signing. The installer is unsigned, so Windows SmartScreen warns on first run.

Do: add one line wherever players download (README download section, landing page, release notes template) saying the SmartScreen warning is expected: click "More info > Run anyway".
