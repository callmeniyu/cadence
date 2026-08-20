import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesApi } from '../../services';

function invalidate(qc, businessId) {
  qc.invalidateQueries({ queryKey: ['invoices', businessId] });
  qc.invalidateQueries({ queryKey: ['dashboard-kpis', businessId] });
}

export function useInvoices(businessId, params) {
  return useQuery({ queryKey: ['invoices', businessId, params], queryFn: () => invoicesApi.list(businessId, params), enabled: Boolean(businessId), placeholderData: (p) => p });
}

export function useInvoice(id) {
  return useQuery({ queryKey: ['invoice', id], queryFn: () => invoicesApi.get(id), enabled: Boolean(id) });
}

export function useCreateInvoiceFromAppointment(businessId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (appointmentId) => invoicesApi.createFromAppointment(appointmentId),
    onSuccess: () => invalidate(qc, businessId),
  });
}

export function useUpdateDraftInvoice(businessId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, items, taxRatePercent }) => invoicesApi.updateDraft(id, { items, taxRatePercent }),
    onSuccess: (_d, vars) => { invalidate(qc, businessId); qc.invalidateQueries({ queryKey: ['invoice', vars.id] }); },
  });
}

export function useIssueInvoice(businessId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => invoicesApi.issue(id),
    onSuccess: (_d, id) => { invalidate(qc, businessId); qc.invalidateQueries({ queryKey: ['invoice', id] }); },
  });
}

export function useVoidInvoice(businessId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => invoicesApi.void(id),
    onSuccess: (_d, id) => { invalidate(qc, businessId); qc.invalidateQueries({ queryKey: ['invoice', id] }); },
  });
}
