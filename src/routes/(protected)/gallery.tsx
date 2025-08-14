import { useWindowSize } from '@react-hook/window-size';
import {
  useMutation,
  useQuery,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { FolderPlus, Plus, Trash, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { AddImageDialog } from '@/features/gallery/AddImageDialog';
import { CreateFolderDialog } from '@/features/gallery/CreateFolderDialog';
import { FolderBreadcrumbs } from '@/features/gallery/FolderBreadcrumbs';
import { FolderGrid } from '@/features/gallery/FolderGrid';
import { ImageDetails } from '@/features/gallery/ImageDetails';
import { VirtualizedInfiniteGallery } from '@/features/gallery/VirtualizedInfiniteGallery';
import { GalleryImage } from '@/features/gallery/types/GalleryImage';
import { BreadcrumbItem, FolderContentsResponse } from '@/features/gallery/types/Folder';
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
import { Spinner } from '@/shared/ui/Spinner';
import { H3 } from '@/shared/ui/typography';

export const Route = createFileRoute('/(protected)/gallery')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => ({
    folderId: (search.folderId as string) || null,
  }),
});

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
  const navigate = useNavigate();
  const { folderId: currentFolderId } = Route.useSearch();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const queryClient = useQueryClient();
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [width] = useWindowSize();

  // Calculate responsive column count based on window width
  const getColumnCount = (): number => {
    if (width < BREAKPOINTS.md) {
      return 1;
    }
    if (width < BREAKPOINTS.lg) {
      return 2;
    }
    if (width < BREAKPOINTS.xl) {
      return 3;
    }
    if (width < BREAKPOINTS['2xl']) {
      return 4;
    }
    return 5;
  };

  const columnCount = getColumnCount();

  const [itemsPerPage] = useState(50); // Good balance for performance

  // Fetch folder contents with infinite scrolling
  const {
    data: infiniteData,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<FolderContentsResponse, ApiError>({
    queryKey: ['folder-contents-infinite', currentFolderId, itemsPerPage],
    queryFn: async ({ pageParam = 1 }) => {
      const endpoint = currentFolderId 
        ? `/api/v1/folders/${currentFolderId}/contents` 
        : '/api/v1/folders/root/contents';
      
      const params = new URLSearchParams({
        page: (pageParam as number).toString(),
        limit: itemsPerPage.toString(),
      });
      
      return fetchWithAuth(`${endpoint}?${params}`);
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination?.has_next) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });

  // Flatten infinite data into single arrays
  const folderContents = useMemo(() => {
    if (!infiniteData) return null;
    
    const allFolders: any[] = [];
    const allFiles: any[] = [];
    
    infiniteData.pages.forEach(page => {
      allFolders.push(...(page.folders || []));
      allFiles.push(...(page.files || []));
    });

    return {
      folders: allFolders,
      files: allFiles,
      pagination: infiniteData.pages[infiniteData.pages.length - 1]?.pagination,
      total_items: infiniteData.pages[0]?.pagination?.total_items || 0,
    };
  }, [infiniteData]);

  // Fetch profile data
  const { data: profileData, isLoading: isProfileLoading } = useQuery<Profile, ApiError>({
    queryKey: ['profile'],
    queryFn: () => fetchWithAuth('/api/v1/profile'),
  });

  // Fetch breadcrumb chain for current folder
  const { data: breadcrumbData } = useQuery<BreadcrumbItem[], ApiError>({
    queryKey: ['folder-breadcrumbs', currentFolderId],
    queryFn: async () => {
      if (!currentFolderId) return [];
      
      const breadcrumbs: BreadcrumbItem[] = [];
      let folderId = currentFolderId;
      
      // Walk up the parent chain to build breadcrumbs
      while (folderId) {
        const folder = await fetchWithAuth(`/api/v1/folders/${folderId}`);
        breadcrumbs.unshift({
          id: folder.folder.id,
          name: folder.folder.name,
          path: folder.folder.path || folder.folder.name,
        });
        folderId = folder.folder.parent_id;
      }
      
      return breadcrumbs;
    },
    enabled: !!currentFolderId,
  });

  // Update breadcrumbs when data changes
  useEffect(() => {
    setBreadcrumbs(breadcrumbData || []);
  }, [breadcrumbData]);

  // Get images and folders from current folder
  const imageData = useMemo(
    () => folderContents?.files || [],
    [folderContents],
  );
  
  const folderData = useMemo(
    () => folderContents?.folders || [],
    [folderContents],
  );


  // Handle folder navigation
  const handleFolderClick = (folderId: string) => {
    navigate({
      to: '/gallery',
      search: { folderId },
    });
  };

  const handleNavigateTo = (folderId: string | null) => {
    navigate({
      to: '/gallery',
      search: folderId ? { folderId } : {},
    });
  };

  const handleCreateFolder = () => {
    // Invalidate infinite query to refetch data
    queryClient.invalidateQueries({ queryKey: ['folder-contents-infinite', currentFolderId] });
    setIsCreateFolderOpen(false);
  };


  const handleImageAdded = useCallback(() => {
    // Invalidate signed URL cache to ensure fresh URLs for newly uploaded files
    queryClient.invalidateQueries({ queryKey: ['signed-url'] });
    queryClient.invalidateQueries({ queryKey: ['bulk-signed-urls'] });
    // Invalidate infinite query to refetch data
    queryClient.invalidateQueries({ queryKey: ['folder-contents-infinite', currentFolderId] });
    setIsAddDialogOpen(false);
  }, [queryClient, currentFolderId]);

  const handleImageUpdated = useCallback(
    (deletedImageId: string | undefined) => {
      if (deletedImageId) {
        // Update the query cache for an immediate UI update
        queryClient.setQueryData<FolderContentsResponse>(['folder-contents', currentFolderId], (oldData) => {
          if (!oldData) {
            return oldData;
          }

          return {
            ...oldData,
            files: oldData.files.filter(
              (img: GalleryImage) => img._id !== deletedImageId,
            ),
          };
        });
      }

      setSelectedImage(null);
      // Invalidate signed URL cache when images are updated/deleted
      queryClient.invalidateQueries({ queryKey: ['signed-url'] });
      queryClient.invalidateQueries({ queryKey: ['bulk-signed-urls'] });
      // Invalidate infinite query to refetch data
      queryClient.invalidateQueries({ queryKey: ['folder-contents-infinite', currentFolderId] });
    },
    [queryClient, currentFolderId],
  );

  const toggleMultiSelectMode = () => {
    if (isMultiSelectMode) {
      setSelectedImageIds([]);
    }
    setIsMultiSelectMode(!isMultiSelectMode);
  };

  const toggleImageSelection = (
    imageId: string,
    event: React.MouseEvent | MouseEvent,
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

  // Delete multiple files mutation
  const deleteMultipleMutation = useMutation<
    DeleteResponse,
    ApiError,
    string[]
  >({
    mutationFn: async (fileIds: string[]) => {
      return fetchWithAuth('/api/v1/folders/files', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileIds }),
      });
    },
    onSuccess: (data) => {
      // Update cache to remove deleted images
      queryClient.setQueryData<FolderContentsResponse>(['folder-contents', currentFolderId], (oldData) => {
        if (!oldData) {
          return oldData;
        }

        return {
          ...oldData,
          files: oldData.files.filter(
            (img: GalleryImage) => !selectedImageIds.includes(img._id),
          ),
        };
      });

      setSelectedImageIds([]);
      setIsMultiSelectMode(false);
      setIsDeleteDialogOpen(false);

      toast.info('Images Deleted', {
        description: `Successfully deleted ${data.deletedCount} images`,
      });

      // Invalidate signed URL cache for deleted images
      queryClient.invalidateQueries({ queryKey: ['signed-url'] });
      queryClient.invalidateQueries({ queryKey: ['bulk-signed-urls'] });
      // Invalidate infinite query to refetch data
      queryClient.invalidateQueries({ queryKey: ['folder-contents-infinite', currentFolderId] });
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
  if (isError || (imageData.length === 0 && folderData.length === 0)) {
    return (
      <div className="flex flex-1 flex-col gap-y-4 p-4 max-w-screen-2xl mx-auto">
        {/* Breadcrumb navigation */}
        {breadcrumbs.length > 0 && (
          <FolderBreadcrumbs 
            breadcrumbs={breadcrumbs} 
            onNavigate={handleNavigateTo} 
          />
        )}
        
        <div className="flex justify-between items-center">
          <H3>{getGalleryTitle()}</H3>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsCreateFolderOpen(true)}>
              <FolderPlus className="h-4 w-4" />
              New Folder
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Image(s)
            </Button>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground mb-4">
            {(() => {
              if (isError && error?.status === 404) {
                return currentFolderId ? 'This folder is empty.' : 'Your gallery is empty. Create folders or upload images to get started.';
              }
              if (isError) {
                return `There was an error: ${error?.statusText || 'Unknown error'}`;
              }
              return currentFolderId ? 'This folder is empty.' : 'Your gallery is empty. Create folders or upload images to get started.';
            })()}
          </p>
        </div>
        
        <AddImageDialog
          open={isAddDialogOpen}
          onClose={() => setIsAddDialogOpen(false)}
          onSuccess={handleImageAdded}
          folderId={currentFolderId}
        />
        
        <CreateFolderDialog
          open={isCreateFolderOpen}
          onClose={() => setIsCreateFolderOpen(false)}
          onSuccess={handleCreateFolder}
          parentId={currentFolderId}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-y-4 p-4 max-w-screen-2xl mx-auto">
      {/* Breadcrumb navigation */}
      {breadcrumbs.length > 0 && (
        <FolderBreadcrumbs 
          breadcrumbs={breadcrumbs} 
          onNavigate={handleNavigateTo} 
        />
      )}
      
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
                <Button variant="outline" onClick={toggleMultiSelectMode} disabled={imageData.length === 0}>
                  Select Multiple
                </Button>
                <Button variant="outline" onClick={() => setIsCreateFolderOpen(true)}>
                  <FolderPlus className="h-4 w-4" />
                  New Folder
                </Button>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add Image(s)
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Folders */}
      <FolderGrid 
        folders={folderData}
        onFolderClick={handleFolderClick}
        // TODO: Add folder management functionality
        // onFolderRename={handleFolderRename}
        // onFolderDelete={handleFolderDelete}
        // onFolderMove={handleFolderMove}
      />

      {/* Virtualized Infinite Gallery */}
      {imageData.length > 0 && (
        <VirtualizedInfiniteGallery
          images={imageData}
          columnCount={columnCount}
          isMultiSelectMode={isMultiSelectMode}
          selectedImageIds={selectedImageIds}
          onImageClick={handleImageClick}
          onImageSelect={toggleImageSelection}
          onLoadMore={() => fetchNextPage()}
          hasNextPage={hasNextPage || false}
          isFetchingNextPage={isFetchingNextPage}
        />
      )}

      <AddImageDialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSuccess={handleImageAdded}
        folderId={currentFolderId}
      />
      
      <CreateFolderDialog
        open={isCreateFolderOpen}
        onClose={() => setIsCreateFolderOpen(false)}
        onSuccess={handleCreateFolder}
        parentId={currentFolderId}
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