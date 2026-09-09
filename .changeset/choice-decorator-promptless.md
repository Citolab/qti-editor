---
"@citolab/prose-qti": patch
---

Choice decorator: offer the remove (×) affordance on interactions without a `qti-prompt`. The
decorator counted choices as `childCount - 1`, assuming a prompt that the schema makes optional, so
promptless two-choice interactions showed no × at all.
