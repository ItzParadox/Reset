// Phase 4 placeholder.
// This file is intentionally not wired into the app yet.
// Later, add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel/.env.local.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
