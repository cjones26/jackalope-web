import { createFileRoute, Link, Outlet } from '@tanstack/react-router';

import Icon from '@/assets/icon.png';
import IconDark from '@/assets/icon-dark.png';
import { useTheme } from '@/shared/context/theme';

export const Route = createFileRoute('/(public)')({
  component: RouteComponent,
});

function RouteComponent() {
  const { colorScheme } = useTheme();

  return (
    <>
      <header className="hidden md:block">
        <Link
          to="/"
          className="flex items-center p-4 bg-background text-foreground"
        >
          <img
            src={colorScheme === 'dark' ? IconDark : Icon}
            alt="Jackalope Logo"
            className="w-12 h-12 rounded-xl mr-4"
          />
          <span className="text-2xl font-bold">Jackalope</span>
        </Link>
      </header>
      <div className="flex flex-1">
        <Outlet />
      </div>
    </>
  );
}
