import { createClient } from '@supabase/supabase-js';
import { PigeonData } from './types';

export const SUPABASE_URL = 'https://ukfftrjzzjgowutshubd.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_eP7NZL1qcOwrGGoRqMysUQ_h--V_MZi';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

export async function searchPigeons(query: string) {
  if (!query || query.trim().length === 0) return [];
  try {
    const { data, error } = await supabase
      .from('pigeons')
      .select('*')
      .or(`ring.ilike.%${query.trim()}%,name.ilike.%${query.trim()}%`)
      .limit(10);

    if (error) {
      console.warn('Supabase search warning:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Supabase search error:', err);
    return [];
  }
}

export async function savePigeonsToSupabase(pigeons: PigeonData[]) {
  const toSave = pigeons
    .filter((p) => p.ring && p.ring.trim() !== '')
    .map((p) => ({
      ring: p.ring,
      name: p.name,
      strain: p.strain,
      owner: p.owner,
      color: p.color,
      year: p.year,
      sex: p.sex,
      results: p.results,
      bgColor: p.bgColor,
    }));

  if (toSave.length === 0) {
    throw new Error('Veuillez d’abord renseigner au moins un numéro de bague.');
  }

  const { data, error } = await supabase.from('pigeons').upsert(toSave, { onConflict: 'ring' });
  if (error) {
    throw error;
  }
  return toSave.length;
}
