/**
 * The two-way channel between the recovery notice and the editor's markers.
 *
 * They cannot talk directly. The notice is React, the editor is a Lit element wrapping ProseMirror,
 * and the notice is a sibling of the element rather than a child — so there is no prop to pass and
 * no context to share. What passes between them is small and known: which sites actually got marked,
 * and a request to go to one or clear them all.
 *
 * Retained rather than purely event-driven, for the same reason `report-channel.ts` is: the editor
 * publishes while mounting, during React's DOM commit, and no `useEffect` has run yet. A subscriber
 * arriving late is the normal case here, not the exception.
 */

/** A request from the notice to the editor. */
export type RecoveryRequest =
  | { type: 'focus'; id: string }
  | { type: 'clear' };

type MarkerListener = (siteIds: string[]) => void;
type RequestListener = (request: RecoveryRequest) => void;

let markedSiteIds: string[] = [];
const markerListeners = new Set<MarkerListener>();
const requestListeners = new Set<RequestListener>();

/**
 * Announces which recovery sites the editor was able to mark.
 *
 * Only these can be offered as "take me there". A site is dropped when the document moved under it
 * (see `resolveRecoverySites`), and offering to navigate to a marker that does not exist would be a
 * button that silently does nothing.
 */
export function publishRecoveryMarkers(siteIds: readonly string[]): void {
  markedSiteIds = [...siteIds];
  for (const listener of markerListeners) listener(markedSiteIds);
}

/** Subscribes to the marked-site list, called immediately with what is already marked. */
export function subscribeRecoveryMarkers(listener: MarkerListener): () => void {
  markerListeners.add(listener);
  listener(markedSiteIds);
  return () => markerListeners.delete(listener);
}

/** Asks the editor to scroll to a site and put the cursor there. */
export function requestRecoveryFocus(id: string): void {
  for (const listener of requestListeners) listener({ type: 'focus', id });
}

/** Asks the editor to remove every marker — the reader has seen the news. */
export function requestRecoveryClear(): void {
  markedSiteIds = [];
  for (const listener of requestListeners) listener({ type: 'clear' });
  for (const listener of markerListeners) listener(markedSiteIds);
}

/** Registers the editor's side of the channel. */
export function onRecoveryRequest(listener: RequestListener): () => void {
  requestListeners.add(listener);
  return () => requestListeners.delete(listener);
}
