import { excerptOf, recoveryKindOf, siteIdOf } from '@citolab/prose-qti/schema-recovery';

import type { CompatibilityChange } from '@citolab/prose-qti/interfaces';
import type { RecoveryChangeKind, RecoverySite } from '@citolab/prose-qti/schema-recovery';

/** The i18next `t` this module needs, and nothing more, so it can be called from React or Lit. */
export type Translate = (key: string, options?: Record<string, unknown>) => string;

export interface RecoveryItem {
  key: string;
  /** The site to offer navigation to, when the editor managed to mark it. */
  siteId?: string;
  /** What was removed, in the reader's language. */
  label: string;
  /** The reader's own content, quoted — the only part that says whether it mattered. */
  quote?: string;
  /** What survived, when something did. */
  aside?: string;
  /** The schema's own name for it, for whoever is debugging rather than authoring. */
  technical?: string;
}

export interface RecoveryGroup {
  id: 'content' | 'formatting' | 'settings' | 'other';
  title: string;
  items: RecoveryItem[];
}

/**
 * Turns the change log into something worth reading.
 *
 * The log is written for the pipeline: one entry per removal, in document order, phrased in schema
 * vocabulary — *Removed unknown node "qtiGapMatchInteraction" and kept its 3 child node(s)* at
 * `$.content[4].content[1]`. Every word of that is true and none of it tells the person who wrote
 * the question what they lost.
 *
 * So the same facts are re-cut for a reader: grouped by what kind of thing went (content,
 * formatting, settings), named in words rather than type names, and quoted from their own document
 * wherever there was text to quote. The type name stays, in small print, because the person
 * debugging the schema change is also a reader and it is the only thing they need.
 */
export function groupRecoveryChanges(
  changes: readonly CompatibilityChange[],
  t: Translate,
): RecoveryGroup[] {
  const groups: Record<RecoveryGroup['id'], RecoveryItem[]> = {
    content: [],
    formatting: [],
    settings: [],
    other: [],
  };

  changes.forEach((change, index) => {
    const item = describeChange(change, index, t);
    groups[item.group].push(item.item);
  });

  return (['content', 'formatting', 'settings', 'other'] as const)
    .filter(id => groups[id].length > 0)
    .map(id => ({ id, title: t(GROUP_TITLE_KEYS[id]), items: groups[id] }));
}

const GROUP_TITLE_KEYS = {
  content: 'compatibilityGroupContent',
  formatting: 'compatibilityGroupFormatting',
  settings: 'compatibilityGroupSettings',
  other: 'compatibilityGroupOther',
} as const;

function describeChange(
  change: CompatibilityChange,
  index: number,
  t: Translate,
): { group: RecoveryGroup['id']; item: RecoveryItem } {
  const key = `${change.code}-${change.path ?? index}-${index}`;
  const siteId = siteIdOf(change);
  const quote = excerptOf(change);

  switch (kindOf(change)) {
    case 'dropped-mark': {
      const markType = stringOf(change.data?.markType) ?? change.nodeType ?? '';
      return {
        group: 'formatting',
        item: {
          key,
          siteId,
          label: t('compatibilityFormattingRemoved', { name: typeLabel(markType, t) }),
          quote,
          technical: markType,
        },
      };
    }

    case 'reset-attribute':
    case 'dropped-attribute': {
      const attribute = change.attributeName ?? '';
      const wasReset = kindOf(change) === 'reset-attribute';
      return {
        group: 'settings',
        item: {
          key,
          siteId,
          label: t(wasReset ? 'compatibilitySettingReset' : 'compatibilitySettingRemoved', {
            attribute,
            name: typeLabel(change.nodeType ?? '', t),
          }),
          quote,
          aside: wasReset
            ? t('compatibilitySettingRejectedValue', { value: formatValue(change.data?.rejectedValue) })
            : undefined,
          technical: change.nodeType ? `${change.nodeType}.${attribute}` : attribute,
        },
      };
    }

    case 'unwrapped-node':
    case 'unrepresentable-element': {
      const keptChildren = typeof change.data?.unwrappedChildren === 'number'
        ? change.data.unwrappedChildren
        : 0;
      return {
        group: 'content',
        item: {
          key,
          siteId,
          label: t('compatibilityContentRemoved', { name: typeLabel(change.nodeType ?? '', t) }),
          quote,
          aside: keptChildren > 0
            ? t('compatibilityKeptChildren', { count: keptChildren })
            : t('compatibilityKeptNothing'),
          technical: change.nodeType,
        },
      };
    }

    default:
      // 'dropped-entry', and anything from the migration ladder, which describes edits rather than
      // removals and carries no kind. The pipeline's own message is the honest fallback: it is
      // English, and it is better than silence about a change nobody has written a phrasing for.
      return {
        group: 'other',
        item: { key, siteId, label: change.message, quote, technical: change.nodeType },
      };
  }
}

