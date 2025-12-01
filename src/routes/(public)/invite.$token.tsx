import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import {
  Mail,
  Users,
  Shield,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

import { useSupabase } from '@/shared/context/supabase';
import { useApi } from '@/shared/hooks/useApi';
import { Button } from '@/shared/ui/Button';
import { Form, FormField, FormInput } from '@/shared/ui/Form';
import { Spinner } from '@/shared/ui/Spinner';
import { H1, H2 } from '@/shared/ui/typography';

export const Route = createFileRoute('/(public)/invite/$token')({
  component: RouteComponent,
});

const signUpSchema = z
  .object({
    email: z.string().email('Please enter a valid email address.'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    password: z
      .string()
      .min(8, 'Please enter at least 8 characters.')
      .max(64, 'Please enter fewer than 64 characters.')
      .regex(
        /^(?=.*[a-z])/,
        'Your password must have at least one lowercase letter.',
      )
      .regex(
        /^(?=.*[A-Z])/,
        'Your password must have at least one uppercase letter.',
      )
      .regex(/^(?=.*[0-9])/, 'Your password must have at least one number.')
      .regex(
        /^(?=.*[!@#$%^&*])/,
        'Your password must have at least one special character.',
      ),
    confirmPassword: z.string().min(8, 'Please enter at least 8 characters.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Your passwords do not match.',
    path: ['confirmPassword'],
  });

function RouteComponent() {
  const { token } = Route.useParams();
  const { user, signUp, signInWithPassword } = useSupabase();
  const { fetchWithAuth, fetchPublic } = useApi();
  const navigate = useNavigate();
  const [showSignIn, setShowSignIn] = useState(false);

  // Fetch invitation details
  const {
    data: invitation,
    isLoading: invitationLoading,
    isError: invitationError,
  } = useQuery({
    queryKey: ['invitation', token],
    queryFn: async () => {
      const result = await fetchPublic(`/api/v1/hubs/invitations/${token}`);
      return result.data;
    },
  });

  // Accept invitation mutation
  const acceptMutation = useMutation({
    mutationFn: async () => {
      await fetchWithAuth(`/api/v1/hubs/invitations/${token}/accept`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      navigate({ to: '/gallery' });
    },
  });

  // Sign up form
  const signUpForm = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: invitation?.email || '',
      firstName: '',
      lastName: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Sign in form
  const signInSchema = z.object({
    email: z.string().email('Please enter a valid email address.'),
    password: z.string().min(1, 'Please enter your password.'),
  });

  const signInForm = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: invitation?.email || '',
      password: '',
    },
  });

  // Update form email values when invitation data loads
  useEffect(() => {
    if (invitation?.email) {
      signUpForm.setValue('email', invitation.email);
      signInForm.setValue('email', invitation.email);
    }
  }, [invitation?.email, signUpForm, signInForm]);

  // Handle sign up and accept invitation
  const handleSignUp = async (values: z.infer<typeof signUpSchema>) => {
    try {
      // Sign up the user with name metadata
      await signUp(values.email, values.password, {
        firstName: values.firstName,
        lastName: values.lastName,
      });

      // Redirect to success page with invitation token
      navigate({
        to: '/signup-success',
        search: { invited: true, token },
      });
    } catch (error) {
      console.error('Sign up error:', error);
      signUpForm.setError('root', {
        message: error instanceof Error ? error.message : 'Failed to sign up',
      });
    }
  };

  // Handle sign in and accept invitation
  const handleSignIn = async (values: z.infer<typeof signInSchema>) => {
    try {
      await signInWithPassword(values.email, values.password);
      // After successful sign in, accept the invitation
      acceptMutation.mutate();
    } catch (error) {
      console.error('Sign in error:', error);
      signInForm.setError('root', {
        message: error instanceof Error ? error.message : 'Failed to sign in',
      });
    }
  };

  if (invitationLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-purple-100">
            <Spinner />
          </div>
          <p className="text-gray-600 font-medium">
            Loading your invitation...
          </p>
        </div>
      </div>
    );
  }

  if (invitationError || !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-red-100">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Invitation Not Found
            </h1>
            <p className="text-gray-600 mb-6">
              This invitation link is invalid or has expired. Please contact the
              person who invited you for a new invitation.
            </p>
            <Button onClick={() => navigate({ to: '/' })} className="w-full">
              Go to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (invitation.status !== 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-amber-100">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2 capitalize">
              Invitation {invitation.status}
            </h1>
            <p className="text-gray-600 mb-6">
              {invitation.status === 'accepted' &&
                'This invitation has already been accepted.'}
              {invitation.status === 'expired' &&
                'This invitation has expired. Please contact the person who invited you for a new invitation.'}
              {invitation.status === 'revoked' &&
                'This invitation has been revoked.'}
            </p>
            <Button
              onClick={() => navigate({ to: user ? '/gallery' : '/' })}
              className="w-full"
            >
              {user ? 'Go to Gallery' : 'Go to Home'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Helper function to get role badge styles
  const getRoleBadgeStyles = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'member':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'viewer':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-4 h-4" />;
      case 'member':
        return <Users className="w-4 h-4" />;
      case 'viewer':
        return <Mail className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  // If user is already logged in
  if (user) {
    // Check if email matches
    if (user.email !== invitation.email) {
      return (
        <div className="min-h-screen bg-gradient-to-br  flex items-center justify-center p-4 w-full">
          <div className="max-w-2xl w-full">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-amber-100">
                <AlertCircle className="w-8 h-8 text-amber-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                Email Mismatch
              </h1>
              <p className="text-gray-600 mb-2">
                This invitation is for{' '}
                <strong className="text-gray-900">{invitation.email}</strong>
              </p>
              <p className="text-gray-600 mb-6">
                but you're signed in as{' '}
                <strong className="text-gray-900">{user.email}</strong>
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  Please sign out and sign in with the invited email address, or
                  contact the person who invited you.
                </p>
              </div>
              <Button
                onClick={() => navigate({ to: '/gallery' })}
                className="w-full"
              >
                Go to Gallery
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br  flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-4 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              You're Invited!
            </h1>
            <p className="text-lg text-gray-600">Join your team on Jackalope</p>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Invitation Details */}
            <div className="p-8">
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                {/* Hub */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">
                      Hub
                    </span>
                  </div>
                  <p className="text-lg font-bold text-purple-900">
                    {invitation.hub_name || 'Team Hub'}
                  </p>
                </div>

                {/* Role */}
                <div
                  className={`rounded-xl p-4 border ${getRoleBadgeStyles(invitation.role)}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {getRoleIcon(invitation.role)}
                    <span className="text-sm font-medium">Your Role</span>
                  </div>
                  <p className="text-lg font-bold capitalize">
                    {invitation.role}
                  </p>
                </div>

                {/* Inviter */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">
                      Invited By
                    </span>
                  </div>
                  <p className="text-lg font-bold text-blue-900">
                    {invitation.inviter_name || 'A team member'}
                  </p>
                </div>
              </div>

              {/* CTA Button */}
              <Button
                onClick={() => acceptMutation.mutate()}
                disabled={acceptMutation.isPending}
                size="lg"
                className="w-full text-lg font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                {acceptMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner />
                    Accepting...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Accept Invitation
                    <ArrowRight className="w-5 h-5" />
                  </span>
                )}
              </Button>

              {acceptMutation.isError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {acceptMutation.error instanceof Error
                      ? acceptMutation.error.message
                      : 'Failed to accept invitation'}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center">
                By accepting, you'll gain access to shared files and collaborate
                with your team.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // User not logged in - show sign up/sign in forms
  return (
    <div className="min-h-screen bg-gradient-to-br flex items-center justify-center p-8 w-full rounded-xl">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-4 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            You're Invited!
          </h1>
          <p className="text-lg text-gray-600">
            Join {invitation.hub_name || 'your team'} on Jackalope
          </p>
        </div>

        {/* Invitation Details Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-4">
            <p className="text-white font-semibold text-center">
              Invitation Details
            </p>
          </div>
          <div className="p-6 grid grid-cols-2 gap-6">
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Users className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-medium text-purple-900">Hub</span>
              </div>
              <p className="font-bold text-purple-900 text-sm">
                {invitation.hub_name || 'Team Hub'}
              </p>
            </div>
            <div
              className={`text-center p-4 rounded-lg border ${getRoleBadgeStyles(invitation.role)}`}
            >
              <div className="flex items-center justify-center gap-1 mb-1">
                {getRoleIcon(invitation.role)}
                <span className="text-xs font-medium">Role</span>
              </div>
              <p className="font-bold text-sm capitalize">{invitation.role}</p>
            </div>
          </div>
        </div>

        {/* Auth Form Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-10">
            {!showSignIn ? (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Create Your Account
                  </h2>
                  <p className="text-sm text-gray-600">
                    Get started in seconds
                  </p>
                </div>
                <Form {...signUpForm}>
                  <form
                    onSubmit={signUpForm.handleSubmit(handleSignUp)}
                    className="space-y-4"
                  >
                    <FormField
                      control={signUpForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormInput
                          label="Email"
                          type="email"
                          placeholder="your@email.com"
                          {...field}
                          disabled
                        />
                      )}
                    />

                    <FormField
                      control={signUpForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormInput
                          label="First Name"
                          placeholder="John"
                          {...field}
                        />
                      )}
                    />

                    <FormField
                      control={signUpForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormInput
                          label="Last Name"
                          placeholder="Doe"
                          {...field}
                        />
                      )}
                    />

                    <FormField
                      control={signUpForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormInput
                          label="Password"
                          type="password"
                          placeholder="••••••••"
                          {...field}
                        />
                      )}
                    />

                    <FormField
                      control={signUpForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormInput
                          label="Confirm Password"
                          type="password"
                          placeholder="••••••••"
                          {...field}
                        />
                      )}
                    />

                    {signUpForm.formState.errors.root && (
                      <p className="text-red-600 text-sm">
                        {signUpForm.formState.errors.root.message}
                      </p>
                    )}

                    <Button
                      type="submit"
                      disabled={signUpForm.formState.isSubmitting}
                      size="lg"
                      className="w-full text-base font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    >
                      {signUpForm.formState.isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <Spinner />
                          Creating account...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          Create Account & Join
                          <ArrowRight className="w-5 h-5" />
                        </span>
                      )}
                    </Button>
                  </form>
                </Form>

                <div className="mt-6 pt-6 border-t border-gray-200 text-center">
                  <p className="text-sm text-gray-600 mb-2">
                    Already have an account?
                  </p>
                  <button
                    onClick={() => setShowSignIn(true)}
                    className="text-sm font-semibold text-purple-600 hover:text-purple-700 hover:underline"
                  >
                    Sign in instead
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Welcome Back
                  </h2>
                  <p className="text-sm text-gray-600">
                    Sign in to accept your invitation
                  </p>
                </div>
                <Form {...signInForm}>
                  <form
                    onSubmit={signInForm.handleSubmit(handleSignIn)}
                    className="space-y-4"
                  >
                    <FormField
                      control={signInForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormInput
                          label="Email"
                          type="email"
                          placeholder="your@email.com"
                          {...field}
                        />
                      )}
                    />

                    <FormField
                      control={signInForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormInput
                          label="Password"
                          type="password"
                          placeholder="••••••••"
                          {...field}
                        />
                      )}
                    />

                    {signInForm.formState.errors.root && (
                      <p className="text-red-600 text-sm">
                        {signInForm.formState.errors.root.message}
                      </p>
                    )}

                    <Button
                      type="submit"
                      disabled={signInForm.formState.isSubmitting}
                      size="lg"
                      className="w-full text-base font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    >
                      {signInForm.formState.isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <Spinner />
                          Signing in...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          Sign In & Join
                          <ArrowRight className="w-5 h-5" />
                        </span>
                      )}
                    </Button>
                  </form>
                </Form>

                <div className="mt-6 pt-6 border-t border-gray-200 text-center">
                  <p className="text-sm text-gray-600 mb-2">
                    Don't have an account?
                  </p>
                  <button
                    onClick={() => setShowSignIn(false)}
                    className="text-sm font-semibold text-purple-600 hover:text-purple-700 hover:underline"
                  >
                    Create account
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-10 py-5 border-t border-gray-200">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>Secure & encrypted connection</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
