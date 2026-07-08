import { ReactNode, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChartPie, Repeat2, ClockFading, BarChart2, SlidersHorizontal, Sun, Moon, LogOut, Settings, PiggyBank, TrendingUp, ShoppingCart } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../context/AuthContext';
import { AiChat } from './AiChat';

// Main navbar — keep this short
const nav = [
  { to: '/',        label: 'Dashboard', icon: ChartPie },
  { to: '/history', label: 'History',   icon: ClockFading },
  { to: '/reports', label: 'Reports',   icon: BarChart2 },
  { to: '/shopping', label: 'Shopping', icon: ShoppingCart },
];

// Secondary links that live in the profile dropdown
const secondaryNav = [
  { to: '/recurring',     label: 'Recurring',  icon: Repeat2 },
  { to: '/savings-goals', label: 'Goals',      icon: PiggyBank },
  { to: '/net-worth',     label: 'Net Worth',  icon: TrendingUp },
  { to: '/settings',      label: 'Settings',   icon: SlidersHorizontal },
];

export function Layout({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme();
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  function handleLogout() { logout(); navigate('/login'); }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Top bar */}
      <header
        className="sticky top-0 z-40 flex h-14 items-center justify-between px-4 transition-all duration-200"
        style={{
          backgroundColor: scrolled
            ? 'color-mix(in srgb, var(--color-surface) 80%, transparent)'
            : 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
          boxShadow: scrolled ? 'var(--shadow-card)' : 'none',
        }}
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold text-white select-none"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
            $
          </span>
          <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>BucketTracker</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link key={to} to={to}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150"
                style={{
                  backgroundColor: active ? 'var(--color-primary)' : 'transparent',
                  color: active ? '#fff' : 'var(--color-text-muted)',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-surface-2)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text)'; }}
                onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)'; } }}
              >
                <Icon size={14} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          <button onClick={toggle}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-surface-2)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)'; }}
            aria-label="Toggle theme">
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {user && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors"
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-surface-2)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = ''}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white select-none"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
                  {(user.name || user.email).slice(0, 1).toUpperCase()}
                </div>
                <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate" style={{ color: 'var(--color-text)' }}>
                  {user.name || user.email}
                </span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-52 rounded-xl p-1 z-50"
                  style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: '0 8px 32px rgb(0 0 0 / 0.18)' }}>
                  <p className="px-3 py-1.5 text-xs truncate" style={{ color: 'var(--color-text-faint)' }}>{user.email}</p>
                  <div className="my-1" style={{ borderTop: '1px solid var(--color-border)' }} />
                  {secondaryNav.map(({ to, label, icon: Icon }) => (
                    <Link key={to} to={to}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
                      style={{ color: 'var(--color-text-muted)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-surface-2)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = ''}>
                      <Icon size={13} /> {label}
                    </Link>
                  ))}
                  <div className="my-1" style={{ borderTop: '1px solid var(--color-border)' }} />
                  <button onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
                    style={{ color: 'var(--color-error)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(220,38,38,0.08)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = ''}>
                    <LogOut size={13} /> Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-3xl px-4 py-6 pb-28 md:pb-10">
        {children}
      </main>

      {/* AI Chat floating assistant */}
      {user && ['/', '/history', '/reports', '/shopping', '/recurring', '/savings-goals'].some(p => pathname === p || pathname.startsWith(p + '/')) && <AiChat />}

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t md:hidden"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        {nav.slice(0, 5).map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link key={to} to={to}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors"
              style={{ color: active ? 'var(--color-primary)' : 'var(--color-text-faint)' }}>
              <div className="relative">
                <Icon size={19} />
                {active && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full"
                    style={{ backgroundColor: 'var(--color-primary)' }} />
                )}
              </div>
              <span className="mt-0.5">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
