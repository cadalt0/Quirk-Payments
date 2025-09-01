"use client"

import { GoogleOAuthProvider } from '@react-oauth/google'
import { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export default function AuthSessionProvider({ children }: Props) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  if (!clientId) {
    console.error('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set in environment variables')
    return <div>Error: Google OAuth not configured</div>
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      {children}
    </GoogleOAuthProvider>
  )
}
