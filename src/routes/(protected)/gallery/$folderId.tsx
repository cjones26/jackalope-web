import { createFileRoute } from '@tanstack/react-router';

import { GalleryPage } from '@/features/gallery/GalleryPage';

export const Route = createFileRoute('/(protected)/gallery/$folderId')({
  component: RouteComponent,
});

function RouteComponent() {
  const { folderId } = Route.useParams();
  return <GalleryPage folderId={folderId} />;
}
