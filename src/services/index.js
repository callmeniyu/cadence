// -----------------------------------------------------------------------
// CADENCE SERVICES
//
// Single, centralized client-side service layer for Cadence.
// All feature hooks and pages consume this uniform contract backed
// entirely by persistent browser localStorage. No backend or API required.
// -----------------------------------------------------------------------

import * as local from './local/localProvider';
import * as store from './local/localStore';

export const DEMO_MODE = true;

export const auth = local.auth;
export const profileApi = local.profileApi;
export const businessApi = local.businessApi;
export const servicesApi = local.servicesApi;
export const staffApi = local.staffApi;
export const customersApi = local.customersApi;
export const availabilityApi = local.availabilityApi;
export const bookingApi = local.bookingApi;
export const appointmentsApi = local.appointmentsApi;
export const invoicesApi = local.invoicesApi;
export const paymentsApi = local.paymentsApi;
export const notificationsApi = local.notificationsApi;
export const reportsApi = local.reportsApi;
export const portalApi = local.portalApi;

export const resetDemoData = store.resetDemoData;
export const exportDatabaseAsJson = store.exportDatabaseAsJson;
export const importDatabaseFromJson = store.importDatabaseFromJson;
export const getLastRecoveryNotice = store.getLastRecoveryNotice;
export const getPreference = store.getPreference;
export const setPreference = store.setPreference;
