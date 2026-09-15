import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import './LoginPage.css';

interface FormErrors {
  email?: string;
  password?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginPage() {
  const navigate = useNavigate();
  const { fetchUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [imageOk, setImageOk] = useState(true);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: FormErrors = {};

    if (!email.trim()) nextErrors.email = 'Email is required';
    else if (!EMAIL_PATTERN.test(email.trim())) nextErrors.email = 'Enter a valid email';
    if (!password) nextErrors.password = 'Password is required';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsLoading(true);
    try {
      await api.login(email.trim(), password);
      await fetchUser();
      navigate('/properties');
    } catch (error) {
      setErrors({ password: error instanceof Error ? error.message : 'Unable to sign in' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-page__form-side">
        <div className="login-page__form-inner">
          <div className="login-page__brand">
            <span className="login-page__brand-mark" aria-hidden="true">
              PM
            </span>
            <span className="login-page__brand-text">Property Management</span>
          </div>

          <h1 className="login-page__heading">Welcome back</h1>
          <p className="login-page__subtext">Sign in to manage properties, blocks, and units.</p>

          <form className="login-page__form" onSubmit={handleSubmit} noValidate>
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              leftIcon={<Mail className="h-4 w-4" />}
              value={email}
              disabled={isLoading}
              onChange={(event) => {
                setEmail(event.target.value);
                if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
              }}
              error={errors.email}
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              autoComplete="current-password"
              leftIcon={<Lock className="h-4 w-4" />}
              value={password}
              disabled={isLoading}
              onChange={(event) => {
                setPassword(event.target.value);
                if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
              }}
              error={errors.password}
              rightAction={
                <button
                  type="button"
                  className="login-page__password-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              }
            />

            <Button type="submit" size="lg" fullWidth isLoading={isLoading}>
              Sign In
            </Button>
          </form>

          <p className="login-page__hint">Demo account: admin@example.com</p>
        </div>
      </div>

      <div className="login-page__visual-side" aria-hidden="true">
        {imageOk ? (
          <img
            className="login-page__visual-img"
            src="https://picsum.photos/seed/property-management-architecture/1200/1600?grayscale"
            alt=""
            loading="lazy"
            onError={() => setImageOk(false)}
          />
        ) : null}
        <div className="login-page__visual-scrim" />
        <div className="login-page__visual-content">
          <p className="login-page__visual-title">Every property, block, and unit in one place.</p>
          <p className="login-page__visual-text">
            Track land area and unit status across your portfolio without spreadsheets.
          </p>
        </div>
      </div>
    </div>
  );
}
