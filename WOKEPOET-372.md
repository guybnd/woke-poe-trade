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
---
Guy's ask (2026-11-18): a "Megalomaniac searcher" that suggests a trade search for the Megalomaniac notables relevant to his build.

Sketch:
- Get the build: PoB code, poe.ninja character, or manual tags (Guy wants as many tags as possibly relevant).
- Score Megalomaniac's notable pool (Allocates <notable>, explicit.stat_2954116742 with option ids in stats.ndjson) against the build tags.
- Build a trade search: count filter (2-of-N / 3-of-N), budget.
- Show as toggle chips with a Search button; standalone panel or inside a Megalomaniac price check.

Status: mockups only. Open choices for Guy: build source, where it lives, chip/scoring layout. Don't build until he picks.
