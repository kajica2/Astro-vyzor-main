import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { getCurrentUser, getSession, onAuthStateChange, signIn, signOut, signUp } from '../services/authService'
import type { SignInData, SignUpData, AuthError } from '../services/authService'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (data: SignInData) => Promise<{ error: AuthError | null }>
  signUp: (data: SignUpData) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    getSession().then((initialSession) => {
      setSession(initialSession)
      setUser(initialSession?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange((event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSignIn = async (data: SignInData) => {
    const result = await signIn(data)
    if (result.error) {
      return { error: result.error }
    }
    setUser(result.user)
    setSession(result.session)
    return { error: null }
  }

  const handleSignUp = async (data: SignUpData) => {
    const result = await signUp(data)
    if (result.error) {
      return { error: result.error }
    }
    setUser(result.user)
    setSession(result.session)
    return { error: null }
  }

  const handleSignOut = async () => {
    const result = await signOut()
    if (result.error) {
      return { error: result.error }
    }
    setUser(null)
    setSession(null)
    return { error: null }
  }

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    isAuthenticated: !!user
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

