import { Plus, Trash, X } from 'lucide-react';
import { memo } from 'react';

import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';
import { H3 } from '@/shared/ui/typography';

import { FolderBreadcrumbs } from './FolderBreadcrumbs';
import { BreadcrumbItem } from './types/Folder';
import { GalleryItem } from './types/GalleryItem';
import { VirtualizedInfiniteGallery } from './VirtualizedInfiniteGallery';

interface GalleryContentProps {
  currentFolderId: string | null;
  itemData: GalleryItem[];
  breadcrumbs: BreadcrumbItem[];
  selectedItemIds: string[];
  deletingItemIds: string[];
  isLoading: boolean;
  isError: boolean;
  error: any;
  deleteMultipleMutation: any;
  galleryTitle: string;
  columnCount: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onNavigateTo: (folderId: string | null) => void;
  onItemClick: (item: GalleryItem, event?: React.MouseEvent) => void;
  onItemSelect: (itemId: string, event: React.MouseEvent | MouseEvent) => void;
  onLoadMore: () => void;
  onAddItem: () => void;
  onClearSelections: () => void;
  onDeleteSelected: () => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  onFileDrop?: (
    draggedFileIds: string[],
    targetFolderId: string | null,
  ) => void;
}

export const GalleryContent = memo(function GalleryContent({
  currentFolderId,
  itemData,
  breadcrumbs,
  selectedItemIds,
  deletingItemIds,
  isLoading,
  isError,
  error,
  deleteMultipleMutation,
  galleryTitle,
  columnCount,
  hasNextPage,
  isFetchingNextPage,
  onNavigateTo,
  onItemClick,
  onItemSelect,
  onLoadMore,
  onAddItem,
  onClearSelections,
  onDeleteSelected,
  onKeyDown,
  onFileDrop,
}: GalleryContentProps) {
  const isMultiSelectMode = selectedItemIds.length > 0;
  // For all errors, including 404, show the empty state (but not during loading)
  if (!isLoading && (isError || itemData.length === 0)) {
    return (
      <div className="flex flex-col gap-y-4 p-4 h-full">
        {/* Breadcrumb navigation - always show */}
        <FolderBreadcrumbs
          breadcrumbs={breadcrumbs}
          onNavigate={onNavigateTo}
        />

        <div className="flex justify-between items-center">
          <H3>{galleryTitle}</H3>
          <div className="flex gap-2">
            <Button onClick={onAddItem}>
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
                  : 'Your gallery is empty. Create folders or upload items to get started.';
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
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-y-4 p-4 h-full overflow-auto focus:outline-none"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      {/* Breadcrumb navigation - always show */}
      <FolderBreadcrumbs breadcrumbs={breadcrumbs} onNavigate={onNavigateTo} />

      {/* Header */}
      <div className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-0">
          <H3>{galleryTitle}</H3>
          {/* Fixed height actions container to prevent shifting */}
          <div className="flex flex-row gap-2 min-h-[40px] items-center">
            {isMultiSelectMode ? (
              <>
                <span className="text-sm self-center mr-2">
                  {selectedItemIds.length} selected
                </span>
                {selectedItemIds.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={onDeleteSelected}
                    disabled={deleteMultipleMutation.isPending || isLoading}
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
                {selectedItemIds.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onClearSelections}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear Selection
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button onClick={onAddItem} disabled={isLoading}>
                  <Plus className="h-4 w-4" />
                  Add Item(s)
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Gallery Content Area */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <Spinner />
          <p className="text-sm text-muted-foreground">Loading files...</p>
        </div>
      ) : itemData.length > 0 ? (
        <VirtualizedInfiniteGallery
          items={itemData}
          columnCount={columnCount}
          selectedItemIds={selectedItemIds}
          deletingItemIds={deletingItemIds}
          onItemClick={onItemClick}
          onItemSelect={onItemSelect}
          onLoadMore={onLoadMore}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onDeleteSelected={onDeleteSelected}
          onClearSelections={onClearSelections}
          onMoveToFolder={onFileDrop}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground mb-4">
            {(() => {
              if (isError && error?.status === 404) {
                return currentFolderId
                  ? 'This folder is empty.'
                  : 'Your gallery is empty. Create folders or upload items to get started.';
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
      )}
    </div>
  );
});
