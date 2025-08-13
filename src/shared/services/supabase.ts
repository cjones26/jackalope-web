import { createClient } from '@supabase/supabase-js';

import { Database } from '@/shared/types/database';

const supabaseUrl = import.meta.env.VITE_PUBLIC_AUTH_API_URL as string;
const supabaseKey = import.meta.env.VITE_PUBLIC_AUTH_API_KEY as string;

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
