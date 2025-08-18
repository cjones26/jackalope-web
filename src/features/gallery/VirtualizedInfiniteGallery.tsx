import { useEffect, useRef, useMemo, memo, useState } from 'react';

import { SecureImage } from './SecureImage';
import { GalleryImage } from './types/GalleryImage';
import { Checkbox } from '@/shared/ui/Checkbox';

interface VirtualizedInfiniteGalleryProps {
  images: GalleryImage[];
  columnCount: number;
  isMultiSelectMode: boolean;
  selectedImageIds: string[];
  deletingImageIds: string[];
  onImageClick: (image: GalleryImage, event?: React.MouseEvent) => void;
  onImageSelect: (imageId: string, event: React.MouseEvent | MouseEvent) => void;
  onLoadMore: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

export const VirtualizedInfiniteGallery = memo(function VirtualizedInfiniteGallery({
  images,
  columnCount,
  isMultiSelectMode,
  selectedImageIds,
  deletingImageIds,
  onImageClick,
  onImageSelect,
  onLoadMore,
  hasNextPage,
  isFetchingNextPage,
}: VirtualizedInfiniteGalleryProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Virtualization state
  const [scrollY, setScrollY] = useState(0);
  
  // Track scroll position for virtualization
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fixed Aspect Ratio Grid with Sliding Virtualization Window
  const { visibleImages, containerHeight } = useMemo(() => {
    if (!images.length) {
      return { visibleImages: [], containerHeight: 0 };
    }

    // Keep original API order - don't sort by ID to preserve upload/API order
    const allImages = [...images];
    
    // Calculate virtualization parameters
    const itemHeight = 300; // Approximate height of each square item including gap
    const rowHeight = itemHeight;
    const imagesPerRow = columnCount;
    const totalRows = Math.ceil(allImages.length / imagesPerRow);
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
    const startIndex = startRow * imagesPerRow;
    const endIndex = Math.min(allImages.length - 1, (endRow + 1) * imagesPerRow - 1);
    
    const visibleSlice = allImages.slice(startIndex, endIndex + 1);
    
    // Add positioning info to each image
    const visibleWithPosition = visibleSlice.map((image, index) => {
      const absoluteIndex = startIndex + index;
      const row = Math.floor(absoluteIndex / imagesPerRow);
      const col = absoluteIndex % imagesPerRow;
      
      return {
        ...image,
        style: {
          position: 'absolute' as const,
          top: `${row * rowHeight}px`,
          left: `${(col / imagesPerRow) * 100}%`,
          width: `${100 / imagesPerRow}%`,
          height: `${itemHeight - 16}px`, // Subtract gap
        }
      };
    });
    
    return {
      visibleImages: visibleWithPosition,
      containerHeight: totalHeight
    };
  }, [images.length, scrollY, columnCount]); // Recalculate on scroll and image changes

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

  // Virtualized Fixed Aspect Ratio Grid - High performance sliding window
  return (
    <div className="w-full">
      {/* Virtualized Container with Fixed Height */}
      <div
        className="relative w-full"
        style={{ height: `${containerHeight}px` }}
      >
        {/* Only render visible images */}
        {visibleImages.map((image) => {
          const isSelected = selectedImageIds.includes(image._id);
          const isDeleting = deletingImageIds.includes(image._id);

          return (
            <div
              key={image._id}
              className={`absolute overflow-hidden rounded-md shadow-md cursor-pointer hover:shadow-lg transition-all duration-200 ${
                isSelected ? 'ring-2 ring-primary' : ''
              } ${isDeleting ? 'opacity-50' : ''}`}
              style={{
                ...image.style,
                padding: '8px', // Gap between items
              }}
              onClick={(e) => onImageClick(image, e)}
            >
              <div className="relative w-full h-full">
                <SecureImage
                  uploadId={image._id}
                  alt={image.title || 'Gallery image'}
                  className="w-full h-full object-cover rounded-md"
                  thumbnail={true}
                  disabled={isDeleting}
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
            </div>
          );
        })}
      </div>

      {/* Performance indicator */}
      {images.length > 50 && (
        <div className="flex items-center justify-center py-2">
          <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
            📊 {images.length} images • {visibleImages.length} rendered • Virtualized grid
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
}, (prevProps, nextProps) => {
  // Simple memo comparison for fixed grid
  return (
    prevProps.images === nextProps.images &&
    prevProps.columnCount === nextProps.columnCount &&
    prevProps.isMultiSelectMode === nextProps.isMultiSelectMode &&
    JSON.stringify(prevProps.selectedImageIds) === JSON.stringify(nextProps.selectedImageIds) &&
    JSON.stringify(prevProps.deletingImageIds) === JSON.stringify(nextProps.deletingImageIds) &&
    prevProps.hasNextPage === nextProps.hasNextPage &&
    prevProps.isFetchingNextPage === nextProps.isFetchingNextPage
  );
});