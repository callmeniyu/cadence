import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  Users,
  Scissors,
  UserCog,
  FileText,
  CreditCard,
  Bell,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  Building2,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { useBusiness } from '../../features/business/BusinessContext';
import { useNotificationsUnreadCount } from '../../features/notifications/hooks';
import { initials } from '../../utils/format';
import { IconButton } from '../common/Button';
import { CadenceLogo } from '../common/CadenceLogo';
import './layout.css';

const NAV_GROUPS = [
  {
    title: 'Operations',
    items: [
      { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/app/calendar', label: 'Calendar', icon: CalendarDays },
      { to: '/app/appointments', label: 'Appointments', icon: ClipboardList },
      { to: '/app/customers', label: 'Customers', icon: Users },
    ],
  },
  {
    title: 'Management',
    items: [
      { to: '/app/services', label: 'Services', icon: Scissors, roles: ['owner', 'admin'] },
      { to: '/app/staff', label: 'Staff', icon: UserCog, roles: ['owner', 'admin'] },
      { to: '/app/invoices', label: 'Invoices', icon: FileText, roles: ['owner', 'admin'] },
      { to: '/app/payments', label: 'Payments', icon: CreditCard, roles: ['owner', 'admin'] },
      { to: '/app/reports', label: 'Reports', icon: BarChart3, roles: ['owner', 'admin'] },
    ],
  },
  {
    title: 'System',
    items: [
      { to: '/app/notifications', label: 'Notifications', icon: Bell, hasBadge: true },
      { to: '/app/settings', label: 'Settings', icon: Settings, roles: ['owner', 'admin'] },
    ],
  },
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
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const unread = useNotificationsUnreadCount();

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  // Get current active view title for topbar
  const currentTitle = (() => {
    const path = location.pathname;
    if (path === '/app') return 'Command Center';
    if (path.startsWith('/app/calendar')) return 'Calendar & Schedule';
    if (path.startsWith('/app/appointments')) return 'Appointment Operations';
    if (path.startsWith('/app/customers')) return 'Customer Directory';
    if (path.startsWith('/app/services')) return 'Services Catalog';
    if (path.startsWith('/app/staff')) return 'Team & Availability';
    if (path.startsWith('/app/invoices')) return 'Billing & Invoices';
    if (path.startsWith('/app/payments')) return 'Payment History';
    if (path.startsWith('/app/reports')) return 'Analytics & Insights';
    if (path.startsWith('/app/notifications')) return 'Activity Notifications';
    if (path.startsWith('/app/settings')) return 'Workspace Settings';
    return 'Cadence Operations';
  })();

  return (
    <div className="sf-app-shell">
      {/* Deep Ink Sidebar */}
      <aside className="sf-app-sidebar" aria-label="Cadence Navigation">
        <div className="sf-app-sidebar-header">
          <CadenceLogo tone="dark" showTagline={true} />

          {/* Current Workspace Pill */}
          <div
            className="sf-sidebar-workspace-badge"
            onClick={() => setMenuOpen((v) => !v)}
            role="button"
            tabIndex={0}
            aria-expanded={menuOpen}
          >
            <div className="sf-flex sf-items-center sf-gap-2" style={{ overflow: 'hidden' }}>
              <Building2 size={13} style={{ color: 'var(--cd-accent-lime)' }} />
              <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentBusiness?.name || 'Workspace'}
              </span>
            </div>
            <span
              style={{
                fontSize: 10,
                textTransform: 'uppercase',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 4,
                background: 'rgba(255,255,255,0.1)',
                color: 'var(--cd-accent-lime)',
              }}
            >
              {role || 'staff'}
            </span>
          </div>
        </div>

        {/* Navigation Groups */}
        <nav className="sf-app-nav">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter((item) => !item.roles || item.roles.includes(role));
            if (!visibleItems.length) return null;

            return (
              <div key={group.title} style={{ marginBottom: 8 }}>
                <div className="sf-nav-group-label">{group.title}</div>
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => `sf-app-nav-link${isActive ? ' sf-app-nav-link-active' : ''}`}
                  >
                    <item.icon size={17} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.hasBadge && unread > 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '1px 7px',
                          borderRadius: 999,
                          background: 'var(--cd-danger)',
                          color: '#FFFFFF',
                        }}
                      >
                        {unread}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer with User Details */}
        <div className="sf-app-sidebar-footer">
          <div className="sf-flex sf-items-center sf-gap-2" style={{ minWidth: 0 }}>
            <div className="sf-avatar" style={{ width: 32, height: 32, fontSize: 12, background: 'var(--cd-dark-subtle)' }}>
              {initials(profile?.full_name || 'U')}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {profile?.full_name || 'User'}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>
                {role || 'Member'}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="sf-btn sf-btn-ghost sf-btn-icon"
            onClick={handleSignOut}
            title="Sign out of Cadence"
            style={{ color: 'rgba(255,255,255,0.7)', border: 'none', background: 'transparent' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="sf-app-main">
        {/* Top Navigation */}
        <header className="sf-app-topbar">
          <div className="sf-flex sf-items-center sf-gap-3">
            <span style={{ fontSize: 'var(--sf-fs-sm)', fontWeight: 700, color: 'var(--cd-primary-dark)' }}>
              {currentTitle}
            </span>
            <span style={{ color: 'var(--cd-border)', fontSize: '0.9rem' }}>/</span>
            <span className="sf-text-xs sf-muted sf-flex sf-items-center sf-gap-1">
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cd-accent-lime)', display: 'inline-block' }} />
              {currentBusiness?.name}
            </span>
          </div>

          <div className="sf-flex sf-items-center sf-gap-3">
            {currentBusiness?.slug && (
              <a
                href={`/b/${currentBusiness.slug}`}
                target="_blank"
                rel="noreferrer"
                className="sf-btn sf-btn-secondary sf-btn-sm sf-flex sf-items-center sf-gap-1"
                style={{ fontSize: '0.75rem', fontWeight: 600 }}
              >
                <span>Live Booking Page</span>
                <ExternalLink size={12} />
              </a>
            )}

            {/* Notifications Button */}
            <IconButton
              label="Notifications"
              onClick={() => navigate('/app/notifications')}
              style={{ position: 'relative' }}
            >
              <Bell size={17} />
              {unread > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: 'var(--cd-danger)',
                  }}
                />
              )}
            </IconButton>

            {/* Workspace Switcher dropdown */}
            <div className="sf-business-switcher">
              <button
                className="sf-flex sf-items-center sf-gap-2"
                style={{
                  background: 'var(--cd-surface-subtle)',
                  border: '1px solid var(--cd-border)',
                  cursor: 'pointer',
                  padding: '0.35rem 0.65rem',
                  borderRadius: 'var(--sf-radius-md)',
                }}
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
              >
                <div className="sf-avatar sf-avatar-lime" style={{ width: 24, height: 24, fontSize: 10 }}>
                  {initials(currentBusiness?.name || 'W')}
                </div>
                <ChevronDown size={14} color="var(--cd-secondary-text)" />
              </button>

              {menuOpen && (
                <div className="sf-dropdown-menu" onMouseLeave={() => setMenuOpen(false)}>
                  <div style={{ padding: '0.4rem 0.75rem 0.25rem', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--cd-secondary-text)' }}>
                    Active Workspace
                  </div>
                  <button
                    className="sf-dropdown-item"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/app/settings');
                    }}
                  >
                    <Settings size={14} /> Workspace settings
                  </button>
                  <button
                    className="sf-dropdown-item"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/onboarding');
                    }}
                  >
                    <Plus size={14} /> Create another workspace
                  </button>
                  <div style={{ borderTop: '1px solid var(--cd-border)', margin: '4px 0' }} />
                  <button className="sf-dropdown-item" onClick={handleSignOut}>
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="sf-app-content">
          <Outlet />
        </main>
      </div>

      {/* Mobile Navigation */}
      <nav className="sf-bottom-nav" aria-label="Mobile Navigation">
        {BOTTOM_NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `sf-bottom-nav-link${isActive ? ' sf-bottom-nav-link-active' : ''}`}
          >
            <item.icon size={19} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
