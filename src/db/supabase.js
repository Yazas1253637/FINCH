import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      // Implicit flow is correct for magic links — no code verifier stored in
      // localStorage, so clicking the link from any browser/email client works.
      // PKCE is only needed for OAuth providers.
      flowType: 'implicit',
    },
  },
)