/**
 * The kind of removal, declared where possible and inferred where not.
 *
 * `kind` has only been on changes since the message layer was opened up, and a change can outlive the
 * code that made it — one sits in `localStorage` inside a quarantined document right now. So the old
 * inference stays as a fallback: a mark drop was `data.markType`, an attribute reset was
 * `data.rejectedValue`. New changes never reach it.
 */
function kindOf(change: CompatibilityChange): RecoveryChangeKind | undefined {
  const declared = recoveryKindOf(change);
  if (declared) return declared;

  if (stringOf(change.data?.markType)) return 'dropped-mark';
  if (change.code === 'UNKNOWN_ATTRIBUTE_PRESERVED') {
    return 'rejectedValue' in (change.data ?? {}) ? 'reset-attribute' : 'dropped-attribute';
  }
  if (change.code === 'UNKNOWN_NODE_PRESERVED' && change.nodeType) return 'unwrapped-node';
  return undefined;
}

/**
 * A node or mark type in words.
 *
 * Asks i18n first, under `compatibilityTypeLabel.<type>`, and falls back to
 * {@link humanizeTypeName}. That indirection is the whole extension point for naming: a host with its
 * own node types — or a house style that says "gap-match question" where this says "gap match
 * interaction" — adds a resource bundle and is done, with no second mechanism to learn and nothing to
 * rebuild. The algorithm stays as the answer for everything nobody has named, which is most things,
 * since the types that show up here are the ones the schema no longer has.
 */
function typeLabel(type: string, t: Translate): string {
  if (!type) return t('compatibilityUnnamedContent');
  const override = t(`compatibilityTypeLabel.${type}`, { defaultValue: '' });
  return override || humanizeTypeName(type);
}

function stringOf(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Turns a schema type name into words.
 *
 * `qtiGapMatchInteraction` and `qti-companion-materials-info` both become "gap match interaction" /
 * "companion materials info" — the QTI prefix is noise to a reader and the casing is an artefact of
 * where the name came from. No dictionary, deliberately: the names this has to handle are the ones
 * the schema no longer has, so a lookup table would be missing exactly the entries that matter.
 */
export function humanizeTypeName(type: string): string {
  const words = type
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 0);

  const withoutPrefix = words[0] === 'qti' ? words.slice(1) : words;
  return (withoutPrefix.length ? withoutPrefix : words).join(' ');
}

/** The tooltip on a marker in the document. Same vocabulary as the notice, one line of it. */
export function describeRecoverySite(site: RecoverySite, t: Translate): string {
  const name = typeLabel(site.removedType ?? '', t);
  const label = site.kind === 'dropped-mark'
    ? t('compatibilityFormattingRemoved', { name })
    : site.kind === 'reset-attribute' || site.kind === 'dropped-attribute'
      ? t('compatibilitySettingChangedHere', { attribute: site.removedType ?? '' })
      : t('compatibilityContentRemoved', { name });

  return site.excerpt ? `${label} — “${site.excerpt}”` : label;
}

function formatValue(value: unknown): string {
  if (typeof value === 'string') return `“${value}”`;
  if (value === null) return 'null';
  if (value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
