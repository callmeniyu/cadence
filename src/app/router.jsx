import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { PageSpinner } from '../components/common/Spinner';
import { ProtectedRoute, RequireWorkspace, RoleGuard, GuestOnlyRoute } from './guards';
import { AppShell } from '../components/layout/AppShell';
import { PortalShell } from '../components/layout/PortalShell';

const Landing = lazy(() => import('../pages/public/Landing'));
const Login = lazy(() => import('../pages/public/Login'));
const Register = lazy(() => import('../pages/public/Register'));
const ForgotPassword = lazy(() => import('../pages/public/ForgotPassword'));
const ResetPassword = lazy(() => import('../pages/public/ResetPassword'));
const Onboarding = lazy(() => import('../pages/public/Onboarding'));
const BusinessPublicPage = lazy(() => import('../pages/public/BusinessPublicPage'));
const BookingWizard = lazy(() => import('../pages/public/BookingWizard'));
const BookingConfirmation = lazy(() => import('../pages/public/BookingConfirmation'));
const BookingLookup = lazy(() => import('../pages/public/BookingLookup'));

const Dashboard = lazy(() => import('../pages/app/Dashboard'));
const Calendar = lazy(() => import('../pages/app/Calendar'));
const Appointments = lazy(() => import('../pages/app/Appointments'));
const AppointmentDetail = lazy(() => import('../pages/app/AppointmentDetail'));
const Customers = lazy(() => import('../pages/app/Customers'));
const CustomerDetail = lazy(() => import('../pages/app/CustomerDetail'));
const Services = lazy(() => import('../pages/app/Services'));
const Staff = lazy(() => import('../pages/app/Staff'));
const StaffDetail = lazy(() => import('../pages/app/StaffDetail'));
const Invoices = lazy(() => import('../pages/app/Invoices'));
const InvoiceDetail = lazy(() => import('../pages/app/InvoiceDetail'));
const Payments = lazy(() => import('../pages/app/Payments'));
const Notifications = lazy(() => import('../pages/app/Notifications'));
const Reports = lazy(() => import('../pages/app/Reports'));
const Settings = lazy(() => import('../pages/app/Settings'));
const Unauthorized = lazy(() => import('../pages/app/Unauthorized'));

const MyBookings = lazy(() => import('../pages/portal/MyBookings'));
const MyInvoices = lazy(() => import('../pages/portal/MyInvoices'));
const MyProfile = lazy(() => import('../pages/portal/MyProfile'));

const NotFound = lazy(() => import('../pages/NotFound'));

function withSuspense(el) {
  return <Suspense fallback={<PageSpinner />}>{el}</Suspense>;
}

export function AppRouter() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={withSuspense(<Landing />)} />
      <Route path="/b/:slug" element={withSuspense(<BusinessPublicPage />)} />
      <Route path="/b/:slug/book" element={withSuspense(<BookingWizard />)} />
      <Route path="/b/:slug/book/confirmation/:code" element={withSuspense(<BookingConfirmation />)} />
      <Route path="/b/:slug/lookup" element={withSuspense(<BookingLookup />)} />

      <Route element={<GuestOnlyRoute />}>
        <Route path="/login" element={withSuspense(<Login />)} />
        <Route path="/register" element={withSuspense(<Register />)} />
      </Route>
      <Route path="/forgot-password" element={withSuspense(<ForgotPassword />)} />
      <Route path="/reset-password" element={withSuspense(<ResetPassword />)} />

      {/* Authenticated */}
      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding" element={withSuspense(<Onboarding />)} />

        <Route element={<RequireWorkspace />}>
          <Route path="/app" element={<AppShell />}>
            <Route index element={withSuspense(<Dashboard />)} />
            <Route path="calendar" element={withSuspense(<Calendar />)} />
            <Route path="appointments" element={withSuspense(<Appointments />)} />
            <Route path="appointments/:id" element={withSuspense(<AppointmentDetail />)} />
            <Route path="customers" element={withSuspense(<Customers />)} />
            <Route path="customers/:id" element={withSuspense(<CustomerDetail />)} />
            <Route path="services" element={<RoleGuard allow={['owner', 'admin']}>{withSuspense(<Services />)}</RoleGuard>} />
            <Route path="staff" element={<RoleGuard allow={['owner', 'admin']}>{withSuspense(<Staff />)}</RoleGuard>} />
            <Route path="staff/:id" element={<RoleGuard allow={['owner', 'admin']}>{withSuspense(<StaffDetail />)}</RoleGuard>} />
            <Route path="invoices" element={<RoleGuard allow={['owner', 'admin']}>{withSuspense(<Invoices />)}</RoleGuard>} />
            <Route path="invoices/:id" element={<RoleGuard allow={['owner', 'admin']}>{withSuspense(<InvoiceDetail />)}</RoleGuard>} />
            <Route path="payments" element={<RoleGuard allow={['owner', 'admin']}>{withSuspense(<Payments />)}</RoleGuard>} />
            <Route path="reports" element={<RoleGuard allow={['owner', 'admin']}>{withSuspense(<Reports />)}</RoleGuard>} />
            <Route path="notifications" element={withSuspense(<Notifications />)} />
            <Route path="settings" element={<RoleGuard allow={['owner', 'admin']}>{withSuspense(<Settings />)}</RoleGuard>} />
            <Route path="unauthorized" element={withSuspense(<Unauthorized />)} />
          </Route>
        </Route>

        <Route path="/portal" element={<PortalShell />}>
          <Route index element={withSuspense(<MyBookings />)} />
          <Route path="invoices" element={withSuspense(<MyInvoices />)} />
          <Route path="profile" element={withSuspense(<MyProfile />)} />
        </Route>
      </Route>

      <Route path="*" element={withSuspense(<NotFound />)} />
    </Routes>
  );
}
