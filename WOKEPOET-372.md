---
id: WOKEPOET-372
title: 'Megalomaniac searcher: build-aware notable search'
status: Grooming
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
---
Guy's ask (2026-11-18): a "Megalomaniac searcher" that suggests a trade search for the Megalomaniac notables relevant to his build.

Sketch:
- Get the build: PoB code, poe.ninja character, or manual tags (Guy wants as many tags as possibly relevant).
- Score Megalomaniac's notable pool (Allocates <notable>, explicit.stat_2954116742 with option ids in stats.ndjson) against the build tags.
- Build a trade search: count filter (2-of-N / 3-of-N), budget.
- Show as toggle chips with a Search button; standalone panel or inside a Megalomaniac price check.

Status: mockups only. Open choices for Guy: build source, where it lives, chip/scoring layout. Don't build until he picks.
