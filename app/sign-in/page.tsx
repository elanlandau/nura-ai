'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Loader2 } from 'lucide-react';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="currentColor" opacity={0.9} d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="currentColor" opacity={0.75} d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="currentColor" opacity={0.85} d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path fill="currentColor" d="M1 1h10v10H1z" />
      <path fill="currentColor" opacity={0.85} d="M1 13h10v10H1z" />
      <path fill="currentColor" opacity={0.7} d="M13 1h10v10H13z" />
      <path fill="currentColor" opacity={0.55} d="M13 13h10v10H13z" />
    </svg>
  );
}

const SOCIAL_BTN =
  'gallery-line-button w-full py-4 text-sm tracking-wide font-medium flex items-center justify-center gap-3 text-black disabled:opacity-70';

export default function SignInPage() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [msLoading, setMsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signIn('google', { callbackUrl: '/home' });
    } catch {
      setError('Could not start Google sign-in.');
      setGoogleLoading(false);
    }
  };

  const handleMicrosoft = async () => {
    setError(null);
    setMsLoading(true);
    try {
      await signIn('azure-ad', { callbackUrl: '/home' });
    } catch {
      setError('Could not start Microsoft sign-in.');
      setMsLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center text-black">
      <div className="w-full max-w-md flex flex-col items-center pb-12 border-0 border-b border-black">
        <h1 className="gallery-heading text-7xl md:text-8xl mb-4">NURA</h1>
        <p className="text-sm text-black/50 mb-12 tracking-wide leading-relaxed text-center">
          Your AI Executive Assistant
        </p>

        <p className="text-xs text-black/40 mb-10 tracking-wide uppercase">Sign in to continue</p>

        <div className="w-full space-y-6">
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || msLoading}
            className={SOCIAL_BTN}
          >
            {googleLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            <span>Continue with Google</span>
          </button>

          <button
            type="button"
            onClick={handleMicrosoft}
            disabled={googleLoading || msLoading}
            className={SOCIAL_BTN}
          >
            {msLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <MicrosoftIcon />
            )}
            <span>Continue with Microsoft</span>
          </button>
        </div>

        {error && (
          <p className="gallery-line-notice text-sm text-center text-black py-4 leading-relaxed mt-6" role="alert">
            {error}
          </p>
        )}

        <p className="mt-10 text-xs text-black/35 tracking-wide leading-relaxed text-center">
          Sign in with your Google or Microsoft account.<br />
          OAuth tokens are stored securely and never shared.
        </p>
      </div>
    </div>
  );
}
