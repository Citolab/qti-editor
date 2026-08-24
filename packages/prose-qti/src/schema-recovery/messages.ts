import type { RecoveryChange, RecoveryMessageResolver } from './types.js';

/**
 * Applies a host's message resolver, and survives it failing.
 *
 * Two things worth stating, because both are deliberate:
 *
 * **The built-in English is composed first and replaced second**, rather than the resolver being
 * asked to produce a message from nothing. That is what makes partial overrides the normal case — a
 * host can reword the two kinds it cares about and return `undefined` for the rest. The migration
 * ladder's `getMessage` wraps `addChange` the same way, for the same reason.
 *
 * **A resolver that throws costs a translation, not the recovery.** It is someone else's code running
 * in the one code path that executes only when something has already gone wrong. A missing
 * translation key must not take the document down with it: a change carrying untranslated English is
 * a small loss, an aborted salvage is the whole document.
 */
export function withHostMessage(
  change: RecoveryChange,
  getMessage: RecoveryMessageResolver | undefined,
): RecoveryChange {
  if (!getMessage) return change;
  try {
    const override = getMessage(change);
    return override != null ? { ...change, message: override } : change;
  } catch {
    return change;
  }
}
