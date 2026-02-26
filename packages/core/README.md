# @qti-editor/core

Core functionality for QTI Editor - ProseMirror plugins and utilities.

## Overview

This package provides the foundation that UI components build upon. It contains:

- **ProseMirror plugins** - Editor extensions that track state and emit events
- **Types** - TypeScript interfaces for plugin options and event payloads
- **Utilities** - Helper functions for common editor operations

## Installation

```bash
npm install @qti-editor/core
# or
pnpm add @qti-editor/core
```

## Modules

### `@qti-editor/core/attributes`

A ProseMirror plugin that tracks selected nodes with schema attributes and dispatches events for UI components to consume.

```typescript
import { qtiAttributesExtension, updateQtiNodeAttrs } from '@qti-editor/core/attributes';
import type { SidePanelEventDetail } from '@qti-editor/core/attributes';

// Add to your editor
const editor = createEditor({
  extensions: [
    qtiAttributesExtension({
      eventName: 'qti:attributes:update',
      eventTarget: document,
      onUpdate: (detail, state) => {
        console.log('Selected nodes:', detail.nodes);
      },
    }),
  ],
});

// Listen for attribute updates
document.addEventListener('qti:attributes:update', (event) => {
  const detail = (event as CustomEvent<SidePanelEventDetail>).detail;
  // Update your UI
});

// Programmatically update node attributes
updateQtiNodeAttrs(editor.view, nodePos, { newAttr: 'value' });
```

## Design Philosophy

This package follows the ProseKit pattern of separating core logic from UI:

- **Core (this package)**: Pure logic, framework-agnostic, installed via npm
- **UI (registry components)**: Customizable components, copied into your project

This separation allows you to:
1. Keep core functionality up-to-date via npm
2. Fully customize the UI layer for your needs
3. Use any frontend framework for the UI
