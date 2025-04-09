import type { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext } from 'react';

export type SupabaseContextProps = {
  user: User | null;
  session: Session | null;
  initialized?: boolean;
  signUp: (
    email: string,
    password: string,
    first_name: string,
    last_name: string
  ) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export type SupabaseProviderProps = {
  children: React.ReactNode;
};

export const SupabaseContext = createContext<SupabaseContextProps>({
  user: null,
  session: null,
  initialized: false,
  signUp: async () => {},
  signInWithPassword: async () => {},
  signOut: async () => {},
});

export const useSupabase = () => useContext(SupabaseContext);
