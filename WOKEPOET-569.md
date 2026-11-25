---
id: WOKEPOET-569
title: 'Flaky e2e: map-mods-tabs ''checking a chart shows the verdict card'''
status: Todo
priority: None
effort: None
assignee: unassigned
tags:
  - test
  - flaky
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-24T12:33:14.323Z'
    comment: Created ticket.
    id: a-2026-11-24t12-33-14-323z
  - type: comment
    user: Agent
    comment: >-
      Also flaked once each: trade.spec "reopen" and pins.spec "hideout-to-map
      spot".
    date: '2026-11-24T14:29:13.554Z'
    selfAttested: true
    id: c-2026-11-24t14-29-13-554z
  - type: comment
    user: Agent
    comment: >-
      Also flaked once each (PR 894 CI): glance-bar-fields.spec.ts "with the
      overlay open, the cog opens the bar settings"; dock-menu "undoing one
      dismissal".
    date: '2026-11-24T17:26:36.557Z'
    selfAttested: true
    id: c-2026-11-24t17-26-36-557z
  - type: comment
    user: Agent
    comment: >-
      Lead from the PR 904 thread: on master, map-mods-tabs.spec.ts > "checking
      a chart shows the verdict card with its mods" fails ~1 in 3. After Alt+M
      the Map check card says "That item isn't a map…" for
      items/chart-sandy-seabed.txt.
    date: '2026-11-25T03:34:13.221Z'
    selfAttested: true
    pin: true
    id: c-2026-11-25t03-34-13-221z
  - type: comment
    user: Agent
    comment: >-
      Also flaky on master: dock-menu :136 and chip-settings-layout :60. Cause:
      the Ctrl+Space search box is missing when they run after other specs in
      the same worker.
    date: '2026-11-25T06:22:15.855Z'
    selfAttested: true
    id: c-2026-11-25t06-22-15-855z
  - type: comment
    user: Agent
    comment: >-
      Ctrl+Space flakes (forbidden-pair, search-settings, chip-settings-layout
      :60) fixed in PR 927: early hotkey press before the lazy search widget
      mounted was lost. Not covered: map-mods-tabs chart, dock-menu :136.
    date: '2026-11-25T07:25:14.572Z'
    selfAttested: true
    pin: true
    id: c-2026-11-25t07-25-14-572z
  - type: comment
    user: Agent
    comment: >-
      map-mods-tabs chart-spec flake: root cause was a lost early Alt+M (lazy
      card chunk not loaded yet), fixed in PR 940
      (https://github.com/guybnd/woke-poe-trade/pull/940, c69f8a0). Still not
      covered: dock-menu :136.
    date: '2026-11-25T13:09:52.932Z'
    selfAttested: true
    pin: true
    id: c-2026-11-25t13-09-52-932z
---
Failed once in shard 2/4 on PR 864's CI run, passed on re-run. Investigate the timing/flake.
