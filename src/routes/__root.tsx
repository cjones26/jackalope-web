import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

import { SupabaseContextProps } from '@/shared/context/supabase';

interface JackalopeRouterContext {
  supabase: SupabaseContextProps;
}

export const Route = createRootRouteWithContext<JackalopeRouterContext>()({
  component: () => (
    <div className="flex flex-col h-dvh">
      <Outlet />
      {import.meta.env.MODE !== 'production' && (
        <>
          <ReactQueryDevtools />
          <TanStackRouterDevtools />
        </>
      )}
    </div>
  ),
});
