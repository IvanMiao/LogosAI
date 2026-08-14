import { useState, type ReactElement } from 'react';
import { BookOpen, Brain, Cloud, ShieldCheck } from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { EmailAuthForm } from './EmailAuthForm';
import { SocialAuthButtons } from './SocialAuthButtons';
import { getSafeNextPath, type AuthMode } from './auth.helpers';

interface AuthPageProps {
  mode: AuthMode;
}

export function AuthPage({ mode }: AuthPageProps): ReactElement {
  const auth = useAuth();
  const location = useLocation();
  const [formError, setFormError] = useState('');
  const nextPath = getSafeNextPath(location.search);
  const isSignUp = mode === 'sign-up';

  if (auth.status === 'authenticated') {
    return <Navigate to={nextPath} replace />;
  }

  return (
    <main
      id="main-content"
      data-route-focus
      tabIndex={-1}
      className="min-h-dvh bg-background px-4 py-8 text-foreground sm:px-6 lg:py-12"
    >
      <div className="mx-auto grid w-full min-w-0 max-w-5xl overflow-hidden border-4 border-border bg-card shadow-[10px_10px_0px_0px_var(--border)] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="min-w-0 border-b-4 border-border bg-secondary p-6 text-secondary-foreground lg:border-b-0 lg:border-r-4 lg:p-10">
          <Link to="/" className="inline-flex items-center gap-3 font-brand text-2xl font-black">
            <span className="flex h-11 w-11 items-center justify-center border-2 border-border bg-primary shadow-hard-sm">
              <Brain className="h-6 w-6" aria-hidden="true" />
            </span>
            LogosAI
          </Link>
          <div className="mt-12 max-w-md">
            <p className="text-xs font-black uppercase tracking-[0.18em]">Your reading workspace</p>
            <h1 className="mt-3 break-words font-brand text-4xl font-black leading-tight sm:text-5xl">
              Keep every difficult passage within reach.
            </h1>
            <ul className="mt-8 space-y-4 font-sans text-sm leading-6">
              <li className="flex gap-3"><Cloud className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />Sessions stay available across devices.</li>
              <li className="flex gap-3"><BookOpen className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />Selections, notes, and close reads stay tied to their source.</li>
              <li className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />Your Gemini key is encrypted before storage.</li>
            </ul>
          </div>
        </section>

        <section className="min-w-0 p-6 sm:p-8 lg:p-10" aria-labelledby="auth-heading">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
            {isSignUp ? 'Create_Account' : 'Welcome_Back'}
          </p>
          <h2 id="auth-heading" className="mt-2 font-brand text-3xl font-black">
            {isSignUp ? 'Create your account' : 'Sign in to continue'}
          </h2>
          <p className="mt-2 font-sans text-sm leading-6 text-muted-foreground">
            {isSignUp
              ? 'Start a private, synced reading library.'
              : 'Open your saved reading sessions and continue where you stopped.'}
          </p>

          <div className="mt-7 space-y-5">
            <SocialAuthButtons callbackURL={nextPath} onError={setFormError} />
            <EmailAuthForm
              mode={mode}
              nextPath={nextPath}
              formError={formError}
              onFormErrorChange={setFormError}
            />
          </div>

          <p className="mt-6 text-center font-sans text-sm text-muted-foreground">
            {isSignUp ? 'Already have an account?' : 'New to LogosAI?'}{' '}
            <Link
              to={`${isSignUp ? '/login' : '/register'}?next=${encodeURIComponent(nextPath)}`}
              className="font-bold text-link underline underline-offset-2"
            >
              {isSignUp ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
