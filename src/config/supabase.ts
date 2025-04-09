import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_PUBLIC_AUTH_API_URL as string;
const supabaseKey = process.env.VITE_PUBLIC_AUTH_API_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
