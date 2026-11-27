---
id: WOKEPOET-372
title: 'Megalomaniac searcher: build-aware notable search'
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-18T10:00:08.739Z'
    comment: Created ticket.
    id: a-2026-11-18t10-00-08-739z
  - type: activity
    user: Agent
    date: '2026-11-18T10:02:52.779Z'
    comment: >-
      Mocks and picks page for Guy:
      https://claude.ai/artifact/7cDTZMXj5YkjCqk2UYTW9U (build source, where it
      lives, list layout, count default, full tag list, notes). Picks land in
      its db under picks/* and notes/main. Waiting on Guy; don't build until he
      picks.
    id: a-2026-11-18t10-02-52-779z
  - type: activity
    user: Agent
    date: '2026-11-18T10:06:34.460Z'
    comment: >-
      Guy added: hover tooltip per suggested notable with disable, suggested +
      editable weights, many tags to filter. Mock page v2 adds a working list
      for this (section 3b) and a pick on search mode (count / weighted sum /
      both). Tooltip text comes from passive-tree.json clusters.named.
    id: a-2026-11-18t10-06-34-460z
  - type: comment
    user: Agent
    comment: >-
      Guy's picks (2026-11-18, mock page
      https://claude.ai/artifact/7cDTZMXj5YkjCqk2UYTW9U): source D (PoB or live
      character, then editable tags); where B (standalone panel: Ctrl+Space
      "megalo" + PoB build page button); layout A (chips grouped by tag) with
      per-notable hover tooltip (real text from passive-tree.json
      clusters.named), untick to drop, suggested + editable weights with reset;
      many-tag filter bar; count default 2-of-N; full ~115 tag list. Weights
      pick unanswered: going with both modes (Count default, Weighted sum
      switch) per his message.
    date: '2026-11-18T10:06:58.274Z'
    selfAttested: true
    pin: true
    id: c-2026-11-18t10-06-58-274z
  - type: activity
    user: Agent
    date: '2026-11-18T10:31:19.247Z'
    comment: Updated implementation link.
    id: a-2026-11-18t10-31-19-247z
  - type: activity
    user: Agent
    date: '2026-11-18T10:31:20.434Z'
    comment: >-
      Built and up for merge as PR #617 (woke/megalo-searcher, 39a76f52). The
      adversarial review found 9 issues, all fixed. Local checks pass: tsc,
      eslint, vitest 4542, vite build. Handed to the coordinator for the merge
      thread.
    id: a-2026-11-18t10-31-20-434z
  - type: comment
    user: Agent
    comment: >-
      Megalomaniac searcher merged as #617 (5679732a). Review fixes are in, and
      local checks pass.
    date: '2026-11-18T10:44:29.447Z'
    completionComment: true
    id: c-2026-11-18t10-44-29-447z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-18T10:44:29.447Z'
  - type: comment
    user: Agent
    comment: >-
      Megalomaniac searcher shipped in #617 (5679732a). It reads the PoB build
      or character and tags it with editable tags. Notables show as chips
      grouped by tag, with hover text, ticks and editable weights. Searches can
      use Count or Weighted sum, with a divine price cap. Opens from Ctrl+Space
      "megalo" and PoB › More. Not yet tried in game.
    completionComment: true
    date: '2026-11-18T10:44:35.352Z'
    id: c-2026-11-18t10-44-35-352z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-18T10:44:35.818Z'
  - type: activity
    user: Agent
    date: '2026-11-18T11:46:02.315Z'
    comment: >-
      Follow-ups merged in #619 (fd988335),
      https://github.com/guybnd/woke-poe-trade/pull/619. They add a tools menu
      entry under Builds & trade, one mod per line in the tooltip, Save to Trade
      searches, right-click must-haves (and group), a filter that matches mod
      text, and the price check's seller setting. The window contents stay
      unmounted until the first open. Leftover folder
      E:\Git\woke\wt\megalo-launcher (git worktree already removed) couldn't be
      deleted (permission denied); delete it by hand.
    id: a-2026-11-18t11-46-02-315z
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T04:30:58.308Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/617'
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
version: '0003'
releasedAt: '2026-11-27T04:30:50.393Z'
releaseDocPath: release-notes/0003
---
Guy's ask (2026-11-18): a "Megalomaniac searcher" that suggests a trade search for the Megalomaniac notables relevant to his build.

Sketch:
- Get the build: PoB code, poe.ninja character, or manual tags (Guy wants as many tags as possibly relevant).
- Score Megalomaniac's notable pool (Allocates <notable>, explicit.stat_2954116742 with option ids in stats.ndjson) against the build tags.
- Build a trade search: count filter (2-of-N / 3-of-N), budget.
- Show as toggle chips with a Search button; standalone panel or inside a Megalomaniac price check.

Status: mockups only. Open choices for Guy: build source, where it lives, chip/scoring layout. Don't build until he picks.
