import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

import { ProfileForm } from '@/features/profile/ProfileForm';
import { useSupabase } from '@/shared/context/supabase';
import { useApi } from '@/shared/hooks/useApi';
import { Spinner } from '@/shared/ui/Spinner';
import { H3 } from '@/shared/ui/typography';

export const Route = createFileRoute('/(protected)/settings')({
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = useSupabase();
  const { fetchWithAuth } = useApi();

  // Fetch the user profile from backend API
  const {
    data: profile,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['user', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const result = await fetchWithAuth('/api/v1/profile/me');
      return result.data;
    },
    enabled: !!user?.id,
    refetchOnMount: 'always',
  });

  // Early returns AFTER all hooks
  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-y-4 m-4">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-y-4 m-4">
        <span>There was an error fetching your profile.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-start gap-y-6 m-4 max-w-4xl mx-auto w-full">
      <H3>Settings</H3>
      <ProfileForm profile={profile || null} />
    </div>
  );
}
