import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { groupRecoveryChanges } from '../../lib/compatibility/describe.js';
import {
  requestRecoveryClear,
  requestRecoveryFocus,
  subscribeRecoveryMarkers,
} from '../../lib/compatibility/recovery-channel.js';
import {
  COMPATIBILITY_REPORT_EVENT,
  consumePendingCompatibilityReport,
} from '../../lib/compatibility/report-channel.js';
import { getActiveStorageScope, readQuarantinedDoc } from '../../lib/fileStore.js';

import type { RecoveryItem } from '../../lib/compatibility/describe.js';
import type { CompatibilityChange, CompatibilityReport } from '@citolab/prose-qti/interfaces';

/**
 * Tells the user what opening their document cost them.
 *
 * The compatibility pipeline has always produced a report — it was dispatched on `document` as
 * `qti:compatibility:report` and nothing anywhere listened for it, so every migration and every
 * salvaged node was announced to no one. This is that listener, and it now speaks for four paths:
 * the restore at startup, opening a saved file, importing QTI XML, and importing JSON.
 *
 * Two kinds of news, and they are not the same kind:
 *
 *   - **errors** — the document could not be read at all, and nothing was changed. The file is
 *     untouched. There is no detail to expand, only the reason.
 *   - **warnings** — content was removed to make the document loadable. Each one is named, quoted
 *     from the user's own text where there was text to quote, and — when the editor managed to mark
 *     the spot — offered with a way to go and look at it.
 *
 * A clean migration is deliberately silent. It changed the document in ways the user did not ask
 * about and cannot act on. Removed content is different: the file no longer round-trips, and only
 * the user knows whether what went missing mattered.
 */
export function CompatibilityNotice() {
  const { t } = useTranslation();
  const [report, setReport] = useState<CompatibilityReport | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [markedSiteIds, setMarkedSiteIds] = useState<string[]>([]);

  useEffect(() => {
    const onReport = (event: Event) => {
      const detail = (event as CustomEvent<CompatibilityReport>).detail;
      if (!detail?.hasWarnings && !detail?.hasErrors) return; // clean migrations are not news
      setReport(detail);
      setExpanded(false);
    };
    document.addEventListener(COMPATIBILITY_REPORT_EVENT, onReport);

    // The startup report is published before React attaches this listener, so collect it directly
    // rather than relying on having been mounted in time.
    const alreadyPublished = consumePendingCompatibilityReport();
    if (alreadyPublished?.hasWarnings || alreadyPublished?.hasErrors) setReport(alreadyPublished);

    return () => document.removeEventListener(COMPATIBILITY_REPORT_EVENT, onReport);
  }, []);

  // Which sites the editor actually managed to mark. Only these can be navigated to.
  useEffect(() => subscribeRecoveryMarkers(setMarkedSiteIds), []);

  const dismiss = useCallback(() => {
    setReport(null);
    requestRecoveryClear();
  }, []);

  const changes = useMemo(
    () => report?.items.flatMap(item => item.changes) ?? [],
    [report],
  );
  const errors = changes.filter(change => change.severity === 'error');
  const warnings = changes.filter(change => change.severity === 'warning');
  const groups = useMemo(() => groupRecoveryChanges(warnings, t), [warnings, t]);

  if (!report || (errors.length === 0 && warnings.length === 0)) return null;

  const isError = errors.length > 0;
  const palette = isError ? ERROR_PALETTE : WARNING_PALETTE;

  return (
    <div
      role={isError ? 'alert' : 'status'}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '10px 16px',
        background: palette.background,
        borderBottom: `1px solid ${palette.border}`,
        color: palette.text,
        font: '13px/1.5 system-ui, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ flex: 1 }}>
          {isError ? (
            <>
              <strong>{t('compatibilityCouldNotOpen', { name: labelOf(report) })}</strong>{' '}
              <span style={{ opacity: 0.85 }}>{errors.map(errorMessage).join(' ')}</span>{' '}
              <span style={{ opacity: 0.85 }}>{t('compatibilityFileUntouched')}</span>
            </>
          ) : (
            <>
              {t('compatibilityRemoved', { count: warnings.length })}{' '}
              <span style={{ opacity: 0.85 }}>{t('compatibilityKeptRest')}</span>
            </>
          )}
        </span>

        {!isError && (
          <button type="button" onClick={() => setExpanded(value => !value)} style={buttonStyle}>
            {expanded ? t('compatibilityHideDetails') : t('compatibilityShowDetails')}
          </button>
        )}
        <DownloadOriginalButton label={t('compatibilityDownloadOriginal')} />
        <button
          type="button"
          onClick={dismiss}
          aria-label={t('compatibilityDismiss')}
          style={buttonStyle}
        >
          ✕
        </button>
      </div>

      {expanded && !isError && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBlockStart: 4 }}>
          {groups.map(group => (
            <section key={group.id}>
              <h3 style={{ margin: 0, font: '600 12px/1.6 system-ui, sans-serif', opacity: 0.8 }}>
                {group.title}
              </h3>
              <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                {group.items.map(item => (
                  <ItemRow
                    key={item.key}
                    item={item}
                    canFocus={item.siteId != null && markedSiteIds.includes(item.siteId)}
                    focusLabel={t('compatibilityGoTo')}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ItemRow({ item, canFocus, focusLabel }: {
  item: RecoveryItem;
  canFocus: boolean;
  focusLabel: string;
}) {
  return (
    <li style={{ marginBlockEnd: 2 }}>
      <span>{item.label}</span>
      {item.quote && (
        <span style={{ fontStyle: 'italic' }}> — “{item.quote}”</span>
      )}
      {item.aside && <span style={{ opacity: 0.75 }}> ({item.aside})</span>}
      {item.technical && (
        <code style={{ marginInlineStart: 6, opacity: 0.6, fontSize: '0.9em' }}>{item.technical}</code>
      )}
      {canFocus && item.siteId && (
        <button
          type="button"
          onClick={() => requestRecoveryFocus(item.siteId!)}
          style={{ ...buttonStyle, marginInlineStart: 8, padding: '0 6px' }}
        >
          {focusLabel}
        </button>
      )}
    </li>
  );
}

/**
 * Hands back the document that could not be opened.
 *
 * The quarantine copy existed from the start and there was no way to reach it, which makes a safety
 * net nobody can climb into. Rendered only when there is something to download — offering a button
 * for a file that is not there would be worse than offering nothing.
 */
function DownloadOriginalButton({ label }: { label: string }) {
  const quarantined = useMemo(() => readQuarantinedDoc(getActiveStorageScope()), []);
  if (!quarantined) return null;

  const download = () => {
    const blob = new Blob([quarantined.doc], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `qti-editor-original-${quarantined.quarantinedAt.slice(0, 10) || 'document'}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button type="button" onClick={download} style={buttonStyle} title={quarantined.reason}>
      {label}
    </button>
  );
}

/** The first label any item in the report carries — the file or document the news is about. */
function labelOf(report: CompatibilityReport): string {
  return report.items.find(item => item.label)?.label ?? '';
}

function errorMessage(change: CompatibilityChange): string {
  return change.message;
}

const WARNING_PALETTE = { background: '#fef3c7', border: '#fcd34d', text: '#78350f' };
const ERROR_PALETTE = { background: '#fee2e2', border: '#fca5a5', text: '#7f1d1d' };

const buttonStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid currentColor',
  borderRadius: 4,
  color: 'inherit',
  cursor: 'pointer',
  font: 'inherit',
  padding: '2px 8px',
  whiteSpace: 'nowrap',
};
