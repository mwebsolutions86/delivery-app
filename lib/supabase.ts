import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'

// ⚠️ REMPLACE AVEC TES CLÉS (Les mêmes que les autres projets)
const supabaseUrl = 'https://kdoodpxjgczqajykcqcd.supabase.co' 
const supabaseAnonKey = 'sb_publishable_ddklRnFtTbJ6C9hVK3sU2w_Ocj8QHSs'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)