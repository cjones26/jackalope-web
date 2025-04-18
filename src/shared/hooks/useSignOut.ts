import { useQueryClient } from '@tanstack/react-query';

import { useSupabase } from '@/shared/context/supabase';

export default function useSignOut() {
  const { signOut } = useSupabase();
  const queryClient = useQueryClient();

  return async () => {
    await signOut();
    queryClient.clear();
  };
}
