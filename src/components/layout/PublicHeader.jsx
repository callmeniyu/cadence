import { Link } from 'react-router-dom';
import { CalendarCheck2 } from 'lucide-react';
import { Button } from '../common/Button';
import { useAuth } from '../../features/auth/AuthContext';
import './layout.css';

export function PublicHeader() {
  const { isAuthenticated } = useAuth();
  return (
    <header className="sf-pub-header">
      <div className="sf-container sf-pub-header-inner">
        <Link to="/" className="sf-pub-logo">
          <CalendarCheck2 size={22} />
          ServiceFlow
        </Link>
        <nav className="sf-pub-nav">
          {isAuthenticated ? (
            <Link to="/app"><Button variant="primary" size="sm">Go to dashboard</Button></Link>
          ) : (
            <>
              <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
              <Link to="/register"><Button variant="primary" size="sm">Get started</Button></Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="sf-pub-footer">
      <div className="sf-container sf-flex sf-justify-between sf-items-center" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <span>&copy; {new Date().getFullYear()} ServiceFlow. Built as a demo project.</span>
        <span className="sf-text-xs">Appointment scheduling for service businesses</span>
      </div>
    </footer>
  );
}
