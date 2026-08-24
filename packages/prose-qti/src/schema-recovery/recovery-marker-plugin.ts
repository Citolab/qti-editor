import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

import { resolveRecoverySites, type ResolvedRecoverySite } from './recovery-sites.js';

import type { RecoverySite } from './types.js';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { Command, EditorState } from 'prosemirror-state';

export interface RecoveryMarkerOptions {
  /** Class applied to surviving content that sits where something was removed. */
  markClassName?: string;
  /** Class applied to the widget standing in for content that left nothing behind. */
  gapClassName?: string;
  /**
   * Tooltip text for a marker. Supply this to say it in the reader's language — the default is
   * English, which is the one thing a package cannot get right on a host's behalf.
   */
  describeSite?: (site: ResolvedRecoverySite) => string;
}

export interface RecoveryMarkerState {
  decorations: DecorationSet;
  /** Sites that resolved against the document, with positions kept current through edits. */
  sites: ResolvedRecoverySite[];
}

interface RecoveryMarkerMeta {
  sites?: readonly RecoverySite[];
  clear?: true;
}

export const recoveryMarkerPluginKey = new PluginKey<RecoveryMarkerState>('recovery-markers');

/**
 * Marks the places in a document where content was removed to make it loadable.
 *
 * A report that says "an interaction was removed" leaves the reader to find the hole themselves, in
 * a document they cannot compare against anything — the original is not on screen and, by
 * definition, cannot be opened. So the report names what went, and this names where.
 *
 * The marks are decorations, so they touch neither the document nor what gets saved, and they follow
 * the content as it is edited. They are set after the document is in place rather than at
 * construction, because that is when the positions can be resolved:
 *
 *   view.dispatch(setRecoverySites(sites)(view.state, view.dispatch))
 *
 * A host that wants to offer "take me there" reads {@link listRecoverySites} for the sites that
 * actually resolved — never the raw list, some of which may have been discarded as unsafe to mark —
 * and runs {@link focusRecoverySite} for the chosen one.
 */
export function createRecoveryMarkerPlugin(options: RecoveryMarkerOptions = {}): Plugin<RecoveryMarkerState> {
  const markClassName = options.markClassName ?? 'pm-recovery-mark';
  const gapClassName = options.gapClassName ?? 'pm-recovery-gap';
  const describeSite = options.describeSite ?? describe;

  return new Plugin<RecoveryMarkerState>({
    key: recoveryMarkerPluginKey,
    state: {
      init: () => ({ decorations: DecorationSet.empty, sites: [] }),
      apply(tr, previous) {
        const meta = tr.getMeta(recoveryMarkerPluginKey) as RecoveryMarkerMeta | undefined;

        if (meta?.clear) return { decorations: DecorationSet.empty, sites: [] };

        if (meta?.sites) {
          const sites = resolveRecoverySites(tr.doc, meta.sites);
          return {
            decorations: decorationsFor(tr.doc, sites, { markClassName, gapClassName, describeSite }),
            sites,
          };
        }

        if (!tr.docChanged) return previous;

        // Follow the content: a marker that stayed put while its paragraph moved would point at
        // whatever slid into place, which is worse than not marking at all.
        return {
          decorations: previous.decorations.map(tr.mapping, tr.doc),
          sites: previous.sites.map(site => ({
            ...site,
            from: tr.mapping.map(site.from, -1),
            to: tr.mapping.map(site.to, 1),
          })),
        };
      },
    },
    props: {
      decorations: state => recoveryMarkerPluginKey.getState(state)?.decorations,
    },
  });
}

/** Marks the given sites, replacing any already marked. */
export function setRecoverySites(sites: readonly RecoverySite[]): Command {
  return (state, dispatch) => {
    if (dispatch) dispatch(state.tr.setMeta(recoveryMarkerPluginKey, { sites }));
    return true;
  };
}

/** Removes every marker — for when the reader has seen the news and dismissed it. */
export function clearRecoverySites(): Command {
  return (state, dispatch) => {
    if (dispatch) dispatch(state.tr.setMeta(recoveryMarkerPluginKey, { clear: true }));
    return true;
  };
}

/** The sites that resolved against the document, in the order they were recorded. */
export function listRecoverySites(state: EditorState): ResolvedRecoverySite[] {
  return recoveryMarkerPluginKey.getState(state)?.sites ?? [];
}

/** Puts the selection at a site and scrolls it into view. Returns false if the id is not marked. */
export function focusRecoverySite(id: string): Command {
  return (state, dispatch) => {
    const site = listRecoverySites(state).find(candidate => candidate.id === id);
    if (!site) return false;
    if (!dispatch) return true;

    const from = Math.min(Math.max(site.from, 0), state.doc.content.size);
    const selection = TextSelection.near(state.doc.resolve(from));
    dispatch(state.tr.setSelection(selection).scrollIntoView());
    return true;
  };
}

function decorationsFor(
  doc: ProseMirrorNode,
  sites: readonly ResolvedRecoverySite[],
  labels: { markClassName: string; gapClassName: string; describeSite: (site: ResolvedRecoverySite) => string },
): DecorationSet {
  const decorations = sites.flatMap(site => {
    if (site.from === site.to) {
      return [Decoration.widget(site.from, () => gapWidget(site, labels.gapClassName, labels.describeSite(site)), {
        side: -1,
        key: `recovery-gap-${site.id}`,
      })];
    }

    const attrs = {
      class: labels.markClassName,
      'data-recovery-site': site.id,
      title: labels.describeSite(site),
    };

    // One inline decoration can span any number of text nodes, but a node decoration describes
    // exactly one node — so a site covering several gets one apiece.
    return site.inline
      ? [Decoration.inline(site.from, site.to, attrs)]
      : site.ranges.map(range => Decoration.node(range.from, range.to, attrs));
  });

  return DecorationSet.create(doc, decorations);
}

/**
 * The stand-in for content that left nothing behind.
 *
 * Contains no text: it is a marker in a document the user is editing, and anything readable inside
 * it would be mistaken for their own content — or worse, exported as if it were.
 */
function gapWidget(site: ResolvedRecoverySite, className: string, title: string): HTMLElement {
  const element = document.createElement('span');
  element.className = className;
  element.setAttribute('data-recovery-site', site.id);
  element.setAttribute('aria-hidden', 'true');
  element.title = title;
  return element;
}

/** The default tooltip. Overridable via `describeSite`, which is how a host localises it. */
function describe(site: ResolvedRecoverySite): string {
  const { removedType, excerpt } = site.site;
  const subject = removedType ?? 'content';
  return excerpt ? `Removed: ${subject} — “${excerpt}”` : `Removed: ${subject}`;
}
