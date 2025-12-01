/**
 * Hub Switcher Component
 * Dropdown to switch between user's hubs
 */

import { ChevronDown, Plus, Settings } from 'lucide-react';

import { Button } from '@/shared/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/DropdownMenu/DropdownMenu';

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors min-w-[200px]">
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
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-[250px] max-h-[400px] overflow-y-auto p-0">
        {/* Hubs List */}
        <div className="py-1">
          {hubs.map((hub) => (
            <DropdownMenuItem
              key={hub.id}
              onClick={() => onHubChange(hub.id)}
              className={`px-4 py-2 ${hub.id === currentHubId ? 'bg-blue-50' : ''}`}
            >
              <div className="flex items-center justify-between w-full gap-2">
                <div className="flex-1 min-w-0">
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
                    }}
                    className="p-1 hover:bg-gray-200 rounded shrink-0"
                    title="Hub Settings"
                  >
                    <Settings className="w-4 h-4 text-gray-500" />
                  </button>
                )}
              </div>
            </DropdownMenuItem>
          ))}
        </div>

        {/* Create Hub Button */}
        {hubs.length > 0 && onCreateHub && <div className="border-t border-gray-200" />}
        {onCreateHub && (
          <DropdownMenuItem onClick={onCreateHub} className="px-4 py-2 text-blue-600">
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Create New Hub</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
