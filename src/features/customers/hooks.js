import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '../../services';

export function useCustomers(businessId, params) {
  return useQuery({
    queryKey: ['customers', businessId, params],
    queryFn: () => customersApi.list(businessId, params),
    enabled: Boolean(businessId),
    placeholderData: (prev) => prev,
  });
}

export function useCustomer(id) {
  return useQuery({ queryKey: ['customer', id], queryFn: () => customersApi.get(id), enabled: Boolean(id) });
}

export function useCreateCustomer(businessId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => customersApi.create(businessId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers', businessId] }),
  });
}

export function useUpdateCustomer(businessId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }) => customersApi.update(id, patch),
    onSuccess: (_d, vars) => { qc.invalidateQueries({ queryKey: ['customers', businessId] }); qc.invalidateQueries({ queryKey: ['customer', vars.id] }); },
  });
}

export function useArchiveCustomer(businessId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => customersApi.archive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers', businessId] }),
  });
}
