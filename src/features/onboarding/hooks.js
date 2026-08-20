import { useMutation } from '@tanstack/react-query';
import { businessApi } from '../../services';
import { useBusiness } from '../business/BusinessContext';
import { useAuth } from '../auth/AuthContext';

export function useCreateWorkspace() {
  const { user } = useAuth();
  const { reload, switchBusiness } = useBusiness();
  return useMutation({
    mutationFn: (payload) => businessApi.createWorkspace({ userId: user.id, ...payload }),
    onSuccess: async (business) => {
      await reload();
      switchBusiness(business.id);
    },
  });
}
