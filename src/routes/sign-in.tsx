import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useSupabase } from '@/shared/context/supabase';
import { Button } from '@/shared/ui/Button';
import { Form, FormField } from '@/shared/ui/Form';
import { FormInput } from '@/shared/ui/Form/Form';
import { H1 } from '@/shared/ui/typography';

export const Route = createFileRoute('/sign-in')({
  component: RouteComponent,
});

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z
    .string()
    .min(8, 'Please enter at least 8 characters.')
    .max(64, 'Please enter fewer than 64 characters.'),
});

function RouteComponent() {
  const [isLoginError, setIsLoginError] = useState(false);
  const { signInWithPassword } = useSupabase();

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(data: z.infer<typeof signupSchema>) {
    try {
      console.log('Signing in with: ', data.email, data.password);
      await signInWithPassword(data.email, data.password);

      form.reset();
    } catch (error: Error | unknown) {
      setIsLoginError(true);
      console.log('Error signing in: ', error);
    }
  }

  return (
    <div className="flex flex-col flex-1 bg-background p-4">
      <div className="flex flex-1 flex-col items-center justify-center gap-y-4 m-4">
        <H1>Sign in</H1>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            onChange={() => setIsLoginError(false)}
            className="flex flex-col gap-4"
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
                  className="form-input w-80"
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
                  className="form-input w-80"
                  {...field}
                />
              )}
            />
            {isLoginError ? (
              <p className="font-medium text-destructive w-80 break-words text-center text-sm">
                Incorrect email or password. Try again or
                <Link className="underline" to="/sign-up">
                  {' '}
                  create an account
                </Link>
                .
              </p>
            ) : null}
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="btn-default"
            >
              {form.formState.isSubmitting ? (
                <span>Loading...</span>
              ) : (
                <span>Sign in</span>
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
