import {
  useMutation,
  useQuery,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { FolderPlus, Plus, Trash, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { toast } from 'sonner';


import { AddImageDialog } from '@/features/gallery/AddImageDialog';
import { CreateFolderDialog } from '@/features/gallery/CreateFolderDialog';
import { FolderBreadcrumbs } from '@/features/gallery/FolderBreadcrumbs';
import { FolderGrid } from '@/features/gallery/FolderGrid';
import { ImageDetails } from '@/features/gallery/ImageDetails';
import { VirtualizedInfiniteGallery } from '@/features/gallery/VirtualizedInfiniteGallery';
import { GalleryImage } from '@/features/gallery/types/GalleryImage';
import {
  BreadcrumbItem,
  FolderContentsResponse,
} from '@/features/gallery/types/Folder';
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

// Create a context to manage selectedImage without causing re-renders
const useSelectedImageManager = () => {
  const [selectedImage, setSelectedImageState] = useState<GalleryImage | null>(null);
  
  const setSelectedImage = useCallback((image: GalleryImage | null) => {
    setSelectedImageState(image);
  }, []);
  
  return { selectedImage, setSelectedImage };
};

function RouteComponent() {
  const { fetchWithAuth } = useApi();
  
  const navigate = useNavigate();
  const { folderId: currentFolderId } = Route.useSearch();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const { selectedImage, setSelectedImage } = useSelectedImageManager();
  const queryClient = useQueryClient();
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [deletingImageIds, setDeletingImageIds] = useState<string[]>([]);
  // Fixed 5 columns for denser grid
  const columnCount = 5;

  const [itemsPerPage] = useState(50); // Good balance for performance
  
  // CUSTOM INFINITE SCROLL IMPLEMENTATION - Bypassing React Query completely
  const [customFolderData, setCustomFolderData] = useState<{
    folders: FolderContentsResponse['folders'];
    files: GalleryImage[];
    pagination: FolderContentsResponse['pagination'] | null;
    total_items: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const currentPageRef = useRef(1);
  const allPagesRef = useRef<FolderContentsResponse[]>([]);

  // Stable folder contents reference - only changes when actual data changes
  const folderContents = useMemo(() => {
    if (!customFolderData) return null;
    return customFolderData;
  }, [customFolderData?.files, customFolderData?.folders, customFolderData?.total_items]);

  // Function to fetch a specific page
  const fetchPage = useCallback(async (page: number) => {
    const endpoint = currentFolderId
      ? `/api/v1/folders/${currentFolderId}/contents`
      : '/api/v1/folders/root/contents';

    const params = new URLSearchParams({
      page: page.toString(),
      limit: itemsPerPage.toString(),
    });

    const result = await fetchWithAuth(`${endpoint}?${params}`);
    return result;
  }, [currentFolderId, itemsPerPage]);

  // Function to fetch next page
  const fetchNextPage = useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage) return;
    
    setIsFetchingNextPage(true);
    try {
      const nextPage = currentPageRef.current + 1;
      const newPageData = await fetchPage(nextPage);
      
      // Handle case where fetchPage returns undefined (auth failure)
      if (!newPageData) {
        return;
      }
      
      // Add to our pages array
      allPagesRef.current.push(newPageData);
      currentPageRef.current = nextPage;
      
      // Flatten all pages and update state with stable reference
      const allFolders: FolderContentsResponse['folders'] = [];
      const allFiles: GalleryImage[] = [];
      
      allPagesRef.current.forEach((page) => {
        allFolders.push(...(page.folders || []));
        allFiles.push(...(page.files || []));
      });
      
      const newData = {
        folders: allFolders,
        files: allFiles,
        pagination: newPageData.pagination,
        total_items: allPagesRef.current[0]?.pagination?.total_items || 0,
      };
      
      setCustomFolderData(prevData => {
        // Compare content to prevent unnecessary updates
        if (prevData && 
            prevData.total_items === newData.total_items &&
            prevData.files.length === newData.files.length &&
            prevData.folders.length === newData.folders.length &&
            prevData.files[0]?._id === newData.files[0]?._id) {
          return prevData;
        }
        return newData;
      });
      
      setHasNextPage(!!newPageData.pagination?.has_next);
    } catch (err) {
      console.error('Error fetching next page:', err);
      // Don't show error to user for infinite scroll failures
      // The auth system will handle redirects if needed
    } finally {
      setIsFetchingNextPage(false);
    }
  }, [hasNextPage, isFetchingNextPage, fetchPage]);

  // Initial data fetch when folder changes
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      setIsError(false);
      setError(null);
      currentPageRef.current = 1;
      allPagesRef.current = [];
      
      try {
        const initialPageData = await fetchPage(1);
        
        // Set up our pages array
        allPagesRef.current = [initialPageData];
        
        // Set initial data with stable reference - only update if different
        const newData = {
          folders: initialPageData.folders || [],
          files: initialPageData.files || [],
          pagination: initialPageData.pagination,
          total_items: initialPageData.pagination?.total_items || 0,
        };
        
        setCustomFolderData(prevData => {
          // Compare content to prevent unnecessary updates
          if (prevData && 
              prevData.total_items === newData.total_items &&
              prevData.files.length === newData.files.length &&
              prevData.folders.length === newData.folders.length &&
              prevData.files[0]?._id === newData.files[0]?._id) {
            return prevData;
          }
          return newData;
        });
        
        setHasNextPage(!!initialPageData.pagination?.has_next);
      } catch (err) {
        setIsError(true);
        setError(err as ApiError);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [currentFolderId, fetchPage]);


  // Fetch profile data
  const { data: profileData, isLoading: isProfileLoading } = useQuery<
    Profile,
    ApiError
  >({
    queryKey: ['profile'],
    queryFn: () => fetchWithAuth('/api/v1/profile'),
    staleTime: 30 * 60 * 1000, // 30 minutes - profile rarely changes
  });

  // Fetch breadcrumb chain for current folder
  const { data: breadcrumbData } = useQuery<BreadcrumbItem[], ApiError>({
    queryKey: ['folder-breadcrumbs', currentFolderId],
    staleTime: 10 * 60 * 1000, // 10 minutes - folder structure rarely changes
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

  // Get images and folders from current folder, filtering out deleting images
  const imageData = useMemo(() => {
    const filtered = (folderContents?.files || []).filter(
      (image) => !deletingImageIds.includes(image._id),
    );
    return filtered;
  }, [folderContents?.files, deletingImageIds]);

  const folderData = useMemo(
    () => folderContents?.folders || [],
    [folderContents?.folders],
  );


  // Handle folder navigation
  const handleFolderClick = useCallback((folderId: string) => {
    navigate({
      to: '/gallery',
      search: { folderId },
    });
  }, [navigate]);

  const handleNavigateTo = useCallback((folderId: string | null) => {
    navigate({
      to: '/gallery',
      search: { folderId },
    });
  }, [navigate]);

  const handleCreateFolder = useCallback(() => {
    // Refresh the custom data by re-fetching
    const refreshData = async () => {
      try {
        const refreshedData = await fetchPage(1);
        allPagesRef.current = [refreshedData];
        currentPageRef.current = 1;
        
        setCustomFolderData({
          folders: refreshedData.folders || [],
          files: refreshedData.files || [],
          pagination: refreshedData.pagination,
          total_items: refreshedData.pagination?.total_items || 0,
        });
        
        setHasNextPage(!!refreshedData.pagination?.has_next);
      } catch (err) {
        console.error('Error refreshing data:', err);
      }
    };
    
    refreshData();
    setIsCreateFolderOpen(false);
  }, [fetchPage]);

  const handleImageAdded = useCallback(() => {

    // Clear all signed URL related queries to ensure fresh URLs
    queryClient.removeQueries({ queryKey: ['signed-url'] });
    queryClient.removeQueries({ queryKey: ['bulk-signed-urls'] });

    // Refresh the custom data by re-fetching
    const refreshData = async () => {
      try {
        const refreshedData = await fetchPage(1);
        allPagesRef.current = [refreshedData];
        currentPageRef.current = 1;
        
        setCustomFolderData({
          folders: refreshedData.folders || [],
          files: refreshedData.files || [],
          pagination: refreshedData.pagination,
          total_items: refreshedData.pagination?.total_items || 0,
        });
        
        setHasNextPage(!!refreshedData.pagination?.has_next);
      } catch (err) {
        console.error('Error refreshing data:', err);
      }
    };
    
    refreshData();
    setIsAddDialogOpen(false);
  }, [queryClient, fetchPage]);

  const handleImageUpdated = useCallback(
    (deletedImageId: string | undefined) => {
      
      if (deletedImageId) {
        // Optimistically remove the image from custom data
        setCustomFolderData(prevData => {
          if (!prevData) return prevData;
          
          const newData = {
            ...prevData,
            files: prevData.files.filter(file => file._id !== deletedImageId),
          };
          
          
          return newData;
        });
        
        // Also update the pages refs to keep them in sync
        allPagesRef.current = allPagesRef.current.map(page => ({
          ...page,
          files: page.files.filter(file => file._id !== deletedImageId),
        }));

        // Remove signed URL cache entries for the deleted image
        queryClient.removeQueries({
          queryKey: ['signed-url', deletedImageId],
          exact: false,
        });
      }

        setSelectedImage(null);
    },
    [queryClient],
  );

  const toggleMultiSelectMode = useCallback(() => {
    if (isMultiSelectMode) {
      setSelectedImageIds([]);
    }
    setIsMultiSelectMode(!isMultiSelectMode);
  }, [isMultiSelectMode]);

  const toggleImageSelection = useCallback((
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
  }, []);

  const handleImageClick = useCallback((image: GalleryImage, event?: React.MouseEvent) => {
    if (isMultiSelectMode) {
      toggleImageSelection(image._id, event || new MouseEvent('click'));
    } else {
      setSelectedImage(image);
    }
  }, [isMultiSelectMode, toggleImageSelection]);

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
    string[],
    { previousData: unknown }
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
    onMutate: async (fileIds: string[]) => {
      setDeletingImageIds(fileIds);
      return { previousData: null };
    },
    onSuccess: (data) => {
      setSelectedImageIds([]);
      setIsMultiSelectMode(false);
      setIsDeleteDialogOpen(false);
      setDeletingImageIds([]);

      toast.info('Images Deleted', {
        description: `Successfully deleted ${data.deletedCount} images`,
      });
    },
    onError: () => {
      setDeletingImageIds([]); // Clear deleting state on error
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
            <Button
              variant="outline"
              onClick={() => setIsCreateFolderOpen(true)}
            >
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
                return currentFolderId
                  ? 'This folder is empty.'
                  : 'Your gallery is empty. Create folders or upload images to get started.';
              }
              if (isError) {
                return `There was an error: ${error?.statusText || 'Unknown error'}`;
              }
              return currentFolderId
                ? 'This folder is empty.'
                : 'Your gallery is empty. Create folders or upload images to get started.';
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
                    {deleteMultipleMutation.isPending ? (
                      <>
                        <Spinner className="h-4 w-4 mr-1" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash className="h-4 w-4 mr-1" />
                        Delete Selected
                      </>
                    )}
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
                <Button
                  variant="outline"
                  onClick={toggleMultiSelectMode}
                  disabled={imageData.length === 0}
                >
                  Select Multiple
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateFolderOpen(true)}
                >
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
      />

      {/* Virtualized Infinite Gallery */}
      {imageData.length > 0 && (
        <VirtualizedInfiniteGallery
          images={imageData}
          columnCount={columnCount}
          isMultiSelectMode={isMultiSelectMode}
          selectedImageIds={selectedImageIds}
          deletingImageIds={deletingImageIds}
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
