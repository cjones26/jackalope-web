import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useSupabase } from '@/shared/context/supabase';
import { Button } from '@/shared/ui/Button';
import { Form, FormField } from '@/shared/ui/Form';
import { FormInput } from '@/shared/ui/Form/Form';
import { H1 } from '@/shared/ui/typography';

export const Route = createFileRoute('/sign-up')({
  component: RouteComponent,
});

const signUpSchema = z
  .object({
    // firstName: z
    //   .string()
    //   .min(1, 'Please enter your first name.')
    //   .max(64, 'First name must be less than 64 characters.'),
    // lastName: z
    //   .string()
    //   .min(1, 'Please enter your last name.')
    //   .max(64, 'Last name must be less than 64 characters.'),
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
      // firstName: '',
      // lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(data: z.infer<typeof signUpSchema>) {
    try {
      await signUp(data.email, data.password);

      form.reset();
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <div className="flex flex-col flex-1 bg-background p-4">
      <div className="flex flex-col flex-1 gap-4 m-4">
        <H1>Sign Up</H1>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormInput
                    label="Email"
                    placeholder="Email"
                    autoCapitalize="none"
                    autoComplete="email"
                    type="email"
                    {...field}
                  />
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormInput
                    label="Password"
                    placeholder="Password"
                    autoCapitalize="none"
                    type="password"
                    {...field}
                  />
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormInput
                    label="Confirm Password"
                    placeholder="Confirm password"
                    autoCapitalize="none"
                    type="password"
                    {...field}
                  />
                )}
              />
            </div>
            {/* <Button
              type="submit"
              className={`btn btn-default m-4 ${
                form.formState.isSubmitting
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
              onClick={() => {
                console.log('inonClick');
                form.handleSubmit(onSubmit);
              }}
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <span className="loader small" />
              ) : (
                <span>Sign up</span>
              )}
            </Button> */}
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="btn-default"
            >
              {form.formState.isSubmitting ? (
                <span>Loading...</span>
              ) : (
                <span>Sign up</span>
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
