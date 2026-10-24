import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/http';

/**
 * Server state cache shared by every screen. New screens read through useQuery /
 * useMutation instead of keeping API data in component state.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Don't retry what retrying can't fix (auth, permission, validation, not found).
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
    },
  },
});
