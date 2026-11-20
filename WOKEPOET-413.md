---
id: WOKEPOET-413
title: Travel to hideout button on instant buyout results
status: In Progress
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
---
Guy approved (2026-11-20, project chat). Instant buyout (merchant) listings in the price check get a button that sends you to the seller's hideout; stash listings keep the whisper.

API (confirmed from TradeUtils-PoE1 and poe-overlay-linux): signed-in /api/trade/fetch returns `listing.hideout_token` (JWT, exp ~300 s). POST /api/trade/whisper `{token}` with X-Requested-With + Origin; `{success:true}` travels, `{success:false}` = in demand, retry with `continue: true`; errors as `{error:{code,message}}`.

Mocks: https://claude.ai/artifact/A5yxWPNGwBtZ2UmEdjT4A1 (A door icon recommended, being built). Branch woke/hideout-travel, worktree E:\Git\woke\wt\hideout-travel.
