import { useTranslation } from 'react-i18next';
import type { User } from 'firebase/auth';
import type { SyncStatus } from '../../hooks/use-file-operations';

interface StatusBarProps {
  user: User | null;
  authLoading: boolean;
  syncStatus: SyncStatus;
  lastSyncedAt: Date | null;
  onSignIn: () => void;
}

function formatTime(date: Date, language: string): string {
  return date.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function StatusBar({ user, authLoading, syncStatus, lastSyncedAt, onSignIn }: StatusBarProps) {
  const { t, i18n } = useTranslation();
  const dot: Record<SyncStatus, { color: string; label: string }> = {
    idle:    { color: '#9ca3af', label: t('statusNotSynced') },
    syncing: { color: '#f59e0b', label: t('statusSyncing') },
    synced:  { color: '#10b981', label: t('statusSynced') },
    error:   { color: '#ef4444', label: t('statusSyncError') },
  };
  const sync = dot[syncStatus];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '24px',
        padding: '0 16px',
        flexShrink: 0,
        background: '#fff',
        borderTop: '1px solid #e5e7eb',
        fontSize: '11px',
        color: '#6b7280',
        userSelect: 'none',
      }}
    >
      {/* Left: auth status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {authLoading ? null : user ? (
          <>
            <span style={{ color: '#10b981' }}>●</span>
            <span>{t('statusSignedInAs', { email: user.email })}</span>
          </>
        ) : (
          <>
            <span style={{ color: '#6b7280' }}>○</span>
            <span>{t('statusLocalOnly')}</span>
            <button
              onClick={onSignIn}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#60a5fa',
                cursor: 'pointer',
                fontSize: '11px',
                textDecoration: 'underline',
              }}
            >
              {t('statusEnableSyncAction')}
            </button>
            <span>{t('statusEnableSyncSuffix')}</span>
          </>
        )}
      </div>

      {/* Right: sync status (only when signed in) */}
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ color: sync.color }}>●</span>
          <span>{sync.label}</span>
          {syncStatus === 'synced' && lastSyncedAt && (
            <span style={{ color: '#9ca3af' }}>
              {t('statusAtTime', { time: formatTime(lastSyncedAt, i18n.language) })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
