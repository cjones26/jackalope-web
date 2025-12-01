import { UseMutationResult } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { User, Mail, CheckCircle2, AlertCircle } from 'lucide-react';

import { ProfileAvatar } from '@/features/profile/ProfileAvatar';
import { Alert, AlertDescription } from '@/shared/ui/Alert';
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

const profileInfoSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
});

type ProfileInfoFormData = z.infer<typeof profileInfoSchema>;

interface ProfileInfoCardProps {
  profile: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
  avatarUrl: string | null;
  onAvatarChange: (url: string | null) => void;
  onSubmit: (data: ProfileInfoFormData) => void;
  mutation: UseMutationResult<any, Error, any, unknown>;
}

export function ProfileInfoCard({
  profile,
  avatarUrl,
  onAvatarChange,
  onSubmit,
  mutation,
}: ProfileInfoCardProps) {
  const [successMessage, setSuccessMessage] = useState('');

  const form = useForm<ProfileInfoFormData>({
    resolver: zodResolver(profileInfoSchema),
    defaultValues: {
      firstName: profile?.first_name || '',
      lastName: profile?.last_name || '',
    },
  });

  const handleSubmit = (data: ProfileInfoFormData) => {
    setSuccessMessage('');
    onSubmit(data);
    setSuccessMessage('Profile updated successfully!');
  };

  const handleFormChange = () => {
    mutation.reset();
    setSuccessMessage('');
  };

  return (
    <Card className="overflow-hidden">
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            onChange={handleFormChange}
            className="flex flex-col gap-6"
          >
            {/* Avatar Section */}
            <div className="flex justify-center py-2 pb-6 border-b">
              <ProfileAvatar
                avatarUrl={avatarUrl}
                firstName={profile?.first_name}
                lastName={profile?.last_name}
                onAvatarChange={onAvatarChange}
              />
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-medium">
                  First Name
                </Label>
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormInput
                      id="firstName"
                      type="text"
                      placeholder="Enter your first name"
                      autoCapitalize="words"
                      autoComplete="given-name"
                      {...field}
                    />
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium">
                  Last Name
                </Label>
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormInput
                      id="lastName"
                      type="text"
                      placeholder="Enter your last name"
                      autoCapitalize="words"
                      autoComplete="family-name"
                      {...field}
                    />
                  )}
                />
              </div>
            </div>

            {/* Status Messages */}
            {mutation.isError && (
              <Alert variant="destructive" className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 mt-0.5" />
                <AlertDescription>
                  There was an error saving your profile. Please try again.
                </AlertDescription>
              </Alert>
            )}

            {successMessage && (
              <Alert className="flex items-start gap-3 border-green-200 bg-green-50 text-green-900">
                <CheckCircle2 className="h-5 w-5 mt-0.5 text-green-600" />
                <AlertDescription className="text-green-900">
                  {successMessage}
                </AlertDescription>
              </Alert>
            )}

            {/* Actions */}
            <div className="flex justify-end pt-6 border-t">
              <Button
                type="submit"
                disabled={mutation.isPending || !form.formState.isDirty}
              >
                {mutation.isPending ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
