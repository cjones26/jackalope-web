import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

import { ProfileForm } from '@/features/profile/ProfileForm';
import { useSupabase } from '@/shared/context/supabase';
import { supabase } from '@/shared/services/supabase';
import { Spinner } from '@/shared/ui/Spinner';
import { H3 } from '@/shared/ui/typography';

export const Route = createFileRoute('/(protected)/profile')({
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = useSupabase();

  // Fetch the user profile from Supabase
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

      const { data, error } = await supabase
        .from('users')
        .select('first_name, last_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (error) {
        throw error;
      }
      return data;
    },
    enabled: !!user?.id,
  });

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

  // Check if profile exists with data
  const profileExists =
    profile && (profile.first_name || profile.last_name || profile.avatar_url);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-y-4 m-4">
      {/* Profile Section */}
      <H3>{profileExists ? 'Update Profile' : 'Create Profile'}</H3>
      <ProfileForm profile={profile || null} />
    </div>
  );
}
