import { useEffect, useRef, useMemo } from 'react';

import { SecureImage } from './SecureImage';
import { GalleryImage } from './types/GalleryImage';
import { Checkbox } from '@/shared/ui/Checkbox';

interface VirtualizedInfiniteGalleryProps {
  images: GalleryImage[];
  columnCount: number;
  isMultiSelectMode: boolean;
  selectedImageIds: string[];
  onImageClick: (image: GalleryImage, event?: React.MouseEvent) => void;
  onImageSelect: (imageId: string, event: React.MouseEvent | MouseEvent) => void;
  onLoadMore: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

export function VirtualizedInfiniteGallery({
  images,
  columnCount,
  isMultiSelectMode,
  selectedImageIds,
  onImageClick,
  onImageSelect,
  onLoadMore,
  hasNextPage,
  isFetchingNextPage,
}: VirtualizedInfiniteGalleryProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Create proper masonry layout with column distribution
  const columns = useMemo(() => {
    if (!columnCount || !images.length) {
      return [] as GalleryImage[][];
    }

    // Create array of column heights for better distribution
    const columnHeights = Array(columnCount).fill(0);
    // Create array of columns with images
    const columnArrays: GalleryImage[][] = Array.from(
      { length: columnCount },
      () => [],
    );

    // Place each image in the shortest column
    images.forEach((image) => {
      const shortestColumnIndex = columnHeights.indexOf(
        Math.min(...columnHeights),
      );
      columnArrays[shortestColumnIndex].push(image);

      // Update the column height (approximate based on aspect ratio)
      const aspectRatio = image.width / image.height || 1;
      // Assuming a standard column width, calculate the height this image would add
      const imageHeight = 300 / aspectRatio; // Approximate base height
      columnHeights[shortestColumnIndex] += imageHeight + 16; // Add gap
    });

    return columnArrays;
  }, [images, columnCount]);

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
      }
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
  }, [hasNextPage, isFetchingNextPage, onLoadMore, images.length]);

  // Masonry layout with infinite scroll using main page scroll - single scrollbar UX
  return (
    <div className="w-full">
      {/* Masonry Grid - flows with main page */}
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
        }}
      >
        {columns.map((column, colIndex) => (
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
                  style={{ 
                    // Remove fixed aspect ratio to allow natural masonry sizing
                    minHeight: `${Math.max(200, 300 / aspectRatio)}px`
                  }}
                  onClick={(e) => onImageClick(image, e)}
                >
                  <SecureImage
                    uploadId={image._id}
                    alt={image.title || 'Gallery image'}
                    className="w-full h-auto object-cover"
                    thumbnail={true} // Force thumbnails for performance
                  />
                  {isMultiSelectMode && (
                    <div
                      className="absolute top-2 right-2 bg-background rounded-md flex items-center justify-center w-6 h-6"
                      onClick={(e) => onImageSelect(image._id, e)}
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

      {/* Performance indicator */}
      {images.length > 50 && (
        <div className="flex items-center justify-center py-2">
          <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
            📊 {images.length} images • Masonry layout
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
            <span className="text-sm text-muted-foreground">Loading more images...</span>
          </div>
        )}
      </div>

      {/* End of content indicator */}
      {!hasNextPage && images.length > 0 && (
        <div className="flex items-center justify-center py-8">
          <span className="text-sm text-muted-foreground">
            All images loaded • {images.length} total
          </span>
        </div>
      )}
    </div>
  );
}