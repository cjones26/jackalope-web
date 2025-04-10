import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { createFileRoute, Link } from '@tanstack/react-router';

import { Button } from '@/shared/ui/Button';
import { H1, P } from '@/shared/ui/typography';

export const Route = createFileRoute('/check-email')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-1 flex-col bg-background p-4">
      <div className="flex flex-1 flex-col items-center justify-center gap-y-4 m-4">
        <DotLottieReact
          src="lottie/success.lottie"
          className="w-96 h-96"
          autoplay
        />
        {/* <img src={Icon} alt="App Icon" className="w-16 h-16 rounded-xl" /> */}
        <H1 className="text-center">Woohoo!</H1>
        <P className="text-center">
          Check your email to complete your sign up.
        </P>
      </div>
      <div className="flex flex-col gap-y-4 m-4 items-center">
        <Button className="w-96 py-2 px-4" asChild>
          <Link to="/sign-in">Sign in</Link>
        </Button>
      </div>
    </div>
  );
}
