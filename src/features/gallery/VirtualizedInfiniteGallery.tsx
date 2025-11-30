import { FolderIcon } from 'lucide-react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/shared/ui/context-menu';

import { FileViewer } from './FileViewer';
import { useFolderTree } from './hooks/useFolderTree';
import { GalleryItem } from './types/GalleryItem';

interface VirtualizedInfiniteGalleryProps {
  items: GalleryItem[];
  columnCount: number;
  selectedItemIds: string[];
  deletingItemIds: string[];
  onItemClick: (item: GalleryItem, event?: React.MouseEvent) => void;
  onItemSelect: (itemId: string, event: React.MouseEvent | MouseEvent) => void;
  onLoadMore: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onDeleteSelected?: (itemIds?: string[]) => void;
  onClearSelections?: () => void;
  onMoveToFolder?: (
    draggedFileIds: string[],
    targetFolderId: string | null,
  ) => void;
}

export const VirtualizedInfiniteGallery = memo(
  function VirtualizedInfiniteGallery({
    items,
    columnCount,
    selectedItemIds,
    deletingItemIds,
    onItemClick,
    onItemSelect,
    onLoadMore,
    hasNextPage,
    isFetchingNextPage,
    onDeleteSelected,
    onClearSelections,
    onMoveToFolder,
  }: VirtualizedInfiniteGalleryProps) {
    const isMultiSelectMode = selectedItemIds.length > 0;
    const sentinelRef = useRef<HTMLDivElement>(null);

    // Get folder tree for context menu
    const { treeData: folderTree } = useFolderTree();

    // Virtualization state
    const [scrollY, setScrollY] = useState(0);

    // Track scroll position for virtualization
    useEffect(() => {
      const handleScroll = () => setScrollY(window.scrollY);
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Fixed Aspect Ratio Grid with Sliding Virtualization Window
    const { visibleItems, containerHeight } = useMemo(() => {
      if (!items.length) {
        return { visibleItems: [], containerHeight: 0 };
      }

      // Keep original API order - don't sort by ID to preserve upload/API order
      const allItems = [...items];

      // Calculate virtualization parameters
      const itemHeight = 320; // Increased height for better image visibility
      const rowHeight = itemHeight;
      const itemsPerRow = columnCount;
      const totalRows = Math.ceil(allItems.length / itemsPerRow);
      const totalHeight = totalRows * rowHeight;

      // Calculate visible range with buffer
      const viewportHeight = window.innerHeight;
      const bufferSize = viewportHeight; // Render 1 screen above and below
      const startY = Math.max(0, scrollY - bufferSize);
      const endY = scrollY + viewportHeight + bufferSize;

      // Calculate visible rows
      const startRow = Math.floor(startY / rowHeight);
      const endRow = Math.min(totalRows - 1, Math.ceil(endY / rowHeight));

      // Calculate visible images
      const startIndex = startRow * itemsPerRow;
      const endIndex = Math.min(
        allItems.length - 1,
        (endRow + 1) * itemsPerRow - 1,
      );

      const visibleSlice = allItems.slice(startIndex, endIndex + 1);

      // Add positioning info to each item
      const visibleWithPosition = visibleSlice.map((item, index) => {
        const absoluteIndex = startIndex + index;
        const row = Math.floor(absoluteIndex / itemsPerRow);
        const col = absoluteIndex % itemsPerRow;

        return {
          ...item,
          style: {
            position: 'absolute' as const,
            top: `${row * rowHeight}px`,
            left: `${(col / itemsPerRow) * 100}%`,
            width: `${(100 - 2) / itemsPerRow}%`, // Slightly reduce width to create column gaps
            height: `${itemHeight - 16}px`, // Matched with padding for consistent spacing
          },
        };
      });

      return {
        visibleItems: visibleWithPosition,
        containerHeight: totalHeight,
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items.length, scrollY, columnCount]); // Recalculate on scroll and item changes

    // Set up intersection observer for infinite scroll using MAIN PAGE scroll
    useEffect(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
            onLoadMore();
          }
        },
        {
          root: null, // Use viewport as root (main page scroll)
          rootMargin: '300px', // Start loading 300px before the bottom
          threshold: 0.1,
        },
      );

      const currentSentinel = sentinelRef.current;
      if (currentSentinel) {
        observer.observe(currentSentinel);
      }

      return () => {
        if (currentSentinel) {
          observer.unobserve(currentSentinel);
        }
      };
    }, [hasNextPage, isFetchingNextPage, onLoadMore, items.length]);

    // Virtualized Fixed Aspect Ratio Grid - High performance sliding window
    return (
      <div className="w-full">
        {/* Virtualized Container with Fixed Height */}
        <div
          className="relative w-full"
          style={{ height: `${containerHeight}px` }}
        >
          {/* Only render visible items */}
          {visibleItems.map((item) => {
            const isSelected = selectedItemIds.includes(item._id);
            const isDeleting = deletingItemIds.includes(item._id);

            return (
              <ContextMenu key={`context-${item._id}`}>
                <ContextMenuTrigger asChild>
                  <div
                    draggable={true}
                    className={`absolute overflow-hidden rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-all duration-200 ${
                      isSelected
                        ? 'border-2 border-primary shadow-xl'
                        : 'hover:bg-black/5 hover:shadow-xl border-2 border-transparent'
                    } ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}
                    style={{
                      ...item.style,
                      padding: '8px', // Matched vertical and horizontal padding
                      boxSizing: 'border-box',
                      pointerEvents: isDeleting ? 'none' : 'auto',
                    }}
                    onClick={(e) => {
                      // Handle Ctrl+click and Shift+click for multi-selection
                      if (e.ctrlKey || e.metaKey || e.shiftKey) {
                        e.preventDefault();
                        onItemSelect(item._id, e);
                      } else {
                        // Single click now selects the item
                        onItemSelect(item._id, e);
                      }
                    }}
                    onDoubleClick={(e) => {
                      // Double click opens the item
                      e.preventDefault();
                      onItemClick(item, e);
                    }}
                    onDragStart={(e) => {
                      // If the item isn't selected and we have selections, include all selected items
                      const draggedIds = isSelected
                        ? selectedItemIds.length > 0
                          ? selectedItemIds
                          : [item._id]
                        : [item._id];
                      e.dataTransfer.setData(
                        'application/jackalope-files',
                        JSON.stringify(draggedIds),
                      );
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                  >
                    <div className="relative w-full h-full">
                      <FileViewer
                        uploadId={item._id}
                        alt={item.title || 'Gallery item'}
                        className="w-full h-full object-cover rounded-lg"
                        thumbnail={true}
                        disabled={isDeleting}
                        mimeType={item.mimeType}
                        filename={item.title}
                      />
                      {item.title && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-sm truncate">
                          {item.title}
                        </div>
                      )}
                    </div>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem
                    onClick={() =>
                      onItemSelect(item._id, new MouseEvent('click'))
                    }
                  >
                    {isSelected ? 'Deselect' : 'Select'}
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  {/* Move to folder submenu */}
                  {folderTree && folderTree.length > 0 && (
                    <>
                      <ContextMenuSub>
                        <ContextMenuSubTrigger>
                          <FolderIcon className="mr-2 h-4 w-4" />
                          Move to...
                        </ContextMenuSubTrigger>
                        <ContextMenuSubContent>
                          {/* Home/Root option */}
                          <ContextMenuItem
                            onClick={() => {
                              const selectedIds = isSelected
                                ? selectedItemIds
                                : [item._id];
                              onMoveToFolder?.(selectedIds, null);
                            }}
                          >
                            <FolderIcon className="mr-2 h-4 w-4" />
                            Home
                          </ContextMenuItem>
                          {folderTree.length > 0 && <ContextMenuSeparator />}
                          {/* Folder options */}
                          {folderTree.map((folder) => (
                            <ContextMenuItem
                              key={folder.id}
                              onClick={() => {
                                const selectedIds = isSelected
                                  ? selectedItemIds
                                  : [item._id];
                                onMoveToFolder?.(selectedIds, folder.id);
                              }}
                            >
                              <FolderIcon className="mr-2 h-4 w-4" />
                              {folder.name}
                            </ContextMenuItem>
                          ))}
                        </ContextMenuSubContent>
                      </ContextMenuSub>
                      <ContextMenuSeparator />
                    </>
                  )}
                  {isMultiSelectMode && (
                    <>
                      <ContextMenuItem onClick={onClearSelections}>
                        Clear Selection
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                    </>
                  )}
                  <ContextMenuItem
                    variant="destructive"
                    onClick={() => {
                      // Pass the item IDs to delete directly
                      const itemsToDelete = isSelected
                        ? selectedItemIds
                        : [item._id];
                      onDeleteSelected?.(itemsToDelete);
                    }}
                  >
                    Delete
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
        </div>

        {/* Performance indicator */}
        {items.length > 50 && (
          <div className="flex items-center justify-center py-2">
            <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
              📊 {items.length} items
            </span>
          </div>
        )}

        {/* Infinite Scroll Sentinel */}
        <div
          ref={sentinelRef}
          className="h-20 flex items-center justify-center"
        >
          {isFetchingNextPage && (
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">
                Loading more items...
              </span>
            </div>
          )}
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom memo comparison for fixed grid
    // Return true if props are equal (skip re-render), false if different (do re-render)
    const itemsEqual = prevProps.items === nextProps.items;
    const columnCountEqual = prevProps.columnCount === nextProps.columnCount;
    const selectedIdsEqual =
      JSON.stringify(prevProps.selectedItemIds) ===
      JSON.stringify(nextProps.selectedItemIds);
    const deletingIdsEqual =
      JSON.stringify(prevProps.deletingItemIds) ===
      JSON.stringify(nextProps.deletingItemIds);
    const hasNextPageEqual = prevProps.hasNextPage === nextProps.hasNextPage;
    const isFetchingEqual =
      prevProps.isFetchingNextPage === nextProps.isFetchingNextPage;

    // Also check callback functions - if they change, we need to re-render
    const callbacksEqual =
      prevProps.onItemClick === nextProps.onItemClick &&
      prevProps.onItemSelect === nextProps.onItemSelect &&
      prevProps.onDeleteSelected === nextProps.onDeleteSelected &&
      prevProps.onClearSelections === nextProps.onClearSelections &&
      prevProps.onMoveToFolder === nextProps.onMoveToFolder;

    return (
      itemsEqual &&
      columnCountEqual &&
      selectedIdsEqual &&
      deletingIdsEqual &&
      hasNextPageEqual &&
      isFetchingEqual &&
      callbacksEqual
    );
  },
);
