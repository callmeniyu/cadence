import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../../services';

export function useDashboardKpis(businessId) {
  return useQuery({ queryKey: ['dashboard-kpis', businessId], queryFn: () => reportsApi.getDashboardKpis(businessId), enabled: Boolean(businessId) });
}

export function useTodaySchedule(businessId) {
  return useQuery({ queryKey: ['today-schedule', businessId], queryFn: () => reportsApi.getTodaySchedule(businessId), enabled: Boolean(businessId) });
}

export function useRevenueSeries(businessId, days = 30) {
  return useQuery({ queryKey: ['revenue-series', businessId, days], queryFn: () => reportsApi.getRevenueSeries(businessId, days), enabled: Boolean(businessId) });
}

export function useBookingsSeries(businessId, days = 30) {
  return useQuery({ queryKey: ['bookings-series', businessId, days], queryFn: () => reportsApi.getBookingsSeries(businessId, days), enabled: Boolean(businessId) });
}

export function useStatusBreakdown(businessId) {
  return useQuery({ queryKey: ['status-breakdown', businessId], queryFn: () => reportsApi.getStatusBreakdown(businessId), enabled: Boolean(businessId) });
}

export function useServicePopularity(businessId) {
  return useQuery({ queryKey: ['service-popularity', businessId], queryFn: () => reportsApi.getServicePopularity(businessId), enabled: Boolean(businessId) });
}

export function useStaffWorkload(businessId) {
  return useQuery({ queryKey: ['staff-workload', businessId], queryFn: () => reportsApi.getStaffWorkload(businessId), enabled: Boolean(businessId) });
}

export function usePaymentMethodDistribution(businessId) {
  return useQuery({ queryKey: ['payment-method-dist', businessId], queryFn: () => reportsApi.getPaymentMethodDistribution(businessId), enabled: Boolean(businessId) });
}

export function useNewCustomersSeries(businessId, days = 30) {
  return useQuery({ queryKey: ['new-customers-series', businessId, days], queryFn: () => reportsApi.getNewCustomersSeries(businessId, days), enabled: Boolean(businessId) });
}
