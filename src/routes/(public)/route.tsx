import { createFileRoute, Link, Outlet } from '@tanstack/react-router';

import Icon from '@/assets/icon.png';
import IconDark from '@/assets/icon-dark.png';
import Footer from '@/shared/components/Footer';
import { useTheme } from '@/shared/context/theme';

export const Route = createFileRoute('/(public)')({
  component: RouteComponent,
});

function RouteComponent() {
  const { colorScheme } = useTheme();

  return (
    <>
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex justify-between items-center">
          <Link
            to="/"
            className="flex items-center bg-background text-foreground"
          >
            <img
              src={colorScheme === 'dark' ? IconDark : Icon}
              alt="Jackalope Logo"
              className="w-10 h-10 rounded-xl mr-3"
            />
            <span className="text-xl font-bold">Jackalope</span>
          </Link>
        </div>
      </header>
      <main className="container mx-auto py-6 px-4 flex-1 flex items-center justify-center">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
