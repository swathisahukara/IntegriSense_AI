import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export function useIntegrations() {
  return useQuery({
    queryKey: ['integrations'],
    queryFn: () => api.getIntegrations(),
    refetchInterval: 10_000, // refresh every 10 seconds
    staleTime: 5_000,
  });
}
