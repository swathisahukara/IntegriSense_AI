import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export function useIncidents(status?: 'active' | 'resolved') {
  return useQuery({
    queryKey: ['incidents', status],
    queryFn: () => api.getIncidents(status),
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}
