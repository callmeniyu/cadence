import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { useBusiness } from '../features/business/BusinessContext';
import { PageSpinner } from '../components/common/Spinner';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <PageSpinner label="Loading your account..." />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}

// Requires the user to already own/belong to a business workspace; sends
// brand-new users into onboarding first.
export function RequireWorkspace() {
  const { hasWorkspace, loading } = useBusiness();
  const location = useLocation();
  if (loading) return <PageSpinner label="Loading your workspace..." />;
  if (!hasWorkspace && location.pathname !== '/onboarding') return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

export function RoleGuard({ allow, children }) {
  const { role } = useBusiness();
  if (!role || !allow.includes(role)) return <Navigate to="/app/unauthorized" replace />;
  return children;
}

export function GuestOnlyRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageSpinner />;
  if (isAuthenticated) return <Navigate to="/app" replace />;
  return <Outlet />;
}
