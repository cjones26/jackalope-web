import {
  ArrowDownAZ,
  ArrowUpAZ,
  ChevronDown,
  Plus,
  Trash,
  X,
} from 'lucide-react';
import { memo, useMemo } from 'react';

import { Button } from '@/shared/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/shared/ui/DropdownMenu/DropdownMenu';
import { Spinner } from '@/shared/ui/Spinner';
import { H3 } from '@/shared/ui/typography';

import { FolderBreadcrumbs } from './FolderBreadcrumbs';
import { SearchBar } from './SearchBar';
import { BreadcrumbItem, Folder } from './types/Folder';
import { GalleryItem } from './types/GalleryItem';
import { VirtualizedInfiniteGallery } from './VirtualizedInfiniteGallery';

interface DeleteMutation {
  isPending: boolean;
  mutate: (fileIds: string[]) => void;
}

interface GalleryContentProps {
  currentFolderId: string | null;
  itemData: GalleryItem[];
  folders?: Folder[];
  breadcrumbs: BreadcrumbItem[];
  selectedItemIds: string[];
  deletingItemIds: string[];
  isLoading: boolean;
  isError: boolean;
  error: { status?: number; statusText?: string } | null;
  deleteMultipleMutation: DeleteMutation;
  galleryTitle: string;
  columnCount: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  sortBy: 'name' | 'created_at' | 'updated_at' | 'type' | 'size';
  sortOrder: 'asc' | 'desc';
  searchQuery: string;
  onNavigateTo: (folderId: string | null) => void;
  onItemClick: (item: GalleryItem, event?: React.MouseEvent) => void;
  onItemSelect: (itemId: string, event: React.MouseEvent | MouseEvent) => void;
  onLoadMore: () => void;
  onAddItem: () => void;
  onClearSelections: () => void;
  onSelectAll: () => void;
  onDeleteSelected: (itemIds?: string[]) => void;
  onSortChange: (
    sortBy: 'name' | 'created_at' | 'updated_at' | 'type' | 'size',
  ) => void;
  onSortOrderToggle: () => void;
  onSearchChange: (query: string) => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  onFileDrop?: (
    draggedFileIds: string[],
    targetFolderId: string | null,
  ) => void;
}

const SORT_LABELS: Record<GalleryContentProps['sortBy'], string> = {
  name: 'Name',
  created_at: 'Date Created',
  updated_at: 'Date Modified',
  type: 'File Type',
  size: 'File Size',
};

/**
 * Returns the appropriate empty state message based on the current context
 */
function getEmptyStateMessage(
  isSearching: boolean,
  isError: boolean,
  errorStatus: number | undefined,
  errorMessage: string | undefined,
  isInFolder: boolean,
): string {
  // If user is actively searching, show "no results" message
  if (isSearching) {
    return 'No results found. Try adjusting your search terms.';
  }

  // Handle error states
  if (isError) {
    if (errorStatus === 404) {
      return isInFolder
        ? 'This folder is empty.'
        : 'Your gallery is empty. Create folders or upload items to get started.';
    }
    return `There was an error: ${errorMessage || 'Unknown error'}`;
  }

  // Default empty state (no content, no search, no error)
  return isInFolder
    ? 'This folder is empty.'
    : 'Your gallery is empty. Create folders or upload items to get started.';
}

/**
 * Header component containing breadcrumbs and action buttons
 */
const GalleryHeader = memo(function GalleryHeader({
  galleryTitle,
  breadcrumbs,
  onNavigateTo,
  onAddItem,
}: {
  galleryTitle: string;
  breadcrumbs: BreadcrumbItem[];
  onNavigateTo: (folderId: string | null) => void;
  onAddItem: () => void;
}) {
  return (
    <>
      <FolderBreadcrumbs breadcrumbs={breadcrumbs} onNavigate={onNavigateTo} />
      <div className="flex justify-between items-center">
        <H3>{galleryTitle}</H3>
        <Button onClick={onAddItem}>
          <Plus className="h-4 w-4" />
          Add Item(s)
        </Button>
      </div>
    </>
  );
});

/**
 * Empty state component displayed when there's no content
 */
const EmptyState = memo(function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-muted-foreground mb-4">{message}</p>
    </div>
  );
});

/**
 * Action toolbar for multi-select mode
 */
