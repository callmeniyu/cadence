import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { staffApi, businessApi } from '../../services';

export function useStaffList(businessId) {
  return useQuery({ queryKey: ['staff', businessId], queryFn: () => staffApi.list(businessId), enabled: Boolean(businessId) });
}

export function useStaffMember(memberId) {
  return useQuery({ queryKey: ['staff-member', memberId], queryFn: () => staffApi.get(memberId), enabled: Boolean(memberId) });
}

export function useAssignServices(businessId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, serviceIds }) => staffApi.assignServices(memberId, businessId, serviceIds),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff', businessId] }); qc.invalidateQueries({ queryKey: ['staff-member'] }); },
  });
}

export function useSetAvailability(businessId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, rules }) => staffApi.setAvailability(memberId, businessId, rules),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff-member'] }),
  });
}

export function useAddBlockedTime(businessId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, payload }) => staffApi.addBlockedTime(memberId, businessId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff-member'] }),
  });
}

export function useRemoveBlockedTime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => staffApi.removeBlockedTime(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff-member'] }),
  });
}

export function useMembers(businessId) {
  return useQuery({ queryKey: ['members', businessId], queryFn: () => businessApi.getMembers(businessId), enabled: Boolean(businessId) });
}

export function useUpdateMemberRole(businessId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, role }) => businessApi.updateMemberRole(memberId, role),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['members', businessId] }); qc.invalidateQueries({ queryKey: ['staff', businessId] }); },
  });
}

export function useSetMemberActive(businessId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, active }) => businessApi.setMemberActive(memberId, active),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['members', businessId] }); qc.invalidateQueries({ queryKey: ['staff', businessId] }); },
  });
}

export function useInviteMember(businessId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => businessApi.inviteMember(businessId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members', businessId] }),
  });
}
