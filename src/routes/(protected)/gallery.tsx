import { createFileRoute } from '@tanstack/react-router';

import { H1 } from '@/shared/ui/typography';

export const Route = createFileRoute('/(protected)/gallery')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-1 flex-col items-center gap-y-4 m-4">
      <H1>Gallery</H1>
    </div>
  );
}