const MultiSelectActions = memo(function MultiSelectActions({
  selectedCount,
  totalCount,
  isDeleting,
  isLoading,
  onDeleteSelected,
  onClearSelections,
  onSelectAll,
}: {
  selectedCount: number;
  totalCount: number;
  isDeleting: boolean;
  isLoading: boolean;
  onDeleteSelected: (itemIds?: string[]) => void;
  onClearSelections: () => void;
  onSelectAll: () => void;
}) {
  const allSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <>
      <span className="text-sm self-center mr-2">{selectedCount} selected</span>
      <Button
        variant="outline"
        size="sm"
        onClick={onSelectAll}
        disabled={isLoading || allSelected}
      >
        Select All
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => {
          console.log('Delete Selected button clicked');
          onDeleteSelected();
        }}
        disabled={isDeleting || isLoading}
      >
        {isDeleting ? (
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
      <Button
        variant="outline"
        size="sm"
        onClick={onClearSelections}
        disabled={isLoading}
      >
        <X className="h-4 w-4 mr-1" />
        Clear Selection
      </Button>
    </>
  );
});

/**
 * Sorting controls for the gallery
 */
const SortingControls = memo(function SortingControls({
  sortBy,
  sortOrder,
  isLoading,
  onSortChange,
  onSortOrderToggle,
}: {
  sortBy: GalleryContentProps['sortBy'];
  sortOrder: 'asc' | 'desc';
  isLoading: boolean;
  onSortChange: (sortBy: GalleryContentProps['sortBy']) => void;
  onSortOrderToggle: () => void;
}) {
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={isLoading}>
            Sort: {SORT_LABELS[sortBy]}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup
            value={sortBy}
            onValueChange={(value) =>
              onSortChange(value as GalleryContentProps['sortBy'])
            }
          >
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <DropdownMenuRadioItem key={value} value={value}>
                {label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="outline"
        size="icon"
        onClick={onSortOrderToggle}
        disabled={isLoading}
        title={sortOrder === 'asc' ? 'Sort Ascending' : 'Sort Descending'}
      >
        {sortOrder === 'asc' ? (
          <ArrowUpAZ className="h-4 w-4" />
        ) : (
          <ArrowDownAZ className="h-4 w-4" />
        )}
      </Button>
    </>
  );
});

export const GalleryContent = memo(function GalleryContent({
  currentFolderId,
  itemData,
  folders = [],
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
  sortBy,
  sortOrder,
  searchQuery,
  onNavigateTo,
  onItemClick,
  onItemSelect,
  onLoadMore,
  onAddItem,
  onClearSelections,
  onSelectAll,
  onDeleteSelected,
  onSortChange,
  onSortOrderToggle,
  onSearchChange,
  onKeyDown,
  onFileDrop,
}: GalleryContentProps) {
  const isMultiSelectMode = selectedItemIds.length > 0;
  const hasContent = itemData.length > 0 || folders.length > 0;
  const isSearching = searchQuery.trim().length > 0;

  // Compute the empty state message once
  const emptyStateMessage = useMemo(
    () =>
      getEmptyStateMessage(
        isSearching,
        isError,
        error?.status,
        error?.statusText,
        !!currentFolderId,
      ),
    [isSearching, isError, error?.status, error?.statusText, currentFolderId],
  );

  // Early return for error or empty states - simplified layout
  if (!isLoading && (isError || !hasContent)) {
    return (
      <div className="flex flex-col gap-y-4 p-4 h-full">
        <GalleryHeader
          galleryTitle={galleryTitle}
          breadcrumbs={breadcrumbs}
          onNavigateTo={onNavigateTo}
          onAddItem={onAddItem}
        />
        <EmptyState message={emptyStateMessage} />
      </div>
    );
  }

  // Main content view
  return (
    <div
      className="flex flex-col gap-y-4 p-4 h-full overflow-auto focus:outline-none"
      onKeyDown={onKeyDown}
    >
      <FolderBreadcrumbs breadcrumbs={breadcrumbs} onNavigate={onNavigateTo} />

      {/* Header - Title, Search, and Actions */}
      <div className="w-full">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
          <H3 className="flex-shrink-0">{galleryTitle}</H3>

          {/* Search Bar */}
          <div className="flex-1 min-w-0">
            <SearchBar
              onSearch={onSearchChange}
              initialValue={searchQuery}
              disabled={false}
              placeholder="Search files by name, description, or tags..."
            />
          </div>

          {/* Actions */}
          <div className="flex flex-row gap-2 items-center flex-shrink-0" style={{ pointerEvents: 'auto' }}>
            {isMultiSelectMode ? (
              <MultiSelectActions
                selectedCount={selectedItemIds.length}
                totalCount={itemData.length}
                isDeleting={deleteMultipleMutation.isPending}
                isLoading={isLoading}
                onDeleteSelected={onDeleteSelected}
                onClearSelections={onClearSelections}
                onSelectAll={onSelectAll}
              />
            ) : (
              <>
                <SortingControls
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  isLoading={isLoading}
                  onSortChange={onSortChange}
                  onSortOrderToggle={onSortOrderToggle}
                />
                <Button
                  variant="outline"
                  onClick={onSelectAll}
                  disabled={isLoading || itemData.length === 0}
                >
                  Select All
                </Button>
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
        <EmptyState message={emptyStateMessage} />
      )}
    </div>
  );
});
