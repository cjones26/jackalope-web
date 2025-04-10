import { createRouter, RouterProvider } from '@tanstack/react-router';

import { SupabaseProvider } from '@/shared/context/supabase/SupabaseProvider';
import { ThemeProvider } from '@/shared/context/theme/ThemeProvider';

import { routeTree } from './routeTree.gen';
import { useSupabase } from './shared/context/supabase';

// Create a new router instance
const router = createRouter({
  routeTree,
  context: {
    // Iniitally undefined but set below in InnerApp
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
      <ThemeProvider storageKey="jackalope-theme">
        <InnerApp />
      </ThemeProvider>
    </SupabaseProvider>
  );
}
