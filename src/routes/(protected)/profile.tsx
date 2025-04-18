import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

import { ProfileForm } from '@/features/profile/ProfileForm';
import { useApi } from '@/shared/hooks/useApi';
import { H3 } from '@/shared/ui/typography';

export const Route = createFileRoute('/(protected)/profile')({
  component: RouteComponent,
});

function RouteComponent() {
  const { fetchWithAuth } = useApi();

  const { isPending, isError, data, error } = useQuery({
    queryKey: ['profile'],
    queryFn: () => fetchWithAuth('/profile'),
  });

  if (isPending) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-y-4 m-4">
        <span>Loading...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-y-4 m-4">
        <span>Error: {error.message}</span>
      </div>
    );
  }

  // Check if profile exists
  const profileExists = data && Object.keys(data).length > 0;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-y-4 m-4">
      {/* Profile Section */}
      <H3>{profileExists ? 'Update Profile' : 'Create Profile'}</H3>
      <ProfileForm initialData={profileExists ? data : undefined} />
    </div>
  );
}
