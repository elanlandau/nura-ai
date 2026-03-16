import { createClient } from '@supabase/supabase-js';

// Use placeholders during build when env is not set (e.g. static generation); runtime uses real vars from Vercel/env.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
