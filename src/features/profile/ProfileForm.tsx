import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { User, Settings, Users } from 'lucide-react';

import { useHub } from '@/shared/context/hub';
import { useSupabase } from '@/shared/context/supabase';
import { useApi } from '@/shared/hooks/useApi';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/Tabs';
import { ProfileInfoCard, HubMembersCard } from '@/features/settings';
import { HubSettingsForm } from '@/features/hubs/components/HubSettingsForm';

interface ProfileFormProps {
  profile: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    hubs?: any[];
  } | null;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    profile?.avatar_url || null,
  );
  const queryClient = useQueryClient();
  const { user } = useSupabase();
  const { fetchWithAuth } = useApi();
  const { selectedHubId } = useHub();

  // Get current hub membership
  const currentMembership = profile?.hubs?.find((h: any) => h.hubs.id === selectedHubId)
    || profile?.hubs?.[0];
  const currentHub = currentMembership?.hubs;
  const isAdmin = currentMembership?.role === 'admin';
  const storageConfig = currentHub?.hub_storage_config;
  const isStorageConfigured = !!storageConfig;

  // Handle avatar URL changes from the ProfileAvatar component
  const handleAvatarChange = (url: string | null) => {
    setAvatarUrl(url);
  };

  // Update profile mutation (personal info only)
  const profileMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string }) => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      return await fetchWithAuth('/api/v1/profile/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          avatarUrl: avatarUrl,
        }),
      });
    },
    onSuccess: (responseData) => {
      queryClient.setQueryData(['user', user?.id], responseData.data);
      queryClient.invalidateQueries({ queryKey: ['user-nav', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-hubs', user?.id] });
    },
  });

  const handleProfileSubmit = (data: { firstName: string; lastName: string }) => {
    profileMutation.mutate(data);
  };

  return (
    <div className="w-full max-w-4xl">
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-3' : 'grid-cols-1'}`}>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="user-management" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                User Management
              </TabsTrigger>
              <TabsTrigger value="storage-config" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Storage Configuration
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileInfoCard
            profile={profile}
            avatarUrl={avatarUrl}
            onAvatarChange={handleAvatarChange}
            onSubmit={handleProfileSubmit}
            mutation={profileMutation}
          />
        </TabsContent>

        {isAdmin && currentHub && (
          <>
            <TabsContent value="user-management" className="mt-6">
              <HubMembersCard hubId={currentHub.id} isAdmin={isAdmin} />
            </TabsContent>

            <TabsContent value="storage-config" className="mt-6">
              <HubSettingsForm
                hubId={currentHub.id}
                hubName={currentHub.name}
                isAdmin={isAdmin}
                storageConfig={storageConfig || null}
              />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
