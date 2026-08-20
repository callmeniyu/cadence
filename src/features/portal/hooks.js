import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portalApi } from '../../services';
import { useAuth } from '../auth/AuthContext';

export function useMyAppointments() {
  const { user } = useAuth();
  return useQuery({ queryKey: ['portal-appointments', user?.id], queryFn: () => portalApi.getMyAppointments(user.id), enabled: Boolean(user?.id) });
}

export function useMyInvoices() {
  const { user } = useAuth();
  return useQuery({ queryKey: ['portal-invoices', user?.id], queryFn: () => portalApi.getMyInvoices(user.id), enabled: Boolean(user?.id) });
}

export function useCancelMyAppointment() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (appointmentId) => portalApi.cancelMyAppointment(appointmentId, user.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal-appointments'] }),
  });
}
