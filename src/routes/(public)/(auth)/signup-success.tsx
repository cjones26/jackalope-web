import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { z } from 'zod';

import { useApi } from '@/shared/hooks/useApi';
import { useSupabase } from '@/shared/context/supabase';
import { Button } from '@/shared/ui/Button';
import { H1, P } from '@/shared/ui/typography';

const searchSchema = z.object({
  invited: z.boolean().optional(),
  token: z.string().optional(),
});

export const Route = createFileRoute('/(public)/(auth)/signup-success')({
  component: RouteComponent,
  validateSearch: searchSchema,
});

function RouteComponent() {
  const { invited, token } = Route.useSearch();
  const { fetchWithAuth, fetchPublic } = useApi();
  const { user } = useSupabase();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasAccepted = useRef(false);

  // Accept invitation mutation
  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('No invitation token');
      // Get invitation details first to know which hub
      const invitationData = await fetchPublic(
        `/api/v1/hubs/invitations/${token}`
      );
      const hubId = invitationData.data.hub_id;

      // Accept the invitation
      await fetchWithAuth(`/api/v1/hubs/invitations/${token}/accept`, {
        method: 'POST',
      });

      return hubId;
    },
    onSuccess: (hubId: string) => {
      // Invitation accepted successfully
      hasAccepted.current = true;
      // Invalidate user queries to refetch with new hub membership
      queryClient.invalidateQueries({ queryKey: ['user-hubs', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-nav', user?.id] });
    },
    onError: (error: any) => {
      console.error('Failed to accept invitation:', error);
      // If already a member, treat as success
      if (error?.message?.includes('already a member')) {
        hasAccepted.current = true;
        // Invalidate queries even on "already a member" error
        queryClient.invalidateQueries({ queryKey: ['user-hubs', user?.id] });
        queryClient.invalidateQueries({ queryKey: ['user-nav', user?.id] });
      }
    },
  });

  // Automatically accept invitation on mount (only once)
  useEffect(() => {
    if (invited && token && !hasAccepted.current) {
      hasAccepted.current = true;
      acceptMutation.mutate();
    }
  }, [invited, token, acceptMutation]);

  return (
    <div className="flex flex-1 flex-col bg-background p-4">
      <div className="flex flex-1 flex-col items-center justify-center gap-y-4 m-4">
        <DotLottieReact
          src="lottie/success.lottie"
          className="w-96 h-96"
          autoplay
        />
        <H1 className="text-center">Woohoo!</H1>
        <P className="text-center">
          {invited
            ? "You're all set! Click below to get started."
            : 'Check your email to complete your sign up.'}
        </P>
      </div>
      <div className="flex flex-col gap-y-4 m-4 items-center">
        <Button className="w-96 py-2 px-4" asChild>
          <Link to={invited ? '/gallery' : '/sign-in'}>
            {invited ? 'Go to Gallery' : 'Sign in'}
          </Link>
        </Button>
      </div>
    </div>
  );
}
