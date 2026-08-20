import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('ServiceFlow error boundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="sf-empty" style={{ minHeight: '60vh', justifyContent: 'center' }}>
          <AlertTriangle size={40} color="var(--sf-danger-500)" />
          <div className="sf-empty-title">Something went wrong</div>
          <p className="sf-muted">An unexpected error occurred while rendering this page.</p>
          <Button onClick={() => { this.setState({ hasError: false }); window.location.assign('/'); }}>
            Go to homepage
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
