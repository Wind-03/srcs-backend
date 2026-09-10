// supabase.provider.ts
import { createClient } from '@supabase/supabase-js';

export const SupabaseProvider = {
  provide: 'SUPABASE_CLIENT',
  useFactory: () => {
    return createClient(
      process?.env?.SUPABASE_URL!,
      process?.env?.SUPABASE_KEY! // This must be the anon or service_role key
    );
  },
};