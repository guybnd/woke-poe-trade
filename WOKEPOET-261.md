---
id: WOKEPOET-261
title: Players get "OCR files missing" with no way to fix it in the app
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
    date: '2026-11-13T04:01:07.805Z'
    comment: Created ticket.
    id: a-2026-11-13t04-01-07-805z
  - type: comment
    user: Agent
    comment: >-
      PR #409 is merged (cb9520d5). When the OCR files are missing, the app now
      downloads them itself, and the error links our guide.
    date: '2026-11-13T04:12:59.024Z'
    completionComment: true
    id: c-2026-11-13t04-12-59-024z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-13T04:12:59.024Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as cb9520d5. When no folder has every OCR file, the app downloads
      cv-ocr.zip into the config folder. A partial config folder no longer hides
      the installer's copy, and the error links our OCR guide. Players get this
      in the next patch release.
    completionComment: true
    date: '2026-11-13T04:13:05.729Z'
    id: c-2026-11-13t04-13-05-729z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-13T04:13:05.949Z'
needsAction: null
baselineCommit: 9747783386088b67140c621fed5865bf72798b69
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/409'
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
A player on the public release saw "OCR files missing: tesseract-core-simd.js, opencv.js, eng.traineddata" in Essence scan, pointing at Awakened PoE Trade's releases page.

Every installer ships resources/cv-ocr (checked 0.3.0 and 1.330.0 installer and portable), so on that PC the bundled copy was removed or hidden. Guy's PC hides the problem because his config folder already has the files.

Fix (PR https://github.com/guybnd/woke-poe-trade/pull/409): pick only a complete folder, download cv-ocr.zip into the config folder when none is complete, and point the error at our OCR guide.
