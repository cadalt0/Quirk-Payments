"use client"

import { useState, useEffect } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { useRouter } from 'next/navigation'
import ModelViewer from '../../components/3d-model-viewer'
import { pushUserEmailToDB } from '../../lib/auth-script'
import { useAuth } from '../../lib/auth-context'
import axios from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_QUIRK_API_URL || 'http://localhost:3001'

export default function AuthPage() {
  const [isButtonClicked, setIsButtonClicked] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [dbPushStatus, setDbPushStatus] = useState<'idle' | 'pushing' | 'success' | 'error'>('idle')
  const [dbPushError, setDbPushError] = useState<string | null>(null)
  const router = useRouter()
  const { setUserEmail } = useAuth()

  // Function to push user email to database with retry logic
  const pushUserEmailToDBWithRetry = async (email: string, retryCount = 0) => {
    const maxRetries = 2
    const retryDelay = 500 // 500ms for faster retries

    try {
      console.log(`📧 Pushing email to database (attempt ${retryCount + 1}/${maxRetries + 1}):`, email)
      
      // Test connection first to detect network issues
      try {
        await axios.get(`${BASE_URL}/api/quirk`, { timeout: 5000 })
      } catch (connectionError: any) {
        console.log(`🔍 Connection test failed (attempt ${retryCount + 1}):`, connectionError.message)
        
        // If it's a network error, retry
        if (retryCount < maxRetries && (
          connectionError.code === 'ECONNREFUSED' || 
          connectionError.code === 'ENOTFOUND' ||
          connectionError.message?.includes('Network Error') ||
          connectionError.message?.includes('timeout') ||
          connectionError.response?.status >= 500
        )) {
          console.log(`🔄 Retrying connection in ${retryDelay}ms... (${retryCount + 1}/${maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          return pushUserEmailToDBWithRetry(email, retryCount + 1)
        }
        
        // If max retries reached, throw the error
        if (retryCount >= maxRetries) {
          throw new Error(`Connection failed after ${maxRetries} attempts: ${connectionError.message}`)
        }
      }
      
      // Now try to push the email
      const result = await pushUserEmailToDB(email)
      
      if (result) {
        console.log('✅ Email successfully pushed to database')
        return true
      } else {
        // If pushUserEmailToDB returns false, it means there was an error
        // We should retry this as well
        if (retryCount < maxRetries) {
          console.log(`🔄 Database push failed, retrying in ${retryDelay}ms... (${retryCount + 1}/${maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          return pushUserEmailToDBWithRetry(email, retryCount + 1)
        } else {
          throw new Error('Database push failed after all retries')
        }
      }
    } catch (error: any) {
      console.error(`❌ Error pushing email to database (attempt ${retryCount + 1}):`, error)
      
      // If we haven't reached max retries, retry
      if (retryCount < maxRetries) {
        console.log(`🔄 Retrying in ${retryDelay}ms... (${retryCount + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        return pushUserEmailToDBWithRetry(email, retryCount + 1)
      }
      
      // Max retries reached
      console.error('❌ Max retries reached for database push')
      return false
    }
  }

  // Show loading screen for 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  const login = useGoogleLogin({
    onSuccess: async (response) => {
      console.log('Google login success:', response)
      
      try {
        console.log('Full Google response:', response)
        
        // Get user email from Google response
        let userEmail = null
        
        if (response.access_token) {
          // If we have access_token, fetch user info from Google
          console.log('Using access_token to fetch user info')
          const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
              Authorization: `Bearer ${response.access_token}`,
            },
          })
          
          if (userInfoResponse.ok) {
            const userInfo = await userInfoResponse.json()
            userEmail = userInfo.email
            console.log('User email from Google API:', userEmail)
          }
        } else if ((response as any).id_token) {
          // If we have id_token, decode it to get user info
          console.log('Using id_token to get user info')
          try {
            // Decode JWT token (base64 decode the payload part)
            const payload = (response as any).id_token.split('.')[1]
            const decodedPayload = JSON.parse(atob(payload))
            userEmail = decodedPayload.email
            console.log('User email from id_token:', userEmail)
          } catch (decodeError) {
            console.error('Error decoding id_token:', decodeError)
          }
        }
        
        if (userEmail) {
          
          // Set user email in auth context for use in other pages
          setUserEmail(userEmail)
          console.log('User email set in auth context:', userEmail)
          
          // First check if user already exists in database
          setDbPushStatus('pushing')
          console.log('🔍 Checking if user exists in database...')
          
          try {
            const userCheckResponse = await axios.get(`${BASE_URL}/api/quirk/${encodeURIComponent(userEmail)}`)
            
            if (userCheckResponse.data && userCheckResponse.data.quirk) {
              // User exists - check account status
              const quirkData = userCheckResponse.data.quirk
              console.log('✅ User exists in database:', quirkData)
              
              if (quirkData.account === false) {
                // User exists but account is false - don't push anything, redirect as usual
                console.log('⚠️ User exists but account is false - redirecting to account-created')
                setDbPushStatus('success')
                setTimeout(() => {
                  router.push('/account-created')
                }, 3000)
              } else if (quirkData.account === true && quirkData.smartwallets && Object.keys(quirkData.smartwallets).length > 0) {
                // User exists and account is true with smartwallets - redirect directly to home
                console.log('✅ User has active account with smartwallets - redirecting to home')
                setDbPushStatus('success')
                setTimeout(() => {
                  router.push('/')
                }, 1000)
              } else {
                // User exists but no account status or smartwallets - redirect to account-created
                console.log('⚠️ User exists but no account status or smartwallets - redirecting to account-created')
                setDbPushStatus('success')
                setTimeout(() => {
                  router.push('/account-created')
                }, 3000)
              }
            } else {
              // User doesn't exist - push to database
              console.log('🆕 User doesn\'t exist - pushing to database...')
              const dbSuccess = await pushUserEmailToDBWithRetry(userEmail)
              console.log('🔄 Database push result:', dbSuccess)
              
              if (dbSuccess) {
                setDbPushStatus('success')
                // Only redirect after successful database insertion
                setTimeout(() => {
                  router.push('/account-created')
                }, 3000)
              } else {
                console.error('❌ Failed to push user email to database after all retries')
                setDbPushStatus('error')
                setDbPushError('Failed to save account to database. Please try again.')
                // Show error and don't redirect
                setIsButtonClicked(false)
              }
            }
          } catch (error: any) {
            console.error('❌ Error checking user existence:', error)
            
            if (error.response?.status === 404) {
              // User not found - push to database
              console.log('🆕 User not found (404) - pushing to database...')
              const dbSuccess = await pushUserEmailToDBWithRetry(userEmail)
              console.log('🔄 Database push result:', dbSuccess)
              
              if (dbSuccess) {
                setDbPushStatus('success')
                setTimeout(() => {
                  router.push('/account-created')
                }, 3000)
              } else {
                console.error('❌ Failed to push user email to database after all retries')
                setDbPushStatus('error')
                setDbPushError('Failed to save account to database. Please try again.')
                setIsButtonClicked(false)
              }
            } else {
              // Other error - show error message
              console.error('❌ Error checking user existence:', error)
              setDbPushStatus('error')
              setDbPushError('Failed to check user account. Please try again.')
              setIsButtonClicked(false)
            }
          }
        } else {
          console.warn('No user email found in Google response')
          setIsButtonClicked(false)
        }
      } catch (error) {
        console.error('Error processing user data:', error)
        setIsButtonClicked(false)
      }
    },
    onError: (error) => {
      console.error('Google login error:', error)
      setIsButtonClicked(false)
    },
    onNonOAuthError: (error) => {
      console.error('Non-OAuth error:', error)
      setIsButtonClicked(false)
    },
    // Use implicit flow for popup (no redirect URI needed)
    flow: 'implicit'
  })

  const handleCreateAccount = () => {
    setIsButtonClicked(true)
    login()
  }

  return (
    <main className="mobile-page items-center justify-center text-center">
      {/* Always show the auth page components */}
      <div className="space-y-2 -mt-16">
        <h1 className="text-2xl font-extrabold">Create your Quirk account</h1>
        <p className="text-sm text-muted-foreground">Settle USDC on any chain.</p>
      </div>
      
      <ModelViewer isButtonClicked={isButtonClicked} />
      
      <div className="mt-6 w-full">
        <button
          onClick={handleCreateAccount}
          disabled={isButtonClicked}
          className="w-full rounded-xl bg-[#6b46ff] text-white font-semibold py-3 shadow hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-70"
        >
          {isButtonClicked ? (
            dbPushStatus === 'pushing' ? "Checking Account..." :
            dbPushStatus === 'success' ? "Redirecting..." :
            "Creating Account..."
          ) : "Create Account with Google"}
        </button>
        
        {/* Database push status indicators */}
        {isButtonClicked && (
          <div className="mt-3 space-y-2">
            {dbPushStatus === 'pushing' && (
              <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Checking account status...
              </div>
            )}
            
            {dbPushStatus === 'success' && (
              <div className="flex items-center justify-center gap-2 text-sm text-green-600">
                <span>✅</span>
                Account saved successfully! Redirecting...
              </div>
            )}
            
            {dbPushStatus === 'error' && (
              <div className="text-sm text-red-600">
                <p className="font-medium">❌ Database Error</p>
                <p className="text-xs mt-1">{dbPushError}</p>
                <div className="mt-2 space-y-2">
                  <button
                    onClick={() => {
                      setDbPushStatus('idle')
                      setDbPushError(null)
                      setIsButtonClicked(false)
                    }}
                    className="px-4 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={async () => {
                      setDbPushStatus('pushing')
                      setDbPushError(null)
                      console.log('🔄 Manual retry attempt...')
                      // We need to get the email from the current user context or re-extract it
                      // For now, let's just reset the state and let user try the full flow again
                      setDbPushStatus('idle')
                      setDbPushError(null)
                      setIsButtonClicked(false)
                    }}
                    className="px-4 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition-colors ml-2"
                  >
                    Reset & Try Again
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="mt-3 text-center">
          <p className="text-xs text-gray-500">
            100% Decentralized • No Swaps • Native USDC Transfer
          </p>
        </div>
      </div>

      {/* Loading overlay with $ emoji on top */}
      {isLoading && (
        <div className="absolute inset-0 bg-white flex items-center justify-center z-50">
          <div className="text-center">
            <div className="text-8xl mb-4">💰</div>
            <p className="text-lg text-gray-600">Loading Quirk...</p>
          </div>
        </div>
      )}
    </main>
  )
}
