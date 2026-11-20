---
id: WOKEPOET-401
title: Refresh the landing page for 1.330.x
status: In Progress
priority: None
effort: None
assignee: unassigned
tags:
  - landing
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-20T01:02:48.172Z'
    comment: Created ticket.
    id: a-2026-11-20t01-02-48-172z
  - type: activity
    user: Agent
    date: '2026-11-20T01:06:02.030Z'
    comment: >-
      Mocks A/B/C posted for Guy's pick:
      https://claude.ai/artifact/RE1GguCZNVsswrAhxsVFkM. Building C (slides +
      live release line) in E:\Git\woke\wt\landing-refresh, branch
      woke/landing-refresh.
    id: a-2026-11-20t01-06-02-030z
  - type: activity
    user: Agent
    date: '2026-11-20T01:28:23.701Z'
    comment: >-
      Option C built as PR #661 (branch woke/landing-refresh): release line from
      GitHub API, 6 new slides with shot tests, 3 rewritten. Bug review next;
      merge waits on Guy's pick.
    id: a-2026-11-20t01-28-23-701z
  - type: activity
    user: Agent
    date: '2026-11-20T03:00:51.587Z'
    comment: >-
      Guy dropped the release line: show all features, update as we go. #661
      reworked (66cbf363): line removed, slides added for Saved searches,
      Stacked decks, Run timer, Wickerman. Sent to merge thread.
    id: a-2026-11-20t03-00-51-587z
---
Landing content (docs/.vitepress/theme/landing/content.js) last changed 2026-11-13. Since then 1.330.5–1.330.10 and unreleased master added: Alt+T atlas/tree overlays, Ctrl+Space lookups (zones, pantheon, saved lists, bestiary recipes, anoints, crafts), Market prices list, map mods two-pane redesign, mod right-click menu, gem/cluster/Viscera version clicks, socket colour tiles, fractured pricing, cluster notable positions, update-while-closed with Go back.

Plan: mocks with options in an artifact for Guy's pick, build the recommended option meanwhile (new slides + shots via landing-highlights.spec.ts, stale slide text rewritten).
