import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';

import { useSupabase } from '@/shared/context/supabase';
import { ApiError, useApi } from '@/shared/hooks/useApi';
import { Button } from '@/shared/ui/Button';
import { H1, Muted } from '@/shared/ui/typography';

export const Route = createFileRoute('/(protected)/settings')({
  component: RouteComponent,
});

function RouteComponent() {
  const { signOut } = useSupabase();
  const { fetchWithAuth } = useApi();

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetchWithAuth('http://localhost:8080/profile', {
          method: 'GET',
        });

        console.log('response: ', response);
      } catch (error) {
        if ((error as ApiError).status === 404) {
          console.error('Profile does not exist!');
        }
      }
    }

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex-1 items-center justify-center bg-background p-4 gap-y-4">
      <H1 className="text-center">Sign Out</H1>
      <Muted className="text-center">
        Sign out and return to the welcome screen.
      </Muted>
      <Button
        className="w-full"
        size="default"
        variant="default"
        onClick={signOut}
      >
        Sign out
      </Button>
    </div>
  );
}
