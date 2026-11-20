---
id: WOKEPOET-413
title: Travel to hideout button on instant buyout results
status: Done
priority: None
effort: M
assignee: unassigned
tags:
  - price-check
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-20T10:13:39.461Z'
    comment: Created ticket.
    id: a-2026-11-20t10-13-39-461z
  - type: activity
    user: Agent
    date: '2026-11-20T10:27:07.638Z'
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/674 (option A). Review
      fixes in: state per token, no resend after travelling. Cloud checks green
      except a loot-filter e2e shard (unrelated), rerunning. Mocks/pick:
      https://claude.ai/artifact/A5yxWPNGwBtZ2UmEdjT4A1
    id: a-2026-11-20t10-27-07-638z
  - type: comment
    user: Agent
    comment: >-
      Merged as #674 (61fa47fd). Dev build reloaded on master. Probe from the
      dev overlay with a fake token got the site's own "Invalid query" (400), so
      the request passes the site's Origin check; the app is signed in. Real
      teleport still untried: needs Guy's click on an instant listing.
    date: '2026-11-20T10:33:34.544Z'
    completionComment: true
    id: c-2026-11-20t10-33-34-544z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-20T10:33:34.544Z'
  - type: comment
    user: Agent
    comment: >-
      Door icon on instant buyout rows travels to the seller's hideout (option
      A). Live in the dev build; in-game teleport awaits Guy's first click.
    completionComment: true
    date: '2026-11-20T10:33:38.338Z'
    id: c-2026-11-20t10-33-38-338z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-20T10:33:38.767Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/674'
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
Guy approved (2026-11-20, project chat). Instant buyout (merchant) listings in the price check get a button that sends you to the seller's hideout; stash listings keep the whisper.

API (confirmed from TradeUtils-PoE1 and poe-overlay-linux): signed-in /api/trade/fetch returns `listing.hideout_token` (JWT, exp ~300 s). POST /api/trade/whisper `{token}` with X-Requested-With + Origin; `{success:true}` travels, `{success:false}` = in demand, retry with `continue: true`; errors as `{error:{code,message}}`.

Mocks: https://claude.ai/artifact/A5yxWPNGwBtZ2UmEdjT4A1 (A door icon recommended, being built). Branch woke/hideout-travel, worktree E:\Git\woke\wt\hideout-travel.
