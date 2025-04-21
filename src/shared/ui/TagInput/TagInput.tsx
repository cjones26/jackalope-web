import { X } from 'lucide-react';
import { KeyboardEvent, useState } from 'react';

import { Input } from '@/shared/ui/Input';

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  label?: string;
}

function TagInput({
  tags,
  onTagsChange,
  placeholder = 'Add tag...',
  maxTags = 10,
  label,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();

    if (!trimmedTag) return;
    if (tags.includes(trimmedTag)) return;
    if (tags.length >= maxTags) return;

    onTagsChange([...tags, trimmedTag]);
    setInputValue('');
  };

  const removeTag = (indexToRemove: number) => {
    onTagsChange(tags.filter((_, index) => index !== indexToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  return (
    <div className="grid gap-2">
      {label && <label className="text-sm font-medium">{label}</label>}
      <div className="flex flex-wrap gap-2 px-3 py-1 border border-input rounded-md bg-transparent min-h-9 focus-within:ring-[3px] focus-within:ring-ring/50 focus-within:border-ring">
        {tags.map((tag, index) => (
          <div
            key={index}
            className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md"
          >
            <span className="text-sm">{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="text-primary/70 hover:text-primary"
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Remove {tag}</span>
            </button>
          </div>
        ))}
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={
            tags.length < maxTags ? placeholder : `Maximum ${maxTags} tags`
          }
          className="flex-grow border-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-0 p-0 px-0 text-sm h-8 bg-transparent shadow-none"
          disabled={tags.length >= maxTags}
        />
      </div>
    </div>
  );
}

export default TagInput;
