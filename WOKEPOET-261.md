---
id: WOKEPOET-261
title: Players get "OCR files missing" with no way to fix it in the app
status: In Progress
priority: High
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-13T04:01:07.805Z'
    comment: Created ticket.
---
A player on the public release saw "OCR files missing: tesseract-core-simd.js, opencv.js, eng.traineddata" in Essence scan, pointing at Awakened PoE Trade's releases page.

Every installer ships resources/cv-ocr (checked 0.3.0 and 1.330.0 installer and portable), so on that PC the bundled copy was removed or hidden. Guy's PC hides the problem because his config folder already has the files.

Fix (PR https://github.com/guybnd/woke-poe-trade/pull/409): pick only a complete folder, download cv-ocr.zip into the config folder when none is complete, and point the error at our OCR guide.
