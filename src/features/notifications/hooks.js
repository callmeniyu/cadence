import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { notificationsApi } from '../../services';
import { useAuth } from '../auth/AuthContext';
import { useBusiness } from '../business/BusinessContext';

export function useNotifications() {
  const { currentBusiness } = useBusiness();
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notifications', currentBusiness?.id, user?.id],
    queryFn: () => notificationsApi.list(currentBusiness.id, user.id),
    enabled: Boolean(currentBusiness?.id && user?.id),
    refetchInterval: 30_000,
  });
}

export function useNotificationsUnreadCount() {
  const { currentBusiness } = useBusiness();
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ['notifications-unread', currentBusiness?.id, user?.id],
    queryFn: () => notificationsApi.unreadCount(currentBusiness.id, user.id),
    enabled: Boolean(currentBusiness?.id && user?.id),
    refetchInterval: 30_000,
  });
  return data || 0;
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const { currentBusiness } = useBusiness();
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(currentBusiness.id, user.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });
}
