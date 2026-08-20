import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesApi } from '../../services';

export function useServices(businessId, opts = {}) {
  return useQuery({
    queryKey: ['services', businessId, opts],
    queryFn: () => servicesApi.list(businessId, opts),
    enabled: Boolean(businessId),
  });
}

export function useService(id) {
  return useQuery({ queryKey: ['service', id], queryFn: () => servicesApi.get(id), enabled: Boolean(id) });
}

export function useCreateService(businessId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => servicesApi.create(businessId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services', businessId] }),
  });
}

export function useUpdateService(businessId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }) => servicesApi.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services', businessId] }),
  });
}

export function useDeleteService(businessId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => servicesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services', businessId] }),
  });
}
