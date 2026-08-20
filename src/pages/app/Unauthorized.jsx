import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/common/Button';

export default function Unauthorized() {
  return (
    <div style={{ padding: '4rem 0' }}>
      <EmptyState
        icon={<ShieldAlert size={40} color="var(--sf-danger-500)" />}
        title="You don't have access to this page"
        description="Your role in this workspace doesn't include this permission."
        action={<Link to="/app"><Button variant="secondary">Back to dashboard</Button></Link>}
      />
    </div>
  );
}
