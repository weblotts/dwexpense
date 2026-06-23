import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../lib/api';
import { AuthShell } from '../components/AuthShell';

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register({ name, email, password });
      navigate('/');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Start tracking your budget — it's free">
      <form onSubmit={submit} className="space-y-4">
        <AuthField label="Your name (optional)" htmlFor="name">
          <div className="auth-input-wrap">
            <User size={16} className="auth-input-icon" />
            <input
              id="name"
              type="text"
              placeholder="Davies"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </AuthField>

        <AuthField label="Email address" htmlFor="email">
          <div className="auth-input-wrap">
            <Mail size={16} className="auth-input-icon" />
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </AuthField>

        <AuthField label="Password" htmlFor="password">
          <div className="auth-input-wrap">
            <Lock size={16} className="auth-input-icon" />
            <input
              id="password"
              type="password"
              placeholder="At least 6 characters"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </AuthField>

        {error && <AuthError message={error} />}

        <button
          type="submit"
          disabled={busy}
          className="auth-btn"
        >
          {busy
            ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            : <ArrowRight size={16} />}
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
        Already have an account?{' '}
        <Link to="/login" className="font-semibold" style={{ color: 'var(--color-primary)' }}>
          Sign in →
        </Link>
      </p>
    </AuthShell>
  );
}

function AuthField({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function AuthError({ message }: { message: string }) {
  return (
    <div
      className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm"
      style={{ backgroundColor: 'rgba(220,38,38,0.07)', color: 'var(--color-error)', border: '1px solid rgba(220,38,38,0.18)' }}
    >
      <AlertCircle size={15} className="flex-shrink-0" />
      {message}
    </div>
  );
}
