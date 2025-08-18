import { useCallback, useMemo } from 'react';
import { useRouter } from '@tanstack/react-router';

import { useSupabase } from '@/shared/context/supabase';
import { supabase } from '@/shared/services/supabase';

export type ApiError = {
  status: number;
  statusText: string;
};

export const useApi = () => {
  const { session, signOut } = useSupabase();
  const router = useRouter();

  // Memoize the access token to prevent unnecessary re-renders
  const accessToken = useMemo(() => session?.access_token, [session?.access_token]);

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}, retryCount = 0) => {
    // Always get the most current token from Supabase
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const token = currentSession?.access_token;

    if (!token) {
      console.log('No token available - signing out');
      await signOut();
      return;
    }

    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
        ...options,
        headers,
      });

      // Handle JWT expiration or invalid token
      if (response.status === 401 && retryCount === 0) {
        console.log('JWT token expired during request - attempting to refresh');
        
        // Force refresh the session
        const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();
        
        if (error || !refreshedSession?.access_token) {
          console.log('Token refresh failed - signing out', error);
          await signOut();
          return;
        }

        console.log('Token refreshed successfully - retrying request');
        
        // Retry the request with the new token (only once)
        const newHeaders = {
          ...options.headers,
          Authorization: `Bearer ${refreshedSession.access_token}`,
        };

        const retryResponse = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
          ...options,
          headers: newHeaders,
        });

        if (retryResponse.status === 401) {
          console.log('Retry failed with 401 - signing out');
          await signOut();
          return;
        }

        if (!retryResponse.ok) {
          throw { status: retryResponse.status, statusText: retryResponse.statusText };
        }

        return retryResponse.json();
      }

      if (response.status === 401 || response.status === 403) {
        console.log('Authentication failed - signing out');
        await signOut();
        return;
      }

      if (!response.ok) {
        throw { status: response.status, statusText: response.statusText };
      }

      return response.json();
    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      throw fetchError;
    }
  }, [signOut]); // Remove accessToken dependency to prevent stale token issues

  return { fetchWithAuth };
};
