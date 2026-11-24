---
id: WOKEPOET-573
title: Offer restart as admin when PoE is elevated
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-24T13:00:42.493Z'
    comment: Created ticket.
    id: a-2026-11-24t13-00-42-493z
  - type: activity
    user: Agent
    date: '2026-11-24T13:07:18.757Z'
    comment: Updated implementation link.
    id: a-2026-11-24t13-07-18-757z
  - type: comment
    user: Agent
    comment: 'Guy''s pick is open: https://claude.ai/artifact/2aPGTNaCJcfoPQnoorRRbg'
    date: '2026-11-24T13:07:19.872Z'
    selfAttested: true
    id: c-2026-11-24t13-07-19-872z
  - type: comment
    user: Agent
    comment: >-
      The Restart as admin button only shows in packaged builds (not the dev
      build). Guy's pick is still open:
      https://claude.ai/artifact/2aPGTNaCJcfoPQnoorRRbg
    date: '2026-11-24T13:20:41.866Z'
    selfAttested: true
    pin: true
    id: c-2026-11-24t13-20-41-866z
  - type: comment
    user: Agent
    comment: PR 882 merged (88b6c0e).
    date: '2026-11-24T13:20:42.736Z'
    completionComment: true
    id: c-2026-11-24t13-20-42-736z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-24T13:20:42.736Z'
  - type: comment
    user: Agent
    comment: >-
      Merged at 88b6c0e; dev build reloaded. Button is packaged-only; Guy's pick
      still open.
    completionComment: true
    date: '2026-11-24T13:20:46.141Z'
    id: c-2026-11-24t13-20-46-141z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T13:20:46.642Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/882'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
swimlane: null
diffSummary:
  - file: renderer/src/web/woke/pob-builds/BuildDetail.vue
    additions: 4
    deletions: 4
  - file: renderer/src/web/woke/pob-builds/build-model.ts
    additions: 14
    deletions: 0
  - file: renderer/test/woke/pob-builds.test.ts
    additions: 39
    deletions: 1
---
When PoE runs elevated, the overlay can't interact with it; offer to restart the app as admin. No PR yet.
