---
"@citolab/prose-qti": patch
---

Keep `qti-prompt`s whose only content is media. `removeEmptyPrompts` (compose) now also keeps a prompt holding only `audio` or `video`, and `stripEmptyPrompts` (the default roundtrip export transform) no longer drops a prompt holding only an `img`, `audio` or `video` — previously a picture-only prompt was lost on every roundtrip export.
