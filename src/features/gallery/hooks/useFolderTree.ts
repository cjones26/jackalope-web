import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Folder as FolderIcon, FolderOpen } from 'lucide-react';
import { useCallback, useMemo } from 'react';

import { useApi } from '@/shared/hooks/useApi';
import { TreeDataItem } from '@/shared/ui/components/tree-view';

import { Folder } from '../types/Folder';

interface FolderTreeNode extends Folder {
  children?: FolderTreeNode[];
}

export const useFolderTree = () => {
  const { fetchWithAuth } = useApi();
  const queryClient = useQueryClient();

  // Fetch all folders - we'll build the tree client-side
  const {
    data: allFolders,
    isLoading,
    error,
    refetch: refetchQuery,
  } = useQuery<Folder[]>({
    queryKey: ['folder-tree'],
    queryFn: async () => {
      // First get root contents to find top-level folders
      const rootResponse = await fetchWithAuth('/api/v1/folders/root/contents');
      const rootFolders = rootResponse.folders || [];

      // Recursively fetch all subfolders
      const allFolders: Folder[] = [...rootFolders];
      const visited = new Set<string>();

      const fetchSubfolders = async (folders: Folder[]) => {
        const promises = folders.map(async (folder) => {
          if (visited.has(folder.id)) {
            return [];
          }
          visited.add(folder.id);

          try {
            const response = await fetchWithAuth(
              `/api/v1/folders/${folder.id}/contents`,
            );
            const subfolders = response.folders || [];
            allFolders.push(...subfolders);

            if (subfolders.length > 0) {
              await fetchSubfolders(subfolders);
            }

            return subfolders;
          } catch (error) {
            console.error(
              `Failed to fetch subfolders for ${folder.id}:`,
              error,
            );
            return [];
          }
        });

        await Promise.all(promises);
      };

      await fetchSubfolders(rootFolders);
      return allFolders;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Build hierarchical tree structure
  const folderTree = useMemo(() => {
    if (!allFolders) {
      return [];
    }

    // Create a map for quick lookup
    const folderMap = new Map<string, FolderTreeNode>();

    // Initialize all folders
    allFolders.forEach((folder) => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });

    // Build parent-child relationships
    const rootFolders: FolderTreeNode[] = [];

    allFolders.forEach((folder) => {
      const folderNode = folderMap.get(folder.id)!;

      if (folder.parent_id === null) {
        // Root folder
        rootFolders.push(folderNode);
      } else {
        // Child folder
        const parent = folderMap.get(folder.parent_id);
        if (parent) {
          parent.children!.push(folderNode);
        } else {
          // Parent not found, treat as root (shouldn't happen in well-formed data)
          rootFolders.push(folderNode);
        }
      }
    });

    return rootFolders;
  }, [allFolders]);

  // Transform to TreeDataItem format
  const transformToTreeData = useCallback(
    (folders: FolderTreeNode[]): TreeDataItem[] => {
      return folders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        icon: FolderIcon,
        openIcon: FolderOpen,
        selectedIcon: FolderOpen,
        children:
          folder.children && folder.children.length > 0
            ? transformToTreeData(folder.children)
            : undefined,
        onClick: () => {
          // This will be handled by the parent component
        },
      }));
    },
    [],
  );

  const treeData = useMemo(() => {
    return transformToTreeData(folderTree);
  }, [folderTree, transformToTreeData]);

  const refetch = useCallback(async () => {
    // Invalidate all folder-related queries
    await queryClient.invalidateQueries({ queryKey: ['folder-tree'] });
    await queryClient.invalidateQueries({ queryKey: ['folder-breadcrumbs'] });
    await queryClient.invalidateQueries({ queryKey: ['folder-contents'] });

    // Refetch the folder tree
    return refetchQuery();
  }, [queryClient, refetchQuery]);

  return {
    treeData,
    isLoading,
    error,
    refetch,
  };
};
