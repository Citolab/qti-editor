import type { CompatibilityReport } from '@citolab/prose-qti/interfaces';

export const COMPATIBILITY_REPORT_EVENT = 'qti:compatibility:report';

let pending: CompatibilityReport | undefined;

/**
 * Publishes a compatibility report to whatever is listening — and holds onto it for whatever is not
 * listening yet.
 *
 * The event alone is not enough. The report that matters most is the one produced while restoring a
 * document at startup, and that is dispatched from the editor element's `updated()` — which runs
 * during React's DOM commit, before any `useEffect` has registered a listener. Deferring the
 * dispatch a tick narrows the window but does not close it: whether React's passive effects flush
 * before a `setTimeout(0)` is a scheduling detail, not a guarantee, and a startup report was
 * observed firing into an empty room.
 *
 * So the report is also retained. A consumer mounting late calls `consumePendingCompatibilityReport`
 * and gets it anyway, which makes delivery independent of who won the race.
 */
export function publishCompatibilityReport(report: CompatibilityReport): void {
  pending = report;
  document.dispatchEvent(new CustomEvent(COMPATIBILITY_REPORT_EVENT, {
    detail: report,
    bubbles: true,
  }));
}

/**
 * Takes the retained report, if one is waiting. Clears it, so a later mount does not resurface a
 * notice the user has already seen and dismissed.
 */
export function consumePendingCompatibilityReport(): CompatibilityReport | undefined {
  const report = pending;
  pending = undefined;
  return report;
}
