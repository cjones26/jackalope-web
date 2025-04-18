import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useSupabase } from '@/shared/context/supabase';
import { Button } from '@/shared/ui/Button';
import { Form, FormField } from '@/shared/ui/Form';
import { FormInput } from '@/shared/ui/Form/Form';
import { H1 } from '@/shared/ui/typography';
import { Spinner } from '@/shared/ui/Spinner';

export const Route = createFileRoute('/(public)/(auth)/sign-up')({
  component: RouteComponent,
});

const signUpSchema = z
  .object({
    email: z.string().email('Please enter a valid email address.'),
    password: z
      .string()
      .min(8, 'Please enter at least 8 characters.')
      .max(64, 'Please enter fewer than 64 characters.')
      .regex(
        /^(?=.*[a-z])/,
        'Your password must have at least one lowercase letter.'
      )
      .regex(
        /^(?=.*[A-Z])/,
        'Your password must have at least one uppercase letter.'
      )
      .regex(/^(?=.*[0-9])/, 'Your password must have at least one number.')
      .regex(
        /^(?=.*[!@#$%^&*])/,
        'Your password must have at least one special character.'
      ),
    confirmPassword: z.string().min(8, 'Please enter at least 8 characters.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Your passwords do not match.',
    path: ['confirmPassword'],
  });

function RouteComponent() {
  const { signUp } = useSupabase();

  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(data: z.infer<typeof signUpSchema>) {
    try {
      await signUp(data.email, data.password);
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-y-4 m-4">
      <H1>Sign Up</H1>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4 w-full md:w-80"
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormInput
                type="email"
                placeholder="Email"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect="false"
                className="w-full"
                {...field}
              />
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormInput
                type="password"
                placeholder="Password"
                autoCapitalize="none"
                autoCorrect="false"
                className="w-full"
                {...field}
              />
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormInput
                type="password"
                placeholder="Confirm Password"
                autoCapitalize="none"
                autoCorrect="false"
                className="form-input w-80"
                {...field}
              />
            )}
          />
          <Button
            type="submit"
            className={`btn btn-default w-full lg:w-80 ${
              form.formState.isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-y-4 m-4">
                <Spinner />
              </div>
            ) : (
              <span>Sign up</span>
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
