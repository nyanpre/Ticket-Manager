import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase environment variables are missing.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 匿名ログインまたは既存セッションの取得
export const getOrCreateAnonymousUser = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    return session.user;
  }
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.user;
};