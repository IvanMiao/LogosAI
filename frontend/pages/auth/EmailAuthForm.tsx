import {
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
  type RefObject,
} from 'react';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { authClient, useAuth } from '@/features/auth';
import {
  getAuthErrorMessage,
  validateAuthFields,
  type AuthFieldErrors,
  type AuthFields,
  type AuthMode,
} from './auth-helpers';

interface EmailAuthFormProps {
  mode: AuthMode;
  nextPath: string;
  formError: string;
  onFormErrorChange: (message: string) => void;
}

const EMPTY_FIELDS: AuthFields = { name: '', email: '', password: '' };

export function EmailAuthForm({
  mode,
  nextPath,
  formError,
  onFormErrorChange,
}: EmailAuthFormProps): ReactElement {
  const navigate = useNavigate();
  const auth = useAuth();
  const [fields, setFields] = useState<AuthFields>(EMPTY_FIELDS);
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);

  const setField = (field: keyof AuthFields, value: string) => {
    setFields((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    onFormErrorChange('');
  };

  const validateField = (field: keyof AuthFields) => {
    const nextErrors = validateAuthFields(fields, mode);
    setErrors((current) => ({ ...current, [field]: nextErrors[field] }));
  };

  const focusFirstError = (nextErrors: AuthFieldErrors) => {
    if (nextErrors.name) nameRef.current?.focus();
    else if (nextErrors.email) emailRef.current?.focus();
    else if (nextErrors.password) passwordRef.current?.focus();
  };

  const submitCredentials = async () => {
    if (mode === 'sign-up') {
      return authClient.signUp.email({
        name: fields.name.trim(),
        email: fields.email.trim(),
        password: fields.password,
        callbackURL: nextPath,
      });
    }
    return authClient.signIn.email({
      email: fields.email.trim(),
      password: fields.password,
      callbackURL: nextPath,
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateAuthFields(fields, mode);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      focusFirstError(nextErrors);
      return;
    }

    setIsSubmitting(true);
    onFormErrorChange('');
    try {
      const result = await submitCredentials();
      if (result.error) {
        onFormErrorChange(getAuthErrorMessage(result.error));
        return;
      }
      await auth.refreshSession();
      navigate(nextPath, { replace: true });
    } catch {
      onFormErrorChange('Unable to reach LogosAI. Check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form noValidate className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
      {mode === 'sign-up' ? (
        <AuthInput
          inputRef={nameRef}
          id="auth-name"
          label="Name"
          value={fields.name}
          autoComplete="name"
          error={errors.name}
          onBlur={() => validateField('name')}
          onChange={(value) => setField('name', value)}
        />
      ) : null}
      <AuthInput
        inputRef={emailRef}
        id="auth-email"
        label="Email"
        type="email"
        value={fields.email}
        autoComplete="email"
        error={errors.email}
        onBlur={() => validateField('email')}
        onChange={(value) => setField('email', value)}
      />
      <div>
        <label htmlFor="auth-password" className="mb-2 block text-sm font-black">Password</label>
        <div className="relative">
          <input
            ref={passwordRef}
            id="auth-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={fields.password}
            required
            autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'auth-password-error' : 'auth-password-help'}
            onBlur={() => validateField('password')}
            onChange={(event) => setField('password', event.target.value)}
            className="h-11 w-full border-2 border-border bg-input px-3 pr-12 text-base shadow-hard-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="button"
            className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword((visible) => !visible)}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p id="auth-password-help" className="mt-1 text-xs text-muted-foreground">
          {mode === 'sign-up' ? 'Use at least 10 characters.' : 'Use the password for this account.'}
        </p>
        {errors.password ? (
          <p id="auth-password-error" className="mt-1 text-sm font-bold text-error-foreground">
            {errors.password}
          </p>
        ) : null}
      </div>
      <p role="alert" className="min-h-5 text-sm font-bold text-error-foreground">
        {formError}
      </p>
      <Button type="submit" className="h-12 w-full" disabled={isSubmitting}>
        {isSubmitting ? <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : null}
        {mode === 'sign-up' ? 'Create account' : 'Sign in'}
      </Button>
    </form>
  );
}

interface AuthInputProps {
  inputRef: RefObject<HTMLInputElement | null>;
  id: string;
  label: string;
  value: string;
  autoComplete: string;
  type?: 'text' | 'email';
  error?: string;
  onBlur: () => void;
  onChange: (value: string) => void;
}

function AuthInput({
  inputRef,
  id,
  label,
  value,
  autoComplete,
  type = 'text',
  error,
  onBlur,
  onChange,
}: AuthInputProps): ReactElement {
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-black">{label}</label>
      <input
        ref={inputRef}
        id={id}
        name={id.replace('auth-', '')}
        type={type}
        value={value}
        required
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full border-2 border-border bg-input px-3 text-base shadow-hard-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {error ? <p id={errorId} className="mt-1 text-sm font-bold text-error-foreground">{error}</p> : null}
    </div>
  );
}
