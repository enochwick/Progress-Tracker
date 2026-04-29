import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

const normalizeSupabaseUrl = (value) => {
  if (!value) return '';
  return value.startsWith('http://') || value.startsWith('https://')
    ? value
    : `https://${value}`;
};

const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl);

export const supabaseConfigError = (() => {
  if (!rawSupabaseUrl && !supabaseAnonKey) return '';
  if (!rawSupabaseUrl || !supabaseAnonKey) return 'Supabase URL and anon key are both required.';

  try {
    const parsed = new URL(supabaseUrl);
    if (!parsed.hostname.endsWith('.supabase.co')) {
      return 'Supabase URL should look like https://your-project-ref.supabase.co.';
    }
  } catch (_) {
    return 'Supabase URL is not valid.';
  }

  return '';
})();

export const isSupabaseConfigured = Boolean(rawSupabaseUrl && supabaseAnonKey && !supabaseConfigError);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    })
  : null;
