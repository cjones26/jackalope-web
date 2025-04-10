import { createFileRoute, Link } from '@tanstack/react-router';

import Icon from '@/assets/icon.png';
import IconDark from '@/assets/icon-dark.png';
import { useTheme } from '@/shared/context/theme';
import { Button } from '@/shared/ui/Button';
import { H1, P } from '@/shared/ui/typography';

export const Route = createFileRoute('/(public)/')({
  component: Index,
});

function Index() {
  const { colorScheme } = useTheme();

  return (
    <div className="flex flex-1 flex-col bg-background p-4">
      <div className="flex flex-1 flex-col items-center justify-center gap-y-4 m-4">
        <img
          src={colorScheme === 'dark' ? IconDark : Icon}
          alt="App Icon"
          className="w-16 h-16 rounded-xl"
        />
        <H1 className="text-center">Welcome to Jackalope</H1>
        <P className="text-center text-muted-foreground">
          A private image hosting platform that allows you to upload, organize,
          and view your images securely and efficiently.
        </P>
      </div>
      <div className="flex flex-col gap-y-4 m-4 items-center">
        <Button className="w-96 py-2 px-4" asChild>
          <Link to="/sign-up">Sign up</Link>
        </Button>
        <Button className="w-96 py-2 px-4" variant={'secondary'} asChild>
          <Link to="/sign-in">Sign in</Link>
        </Button>
      </div>
    </div>
  );
}
