import { supabase } from './supabaseClient'
import type { User, Session } from '@supabase/supabase-js'

export interface AuthError {
  message: string
  code?: string
}

export interface SignUpData {
  email: string
  password: string
  inviteCode: string
}

export interface SignInData {
  email: string
  password: string
}

/**
 * Validate invite code before allowing signup
 */
export async function validateInviteCode(code: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('invite_codes')
      .select('id, used, expires_at, max_uses, use_count')
      .eq('code', code)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return { valid: false, error: 'Invalid invite code' }
      }
      return { valid: false, error: error.message }
    }

    if (!data) {
      return { valid: false, error: 'Invalid invite code' }
    }

    // Check if code has expired
    if (data.expires_at) {
      const expiresAt = new Date(data.expires_at)
      if (expiresAt < new Date()) {
        return { valid: false, error: 'This invite code has expired' }
      }
    }

    // Check if code has been used up
    if (data.max_uses && data.use_count >= data.max_uses) {
      return { valid: false, error: 'This invite code has reached its usage limit' }
    }

    // Check if code is marked as used (if single-use)
    if (data.used && !data.max_uses) {
      return { valid: false, error: 'This invite code has already been used' }
    }

    return { valid: true }
  } catch (error) {
    console.error('Error validating invite code:', error)
    return { valid: false, error: 'Failed to validate invite code' }
  }
}

/**
 * Mark invite code as used after successful signup
 */
export async function markInviteCodeUsed(code: string, userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: inviteData } = await supabase
      .from('invite_codes')
      .select('use_count, max_uses')
      .eq('code', code)
      .single()

    if (!inviteData) {
      return { success: false, error: 'Invite code not found' }
    }

    const updateData: { used: boolean; used_by?: string; use_count?: number } = {
      used: true,
      used_by: userId
    }

    // Increment use count if tracking multiple uses
    if (inviteData.max_uses) {
      updateData.use_count = (inviteData.use_count || 0) + 1
    }

    const { error } = await supabase
      .from('invite_codes')
      .update(updateData)
      .eq('code', code)

    if (error) {
      console.error('Error marking invite code as used:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error marking invite code as used:', error)
    return { success: false, error: 'Failed to mark invite code as used' }
  }
}

/**
 * Sign up a new user with invite code validation
 */
export async function signUp({ email, password, inviteCode }: SignUpData): Promise<{ 
  user: User | null
  session: Session | null
  error: AuthError | null 
}> {
  // First validate the invite code
  const inviteValidation = await validateInviteCode(inviteCode)
  if (!inviteValidation.valid) {
    return {
      user: null,
      session: null,
      error: { message: inviteValidation.error || 'Invalid invite code' }
    }
  }

  // Sign up the user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin
    }
  })

  if (error) {
    return {
      user: null,
      session: null,
      error: { message: error.message, code: error.status?.toString() }
    }
  }

  // Mark invite code as used
  if (data.user) {
    await markInviteCodeUsed(inviteCode, data.user.id)
  }

  return {
    user: data.user,
    session: data.session,
    error: null
  }
}

/**
 * Sign in an existing user
 */
export async function signIn({ email, password }: SignInData): Promise<{ 
  user: User | null
  session: Session | null
  error: AuthError | null 
}> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    return {
      user: null,
      session: null,
      error: { message: error.message, code: error.status?.toString() }
    }
  }

  return {
    user: data.user,
    session: data.session,
    error: null
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut()

  if (error) {
    return { error: { message: error.message, code: error.status?.toString() } }
  }

  return { error: null }
}

/**
 * Get the current session
 */
export async function getSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

/**
 * Get the current user
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (event: string, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
}

