---
id: WOKEPOET-450
title: 'Sales in Net worth: trade history reader, Sold section, Sales view'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - personal
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-21T10:20:44.317Z'
    comment: Created ticket.
    id: a-2026-11-21t10-20-44-317z
  - type: activity
    user: Agent
    date: '2026-11-21T10:21:02.377Z'
    comment: >-
      Options A/B/C sent to Guy on a card in project thread
      cmsg_01TFAVQEVFL8KKQ8fhVfpfJo98Es9he4ogKwZ5Em98fm1G; waiting on his pick.
    id: a-2026-11-21t10-21-02-377z
  - type: activity
    user: Agent
    date: '2026-11-21T10:24:37.964Z'
    comment: >-
      Guy picked A (opt-in reader). Net worth integration mockups sent:
      https://claude.ai/artifact/M9rk3zWppKwDT7eVb91bTm. Waiting on his pick.
    id: a-2026-11-21t10-24-37-964z
  - type: activity
    user: Agent
    date: '2026-11-21T10:27:35.583Z'
    comment: >-
      Guy picked A + C (Sold section + merged sale lines, plus a Holdings/Sales
      switch with a per-type summary). Summary layout mockups sent:
      https://claude.ai/artifact/UVx98gZ39f8EWwFFPmhzjS. Waiting on his pick.
    id: a-2026-11-21t10-27-35-583z
  - type: activity
    user: Agent
    date: '2026-11-21T10:33:47.958Z'
    comment: Updated title. Updated description.
    id: a-2026-11-21t10-33-47-958z
  - type: activity
    user: Agent
    date: '2026-11-21T10:53:04.152Z'
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/728 open; review fixes in
      590144be; CI running.
    id: a-2026-11-21t10-53-04-152z
  - type: comment
    user: Agent
    comment: >-
      Merged PR #728 (b4965510). The review findings are fixed and CI is green.
      A visual check over CDP follows once the dev build pulls master.
    date: '2026-11-21T11:08:01.222Z'
    completionComment: true
    id: c-2026-11-21t11-08-01-222z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-21T11:08:01.222Z'
  - type: comment
    user: Agent
    comment: >-
      Merged PR #728. A trade history reader (/api/trade/history/{league}, kept
      per league, rate-paced). In Net worth: a Sold section, Sold today, sale
      dots on the chart, sale rows in the change list, and a Holdings/Sales
      switch with ranked bars per type. Ctrl+Space finds past sales. An
      adversarial review was done and its findings fixed.
    completionComment: true
    date: '2026-11-21T11:08:07.001Z'
    id: c-2026-11-21t11-08-07-001z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T11:08:07.608Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/728'
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
Guy's picks (2026-11-21): opt-in reader (A), Net worth integration A + C (mockups https://claude.ai/artifact/M9rk3zWppKwDT7eVb91bTm), per-type summary layout 1 "ranked bars" (https://claude.ai/artifact/UVx98gZ39f8EWwFFPmhzjS).

Endpoint (confirmed in Guy's signed-in session via the app proxy):
- GET https://www.pathofexile.com/api/trade/history/{league} with POESESSID (session cookies). HTML /trade/history is behind a Cloudflare challenge; the API is not.
- Reply: {result: [{time ISO, item_id sha, item: full item JSON (frameType, name, typeLine, icon, stackSize...), price: {amount, currency}}]}, newest first, 100 entries (~2.5 days for Guy). No paging seen, so the app must keep its own history, merging by item_id.
- Wrong league -> 400 {"error":{"code":2,"message":"Invalid query"}}.
- Rate limit policy trade-history-request-limit, Account rule: 5/60s, 10/600s, 15/10800s (penalty 60/120/3600 s). Very tight: auto reads must be rare and leave room for Guy using the website.

Plan:
1. Main: TradeHistoryReader in main/src/woke/personal (reader op, same opt-in gate, sessionFetch + RateLimiter), cache per league, merge by item_id.
2. Net worth A: Sold section (today/7d totals, list, vs poe.ninja), merged sale lines in the change list counted as swaps, gold sale dots on the chart.
3. Net worth C: Holdings/Sales switch; Sales view with range, ranked bars per type (uniques, gems, rare gear, currency, fragments & scarabs, div cards, maps, other) that filter a searchable sales table.
4. Ctrl+Space search: past sales.
