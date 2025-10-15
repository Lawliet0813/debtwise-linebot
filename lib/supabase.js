import { createClient } from '@supabase/supabase-js';

let cachedEnv;

function resolveSupabaseEnv() {
  if (cachedEnv) {
    return cachedEnv;
  }

  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseKey = process.env.SUPABASE_KEY?.trim();

  const missing = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!supabaseKey) missing.push('SUPABASE_KEY');

  if (missing.length > 0) {
    throw new Error(`缺少 Supabase 環境變數：${missing.join('、')}。請於環境或 .env 設定 SUPABASE_URL 與 SUPABASE_KEY（僅需 anon key）。`);
  }

  cachedEnv = { supabaseUrl, supabaseKey };
  return cachedEnv;
}

const { supabaseUrl, supabaseKey } = resolveSupabaseEnv();

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function assertSupabaseEnv() {
  resolveSupabaseEnv();
}

export { supabase, assertSupabaseEnv };
