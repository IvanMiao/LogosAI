import { useEffect, useState, type ReactElement } from 'react';
import { Github, LoaderCircle } from 'lucide-react';
import { getAuthProviderConfig, type AuthProviderConfig } from '@/client-api/auth-config-api';
import { Button } from '@/components/ui/button';
import { authClient } from '@/features/auth';

interface SocialAuthButtonsProps {
  callbackURL: string;
  onError: (message: string) => void;
}

function GoogleIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.3Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1a5.8 5.8 0 0 1-5.5-4H3.2v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.5 14.1a6 6 0 0 1 0-4.2V7.3H3.2a10 10 0 0 0 0 9.4l3.3-2.6Z" />
      <path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.7 9.7 0 0 0 3.2 7.3l3.3 2.6a5.8 5.8 0 0 1 5.5-4Z" />
    </svg>
  );
}

export function SocialAuthButtons({
  callbackURL,
  onError,
}: SocialAuthButtonsProps): ReactElement | null {
  const [config, setConfig] = useState<AuthProviderConfig | null>(null);
  const [pendingProvider, setPendingProvider] = useState<'google' | 'github' | null>(null);

  useEffect(() => {
    let active = true;
    void getAuthProviderConfig()
      .then((nextConfig) => {
        if (active) setConfig(nextConfig);
      })
      .catch(() => {
        if (active) setConfig({ emailPassword: true, google: false, github: false });
      });
    return () => {
      active = false;
    };
  }, []);

  const signInWith = async (provider: 'google' | 'github') => {
    onError('');
    setPendingProvider(provider);
    try {
      const result = await authClient.signIn.social({ provider, callbackURL });
      if (!result.error) return;
      onError(`Unable to sign in with ${provider === 'google' ? 'Google' : 'GitHub'}. Try again.`);
    } catch {
      onError('Unable to reach LogosAI. Check your connection and try again.');
    } finally {
      setPendingProvider(null);
    }
  };

  if (!config?.google && !config?.github) {
    return null;
  }

  return (
    <div className="space-y-3">
      {config.google ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full bg-card"
          disabled={pendingProvider !== null}
          onClick={() => void signInWith('google')}
        >
          {pendingProvider === 'google'
            ? <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
            : <GoogleIcon />}
          {pendingProvider === 'google' ? 'Opening Google…' : 'Continue with Google'}
        </Button>
      ) : null}
      {config.github ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full bg-card"
          disabled={pendingProvider !== null}
          onClick={() => void signInWith('github')}
        >
          {pendingProvider === 'github'
            ? <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
            : <Github className="h-4 w-4" aria-hidden="true" />}
          {pendingProvider === 'github' ? 'Opening GitHub…' : 'Continue with GitHub'}
        </Button>
      ) : null}
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-0.5 flex-1 bg-border" />
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">or</span>
        <span className="h-0.5 flex-1 bg-border" />
      </div>
    </div>
  );
}
