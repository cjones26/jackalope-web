import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  UserPlus,
  Trash2,
  Mail,
  XCircle,
  Users,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

import { useApi } from '@/shared/hooks/useApi';
import { useSupabase } from '@/shared/context/supabase';
import { Button } from '@/shared/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/Card';
import { Form, FormField, FormInput } from '@/shared/ui/Form';
import { Label } from '@/shared/ui/Label';
import { Spinner } from '@/shared/ui/Spinner';
import { Alert, AlertDescription } from '@/shared/ui/Alert';
import { UnavailableWarning } from '@/shared/ui/UnavailableWarning';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/shared/ui/DropdownMenu/DropdownMenu';

interface HubMembersCardProps {
  hubId: string;
  isAdmin: boolean;
}

const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['admin', 'member', 'viewer']),
});

const getRoleBadgeStyles = (role: string) => {
  switch (role) {
    case 'admin':
      return 'bg-rose-100 text-rose-800';
    case 'member':
      return 'bg-purple-100 text-purple-800';
    case 'viewer':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export function HubMembersCard({ hubId, isAdmin }: HubMembersCardProps) {
  const { fetchWithAuth } = useApi();
  const { user } = useSupabase();
  const queryClient = useQueryClient();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch members
  const {
    data: membersData,
    isLoading: membersLoading,
    isError: membersError,
    error: membersErrorDetails,
  } = useQuery({
    queryKey: ['hub-members', hubId],
    queryFn: async () => {
      console.log('[HubMembersCard] Fetching members for hubId:', hubId);
      try {
        const result = await fetchWithAuth(`/api/v1/hubs/${hubId}/members`);
        console.log('[HubMembersCard] API Response:', result);

        if (!result) {
          console.error('[HubMembersCard] No result from fetchWithAuth');
          throw new Error(
            'No response from server - please check your authentication',
          );
        }

        const members = result.members || result;
        console.log('[HubMembersCard] Parsed members:', members);
        return members;
      } catch (error) {
        console.error('[HubMembersCard] Error in queryFn:', error);
        throw error;
      }
    },
    enabled: !!hubId,
    retry: 1,
  });

  // Fetch invitations
  const { data: invitationsData } = useQuery({
    queryKey: ['hub-invitations', hubId],
    queryFn: async () => {
      const result = await fetchWithAuth(`/api/v1/hubs/${hubId}/invitations`);
      if (!result) return [];
      return result.invitations || result;
    },
    enabled: !!hubId && isAdmin,
    retry: 1,
  });

  // Invite form
  const inviteForm = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      role: 'member',
    },
  });

  // Invite mutation
  const inviteMutation = useMutation({
    mutationFn: async (data: z.infer<typeof inviteSchema>) => {
      const result = await fetchWithAuth(`/api/v1/hubs/${hubId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!result) throw new Error('Failed to send invitation');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hub-invitations', hubId] });
      inviteForm.reset();
      setShowInviteForm(false);
      setSuccessMessage('Invitation sent successfully!');
      setTimeout(() => setSuccessMessage(''), 5000);
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const result = await fetchWithAuth(
        `/api/v1/hubs/${hubId}/members/${userId}/role`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        },
      );
      if (!result) throw new Error('Failed to update role');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hub-members', hubId] });
      setSuccessMessage('Role updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const result = await fetchWithAuth(
        `/api/v1/hubs/${hubId}/members/${userId}`,
        {
          method: 'DELETE',
        },
      );
      if (!result) throw new Error('Failed to remove member');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hub-members', hubId] });
      setSuccessMessage('Member removed successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    },
  });

  // Revoke invitation mutation
  const revokeInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const result = await fetchWithAuth(
        `/api/v1/hubs/invitations/${invitationId}`,
        {
          method: 'DELETE',
        },
      );
      if (!result) throw new Error('Failed to revoke invitation');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hub-invitations', hubId] });
      setSuccessMessage('Invitation revoked successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    },
  });

  // Resend invitation mutation
  const resendInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const result = await fetchWithAuth(
        `/api/v1/hubs/invitations/${invitationId}/resend`,
        {
          method: 'POST',
        },
      );
      if (!result) throw new Error('Failed to resend invitation');
      return result;
    },
    onSuccess: () => {
      setSuccessMessage('Invitation email resent successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    },
  });

  const handleInvite = (data: z.infer<typeof inviteSchema>) => {
    setSuccessMessage('');
    inviteMutation.mutate(data);
  };

  if (membersLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (membersError) {
    console.error('[HubMembersCard] Error loading members:', {
      error: membersErrorDetails,
      hubId,
      isAdmin,
      errorType: typeof membersErrorDetails,
      errorKeys: membersErrorDetails ? Object.keys(membersErrorDetails) : null,
    });

    const errorMsg =
      membersErrorDetails instanceof Error
        ? membersErrorDetails.message
        : (membersErrorDetails as any)?.error ||
          (membersErrorDetails as any)?.message ||
          'Failed to load members';

    return (
      <UnavailableWarning
        title="Members Unavailable"
        description="Unable to load hub members. This could be due to:"
        reasons={[
          'Network connectivity issues',
          'Database connection problems',
          'Invalid hub configuration',
          'Permission issues',
        ]}
        error={errorMsg}
        isRetrying={membersLoading}
        onRetry={() =>
          queryClient.invalidateQueries({ queryKey: ['hub-members', hubId] })
        }
        helpText="If the problem persists, please contact your administrator."
      />
    );
  }

  const pendingInvitations =
    invitationsData?.filter((inv: any) => inv.status === 'pending') || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members
            </CardTitle>
            <CardDescription>Manage who has access to this hub</CardDescription>
          </div>
          {isAdmin && (
            <Button
              onClick={() => setShowInviteForm(!showInviteForm)}
              variant="default"
              size="sm"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite User
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Success Message */}
        {successMessage && (
          <Alert className="flex items-start gap-3 border-green-200 bg-green-50 text-green-900">
            <CheckCircle2 className="h-5 w-5 mt-0.5 text-green-600" />
            <AlertDescription className="text-green-900">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Invite Form */}
        {showInviteForm && isAdmin && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <h4 className="font-semibold text-gray-900 mb-4">
              Send Invitation
            </h4>
            <Form {...inviteForm}>
              <form
                onSubmit={inviteForm.handleSubmit(handleInvite)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <FormField
                    control={inviteForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormInput
                        id="email"
                        type="email"
                        placeholder="colleague@example.com"
                        {...field}
                      />
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                      >
                        <span className="capitalize">
                          {inviteForm.watch('role') === 'viewer' &&
                            'Viewer - View only'}
                          {inviteForm.watch('role') === 'member' &&
                            'Member - Can upload files'}
                          {inviteForm.watch('role') === 'admin' &&
                            'Admin - Full access'}
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuRadioGroup
                        value={inviteForm.watch('role')}
                        onValueChange={(value) =>
                          inviteForm.setValue(
                            'role',
                            value as 'admin' | 'member' | 'viewer',
                          )
                        }
                      >
                        <DropdownMenuRadioItem value="viewer">
                          Viewer - View only
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="member">
                          Member - Can upload files
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="admin">
                          Admin - Full access
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {inviteMutation.isError && (
                  <Alert
                    variant="destructive"
                    className="border-l-4 border-l-red-500"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <AlertDescription className="text-sm">
                          {inviteMutation.error instanceof Error
                            ? inviteMutation.error.message
                            : 'Failed to send invitation'}
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    type="submit"
                    disabled={inviteMutation.isPending}
                    size="sm"
                  >
                    {inviteMutation.isPending ? (
                      <>
                        <Spinner />
                        <span className="ml-2">Sending...</span>
                      </>
                    ) : (
                      'Send Invitation'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowInviteForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}

        {/* Pending Invitations */}
        {isAdmin && pendingInvitations.length > 0 && (
          <div className="border-t pt-6">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Pending Invitations ({pendingInvitations.length})
            </h4>
            <div className="space-y-2">
              {pendingInvitations.map((invitation: any) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-md"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      {invitation.email}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getRoleBadgeStyles(invitation.role)}`}
                      >
                        {invitation.role}
                      </span>
                      <span>·</span>
                      <span>
                        <span>
                          Expires{' '}
                          {new Date(invitation.expires_at).toLocaleDateString()}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        resendInvitationMutation.mutate(invitation.id)
                      }
                      disabled={resendInvitationMutation.isPending}
                      title="Resend invitation email"
                    >
                      <RefreshCw className="w-4 h-4 text-gray-600 hover:text-gray-900" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        revokeInvitationMutation.mutate(invitation.id)
                      }
                      disabled={revokeInvitationMutation.isPending}
                      title="Revoke invitation"
                    >
                      <XCircle className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Members Table */}
        <div className="border-t pt-6">
          <h4 className="font-semibold text-gray-900 mb-4">
            Active Members ({membersData?.length || 0})
          </h4>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Uploads
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Joined
                  </th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {membersData?.map((member: any) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {member.user.avatar_url ? (
                          <img
                            src={member.user.avatar_url}
                            alt={`${member.user.first_name} ${member.user.last_name}`}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                            {member.user.first_name?.[0]}
                            {member.user.last_name?.[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">
                            {member.user.first_name} {member.user.last_name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {member.user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {isAdmin && member.user_id !== user?.id ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="capitalize"
                            >
                              {member.role}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuRadioGroup
                              value={member.role}
                              onValueChange={(value) =>
                                updateRoleMutation.mutate({
                                  userId: member.user_id,
                                  role: value,
                                })
                              }
                            >
                              <DropdownMenuRadioItem value="viewer">
                                Viewer
                              </DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="member">
                                Member
                              </DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="admin">
                                Admin
                              </DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getRoleBadgeStyles(member.role)}`}
                        >
                          {member.role}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-900">
                        {member.upload_count || 0}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600">
                        {member.joined_at
                          ? new Date(member.joined_at).toLocaleDateString()
                          : 'N/A'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-4">
                        {member.user_id !== user?.id ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              removeMemberMutation.mutate(member.user_id)
                            }
                            disabled={removeMemberMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
