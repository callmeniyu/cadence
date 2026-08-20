import { isSupabaseConfigured } from '../lib/supabaseClient';
import * as demo from './demo/demoProvider';
import * as live from './supabase/supabaseProvider';

// Single switch point (spec section 82): VITE_DEMO_MODE explicitly opts
// into the local demo provider. If it's unset/false but Supabase isn't
// configured either, we still fall back to demo so the app remains usable
// during setup rather than hard-crashing.
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true' || !isSupabaseConfigured;

const provider = DEMO_MODE ? demo : live;

export const auth = provider.auth;
export const profileApi = provider.profileApi;
export const businessApi = provider.businessApi;
export const servicesApi = provider.servicesApi;
export const staffApi = provider.staffApi;
export const customersApi = provider.customersApi;
export const availabilityApi = provider.availabilityApi;
export const bookingApi = provider.bookingApi;
export const appointmentsApi = provider.appointmentsApi;
export const invoicesApi = provider.invoicesApi;
export const paymentsApi = provider.paymentsApi;
export const notificationsApi = provider.notificationsApi;
export const reportsApi = provider.reportsApi;
export const portalApi = provider.portalApi;

export { resetDemoData } from './demo/demoStore';
