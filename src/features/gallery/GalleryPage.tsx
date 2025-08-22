import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useSupabase } from '@/shared/context/supabase';
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

import { AddItemDialog } from './AddItemDialog';
import { CreateFolderDialog } from './CreateFolderDialog';
import { FolderTreeView } from './FolderTreeView';
import { GalleryContent } from './GalleryContent';
import { ImageDetails } from './ImageDetails';
import { BreadcrumbItem, FolderContentsResponse } from './types/Folder';
import { GalleryItem as GalleryImage } from './types/GalleryItem';

interface DeleteResponse {
  deletedCount: number;
  success: boolean;
}

// Create a context to manage selectedImage without causing re-renders
const useSelectedImageManager = () => {
  const [selectedImage, setSelectedImageState] = useState<GalleryImage | null>(
    null,
  );

  const setSelectedImage = useCallback((image: GalleryImage | null) => {
    setSelectedImageState(image);
  }, []);

  return { selectedImage, setSelectedImage };
};

interface GalleryPageProps {
  folderId: string | null;
}

export function GalleryPage({ folderId: currentFolderId }: GalleryPageProps) {
  const { fetchWithAuth } = useApi();
  const { user } = useSupabase();

  const navigate = useNavigate();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const { selectedImage, setSelectedImage } = useSelectedImageManager();
  const queryClient = useQueryClient();
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number>(-1);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: 'home', name: 'Home', path: 'Home' },
  ]);
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
    if (!customFolderData) {
      return null;
    }
    return customFolderData;
  }, [
    customFolderData?.files,
    customFolderData?.folders,
    customFolderData?.total_items,
  ]);

  // Function to fetch a specific page
  const fetchPage = useCallback(
    async (page: number) => {
      const endpoint = currentFolderId
        ? `/api/v1/folders/${currentFolderId}/contents`
        : '/api/v1/folders/root/contents';

      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
      });

      const result = await fetchWithAuth(`${endpoint}?${params}`);
      return result;
    },
    [currentFolderId, itemsPerPage, fetchWithAuth],
  );

  // Function to fetch next page
  const fetchNextPage = useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage) {
      return;
    }

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

      setCustomFolderData((prevData) => {
        // Compare content to prevent unnecessary updates
        if (
          prevData &&
          prevData.total_items === newData.total_items &&
          prevData.files.length === newData.files.length &&
          prevData.folders.length === newData.folders.length &&
          prevData.files[0]?._id === newData.files[0]?._id
        ) {
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

        setCustomFolderData((prevData) => {
          // Compare content to prevent unnecessary updates
          if (
            prevData &&
            prevData.total_items === newData.total_items &&
            prevData.files.length === newData.files.length &&
            prevData.folders.length === newData.folders.length &&
            prevData.files[0]?._id === newData.files[0]?._id
          ) {
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
    {
      first_name: string | null;
      last_name: string | null;
      avatar_url: string | null;
    },
    ApiError
  >({
    queryKey: ['user', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const result = await fetchWithAuth('/api/v1/profile/me');
      return result.data;
    },
    enabled: !!user?.id,
    staleTime: 30 * 60 * 1000, // 30 minutes - profile rarely changes
  });

  // Fetch breadcrumb chain for current folder
  const { data: breadcrumbData } = useQuery<BreadcrumbItem[], ApiError>({
    queryKey: ['folder-breadcrumbs', currentFolderId],
    staleTime: 10 * 60 * 1000, // 10 minutes - folder structure rarely changes
    queryFn: async () => {
      const breadcrumbs: BreadcrumbItem[] = [];

      // Always start with Home
      breadcrumbs.push({
        id: 'home',
        name: 'Home',
        path: 'Home',
      });

      if (!currentFolderId) {
        return breadcrumbs;
      }

      let folderId = currentFolderId;

      // Walk up the parent chain to build breadcrumbs
      while (folderId) {
        const folder = await fetchWithAuth(`/api/v1/folders/${folderId}`);
        breadcrumbs.push({
          id: folder.folder.id,
          name: folder.folder.name,
          path: folder.folder.path || folder.folder.name,
        });
        folderId = folder.folder.parent_id;
      }

      return breadcrumbs;
    },
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

  const handleNavigateTo = useCallback(
    (folderId: string | null) => {
      if (folderId === null || folderId === 'home') {
        navigate({
          to: '/gallery',
        });
      } else {
        navigate({
          to: '/gallery/$folderId',
          params: { folderId },
        });
      }
    },
    [navigate],
  );

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
        setCustomFolderData((prevData) => {
          if (!prevData) {
            return prevData;
          }

          const newData = {
            ...prevData,
            files: prevData.files.filter((file) => file._id !== deletedImageId),
          };

          return newData;
        });

        // Also update the pages refs to keep them in sync
        allPagesRef.current = allPagesRef.current.map((page) => ({
          ...page,
          files: page.files.filter((file) => file._id !== deletedImageId),
        }));

        // Remove signed URL cache entries for the deleted image
        queryClient.removeQueries({
          queryKey: ['signed-url', deletedImageId],
          exact: false,
        });
      }

      setSelectedImage(null);
    },
    [queryClient, setSelectedImage],
  );

  // Clear selections when folder changes
  useEffect(() => {
    setSelectedImageIds([]);
    setLastSelectedIndex(-1);
  }, [currentFolderId]);

  const toggleImageSelection = useCallback(
    (imageId: string, event: React.MouseEvent | MouseEvent) => {
      if (event) {
        event.stopPropagation();
      }

      const currentIndex = imageData.findIndex((img) => img._id === imageId);

      if ((event as React.MouseEvent).shiftKey && lastSelectedIndex >= 0) {
        // Range selection with Shift+click
        const start = Math.min(lastSelectedIndex, currentIndex);
        const end = Math.max(lastSelectedIndex, currentIndex);
        const rangeIds = imageData.slice(start, end + 1).map((img) => img._id);

        setSelectedImageIds((prev) => {
          const newSelection = new Set([...prev, ...rangeIds]);
          return Array.from(newSelection);
        });
      } else {
        // Toggle single selection
        setSelectedImageIds((prev) => {
          if (prev.includes(imageId)) {
            return prev.filter((id) => id !== imageId);
          } else {
            return [...prev, imageId];
          }
        });
        setLastSelectedIndex(currentIndex);
      }
    },
    [imageData, lastSelectedIndex],
  );

  const handleImageClick = useCallback(
    (image: GalleryImage) => {
      // Double-click now opens the image viewer
      setSelectedImage(image);
    },
    [setSelectedImage],
  );

  const clearSelections = () => {
    setSelectedImageIds([]);
    setLastSelectedIndex(-1);
  };

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Delete' && selectedImageIds.length > 0) {
        event.preventDefault();
        setIsDeleteDialogOpen(true);
      }
    },
    [selectedImageIds.length],
  );

  const handleFileDrop = useCallback(
    async (draggedFileIds: string[], targetFolderId: string | null) => {
      try {
        // Optimistically remove the moved images from the current view
        setCustomFolderData((prevData) => {
          if (!prevData) {
            return prevData;
          }

          const newData = {
            ...prevData,
            files: prevData.files.filter(
              (file) => !draggedFileIds.includes(file._id),
            ),
          };

          return newData;
        });

        // Also update the pages refs to keep them in sync
        allPagesRef.current = allPagesRef.current.map((page) => ({
          ...page,
          files: page.files.filter(
            (file) => !draggedFileIds.includes(file._id),
          ),
        }));

        // Clear selections immediately since files are being moved
        setSelectedImageIds([]);
        setLastSelectedIndex(-1);

        // Move each file to the target folder
        for (const fileId of draggedFileIds) {
          await fetchWithAuth(`/api/v1/folders/files/${fileId}/move`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              folder_id: targetFolderId,
            }),
          });
        }

        // Clear any cached queries that might be affected
        queryClient.removeQueries({ queryKey: ['signed-url'] });
        queryClient.removeQueries({ queryKey: ['bulk-signed-urls'] });

        // Remove signed URL cache entries for moved images
        draggedFileIds.forEach((fileId) => {
          queryClient.removeQueries({
            queryKey: ['signed-url', fileId],
            exact: false,
          });
        });

        // Refresh the current folder data
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

        const targetName = targetFolderId ? 'folder' : 'Home';
        toast.success(
          `Moved ${draggedFileIds.length} file${draggedFileIds.length > 1 ? 's' : ''} to ${targetName}`,
        );
      } catch (error) {
        console.error('Failed to move files:', error);
        toast.error('Failed to move files', {
          description: 'Please try again.',
        });

        // If move failed, refresh to restore correct state
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
        } catch (refreshError) {
          console.error('Failed to refresh after move error:', refreshError);
        }
      }
    },
    [fetchWithAuth, fetchPage, queryClient],
  );

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
    onSuccess: (data, deletedFileIds) => {
      // Remove deleted images from custom data
      setCustomFolderData((prevData) => {
        if (!prevData) {
          return prevData;
        }

        const newData = {
          ...prevData,
          files: prevData.files.filter(
            (file) => !deletedFileIds.includes(file._id),
          ),
        };

        return newData;
      });

      // Also update the pages refs to keep them in sync
      allPagesRef.current = allPagesRef.current.map((page) => ({
        ...page,
        files: page.files.filter((file) => !deletedFileIds.includes(file._id)),
      }));

      // Remove signed URL cache entries for deleted images
      deletedFileIds.forEach((fileId) => {
        queryClient.removeQueries({
          queryKey: ['signed-url', fileId],
          exact: false,
        });
      });

      setSelectedImageIds([]);
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
      const firstName = profileData.first_name;
      // Handle possessive correctly - if name ends with 's', just add apostrophe
      const possessive = firstName.endsWith('s')
        ? `${firstName}'`
        : `${firstName}'s`;
      return `${possessive} Gallery`;
    }
    return 'My Gallery';
  };

  // Don't show full page loader - let GalleryContent handle loading states

  // Always show the layout with folder tree - let GalleryContent handle all states
  return (
    <div className="flex flex-1 h-full w-full max-w-screen-2xl mx-auto overflow-hidden">
      {/* Left Sidebar - Folder Tree */}
      {/* Left Sidebar - Folder Tree */}
      <div className="w-80 flex-shrink-0 border-r bg-background relative">
        <div className="absolute inset-0 overflow-hidden">
          <FolderTreeView
            currentFolderId={currentFolderId}
            onFolderSelect={handleNavigateTo}
            onCreateFolder={() => setIsCreateFolderOpen(true)}
            onFileDrop={handleFileDrop}
            className="h-full"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
        <GalleryContent
          currentFolderId={currentFolderId}
          itemData={imageData}
          breadcrumbs={breadcrumbs}
          selectedItemIds={selectedImageIds}
          deletingItemIds={deletingImageIds}
          isLoading={isLoading || isProfileLoading}
          isError={isError}
          error={error}
          deleteMultipleMutation={deleteMultipleMutation}
          galleryTitle={getGalleryTitle()}
          columnCount={columnCount}
          hasNextPage={hasNextPage || false}
          isFetchingNextPage={isFetchingNextPage}
          onNavigateTo={handleNavigateTo}
          onItemClick={handleImageClick}
          onItemSelect={toggleImageSelection}
          onLoadMore={() => fetchNextPage()}
          onAddItem={() => setIsAddDialogOpen(true)}
          onClearSelections={clearSelections}
          onDeleteSelected={handleDeleteButtonClick}
          onKeyDown={handleKeyDown}
          onFileDrop={handleFileDrop}
        />
      </div>

      <AddItemDialog
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
