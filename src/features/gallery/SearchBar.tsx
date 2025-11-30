import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  disabled?: boolean;
  initialValue?: string;
}

export function SearchBar({
  onSearch,
  placeholder = 'Search files by name, description, or tags...',
  disabled = false,
  initialValue = '',
}: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState(initialValue);
  const onSearchRef = useRef(onSearch);

  // Keep the ref updated without causing re-renders
  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  // Debounce search to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchRef.current(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Update local state when initialValue changes (only from parent, not from typing)
  // Use a ref to track if we're typing to prevent external updates from interfering
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (!isTypingRef.current) {
      setSearchQuery(initialValue);
    }
  }, [initialValue]);

  const handleClear = () => {
    setSearchQuery('');
  };

  return (
    <div className="relative flex items-center w-full">
      <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        key="gallery-search-input"
        type="text"
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => {
          isTypingRef.current = true;
          setSearchQuery(e.target.value);
          // Reset typing flag after a delay
          setTimeout(() => {
            isTypingRef.current = false;
          }, 1000);
        }}
        disabled={disabled}
        className="pl-9 pr-9"
        autoComplete="off"
      />
      {searchQuery && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClear}
          disabled={disabled}
          className="absolute right-1 h-7 w-7"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
