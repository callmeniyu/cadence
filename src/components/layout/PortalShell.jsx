import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ClipboardList, FileText, User, LogOut } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { CadenceLogo } from '../common/CadenceLogo';
import { PublicFooter } from './PublicHeader';
import './layout.css';

const NAV = [
  { to: '/portal', label: 'My Bookings', icon: ClipboardList, end: true },
  { to: '/portal/invoices', label: 'Invoices', icon: FileText },
  { to: '/portal/profile', label: 'Profile', icon: User },
];

export function PortalShell() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <div className="sf-flex-col" style={{ minHeight: '100vh', background: 'var(--cd-bg)' }}>
      <header className="sf-pub-header">
        <div className="sf-container sf-pub-header-inner">
          <div className="sf-flex sf-items-center sf-gap-3">
            <CadenceLogo tone="light" />
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '2px 8px',
                borderRadius: 999,
                background: 'var(--cd-accent-violet-subtle)',
                color: 'var(--cd-accent-violet)',
              }}
            >
              Client Portal
            </span>
          </div>

          <nav className="sf-flex sf-gap-3 sf-items-center">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `sf-text-sm ${isActive ? '' : 'sf-muted'}`}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.4rem 0.75rem',
                  borderRadius: 'var(--sf-radius-md)',
                  background: isActive ? 'var(--cd-surface)' : 'transparent',
                  border: isActive ? '1px solid var(--cd-border)' : '1px solid transparent',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--cd-primary-dark)' : 'var(--cd-secondary-text)',
                  textDecoration: 'none',
                })}
              >
                <item.icon size={15} />
                {item.label}
              </NavLink>
            ))}

            <div style={{ height: 18, width: 1, background: 'var(--cd-border)', margin: '0 4px' }} />

            <button
              type="button"
              className="sf-btn sf-btn-ghost sf-btn-sm sf-flex sf-items-center sf-gap-1"
              onClick={handleSignOut}
              title={`Signed in as ${user?.email}`}
            >
              <LogOut size={14} />
              <span>Sign out</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="sf-container" style={{ flex: 1, padding: '2.5rem 0' }}>
        <Outlet />
      </main>

      <PublicFooter />
    </div>
  );
}
