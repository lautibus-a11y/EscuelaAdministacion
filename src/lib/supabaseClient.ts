import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials missing.');
}

// Usamos el Service Role Key (si está disponible) para esta demostración de modo que se saltee el RLS,
// permitiendo al usuario hardcodeado operar con base de datos sin errores ni políticas bloqueantes.
export const supabase = createClient(supabaseUrl, supabaseKey);
