import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { CalendarCheck2, ClipboardList, FileText, User, LogOut } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import './layout.css';

const NAV = [
  { to: '/portal', label: 'My Bookings', icon: ClipboardList, end: true },
  { to: '/portal/invoices', label: 'Invoices', icon: FileText },
  { to: '/portal/profile', label: 'Profile', icon: User },
];

export function PortalShell() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <div className="sf-flex-col" style={{ minHeight: '100vh' }}>
      <header className="sf-pub-header">
        <div className="sf-container sf-pub-header-inner">
          <div className="sf-pub-logo"><CalendarCheck2 size={22} />ServiceFlow</div>
          <nav className="sf-flex sf-gap-4 sf-items-center">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `sf-text-sm ${isActive ? '' : 'sf-muted'}`} style={({ isActive }) => ({ fontWeight: isActive ? 700 : 600, color: isActive ? 'var(--sf-brand-600)' : undefined })}>
                {item.label}
              </NavLink>
            ))}
            <button className="sf-btn sf-btn-ghost sf-btn-sm" onClick={handleSignOut}><LogOut size={14} />Sign out</button>
          </nav>
        </div>
      </header>
      <main className="sf-container" style={{ flex: 1, padding: '2rem 0' }}>
        <Outlet />
      </main>
    </div>
  );
}
