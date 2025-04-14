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

export const Route = createFileRoute('/(public)/(auth)/sign-in')({
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
      await signInWithPassword(data.email, data.password);

      form.reset();
    } catch (error: Error | unknown) {
      setIsLoginError(true);
      console.log('Error signing in: ', error);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-y-4 m-4">
      <H1>Sign in</H1>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          onChange={() => setIsLoginError(false)}
          className="flex flex-col items-center gap-4 w-full md:w-80"
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
            className={`btn btn-default w-full ${
              form.formState.isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={form.formState.isSubmitting}
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
  );
}
