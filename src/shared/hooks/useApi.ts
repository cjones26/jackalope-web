import { useRouter } from '@tanstack/react-router';

import { useSupabase } from '@/shared/context/supabase';

export type ApiError = {
  status: number;
  statusText: string;
};

export const useApi = () => {
  const { session } = useSupabase();
  const router = useRouter();

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const token = session?.access_token;

    if (!token) {
      router.navigate({ to: '/' }); // Redirect to the welcome route
      return;
    }

    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      router.navigate({ to: '/' }); // Redirect to the welcome route
      return;
    }

    if (!response.ok) {
      throw { status: response.status, statusText: response.statusText };
    }

    return response.json();
  };

  return { fetchWithAuth };
};
