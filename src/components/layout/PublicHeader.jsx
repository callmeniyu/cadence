import { Link } from 'react-router-dom';
import { Button } from '../common/Button';
import { CadenceLogo } from '../common/CadenceLogo';
import { useAuth } from '../../features/auth/AuthContext';
import './layout.css';

export function PublicHeader() {
  const { isAuthenticated } = useAuth();
  return (
    <header className="sf-pub-header">
      <div className="sf-container sf-pub-header-inner">
        <Link to="/" className="sf-pub-logo" title="Cadence">
          <CadenceLogo tone="light" />
        </Link>
        <nav className="sf-pub-nav">
          {isAuthenticated ? (
            <Link to="/app">
              <Button variant="primary" size="sm">Go to dashboard</Button>
            </Link>
          ) : (
            <>
              <Link to="/b/nova-wellness-studio">
                <Button variant="ghost" size="sm">Demo Business</Button>
              </Link>
              <Link to="/login">
                <Button variant="secondary" size="sm">Sign in</Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">Get started</Button>
              </Link>
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
        <div className="sf-flex sf-items-center sf-gap-2">
          <span style={{ fontWeight: 700, color: 'var(--cd-primary-dark)' }}>Cadence</span>
          <span>&mdash; Run your business in rhythm.</span>
        </div>
        <span className="sf-text-xs sf-muted">
          Portfolio & demonstration edition &middot; Local storage persistence
        </span>
      </div>
    </footer>
  );
}
