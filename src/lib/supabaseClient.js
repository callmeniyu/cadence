import { createClient } from '@supabase/supabase-js';

// SECURITY NOTE: only the project URL and the publishable/anon key may ever
// live in this file or in any VITE_ env var. The anon key is safe for the
// browser because every table it can reach is protected by Row Level
// Security (see supabase/migrations/003_rls.sql). Never add a service-role
// key here or anywhere under src/ — service-role secrets belong only in the
// Edge Function runtime (supabase/functions/*), never in Vite-bundled code.

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
