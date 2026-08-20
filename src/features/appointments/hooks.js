import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsApi } from '../../services';

function invalidateAll(qc, businessId) {
  qc.invalidateQueries({ queryKey: ['appointments', businessId] });
  qc.invalidateQueries({ queryKey: ['appointments-range', businessId] });
  qc.invalidateQueries({ queryKey: ['dashboard-kpis', businessId] });
  qc.invalidateQueries({ queryKey: ['today-schedule', businessId] });
}

export function useAppointments(businessId, params) {
  return useQuery({
    queryKey: ['appointments', businessId, params],
    queryFn: () => appointmentsApi.list(businessId, params),
    enabled: Boolean(businessId),
    placeholderData: (prev) => prev,
  });
}

export function useAppointmentsInRange(businessId, start, end, filters) {
  return useQuery({
    queryKey: ['appointments-range', businessId, start?.toISOString(), end?.toISOString(), filters],
    queryFn: () => appointmentsApi.listInRange(businessId, start, end, filters),
    enabled: Boolean(businessId && start && end),
  });
}

export function useAppointment(id) {
  return useQuery({ queryKey: ['appointment', id], queryFn: () => appointmentsApi.get(id), enabled: Boolean(id) });
}

export function useAppointmentActivity(id) {
  return useQuery({ queryKey: ['appointment-activity', id], queryFn: () => appointmentsApi.getActivity(id), enabled: Boolean(id) });
}

export function useUpdateAppointmentStatus(businessId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, actorUserId, note }) => appointmentsApi.updateStatus(id, status, actorUserId, note),
    onSuccess: (_d, vars) => {
      invalidateAll(qc, businessId);
      qc.invalidateQueries({ queryKey: ['appointment', vars.id] });
      qc.invalidateQueries({ queryKey: ['appointment-activity', vars.id] });
    },
  });
}

export function useUpdateAppointmentNotes(businessId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }) => appointmentsApi.updateNotes(id, patch),
    onSuccess: (_d, vars) => { invalidateAll(qc, businessId); qc.invalidateQueries({ queryKey: ['appointment', vars.id] }); },
  });
}

export function useReassignStaff(businessId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, staffMemberId, actorUserId }) => appointmentsApi.reassignStaff(id, staffMemberId, actorUserId),
    onSuccess: (_d, vars) => { invalidateAll(qc, businessId); qc.invalidateQueries({ queryKey: ['appointment', vars.id] }); },
  });
}
