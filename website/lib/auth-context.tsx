'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface AuthContextType {
  userEmail: string | null
  setUserEmail: (email: string) => void
  clearUserEmail: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userEmail, setUserEmailState] = useState<string | null>(null)

  const setUserEmail = (email: string) => {
    setUserEmailState(email)
    // Also store in localStorage for persistence
    localStorage.setItem('quirk_user_email', email)
  }

  const clearUserEmail = () => {
    setUserEmailState(null)
    localStorage.removeItem('quirk_user_email')
  }

  // Initialize from localStorage on mount
  useEffect(() => {
    const storedEmail = localStorage.getItem('quirk_user_email')
    if (storedEmail) {
      setUserEmailState(storedEmail)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ userEmail, setUserEmail, clearUserEmail }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
