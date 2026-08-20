import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '../../services';

export function usePayments(businessId, params) {
  return useQuery({ queryKey: ['payments', businessId, params], queryFn: () => paymentsApi.list(businessId, params), enabled: Boolean(businessId), placeholderData: (p) => p });
}

export function useSimulatePayment(businessId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => paymentsApi.simulate(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments', businessId] });
      qc.invalidateQueries({ queryKey: ['invoices', businessId] });
      qc.invalidateQueries({ queryKey: ['invoice'] });
      qc.invalidateQueries({ queryKey: ['appointments', businessId] });
      qc.invalidateQueries({ queryKey: ['appointment'] });
      qc.invalidateQueries({ queryKey: ['dashboard-kpis', businessId] });
    },
  });
}
