import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { TriangleAlert } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useHub } from '@/shared/context/hub';
import { useSupabase } from '@/shared/context/supabase';
import { ApiError, useApi } from '@/shared/hooks/useApi';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/Alert';
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
import { StorageUnavailableWarning } from './StorageUnavailableWarning';
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
  const { currentHub } = useHub();

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

  // Sorting state
  const [sortBy, setSortBy] = useState<
    'name' | 'created_at' | 'updated_at' | 'type' | 'size'
  >('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Handler to change sort field - resets to page 1
  const handleSortChange = useCallback((newSortBy: typeof sortBy) => {
    setSortBy(newSortBy);
  }, []);

  // Handler to toggle sort order - resets to page 1
  const handleSortOrderToggle = useCallback(() => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  }, []);

  // Handler for search - resets to page 1
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

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
  }, [customFolderData]);

  // Function to fetch a specific page
  const fetchPage = useCallback(
    async (page: number) => {
      const endpoint = currentFolderId
        ? `/api/v1/folders/${currentFolderId}/contents`
        : '/api/v1/folders/root/contents';

      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        sort: sortBy,
        order: sortOrder,
      });

      // Add search parameter if query is not empty
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const result = await fetchWithAuth(`${endpoint}?${params}`);
      return result;
    },
    [
      currentFolderId,
      itemsPerPage,
      fetchWithAuth,
      sortBy,
      sortOrder,
      searchQuery,
    ],
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

  // Initial data fetch when folder changes OR sorting changes
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
  }, [currentFolderId, fetchPage]); // fetchPage dependency includes sortBy and sortOrder

  // Fetch profile data
  const { data: profileData, isLoading: isProfileLoading } = useQuery<
    {
      first_name: string | null;
      last_name: string | null;
      avatar_url: string | null;
      hubs: Array<{
        hub_id: string;
        role: string;
        status: string;
        hubs: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          is_active: boolean;
          hub_storage_configs: Array<{
            id: string;
            name: string;
            endpoint_url: string;
            region: string;
            bucket_name: string;
            force_path_style: boolean;
            is_active: boolean;
          }>;
        };
      }>;
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

  // Check S3 storage health
  const {
    data: storageHealth,
    isLoading: isStorageHealthLoading,
    refetch: refetchStorageHealth,
  } = useQuery<{ accessible: boolean; configured: boolean; isAdmin: boolean; error?: string }, ApiError>({
    queryKey: ['storage-health', currentHub?.id],
    queryFn: async () => {
      if (!currentHub?.id) {
        return { accessible: false, configured: false, isAdmin: false };
      }
      const result = await fetchWithAuth(`/api/v1/storage/health?hubId=${currentHub.id}`);
      return result;
    },
    enabled: !!user?.id && !!currentHub?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes - check health regularly
    retry: 1, // Only retry once to fail fast
  });

  // Handler to retry S3 health check
  const handleRetryHealthCheck = useCallback(() => {
    refetchStorageHealth();
  }, [refetchStorageHealth]);

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

  // Get all images from current folder, filtering out deleting images
  const imageData = useMemo(() => {
    return (folderContents?.files || []).filter(
      (image) => !deletingImageIds.includes(image._id),
    );
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
    // Invalidate folder tree query to refresh the sidebar
    queryClient.invalidateQueries({ queryKey: ['folder-tree'] });

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
  }, [fetchPage, queryClient]);

  const handleImageAdded = useCallback(() => {
    // Clear all signed URL related queries to ensure fresh URLs
    queryClient.removeQueries({ queryKey: ['signed-url'] });
    queryClient.removeQueries({ queryKey: ['bulk-signed-urls'] });

    // Invalidate hub members cache to update upload counts
    queryClient.invalidateQueries({ queryKey: ['hub-members'] });

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
    async (deletedImageId: string | undefined) => {
      if (deletedImageId) {
        // File was deleted - close the modal
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

        // Close the modal since the image was deleted
        setSelectedImage(null);
      } else {
        // File was updated (not deleted) - keep modal open with fresh data
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

          // Update the selectedImage with fresh data from the server
          // Find the updated image in the fresh data
          const updatedImage = refreshedData.files.find(
            (file: GalleryImage) => file._id === selectedImage?._id,
          );

          if (updatedImage) {
            setSelectedImage(updatedImage);
          }
        } catch (err) {
          console.error('Error refreshing data after update:', err);
        }
      }
    },
    [queryClient, setSelectedImage, fetchPage, selectedImage],
  );

  // Clear selections and search when folder changes
  useEffect(() => {
    setSelectedImageIds([]);
    setLastSelectedIndex(-1);
    setSearchQuery(''); // Clear search when navigating to a different folder
    // Clean up pointer-events
    document.body.style.pointerEvents = '';
  }, [currentFolderId]);

  // Clean up pointer-events when selections change
  useEffect(() => {
    // Small delay to ensure Radix cleanup has run
    const timer = setTimeout(() => {
      if (selectedImageIds.length === 0) {
        document.body.style.pointerEvents = '';
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedImageIds.length]);

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

  const clearSelections = useCallback(() => {
    setSelectedImageIds([]);
    setLastSelectedIndex(-1);
    // Remove pointer-events: none from body
    document.body.style.pointerEvents = '';
  }, []);

  const selectAllImages = useCallback(async () => {
    // If we have more pages to load, fetch all IDs from the server
    if (hasNextPage) {
      try {
        // Fetch all file IDs without loading full data
        const endpoint = currentFolderId
          ? `/api/v1/folders/${currentFolderId}/file-ids`
          : '/api/v1/folders/root/file-ids';

        const params = new URLSearchParams();
        // Add search parameter if query is not empty
        if (searchQuery.trim()) {
          params.append('search', searchQuery.trim());
        }

        const result = await fetchWithAuth(
          `${endpoint}${params.toString() ? '?' + params : ''}`,
        );

        if (result?.fileIds && Array.isArray(result.fileIds)) {
          setSelectedImageIds(result.fileIds);
          return;
        }
      } catch (error) {
        console.error('Failed to fetch all file IDs:', error);
        // Fall back to selecting only loaded items
      }
    }

    // If no more pages or if the API call failed, just select what's loaded
    const allImageIds = imageData.map((img) => img._id);
    setSelectedImageIds(allImageIds);
  }, [imageData, hasNextPage, currentFolderId, searchQuery, fetchWithAuth]);

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
          await fetchWithAuth(`/api/v1/uploads/${fileId}/move`, {
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
  const {
    mutate: deleteMultipleMutate,
    isPending: isDeletePending,
    ...deleteMultipleMutationRest
  } = useMutation<
    DeleteResponse,
    ApiError,
    string[],
    { previousData: unknown }
  >({
    mutationFn: async (fileIds: string[]) => {
      return fetchWithAuth('/api/v1/uploads/bulk', {
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
      setDeletingImageIds([]);
      setIsDeleteDialogOpen(false);

      // Force cleanup of any stray Radix portals/overlays (AlertDialog AND ContextMenu)
      setTimeout(() => {
        // Remove alert dialog overlays
        const alertOverlays = document.querySelectorAll(
          '[data-slot="alert-dialog-overlay"]',
        );
        alertOverlays.forEach((overlay) => {
          if (overlay.parentElement) {
            overlay.parentElement.remove();
          }
        });

        // Remove context menu portals that might be blocking interactions
        const contextMenuPortals = document.querySelectorAll(
          '[data-slot="context-menu-portal"]',
        );
        contextMenuPortals.forEach((portal) => {
          portal.remove();
        });

        // Also remove any Radix portals that have context menu content
        const contextMenuContents = document.querySelectorAll(
          '[data-radix-context-menu-content]',
        );
        contextMenuContents.forEach((content) => {
          const portal = content.closest('[data-radix-portal]');
          if (portal) {
            portal.remove();
          }
        });

        // Nuclear option: remove ALL Radix portals containing dialogs or context menus
        const allRadixPortals = document.querySelectorAll(
          '[data-radix-portal]',
        );
        allRadixPortals.forEach((portal) => {
          // Only remove if it contains context menu or dialog content
          if (
            portal.querySelector(
              '[data-radix-context-menu-content], [data-slot="alert-dialog-content"]',
            )
          ) {
            portal.remove();
          }
        });
      }, 100);

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

  // Recreate the mutation object for passing to child components
  const deleteMultipleMutation = {
    mutate: deleteMultipleMutate,
    isPending: isDeletePending,
    ...deleteMultipleMutationRest,
  };

  const handleDeleteButtonClick = useCallback((itemIds?: string[]) => {
    console.log('handleDeleteButtonClick called', { itemIds, selectedImageIds });
    // Use provided itemIds or fall back to selectedImageIds
    const idsToDelete = itemIds || selectedImageIds;

    console.log('idsToDelete:', idsToDelete);
    if (idsToDelete.length > 0) {
      // If we're deleting specific items that aren't in selection, update selection first
      if (itemIds && itemIds.length > 0) {
        setSelectedImageIds(itemIds);
      }
      console.log('Setting isDeleteDialogOpen to true');
      setIsDeleteDialogOpen(true);
    } else {
      console.log('No items to delete');
    }
  }, [selectedImageIds]);

  const confirmDelete = useCallback(() => {
    if (selectedImageIds.length > 0) {
      deleteMultipleMutate(selectedImageIds);
    }
  }, [selectedImageIds, deleteMultipleMutate]);

  const handleAddItem = useCallback(() => {
    setIsAddDialogOpen(true);
  }, []);

  const handleLoadMore = useCallback(() => {
    fetchNextPage();
  }, [fetchNextPage]);

  const galleryTitle = useMemo(() => {
    if (profileData?.first_name) {
      const firstName = profileData.first_name;
      // Handle possessive correctly - if name ends with 's', just add apostrophe
      const possessive = firstName.endsWith('s')
        ? `${firstName}'`
        : `${firstName}'s`;
      return `${possessive} Gallery`;
    }
    return 'My Gallery';
  }, [profileData?.first_name]);

  // S3 Outage Screen - only show when storage is configured but inaccessible
  if (!isStorageHealthLoading && storageHealth?.configured && storageHealth?.accessible === false) {
    return (
      <StorageUnavailableWarning
        error={storageHealth.error}
        isRetrying={isStorageHealthLoading}
        onRetry={handleRetryHealthCheck}
      />
    );
  }

  // Normal layout with folder tree and gallery content
  return (
    <div className="flex flex-1 h-full w-full max-w-screen-2xl mx-auto overflow-hidden">
      {/* Left Sidebar - Folder Tree */}
      <div className="w-80 flex-shrink-0 border-r bg-background flex flex-col">
        {/* Folder Tree */}
        <div className="flex-1 overflow-hidden relative">
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
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
        {/* Show warning banner only for hub admins when storage is not configured */}
        {!isStorageHealthLoading && storageHealth?.isAdmin && !storageHealth?.configured && (
          <div className="pl-4 pr-0 py-4 border-b">
            <Alert variant="warning">
              <TriangleAlert className="h-4 w-4" />
              <AlertTitle>Storage Not Configured</AlertTitle>
              <AlertDescription>
                As a hub admin, you need to configure storage for your hub. Go to Settings to set up your storage provider.
              </AlertDescription>
            </Alert>
          </div>
        )}
        <GalleryContent
          currentFolderId={currentFolderId}
          itemData={imageData}
          folders={folderContents?.folders || []}
          breadcrumbs={breadcrumbs}
          selectedItemIds={selectedImageIds}
          deletingItemIds={deletingImageIds}
          isLoading={isLoading || isProfileLoading || isStorageHealthLoading}
          isError={isError}
          error={error}
          deleteMultipleMutation={deleteMultipleMutation}
          galleryTitle={galleryTitle}
          columnCount={columnCount}
          hasNextPage={hasNextPage || false}
          isFetchingNextPage={isFetchingNextPage}
          sortBy={sortBy}
          sortOrder={sortOrder}
          searchQuery={searchQuery}
          onNavigateTo={handleNavigateTo}
          onItemClick={handleImageClick}
          onItemSelect={toggleImageSelection}
          onLoadMore={handleLoadMore}
          onAddItem={handleAddItem}
          onClearSelections={clearSelections}
          onSelectAll={selectAllImages}
          onDeleteSelected={handleDeleteButtonClick}
          onSortChange={handleSortChange}
          onSortOrderToggle={handleSortOrderToggle}
          onSearchChange={handleSearch}
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
        onOpenChange={(open) => {
          // Only allow closing, never opening from external changes
          if (!open) {
            setIsDeleteDialogOpen(false);
            // Remove pointer-events: none from body
            document.body.style.pointerEvents = '';
          }
        }}
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
