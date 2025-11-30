/**
 * Gallery Sections Component
 * Shows "My Files" and "Shared with me" tabs
 */

import { useState } from 'react';
import { File, Users } from 'lucide-react';

interface GallerySectionsProps {
  onSectionChange: (section: 'my-files' | 'shared') => void;
  currentSection?: 'my-files' | 'shared';
}

export function GallerySections({
  onSectionChange,
  currentSection = 'my-files'
}: GallerySectionsProps) {
  return (
    <div className="border-b border-gray-200">
      <nav className="flex gap-8 px-6" aria-label="Tabs">
        <button
          onClick={() => onSectionChange('my-files')}
          className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors ${
            currentSection === 'my-files'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <File className="w-4 h-4" />
          My Files
        </button>

        <button
          onClick={() => onSectionChange('shared')}
          className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors ${
            currentSection === 'shared'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Users className="w-4 h-4" />
          Shared with me
        </button>
      </nav>
    </div>
  );
}
