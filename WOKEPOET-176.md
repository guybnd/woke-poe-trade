---
id: WOKEPOET-176
title: Rewrite the help pages for this app
status: Grooming
priority: Medium
effort: M
assignee: unassigned
tags:
  - docs
  - landing
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-168
history:
  - type: activity
    user: Agent
    date: '2026-11-10T02:55:51.524Z'
    comment: Created as subtask of WOKEPOET-168.
---
Review finding B5.
- `docs/faq.md` never mentions this app; none of the 28 tools has a help page.
- `docs/ocr-guide.md` tells players to download OCR files by hand from upstream's release, though the installer ships them. Cut to two lines.
- `DEVELOPING.md` "How to develop" points at upstream's CI file.
- `.github/FUNDING.yml` shows a Sponsor button for upstream's Patreon. Ask Guy if that is meant as credit.

Idea: generate one help page per tool from `renderer/src/web/woke/modules.ts`, which already feeds the landing page.
