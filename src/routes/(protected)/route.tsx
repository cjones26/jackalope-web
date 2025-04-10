import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/(protected)')({
  beforeLoad: ({ context }) => {
    if (!context.supabase.session) {
      throw redirect({ to: '/' });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
