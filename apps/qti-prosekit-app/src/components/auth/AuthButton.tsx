import { useTranslation } from 'react-i18next';

import type { User } from 'firebase/auth';

interface AuthButtonProps {
  user: User | null;
  loading: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

export function AuthButton({ user, loading, onSignIn, onSignOut }: AuthButtonProps) {
  const { t } = useTranslation();
  if (loading) return null;

  if (user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            fontSize: '11px',
            color: '#6b7280',
            maxWidth: '160px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {user.email}
        </span>
        <button
          onClick={onSignOut}
          style={{
            fontSize: '11px',
            padding: '3px 8px',
            borderRadius: '4px',
            border: '1px solid #d1d5db',
            background: 'white',
            color: '#374151',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {t('authSignOut')}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onSignIn}
      style={{
        fontSize: '11px',
        padding: '3px 8px',
        borderRadius: '4px',
        border: '1px solid #d1d5db',
        background: 'white',
        color: '#374151',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {t('authSignIn')}
    </button>
  );
}
