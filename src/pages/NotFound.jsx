import { Link } from 'react-router-dom';
import { CalendarCheck2 } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';
import { Button } from '../components/common/Button';

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <EmptyState
        icon={<CalendarCheck2 size={40} />}
        title="Page not found"
        description="The page you're looking for doesn't exist or has moved."
        action={<Link to="/"><Button variant="primary">Go home</Button></Link>}
      />
    </div>
  );
}
