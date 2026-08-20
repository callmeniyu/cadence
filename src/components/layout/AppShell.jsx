import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  CalendarCheck2, LayoutDashboard, CalendarDays, ClipboardList, Users, Scissors,
  UserCog, FileText, CreditCard, Bell, BarChart3, Settings, LogOut, ChevronDown, Building2, Plus,
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { useBusiness } from '../../features/business/BusinessContext';
import { useNotificationsUnreadCount } from '../../features/notifications/hooks';
import { initials } from '../../utils/format';
import { IconButton } from '../common/Button';
import './layout.css';

const NAV_ITEMS = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/app/appointments', label: 'Appointments', icon: ClipboardList },
  { to: '/app/customers', label: 'Customers', icon: Users },
  { to: '/app/services', label: 'Services', icon: Scissors, roles: ['owner', 'admin'] },
  { to: '/app/staff', label: 'Staff', icon: UserCog, roles: ['owner', 'admin'] },
  { to: '/app/invoices', label: 'Invoices', icon: FileText, roles: ['owner', 'admin'] },
  { to: '/app/payments', label: 'Payments', icon: CreditCard, roles: ['owner', 'admin'] },
  { to: '/app/reports', label: 'Reports', icon: BarChart3, roles: ['owner', 'admin'] },
  { to: '/app/notifications', label: 'Notifications', icon: Bell },
  { to: '/app/settings', label: 'Settings', icon: Settings, roles: ['owner', 'admin'] },
];

const BOTTOM_NAV_ITEMS = [
  { to: '/app', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/app/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/app/appointments', label: 'Bookings', icon: ClipboardList },
  { to: '/app/customers', label: 'Customers', icon: Users },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

export function AppShell() {
  const { profile, signOut } = useAuth();
  const { currentBusiness, role } = useBusiness();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const unread = useNotificationsUnreadCount();

  const visibleNav = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <div className="sf-app-shell">
      <aside className="sf-app-sidebar" aria-label="Primary navigation">
        <div className="sf-app-sidebar-brand">
          <CalendarCheck2 size={22} />
          ServiceFlow
        </div>
        <nav className="sf-app-nav">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `sf-app-nav-link${isActive ? ' sf-app-nav-link-active' : ''}`}
            >
              <item.icon size={18} />
              {item.label}
              {item.to === '/app/notifications' && unread > 0 && (
                <span className="sf-badge sf-badge-danger" style={{ marginLeft: 'auto' }}>{unread}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sf-app-sidebar-footer">
          <button className="sf-app-nav-link" style={{ width: '100%' }} onClick={handleSignOut}>
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </aside>

      <div className="sf-app-main">
        <header className="sf-app-topbar">
          <div className="sf-business-switcher">
            <button
              className="sf-flex sf-items-center sf-gap-2"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem 0.6rem', borderRadius: 8 }}
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
            >
              <Building2 size={18} color="var(--sf-brand-600)" />
              <span className="sf-text-sm" style={{ fontWeight: 700 }}>{currentBusiness?.name || 'Workspace'}</span>
              <ChevronDown size={16} />
            </button>
            {menuOpen && (
              <div className="sf-dropdown-menu" onMouseLeave={() => setMenuOpen(false)}>
                <button className="sf-dropdown-item" onClick={() => { setMenuOpen(false); navigate('/app/settings'); }}>
                  <Settings size={14} /> Business settings
                </button>
                <button className="sf-dropdown-item" onClick={() => { setMenuOpen(false); navigate('/onboarding'); }}>
                  <Plus size={14} /> Create another workspace
                </button>
              </div>
            )}
          </div>

          <div className="sf-flex sf-items-center sf-gap-3">
            <IconButton label="Notifications" onClick={() => navigate('/app/notifications')} style={{ position: 'relative' }}>
              <Bell size={18} />
              {unread > 0 && <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: '50%', background: 'var(--sf-danger-500)' }} />}
            </IconButton>
            <div className="sf-avatar" title={profile?.full_name}>{initials(profile?.full_name || 'U')}</div>
          </div>
        </header>

        <main className="sf-app-content">
          <Outlet />
        </main>
      </div>

      <nav className="sf-bottom-nav" aria-label="Primary navigation">
        {BOTTOM_NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `sf-bottom-nav-link${isActive ? ' sf-bottom-nav-link-active' : ''}`}>
            <item.icon size={20} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
