import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../db/supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // undefined = still checking, null = no session, object = authenticated
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    // PKCE callback: magic link redirects to ?code=xxx — exchange it for a session.
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (!error) {
          // Remove ?code= from URL so reload doesn't re-attempt exchange.
          window.history.replaceState({}, '', window.location.pathname)
        }
      })
    }

    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={{ session }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
