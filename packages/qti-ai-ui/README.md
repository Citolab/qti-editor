# @citolab/qti-ai-ui

Optional Lit primitives for conversational QTI authoring. Small controls, not a chat shell: the
host composes them into its own conversation UI.

```ts
import { registerQtiAiElements } from '@citolab/qti-ai-ui';
registerQtiAiElements(); // explicit; importing the package registers nothing
```

| Element                | Purpose                                                    | Events                                                     |
| ---------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- |
| `qti-ai-proposal`      | Summary, expandable change list, accept/dismiss buttons    | `qti-ai-accept`, `qti-ai-reject`                           |
| `qti-ai-suggestions`   | Up to four follow-up pills                                 | `qti-ai-suggest` (detail: `Suggestion`)                    |
| `qti-ai-clarification` | One question: options, optional free text, "choose for me" | `qti-ai-answer` (detail: `{ questionId, value, skipped }`) |

Labels are properties so hosts can localize them. Styling hooks: CSS custom properties
`--qti-ai-accent`, `--qti-ai-border`, `--qti-ai-surface`, `--qti-ai-hover`, and CSS parts
`proposal`, `suggestion`, `option`.
