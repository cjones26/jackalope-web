import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

import { SupabaseContextProps } from '@/shared/context/supabase';
import { Toaster } from '@/shared/ui/Sonner';

interface JackalopeRouterContext {
  supabase: SupabaseContextProps;
}

export const Route = createRootRouteWithContext<JackalopeRouterContext>()({
  component: () => (
    <div className="flex flex-col h-dvh bg-background text-foreground">
      <Outlet />
      <Toaster />
      {import.meta.env.MODE !== 'production' && (
        <>
          <ReactQueryDevtools />
          <TanStackRouterDevtools />
        </>
      )}
    </div>
  ),
});
