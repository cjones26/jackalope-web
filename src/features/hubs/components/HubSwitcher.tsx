/**
 * Hub Switcher Component
 * Dropdown to switch between user's hubs
 */

import { useState } from 'react';
import { ChevronDown, Plus, Settings } from 'lucide-react';

interface Hub {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  role?: string; // admin, member, viewer
}

interface HubSwitcherProps {
  hubs: Hub[];
  currentHubId?: string;
  onHubChange: (hubId: string) => void;
  onCreateHub?: () => void;
  onHubSettings?: (hubId: string) => void;
  loading?: boolean;
}

export function HubSwitcher({
  hubs,
  currentHubId,
  onHubChange,
  onCreateHub,
  onHubSettings,
  loading = false
}: HubSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentHub = hubs.find(h => h.id === currentHubId);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg animate-pulse">
        <div className="h-4 w-32 bg-gray-300 rounded"></div>
      </div>
    );
  }

  if (hubs.length === 0) {
    return (
      <div className="text-sm text-gray-500 px-3 py-2">
        No hubs available
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors min-w-[200px]"
      >
        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-gray-900">
            {currentHub?.name || 'Select Hub'}
          </div>
          {currentHub?.role && (
            <div className="text-xs text-gray-500 capitalize">
              {currentHub.role}
            </div>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-1 w-full min-w-[250px] bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-[400px] overflow-y-auto">
            {/* Hubs List */}
            <div className="py-1">
              {hubs.map((hub) => (
                <button
                  key={hub.id}
                  onClick={() => {
                    onHubChange(hub.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2 text-left hover:bg-gray-50 ${
                    hub.id === currentHubId ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {hub.name}
                    </div>
                    {hub.description && (
                      <div className="text-xs text-gray-500 truncate">
                        {hub.description}
                      </div>
                    )}
                    <div className="text-xs text-gray-400 capitalize mt-0.5">
                      {hub.role}
                    </div>
                  </div>

                  {hub.role === 'admin' && onHubSettings && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onHubSettings(hub.id);
                        setIsOpen(false);
                      }}
                      className="p-1 hover:bg-gray-200 rounded"
                      title="Hub Settings"
                    >
                      <Settings className="w-4 h-4 text-gray-500" />
                    </button>
                  )}
                </button>
              ))}
            </div>

            {/* Divider */}
            {hubs.length > 0 && onCreateHub && <div className="border-t border-gray-200" />}

            {/* Create Hub Button */}
            {onCreateHub && (
              <button
                onClick={() => {
                  onCreateHub();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-50 text-blue-600"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Create New Hub</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
