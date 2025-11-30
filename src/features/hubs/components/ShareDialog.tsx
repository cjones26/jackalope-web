/**
 * Share Dialog Component
 * Share files or folders with users in hub network
 */

import { useState, useEffect } from 'react';
import { X, Search, User, Mail, Copy, Check } from 'lucide-react';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: 'file' | 'folder';
  itemId: string;
  itemName: string;
}

interface NetworkUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
}

interface ExistingShare {
  id: string;
  shared_with: string;
  permission: string;
  user?: NetworkUser;
}

export function ShareDialog({
  isOpen,
  onClose,
  itemType,
  itemId,
  itemName
}: ShareDialogProps) {
  const [networkUsers, setNetworkUsers] = useState<NetworkUser[]>([]);
  const [existingShares, setExistingShares] = useState<ExistingShare[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<NetworkUser | null>(null);
  const [manualEmail, setManualEmail] = useState('');
  const [permission, setPermission] = useState<'view' | 'download' | 'edit'>('view');
  const [recursive, setRecursive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchNetworkUsers();
      fetchExistingShares();
    }
  }, [isOpen, itemId]);

  const fetchNetworkUsers = async () => {
    try {
      const response = await fetch('/api/v1/hubs/network-users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNetworkUsers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch network users:', error);
    }
  };

  const fetchExistingShares = async () => {
    try {
      const endpoint = itemType === 'file'
        ? `/api/v1/sharing/files/${itemId}`
        : `/api/v1/sharing/folders/${itemId}`;

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setExistingShares(data.shares || []);
      }
    } catch (error) {
      console.error('Failed to fetch existing shares:', error);
    }
  };

  const handleShare = async () => {
    setLoading(true);

    try {
      const sharedWith = selectedUser?.id || manualEmail;
      if (!sharedWith) {
        alert('Please select a user or enter an email');
        return;
      }

      const endpoint = itemType === 'file'
        ? '/api/v1/sharing/files'
        : '/api/v1/sharing/folders';

      const body = itemType === 'file'
        ? { uploadId: itemId, sharedWith, permission }
        : { folderId: itemId, sharedWith, permission, recursive };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to share');
      }

      // Reset form
      setSelectedUser(null);
      setManualEmail('');
      setSearchQuery('');

      // Refresh shares
      await fetchExistingShares();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to share');
    } finally {
      setLoading(false);
    }
  };

  const handleUnshare = async (shareId: string, userId: string) => {
    try {
      const endpoint = itemType === 'file'
        ? `/api/v1/sharing/files/${itemId}/users/${userId}`
        : `/api/v1/sharing/folders/${itemId}/users/${userId}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to unshare');
      }

      // Refresh shares
      await fetchExistingShares();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to unshare');
    }
  };

  const filteredUsers = networkUsers.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getUserDisplay = (user: NetworkUser) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user.email;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Share {itemType}</h2>
            <p className="text-sm text-gray-500 mt-1">{itemName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Search / Select User */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Share with
            </label>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users in your hub network..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* User List (if searching) */}
            {searchQuery && filteredUsers.length > 0 && (
              <div className="mt-2 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                {filteredUsers.map(user => (
                  <button
                    key={user.id}
                    onClick={() => {
                      setSelectedUser(user);
                      setSearchQuery('');
                      setManualEmail('');
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left"
                  >
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {getUserDisplay(user)}
                      </div>
                      <div className="text-xs text-gray-500 truncate">{user.email}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Selected User */}
            {selectedUser && (
              <div className="mt-2 flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                {selectedUser.avatar_url ? (
                  <img src={selectedUser.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {getUserDisplay(selectedUser)}
                  </div>
                  <div className="text-xs text-gray-600">{selectedUser.email}</div>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Manual Email Entry */}
            {!selectedUser && (
              <div className="mt-2">
                <label className="block text-xs text-gray-500 mb-1">
                  Or enter email manually (for users outside your hub network):
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Permission */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Permission
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setPermission('view')}
                className={`px-4 py-2 rounded-lg border text-sm font-medium ${
                  permission === 'view'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                View
              </button>
              <button
                onClick={() => setPermission('download')}
                className={`px-4 py-2 rounded-lg border text-sm font-medium ${
                  permission === 'download'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Download
              </button>
              {itemType === 'folder' && (
                <button
                  onClick={() => setPermission('edit')}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium ${
                    permission === 'edit'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Edit
                </button>
              )}
            </div>
          </div>

          {/* Recursive (folders only) */}
          {itemType === 'folder' && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="recursive"
                checked={recursive}
                onChange={(e) => setRecursive(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="recursive" className="text-sm text-gray-700">
                Include all files in subfolders
              </label>
            </div>
          )}

          {/* Share Button */}
          <button
            onClick={handleShare}
            disabled={loading || (!selectedUser && !manualEmail)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sharing...' : 'Share'}
          </button>

          {/* Existing Shares */}
          {existingShares.length > 0 && (
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Shared with ({existingShares.length})
              </h3>
              <div className="space-y-2">
                {existingShares.map(share => (
                  <div key={share.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {share.user?.email || share.shared_with}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          {share.permission}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnshare(share.id, share.shared_with)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
