import { Plugin, PluginKey } from 'prosekit/pm/state';
import type { Node as PmNode } from 'prosekit/pm/model';

const gapMatchNodeViewPluginKey = new PluginKey('gap-match-node-view');

function syncAttribute(dom: HTMLElement, name: string, nextValue: string | null): void {
  const currentValue = dom.getAttribute(name);
  if (nextValue == null) {
    if (currentValue !== null) {
      dom.removeAttribute(name);
    }
    return;
  }

  if (currentValue !== nextValue) {
    dom.setAttribute(name, nextValue);
  }
}

function applyAttrs(dom: HTMLElement, attrs: PmNode['attrs']): void {
  syncAttribute(dom, 'max-associations', String(attrs.maxAssociations ?? 1));
  syncAttribute(
    dom,
    'min-associations',
    (attrs.minAssociations as number) > 0 ? String(attrs.minAssociations) : null,
  );
  syncAttribute(dom, 'shuffle', attrs.shuffle ? 'true' : null);
  syncAttribute(dom, 'class', (attrs.class as string | null) ?? null);
  syncAttribute(dom, 'correct-response', (attrs.correctResponse as string | null) ?? null);
  syncAttribute(dom, 'response-identifier', (attrs.responseIdentifier as string | null) ?? null);
}

/**
 * Provides a custom node view for qtiGapMatchInteraction that updates attributes
 * in place rather than recreating the DOM element on every correctResponse change.
 *
 * Without this, ProseMirror's sameMarkup check fails when correctResponse changes,
 * causing the entire element subtree to be destroyed and recreated synchronously
 * inside the click handler — before applyVisualState() can run on the live element.
 */
export function createGapMatchNodeViewPlugin(): Plugin {
  return new Plugin({
    key: gapMatchNodeViewPluginKey,
    props: {
      nodeViews: {
        qtiGapMatchInteraction(node) {
          const dom = document.createElement('qti-gap-match-interaction');
          applyAttrs(dom, node.attrs);

          return {
            dom,
            contentDOM: dom,
            update(newNode: PmNode): boolean {
              if (newNode.type.name !== 'qtiGapMatchInteraction') return false;
              applyAttrs(dom, newNode.attrs);
              return true;
            },
            ignoreMutation(record: MutationRecord): boolean {
              // Ignore attribute mutations on the interaction element itself.
              // These come from applyVisualState() (data-* attrs on children propagate
              // up via nearestDesc) or from our own applyAttrs() call in update().
              // Without this, every applyVisualState() would trigger a ProseMirror
              // reconciliation loop via the mutation observer.
              return record.type === 'attributes';
            },
          };
        },
      },
    },
  });
}
