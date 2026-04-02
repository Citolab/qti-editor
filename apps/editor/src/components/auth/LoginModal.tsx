import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../../context/auth-context';

interface LoginModalProps {
  onClose: () => void;
}

export function LoginModal({ onClose }: LoginModalProps) {
  const { t } = useTranslation();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('authFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-96 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          {mode === 'signin' ? t('authSignIn') : t('authCreateAccount')}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder={t('authEmail')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            placeholder={t('authPassword')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
          <div className="flex justify-between items-center mt-2">
            <button
              type="button"
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
              className="text-xs text-blue-600 hover:underline"
            >
              {mode === 'signin' ? t('authCreateAccountAction') : t('authAlreadyHaveAccount')}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '…' : mode === 'signin' ? t('authSignIn') : t('authCreateAccount')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
