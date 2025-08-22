import { createFileRoute } from '@tanstack/react-router';

import { GalleryPage } from '@/features/gallery/GalleryPage';

export const Route = createFileRoute('/(protected)/gallery/')({
  component: RouteComponent,
});

function RouteComponent() {
  return <GalleryPage folderId={null} />;
}
