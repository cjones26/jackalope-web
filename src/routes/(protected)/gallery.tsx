import { useWindowSize } from '@react-hook/window-size';
import {
  InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Plus, Trash, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { AddImageDialog } from '@/features/gallery/AddImageDialog';
import { ImageDetails } from '@/features/gallery/ImageDetails';
import { GalleryImage } from '@/features/gallery/types/GalleryImage';
import { GalleryResponse } from '@/features/gallery/types/GalleryResponse';
import { Profile } from '@/shared/context/api/types/Profile';
import { ApiError, useApi } from '@/shared/hooks/useApi';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/AlertDialog';
import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/Checkbox';
import { Spinner } from '@/shared/ui/Spinner';
import { H3 } from '@/shared/ui/typography';

export const Route = createFileRoute('/(protected)/gallery')({
  component: RouteComponent,
});

type GalleryQueryData = InfiniteData<GalleryResponse>;

interface DeleteResponse {
  deletedCount: number;
  success: boolean;
}

// Define breakpoints for responsive design
const BREAKPOINTS = {
  sm: 640, // 1 column
  md: 768, // 2 columns
  lg: 1024, // 3 columns
  xl: 1280, // 4 columns
  '2xl': 1536, // 5 columns
};

function RouteComponent() {
  const { fetchWithAuth } = useApi();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [width] = useWindowSize();

  // Determine column count based on screen width
  const getColumnCount = () => {
    if (width < BREAKPOINTS.md) return 1;
    if (width < BREAKPOINTS.lg) return 2;
    if (width < BREAKPOINTS.xl) return 3;
    if (width < BREAKPOINTS['2xl']) return 4;
    return 5;
  };

  const columnCount = getColumnCount();

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery<GalleryResponse, ApiError>({
    queryKey: ['gallery'],
    queryFn: ({ pageParam = 1 }) =>
      fetchWithAuth(`/gallery?page=${pageParam}&limit=20`),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.currentPage + 1 : undefined,
    initialPageParam: 1,
  });

  const { data: profileData, isLoading: isProfileLoading } = useQuery<
    Profile,
    ApiError
  >({
    queryKey: ['profile'],
    queryFn: () => fetchWithAuth('/profile'),
    // Don't throw errors for 404 (no profile yet)
    retry: (failureCount: number, error: ApiError) => {
      return error.status !== 404 && failureCount < 3;
    },
  });

  // Flatten all images from all pages into a single array
  const imageData = useMemo(
    () => data?.pages.flatMap((page) => page.images) || [],
    [data]
  );

  // Calculate grid of images for proper masonry layout
  const gridLayout = useMemo(() => {
    if (!columnCount || !imageData.length) return [] as GalleryImage[][];

    // Create array of column heights
    const columnHeights = Array(columnCount).fill(0);
    // Create array of columns with images
    const columns: GalleryImage[][] = Array.from(
      { length: columnCount },
      () => []
    );

    // Place each image in the shortest column
    imageData.forEach((image) => {
      const shortestColumnIndex = columnHeights.indexOf(
        Math.min(...columnHeights)
      );
      columns[shortestColumnIndex].push(image);

      // Update the column height (approximate based on aspect ratio)
      const aspectRatio = image.width / image.height || 1;
      // Assuming a standard column width, calculate the height this image would add
      const imageHeight = 100 / columnCount / aspectRatio;
      columnHeights[shortestColumnIndex] += imageHeight;
    });

    return columns;
  }, [imageData, columnCount]);

  // Handle infinite scroll loading
  useEffect(() => {
    const handleScroll = () => {
      if (
        !isFetchingNextPage &&
        hasNextPage &&
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 800
      ) {
        fetchNextPage();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const handleImageAdded = useCallback(() => {
    refetch();
    setIsAddDialogOpen(false);
  }, [refetch]);

  const handleImageUpdated = useCallback(
    (deletedImageId: string | undefined) => {
      if (deletedImageId) {
        // Update the query cache for an immediate UI update
        queryClient.setQueryData<GalleryQueryData>(['gallery'], (oldData) => {
          if (!oldData || !oldData.pages) return oldData;

          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              images: page.images.filter(
                (img: GalleryImage) => img._id !== deletedImageId
              ),
            })),
          };
        });
      }

      setSelectedImage(null);
      refetch();
    },
    [queryClient, refetch]
  );

  const toggleMultiSelectMode = () => {
    if (isMultiSelectMode) {
      setSelectedImageIds([]);
    }
    setIsMultiSelectMode(!isMultiSelectMode);
  };

  const toggleImageSelection = (
    imageId: string,
    event: React.MouseEvent | MouseEvent
  ) => {
    if (event) {
      event.stopPropagation();
    }
    setSelectedImageIds((prev) => {
      if (prev.includes(imageId)) {
        return prev.filter((id) => id !== imageId);
      } else {
        return [...prev, imageId];
      }
    });
  };

  const handleImageClick = (image: GalleryImage, event?: React.MouseEvent) => {
    if (isMultiSelectMode) {
      toggleImageSelection(image._id, event || new MouseEvent('click'));
    } else {
      setSelectedImage(image);
    }
  };

  const selectAllImages = () => {
    setSelectedImageIds(imageData.map((img) => img._id));
  };

  const clearSelections = () => {
    setSelectedImageIds([]);
  };

  // Delete multiple images mutation
  const deleteMultipleMutation = useMutation<
    DeleteResponse,
    ApiError,
    string[]
  >({
    mutationFn: async (imageIds: string[]) => {
      return fetchWithAuth('/gallery', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageIds }),
      });
    },
    onSuccess: (data) => {
      // Update cache to remove deleted images
      queryClient.setQueryData<GalleryQueryData>(['gallery'], (oldData) => {
        if (!oldData || !oldData.pages) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            images: page.images.filter(
              (img: GalleryImage) => !selectedImageIds.includes(img._id)
            ),
          })),
        };
      });

      setSelectedImageIds([]);
      setIsMultiSelectMode(false);
      setIsDeleteDialogOpen(false);

      toast.info('Images Deleted', {
        description: `Successfully deleted ${data.deletedCount} images`,
      });

      refetch();
    },
    onError: () => {
      toast.error('Error', {
        description: 'Failed to delete images. Please try again.',
      });
      setIsDeleteDialogOpen(false);
    },
  });

  const handleDeleteButtonClick = () => {
    if (selectedImageIds.length > 0) {
      setIsDeleteDialogOpen(true);
    }
  };

  const confirmDelete = () => {
    if (selectedImageIds.length > 0) {
      deleteMultipleMutation.mutate(selectedImageIds);
    }
  };

  const getGalleryTitle = () => {
    if (profileData?.first_name) {
      return `${profileData.first_name}'s Gallery`;
    }
    return "User's Gallery";
  };

  if (isLoading || isProfileLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-y-4 m-4">
        <Spinner />
      </div>
    );
  }

  // For all errors, including 404, we'll show the empty state with upload option
  if (isError || imageData.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-y-4 p-4 max-w-screen-2xl mx-auto">
        <div className="flex justify-between items-center">
          <H3>{getGalleryTitle()}</H3>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Image
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground mb-4">
            {(() => {
              if (isError && error?.status === 404) {
                return 'Your gallery is empty. Upload your first image to get started.';
              }
              if (isError) {
                return `There was an error: ${error?.statusText || 'Unknown error'}`;
              }
              return 'Your gallery is empty. Upload your first image to get started.';
            })()}
          </p>
        </div>
        <AddImageDialog
          open={isAddDialogOpen}
          onClose={() => setIsAddDialogOpen(false)}
          onSuccess={handleImageAdded}
        />
      </div>
    );
  }

  return (
    <div
      className="flex flex-1 flex-col gap-y-4 p-4 max-w-screen-2xl mx-auto"
      ref={containerRef}
    >
      {/* Header */}
      <div className="w-full mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-0">
          <H3>{getGalleryTitle()}</H3>
          <div className="flex flex-row gap-2">
            {isMultiSelectMode ? (
              <>
                <span className="text-sm self-center mr-2">
                  {selectedImageIds.length} selected
                </span>
                {selectedImageIds.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteButtonClick}
                    disabled={deleteMultipleMutation.isPending}
                  >
                    <Trash className="h-4 w-4 mr-1" />
                    Delete Selected
                  </Button>
                )}
                {selectedImageIds.length < imageData.length ? (
                  <Button variant="outline" size="sm" onClick={selectAllImages}>
                    Select All
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={clearSelections}>
                    Clear All
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleMultiSelectMode}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={toggleMultiSelectMode}>
                  Select Multiple
                </Button>

                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add Image
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Gallery Grid - CSS Grid for Masonry Layout */}
      <div
        className="w-full grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
        }}
      >
        {gridLayout.map((column, colIndex) => (
          <div key={`column-${colIndex}`} className="flex flex-col gap-4">
            {column.map((image) => {
              const isSelected = selectedImageIds.includes(image._id);
              const aspectRatio = image.width / image.height || 1;

              return (
                <div
                  key={image._id}
                  className={`relative overflow-hidden rounded-md shadow-md cursor-pointer hover:shadow-lg transition-shadow ${
                    isSelected ? 'ring-2 ring-primary' : ''
                  }`}
                  style={{ aspectRatio: `${aspectRatio}` }}
                  onClick={(e) => handleImageClick(image, e)}
                >
                  <img
                    src={image.url}
                    alt={image.title || 'Gallery image'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {isMultiSelectMode && (
                    <div
                      className="absolute top-2 right-2 bg-background rounded-md flex items-center justify-center w-6 h-6"
                      onClick={(e) => toggleImageSelection(image._id, e)}
                    >
                      <Checkbox
                        checked={isSelected}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                  )}
                  {image.title && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-sm truncate">
                      {image.title}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {isFetchingNextPage && (
        <div className="flex justify-center my-4">
          <Spinner />
        </div>
      )}

      <AddImageDialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSuccess={handleImageAdded}
      />

      {selectedImage && (
        <ImageDetails
          image={selectedImage}
          open={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          onUpdate={handleImageUpdated}
          allImages={imageData}
        />
      )}

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple Images</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedImageIds.length} image
              {selectedImageIds.length !== 1 ? 's' : ''}? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMultipleMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMultipleMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMultipleMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
