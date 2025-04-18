import type { Session, User } from '@supabase/supabase-js';
import { Router } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { routeTree } from '@/routeTree.gen';
import {
  SupabaseContext,
  SupabaseProviderProps,
} from '@/shared/context/supabase';
import { supabase } from '@/shared/services/supabase';
import { Spinner } from '@/shared/ui/Spinner';

export const SupabaseProvider = ({
  children,
  router,
}: SupabaseProviderProps & { router: Router<typeof routeTree> }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState<boolean>(false);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw error;
    } else {
      router.navigate({ to: '/check-email' });
    }
  };

  const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    router.navigate({ to: '/profile' });
  };

  const signOut = async () => {
    // First attempt to sign out through Supabase
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    const supabaseKeys = Object.keys(localStorage).filter((key) =>
      key.startsWith('sb-')
    );

    supabaseKeys.forEach((key) => {
      localStorage.removeItem(key);
    });

    // Then navigate home
    router.navigate({ to: '/' });
  };

  useEffect(() => {
    async function initialize() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setSession(session);
        setUser(session ? session.user : null);
        setInitialized(true);

        supabase.auth.onAuthStateChange((_event, session) => {
          setSession(session);
          setUser(session ? session.user : null);
        });
      } catch (e) {
        console.warn(e);
      }
    }

    initialize();
  }, []);

  if (!initialized) {
    return (
      <div className="flex flex-col items-center justify-center w-screen h-screen">
        <Spinner>Loading...</Spinner>
      </div>
    );
  }

  return (
    <SupabaseContext.Provider
      value={{
        user,
        session,
        initialized,
        signUp,
        signInWithPassword,
        signOut,
      }}
    >
      {children}
    </SupabaseContext.Provider>
  );
};
