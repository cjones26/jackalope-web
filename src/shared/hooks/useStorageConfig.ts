import { useQuery } from '@tanstack/react-query';

import { useSupabase } from '@/shared/context/supabase';
import { useApi } from '@/shared/hooks/useApi';

interface StorageConfig {
  id: string;
  endpoint_url: string;
  region: string;
  bucket_name: string;
  force_path_style: boolean;
  created_at?: string;
  updated_at?: string;
}

interface Profile {
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  storage_config?: StorageConfig | null;
}

/**
 * Hook to check if the current user has storage configured
 * Returns storage configuration status and profile data
 */
export const useStorageConfig = () => {
  const { user } = useSupabase();
  const { fetchWithAuth } = useApi();

  const {
    data: profile,
    isLoading,
    error,
  } = useQuery<Profile>({
    queryKey: ['user', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return await fetchWithAuth('/api/v1/profile/me');
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    retry: 1,
  });

  const hasStorageConfigured = !!profile?.storage_config;

  return {
    hasStorageConfigured,
    storageConfig: profile?.storage_config,
    profile,
    isLoading,
    error,
  };
};
