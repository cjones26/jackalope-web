import { createRouter, RouterProvider } from '@tanstack/react-router';

import { ApiProvider } from '@/shared/context/api/ApiProvider';
import { useSupabase } from '@/shared/context/supabase';
import { SupabaseProvider } from '@/shared/context/supabase/SupabaseProvider';
import { ThemeProvider } from '@/shared/context/theme/ThemeProvider';

import { routeTree } from './routeTree.gen';

// Create a new router instance
const router = createRouter({
  routeTree,
  context: {
    // Initally undefined but set below in InnerApp
    supabase: undefined!,
  },
});

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function InnerApp() {
  const supabase = useSupabase();

  return <RouterProvider router={router} context={{ supabase }} />;
}

export default function App() {
  return (
    <SupabaseProvider router={router}>
      <ApiProvider>
        <ThemeProvider storageKey="jackalope-theme">
          <InnerApp />
        </ThemeProvider>
      </ApiProvider>
    </SupabaseProvider>
  );
}
