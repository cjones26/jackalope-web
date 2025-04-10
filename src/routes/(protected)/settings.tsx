import { createFileRoute } from '@tanstack/react-router';

import { useSupabase } from '@/shared/context/supabase';
import { Button } from '@/shared/ui/Button';
import { H1, Muted } from '@/shared/ui/typography';

export const Route = createFileRoute('/(protected)/settings')({
  component: RouteComponent,
});

function RouteComponent() {
  const { signOut } = useSupabase();

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
