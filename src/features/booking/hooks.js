import { useQuery, useMutation } from '@tanstack/react-query';
import { businessApi, servicesApi, staffApi, availabilityApi, bookingApi } from '../../services';

export function useBusinessBySlug(slug) {
  return useQuery({ queryKey: ['business-slug', slug], queryFn: () => businessApi.getBusinessBySlug(slug), enabled: Boolean(slug) });
}

export function usePublicServices(businessId) {
  return useQuery({ queryKey: ['public-services', businessId], queryFn: () => servicesApi.list(businessId, { publicOnly: true }), enabled: Boolean(businessId) });
}

export function useStaffForService(businessId, serviceId) {
  return useQuery({ queryKey: ['staff-for-service', businessId, serviceId], queryFn: () => staffApi.servicesForStaff(businessId, serviceId), enabled: Boolean(businessId && serviceId) });
}

export function useSlots({ businessId, serviceId, staffMemberId, date }) {
  return useQuery({
    queryKey: ['slots', businessId, serviceId, staffMemberId, date?.toDateString()],
    queryFn: () => availabilityApi.getSlots({ businessId, serviceId, staffMemberId, date }),
    enabled: Boolean(businessId && serviceId && date),
  });
}

export function useCreatePublicBooking() {
  return useMutation({ mutationFn: (payload) => bookingApi.createPublicBooking(payload) });
}

export function useCreatePortalBooking() {
  return useMutation({ mutationFn: (payload) => bookingApi.createPortalBooking(payload) });
}

export function useCreateAdminBooking() {
  return useMutation({ mutationFn: (payload) => bookingApi.createAdminBooking(payload) });
}

export function useBookingByCode(code) {
  return useQuery({ queryKey: ['booking-code', code], queryFn: () => bookingApi.getByBookingCode(code), enabled: Boolean(code) });
}
