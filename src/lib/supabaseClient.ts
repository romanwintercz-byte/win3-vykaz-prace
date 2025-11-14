import { createClient } from '@supabase/supabase-js'

// Načtení proměnných prostředí
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Kontrola, zda jsou proměnné definovány
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be defined in .env.local");
}

// Vytvoření a export klienta
export const supabase = createClient(supabaseUrl, supabaseAnonKey)