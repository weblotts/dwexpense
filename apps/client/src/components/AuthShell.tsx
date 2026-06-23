import { ReactNode } from 'react';

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl text-white text-xl font-bold shadow-lg"
          style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
        >
          $
        </div>
        <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--color-text-muted)' }}>
          BucketTracker
        </span>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-md rounded-2xl p-8 shadow-lg"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 4px 32px rgba(0,0,0,0.08)',
        }}
      >
        <div className="mb-7 text-center">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{title}</h1>
          <p className="mt-1.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
