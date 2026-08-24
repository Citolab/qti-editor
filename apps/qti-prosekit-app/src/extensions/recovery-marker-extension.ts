/**
 * ProseKit wrapper around the recovery-marker plugin.
 *
 * The plugin itself is generic ProseMirror and lives in `@citolab/prose-qti/schema-recovery`; all
 * this adds is the ProseKit binding and this app's own words for a marker's tooltip. The classes are
 * named here too, because they are styled in `style.css` and the pairing should be visible from both
 * ends.
 */

import { createRecoveryMarkerPlugin } from '@citolab/prose-qti/schema-recovery';
import { definePlugin } from 'prosekit/core';

import { i18n } from '../i18n.js';
import { describeRecoverySite } from '../lib/compatibility/describe.js';

export const RECOVERY_MARK_CLASS = 'qti-recovery-mark';
export const RECOVERY_GAP_CLASS = 'qti-recovery-gap';

export function defineRecoveryMarkerExtension() {
  return definePlugin(() => createRecoveryMarkerPlugin({
    markClassName: RECOVERY_MARK_CLASS,
    gapClassName: RECOVERY_GAP_CLASS,
    describeSite: resolved => describeRecoverySite(resolved.site, (key, options) => i18n.t(key, options ?? {})),
  }));
}
