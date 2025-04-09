import type { Session, User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { supabase } from '@/config/supabase';
import { SupabaseContext, SupabaseProviderProps } from '@/context/supabase';

export const SupabaseProvider = ({ children }: SupabaseProviderProps) => {
  // const navigate = useNavigate();
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
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
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

  useEffect(() => {
    if (!initialized) return;

    if (session) {
      // navigate('/protected');
      console.log('User is logged in:', user);
    } else {
      console.log('No active session, redirecting to login');
    }
  }, [initialized, session, user]);

  if (!initialized) {
    return <div>Loading...</div>;
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
