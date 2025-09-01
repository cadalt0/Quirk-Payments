"use client"
import { AnimatedButton } from "@/components/animated-button"
import { GlobalFX } from "@/components/global-fx"
import { getRequests, type PaymentRequest, addRequest, getConfig } from "@/lib/store"
import { useEffect, useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import SettingsMenu from "@/components/settings-menu"
import { useAuth } from "@/lib/auth-context"
import { useGoogleLogin } from "@react-oauth/google"
import { useRouter } from "next/navigation"
import axios from "axios"
import { QRCard } from "@/components/qr-card"

const BASE_URL = process.env.NEXT_PUBLIC_QUIRK_API_URL || 'http://localhost:3001'

export default function Home() {
  const [requests, setRequests] = useState<PaymentRequest[]>([])
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<PaymentRequest | null>(null)
  const { userEmail, setUserEmail, clearUserEmail } = useAuth()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const router = useRouter()

  // Payment request modal state
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestAmount, setRequestAmount] = useState<string>("50")
  const [requestNote, setRequestNote] = useState<string>("")
  const [generatedRequest, setGeneratedRequest] = useState<string | null>(null)
  const [generatedCode, setGeneratedCode] = useState<string>("")

  // Check authentication status on page load
  useEffect(() => {
    // Check if user is already logged in from localStorage
    const storedEmail = localStorage.getItem('quirk_user_email')
    const storedUserData = localStorage.getItem('quirk_user_data')
    
    if (storedEmail && storedUserData) {
      try {
        const userData = JSON.parse(storedUserData)
        // Check if user data is valid (has smartwallets and account is not false)
        if (userData.smartwallets && Object.keys(userData.smartwallets).length > 0 && userData.account !== false) {
          console.log('🔄 Auto-login from localStorage:', storedEmail)
          setUserEmail(storedEmail)
          setIsLoggedIn(true)
          setIsCheckingAuth(false)
          return
        } else {
          // User has false account or no smartwallets - clear localStorage and redirect to auth
          console.log('⚠️ User has false account or no smartwallets - clearing localStorage and redirecting to auth')
          localStorage.removeItem('quirk_user_email')
          localStorage.removeItem('quirk_user_data')
          clearUserEmail()
          setIsLoggedIn(false)
          setIsCheckingAuth(false)
          router.push('/auth')
          return
        }
      } catch (error) {
        console.error('❌ Error parsing stored user data:', error)
        localStorage.removeItem('quirk_user_email')
        localStorage.removeItem('quirk_user_data')
      }
    }
    
    // If no valid stored data, check authentication status
    checkAuthenticationStatus()
  }, [])

  // Check if user is authenticated and has valid data in database
  const checkAuthenticationStatus = async (retryCount = 0) => {
    if (!userEmail) {
      setIsCheckingAuth(false)
      return
    }

    const maxRetries = 2
    const retryDelay = 500 // 500ms for faster retries

    try {
      console.log(`🔍 Checking authentication status for: ${userEmail} (attempt ${retryCount + 1}/${maxRetries + 1})`)
      const response = await axios.get(`${BASE_URL}/api/quirk/${encodeURIComponent(userEmail)}`)
      
      if (response.data && response.data.quirk) {
        const quirkData = response.data.quirk
        console.log('✅ User authenticated with data:', quirkData)
        
        // Check if user has completed onboarding (has smartwallets and account is not false)
        if (quirkData.smartwallets && Object.keys(quirkData.smartwallets).length > 0 && quirkData.account !== false) {
          setIsLoggedIn(true)
          // Save user data to localStorage for auto-login
          localStorage.setItem('quirk_user_email', userEmail)
          localStorage.setItem('quirk_user_data', JSON.stringify(quirkData))
        } else {
          // User has false account or no smartwallets - logout and redirect to auth
          console.log('⚠️ User has false account or no smartwallets - logging out and redirecting to auth')
          clearUserEmail()
          setIsLoggedIn(false)
          localStorage.removeItem('quirk_user_email')
          localStorage.removeItem('quirk_user_data')
          router.push('/auth')
        }
      } else {
        console.log('❌ User not found in database - redirecting to auth')
        router.push('/auth')
      }
    } catch (error: any) {
      console.error(`❌ Error checking authentication (attempt ${retryCount + 1}):`, error)
      
      if (error.response?.status === 404) {
        console.log('❌ User not found - redirecting to auth')
        router.push('/auth')
        return
      }
      
      // Retry logic for network errors or server issues
      if (retryCount < maxRetries && (
        error.code === 'ECONNREFUSED' || 
        error.code === 'ENOTFOUND' ||
        error.message?.includes('Network Error') ||
        error.message?.includes('timeout') ||
        error.response?.status >= 500
      )) {
        console.log(`🔄 Retrying in ${retryDelay}ms... (${retryCount + 1}/${maxRetries})`)
        
        setTimeout(() => {
          checkAuthenticationStatus(retryCount + 1)
        }, retryDelay)
        return
      }
      
      // Max retries reached or non-retryable error
      if (retryCount >= maxRetries) {
        console.error('❌ Max retries reached, showing login state')
      }
      
      // Network error or other issue - stay on page but show login
      setIsLoggedIn(false)
    } finally {
      if (retryCount >= maxRetries) {
        setIsCheckingAuth(false)
      }
    }
  }

  // Google login handler
  const login = useGoogleLogin({
    onSuccess: async (response) => {
      try {
        console.log('Google login success:', response)
        let userEmail = ''
        
        // Try to get email from access_token first
        if (response.access_token) {
          try {
            const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
              headers: { Authorization: `Bearer ${response.access_token}` }
            })
            userEmail = userInfoResponse.data.email
          } catch (error) {
            console.log('Failed to get email from access_token, trying id_token...')
          }
        }
        
        // Fallback to id_token if access_token failed
        if (!userEmail && (response as any).id_token) {
          try {
            const payload = JSON.parse(atob((response as any).id_token.split('.')[1]))
            userEmail = payload.email
          } catch (error) {
            console.error('Failed to decode id_token:', error)
          }
        }
        
        if (userEmail) {
          console.log('📧 User email:', userEmail)
          setUserEmail(userEmail)
          
          // Check if user exists in database with retry logic
          const checkUserInDatabase = async (retryCount = 0) => {
            const maxRetries = 2
            const retryDelay = 500

            try {
              console.log(`🔍 Checking user in database (attempt ${retryCount + 1}/${maxRetries + 1})`)
              const dbResponse = await axios.get(`${BASE_URL}/api/quirk/${encodeURIComponent(userEmail)}`)
              
              if (dbResponse.data && dbResponse.data.quirk) {
                const quirkData = dbResponse.data.quirk
                console.log('✅ User found in database:', quirkData)
                
                // Check if user has completed onboarding
                if (quirkData.smartwallets && Object.keys(quirkData.smartwallets).length > 0 && quirkData.account !== false) {
                  setIsLoggedIn(true)
                  localStorage.setItem('quirk_user_email', userEmail)
                  localStorage.setItem('quirk_user_data', JSON.stringify(quirkData))
                  // Reload page to show authenticated state
                  window.location.reload()
                } else {
                  // User has false account or no smartwallets - redirect to auth
                  console.log('⚠️ User has false account or no smartwallets - redirecting to auth')
                  router.push('/auth')
                }
              } else {
                console.log('❌ User not found in database - redirecting to auth')
                router.push('/auth')
              }
            } catch (error: any) {
              console.error(`❌ Error checking database (attempt ${retryCount + 1}):`, error)
              
              if (error.response?.status === 404) {
                console.log('❌ User not found - redirecting to auth')
                router.push('/auth')
                return
              }
              
              // Retry logic for network errors or server issues
              if (retryCount < maxRetries && (
                error.code === 'ECONNREFUSED' || 
                error.code === 'ENOTFOUND' ||
                error.message?.includes('Network Error') ||
                error.message?.includes('timeout') ||
                error.response?.status >= 500
              )) {
                console.log(`🔄 Retrying database check in ${retryDelay}ms... (${retryCount + 1}/${maxRetries})`)
                
                setTimeout(() => {
                  checkUserInDatabase(retryCount + 1)
                }, retryDelay)
                return
              }
              
              // Max retries reached
              if (retryCount >= maxRetries) {
                console.error('❌ Max retries reached for database check')
              }
            }
          }
          
          // Start the database check
          checkUserInDatabase()
        } else {
          console.error('❌ Could not extract email from Google response')
        }
      } catch (error) {
        console.error('❌ Error during Google login:', error)
      }
    },
    onError: (error) => {
      console.error('❌ Google login error:', error)
    }
  })

  // Logout handler
  const handleLogout = () => {
    clearUserEmail()
    setIsLoggedIn(false)
    localStorage.removeItem('quirk_user_email')
    localStorage.removeItem('quirk_user_data')
    window.location.reload()
  }

  // Payment request helper functions
  const uid = () => Math.random().toString(36).slice(2, 10)

  // Generate random 6-digit code
  const generateRandomCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  const requestPayload = useMemo(() => {
    const cfg = getConfig()
    const handle = cfg?.handle || "you.quirk"
    const params = new URLSearchParams({
      to: handle,
      amount: requestAmount || "0",
      note: requestNote || "",
      allow: (cfg?.chains || ["Base"]).join(","),
    })
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    return `${origin}/pay?${params.toString()}`
  }, [requestAmount, requestNote])

  const generateRequest = async () => {
    try {
      // Generate random 6-digit code
      const code = generateRandomCode()
      setGeneratedCode(code)
      
      // Prepare data for database (matching the API structure)
      const paymentData = {
        amount: requestAmount || "0",
        mail: userEmail || "",
        status: "pending",
        hash: "", // Leave hash empty as requested
        note: requestNote || "",
        payid: code // Include the 6-digit code in the request
      }
      
      console.log('💰 Creating Quirk Payment Record...')
      console.log('─'.repeat(50))
      console.log('📤 Sending data:', paymentData)
      console.log(`🔢 Generated 6-digit Payment ID: ${code}`)
      
      // Push to database
      const response = await axios.post(`${BASE_URL}/api/quirk-pay`, paymentData)
      
      if (response.status === 201) {
        const result = response.data
        console.log('✅ Payment record created successfully!')
        console.log('\n📋 Created Payment Details:')
        console.log(`   PayID: ${result.payment.payid || code}`)
        console.log(`   Amount: ${result.payment.amount}`)
        console.log(`   Email: ${result.payment.mail}`)
        console.log(`   Status: ${result.payment.status}`)
        console.log(`   Hash: ${result.payment.hash || 'null'}`)
        console.log(`   Created: ${result.payment.created_at}`)
        
        // Use our generated 6-digit code as the payment ID
        const payid = result.payment.payid || code
        
        // Generate payment URL with the 6-digit payment ID
        const paymentUrl = `${window.location.origin}/pay?payid=${payid}&amount=${requestAmount}&note=${encodeURIComponent(requestNote)}`
        setGeneratedRequest(paymentUrl)
        
        // Refresh requests from database
        await loadRequestsFromDB()
      } else {
        console.error(`❌ Error: HTTP ${response.status}`)
        console.error(`Response:`, response.data)
        alert('Failed to create payment request. Please try again.')
      }
    } catch (error: any) {
      console.error('❌ Error creating payment request:', error)
      
      if (error.code === 'ECONNREFUSED') {
        console.error('\n🔧 Troubleshooting:')
        console.error('   1. Ensure quirk-server is running: npm start')
        console.error('   2. Check if port 3001 is available')
        console.error('   3. Verify the server is not blocked by firewall')
        alert('Connection refused. Please check if the server is running.')
      } else {
        alert('Error creating payment request. Please try again.')
      }
    }
  }

  // Load requests from database
  const loadRequestsFromDB = async () => {
    try {
      if (userEmail) {
        console.log(`💰 Fetching all payments for: ${userEmail}`)
        console.log('─'.repeat(50))
        
        const response = await axios.get(`${BASE_URL}/api/quirk-pay?mail=${encodeURIComponent(userEmail)}`)
        
        if (response.status === 200 && response.data) {
          const result = response.data
          console.log('✅ Payments fetched successfully!')
          console.log(`📊 Total payments found: ${result.count || 0}`)
          
          if (result.payments && result.payments.length > 0) {
            console.log('\n📋 Payment Details:')
            result.payments.forEach((payment: any, index: number) => {
              console.log(`\n--- Payment ${index + 1} ---`)
              console.log(`   PayID: ${payment.payid}`)
              console.log(`   Amount: ${payment.amount}`)
              console.log(`   Email: ${payment.mail}`)
              console.log(`   Status: ${payment.status}`)
              console.log(`   Hash: ${payment.hash || 'null'}`)
              console.log(`   Created: ${payment.created_at}`)
              console.log(`   Updated: ${payment.updated_at}`)
            })
            
            // Transform database format to PaymentRequest format
            const dbRequests = result.payments.map((payment: any) => ({
              id: payment.payid || uid(),
              amount: Number(payment.amount) || 0,
              note: payment.note || "",
              url: `${window.location.origin}/pay?payid=${payment.payid || ""}&amount=${payment.amount}&note=${encodeURIComponent(payment.note || "")}`,
              createdAt: new Date(payment.created_at || Date.now()).getTime(),
              status: payment.status === "pending" ? "pending" : "completed",
              network: "Base",
              payid: payment.payid, // Store the payid for reference (should be 6-digit)
              hash: payment.hash, // Store the hash for reference
              updatedAt: payment.updated_at // Store the updated_at for reference
            }))
            
            // Log the payment IDs to verify they are 6-digit
            console.log('🔢 Payment IDs from database:')
            dbRequests.forEach((req: any, index: number) => {
              console.log(`   Payment ${index + 1}: ${req.payid} (${req.payid?.length || 0} digits)`)
            })
            
            console.log('🔄 Transformed requests:', dbRequests)
            setRequests(dbRequests)
          } else {
            console.log('\n📭 No payments found for this email')
            setRequests([])
          }
        } else {
          console.error(`❌ Error: HTTP ${response.status}`)
          console.error(`Response:`, response.data)
          setRequests([])
        }
      }
    } catch (error: any) {
      console.error('❌ Error loading requests from database:', error)
      
      if (error.code === 'ECONNREFUSED') {
        console.error('\n🔧 Troubleshooting:')
        console.error('   1. Ensure quirk-server is running: npm start')
        console.error('   2. Check if port 3001 is available')
        console.error('   3. Verify the server is not blocked by firewall')
      }
      
      // Fallback to localStorage if database fails
      setRequests(getRequests())
    }
  }

  const resetRequestModal = () => {
    setRequestAmount("50")
    setRequestNote("")
    setGeneratedRequest(null)
    setGeneratedCode("")
    setShowRequestModal(false)
  }

  // Helper function to extract payment ID from URL
  const getPaymentId = () => {
    if (generatedRequest && generatedRequest.includes('payid=')) {
      return generatedRequest.split('payid=')[1]?.split('&')[0] || generatedCode
    }
    return generatedCode
  }

  useEffect(() => {
    // Load requests from database when user is logged in
    if (isLoggedIn && userEmail) {
      loadRequestsFromDB()
    } else {
      // Fallback to localStorage if not logged in
      setRequests(getRequests())
    }
  }, [isLoggedIn, userEmail])

  // Periodically check authentication status to catch database changes
  useEffect(() => {
    if (!isLoggedIn || !userEmail) return

    const checkInterval = setInterval(async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/quirk/${encodeURIComponent(userEmail)}`)
        
        if (response.data && response.data.quirk) {
          const quirkData = response.data.quirk
          
          // If user's account status changed to false or lost smartwallets, logout immediately
          if (!quirkData.smartwallets || Object.keys(quirkData.smartwallets).length === 0 || quirkData.account === false) {
            console.log('⚠️ User account status changed - logging out and redirecting to auth')
            clearUserEmail()
            setIsLoggedIn(false)
            localStorage.removeItem('quirk_user_email')
            localStorage.removeItem('quirk_user_data')
            router.push('/auth')
          }
        }
      } catch (error) {
        console.error('❌ Error during periodic auth check:', error)
        // Don't logout on network errors, just log them
      }
    }, 30000) // Check every 30 seconds

    return () => clearInterval(checkInterval)
  }, [isLoggedIn, userEmail, clearUserEmail, router])

  // Periodically refresh payment requests from database
  useEffect(() => {
    if (!isLoggedIn || !userEmail) return

    const refreshInterval = setInterval(async () => {
      try {
        await loadRequestsFromDB()
      } catch (error) {
        console.error('❌ Error during periodic payment refresh:', error)
        // Don't show error to user, just log it
      }
    }, 60000) // Refresh every 60 seconds

    return () => clearInterval(refreshInterval)
  }, [isLoggedIn, userEmail])

  return (
    <main className="mobile-page relative h-full overflow-hidden">
      <GlobalFX />
      {/* (removed) <div className="absolute inset-0 quirk-gradient pointer-events-none" aria-hidden /> */}

      <header className="pt-6 px-4 relative">
        <h1 className="text-2xl font-extrabold tracking-wide">Quirk Dashboard</h1>
      </header>
      
      {/* Authentication UI - Settings when logged in, Login when logged out */}
      <div className="absolute top-6 right-4 z-50">
        {isCheckingAuth ? (
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
            Checking...
          </div>
        ) : isLoggedIn ? (
          <SettingsMenu onLogout={handleLogout} userEmail={userEmail} />
        ) : (
          <button
            onClick={() => login()}
            className="px-4 py-2 bg-[#6b46ff] text-white text-sm font-medium rounded-lg hover:bg-[#5a3fd8] transition-colors"
          >
            Login
          </button>
        )}
      </div>

      {/* Main content - only show when authenticated */}
      {isCheckingAuth ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-lg font-medium text-gray-600">Checking authentication...</div>
            <div className="text-sm text-gray-500 mt-2">Please wait</div>
            <div className="mt-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6b46ff] mx-auto"></div>
            </div>
          </div>
        </div>
      ) : !isLoggedIn ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-lg font-medium text-gray-600">Welcome to Quirk</div>
            <div className="text-sm text-gray-500 mt-2">Please login to access your dashboard</div>
            <div className="mt-4 space-y-3">
              <button
                onClick={() => login()}
                className="px-6 py-3 bg-[#6b46ff] text-white font-medium rounded-lg hover:bg-[#5a3fd8] transition-colors"
              >
                Login with Google
              </button>
              
            </div>
          </div>
        </div>
      ) : (
        <>
          <section className="px-4 mt-4">
            <AnimatedButton onClick={() => setShowRequestModal(true)}>
              + Create Payment Request
            </AnimatedButton>
          </section>

          {/* Your Wallets Section */}
          <section className="px-4 mt-6">
            <h2 className="text-base font-semibold mb-3">Your Wallets</h2>
            <div className="space-y-3">
              {(() => {
                // Get user data from localStorage to display wallets
                const storedUserData = localStorage.getItem('quirk_user_data')
                if (storedUserData) {
                  try {
                    const userData = JSON.parse(storedUserData)
                    if (userData.smartwallets && Object.keys(userData.smartwallets).length > 0) {
                      return Object.entries(userData.smartwallets as Record<string, string>).map(([chain, address]) => (
                        <div
                          key={chain}
                          className="flex items-center justify-between rounded-xl bg-white border border-black/10 px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden">
                              <img
                                src={
                                  chain === 'eth' ? '/eth.png' :
                                  chain === 'arbitrum' ? '/ava.png' :
                                  chain === 'base' ? '/base.png' :
                                  chain === 'avalanche' ? '/aval.png' :
                                  '/placeholder-logo.png'
                                }
                                alt={`${chain} logo`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <div className="text-sm font-medium capitalize">
                                {chain === 'eth' ? 'Ethereum' : 
                                 chain === 'arbitrum' ? 'Arbitrum' : 
                                 chain === 'base' ? 'Base' : 
                                 chain === 'avalanche' ? 'Avalanche' : chain}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {address.slice(0, 6)}...{address.slice(-4)}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={async (e) => {
                              const button = e.currentTarget as HTMLButtonElement
                              const originalContent = button.innerHTML
                              
                              try {
                                await navigator.clipboard.writeText(address)
                                
                                // Show success state
                                button.innerHTML = '✓'
                                button.className = 'px-2 py-1 text-green-600 font-bold text-sm transition-colors'
                                
                                // Reset after 2 seconds
                                setTimeout(() => {
                                  button.innerHTML = '📋'
                                  button.className = 'px-2 py-1 text-blue-600 hover:text-blue-700 transition-colors text-sm'
                                }, 2000)
                                
                              } catch (error) {
                                console.error('Failed to copy address:', error)
                                
                                // Fallback for older browsers
                                const textArea = document.createElement('textarea')
                                textArea.value = address
                                textArea.style.position = 'fixed'
                                textArea.style.left = '-999999px'
                                textArea.style.top = '-999999px'
                                document.body.appendChild(textArea)
                                textArea.focus()
                                textArea.select()
                                
                                try {
                                  const successful = document.execCommand('copy')
                                  if (successful) {
                                    // Show success state
                                    button.innerHTML = '✓'
                                    button.className = 'px-2 py-1 text-green-600 font-bold text-sm transition-colors'
                                    
                                    // Reset after 2 seconds
                                    setTimeout(() => {
                                      button.innerHTML = '📋'
                                      button.className = 'px-2 py-1 text-blue-600 hover:text-blue-700 transition-colors text-sm'
                                    }, 2000)
                                  }
                                } catch (fallbackError) {
                                  console.error('Fallback copy failed:', fallbackError)
                                  // Show error state briefly
                                  button.innerHTML = '✗'
                                  button.className = 'px-2 py-1 text-red-600 font-bold text-sm transition-colors'
                                  
                                  setTimeout(() => {
                                    button.innerHTML = `
                                      <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                                      </svg>
                                    `
                                    button.className = 'px-2 py-1 text-blue-600 hover:text-blue-700 transition-colors text-sm'
                                  }, 2000)
                                } finally {
                                  document.body.removeChild(textArea)
                                }
                              }
                            }}
                            className="px-2 py-1 text-blue-600 hover:text-blue-700 transition-colors text-sm"
                            title="Copy address to clipboard"
                          >
                            📋
                          </button>
                        </div>
                      ))
                    } else {
                      return (
                        <div className="text-sm text-muted-foreground py-4 text-center">
                          No wallets found. Complete onboarding to create your wallets.
                        </div>
                      )
                    }
                  } catch (error) {
                    console.error('Error parsing user data:', error)
                    return (
                      <div className="text-sm text-muted-foreground py-4 text-center">
                        Error loading wallet information.
                      </div>
                      )
                  }
                } else {
                  return (
                    <div className="text-sm text-muted-foreground py-4 text-center">
                      Loading wallet information...
                    </div>
                  )
                }
              })()}
            </div>
          </section>

          <section className="px-4 mt-6 pb-6">
            <h2 className="text-base font-semibold mb-3">Recent Payment Activities</h2>
            <div className="space-y-3">
              {requests.length === 0 ? (
                <div className="text-sm text-muted-foreground">No payments yet. Create your first request.</div>
              ) : (
                requests.slice(0, 6).map((r) => (
                  <article
                    key={r.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSelected(r)
                      setOpen(true)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        setSelected(r)
                        setOpen(true)
                      }
                    }}
                    className="flex items-center justify-between rounded-xl bg-white border border-black/10 px-4 py-3 cursor-pointer hover:bg-black/[0.02] focus:outline-none focus:ring-2 focus:ring-black/10 transition"
                  >
                    <div>
                      <div className="text-sm font-medium">Payment Request</div>
                      <div className="text-xs text-muted-foreground">
                        {r.status.toUpperCase()} • {r.network ?? "Base"}
                      </div>
                      {r.note && (
                        <div className="text-xs text-gray-500 mt-1">{r.note}</div>
                      )}
                      {r.hash && (
                        <div className="text-xs text-green-600 font-mono mt-1">
                          Hash: {r.hash.slice(0, 8)}...{r.hash.slice(-6)}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{r.amount.toFixed(2)} USDC</div>
                      <div className="text-xs text-blue-600 font-mono tracking-wider">
                        {r.payid && r.payid.length === 6 ? r.payid : 'N/A'}
                      </div>
                      {r.updatedAt && (
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(r.updatedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </>
      )}

      {/* Custom Modal that stays within phone frame */}
      {open && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-[90%] w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Payment Details</h3>
                  <p className="text-sm text-muted-foreground">Summary of this payment activity.</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                  ×
                </button>
              </div>
              
              {selected ? (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-semibold">{selected.amount.toFixed(2)} USDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium">{selected.status?.toUpperCase?.() ?? "PENDING"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Network</span>
                    <span className="font-medium">{selected.network ?? "Base"}</span>
                  </div>
                  {selected.payid && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment ID</span>
                      <span className="font-medium font-mono">{selected.payid}</span>
                    </div>
                  )}
                  {selected.hash && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Transaction Hash</span>
                      <span className="font-medium font-mono text-green-600">
                        {selected.hash.slice(0, 8)}...{selected.hash.slice(-6)}
                      </span>
                    </div>
                  )}
                  {selected.note && (
                    <div>
                      <div className="text-muted-foreground">Note</div>
                      <div className="font-medium">{selected.note}</div>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span className="font-medium">{new Date(selected.createdAt).toLocaleDateString()}</span>
                  </div>
                  {selected.updatedAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Updated</span>
                      <span className="font-medium">{new Date(selected.updatedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="pt-2">
                    <a
                      href={selected.url}
                      className="underline text-blue-600"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open Payment Link
                    </a>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Payment Request Modal */}
      {showRequestModal && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-[95%] w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold">Create Payment Request</h3>
                  <p className="text-sm text-muted-foreground">Generate a payment link for USDC</p>
                </div>
                <button
                  onClick={resetRequestModal}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                  ×
                </button>
              </div>
              
              {!generatedRequest ? (
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium">Amount (USDC)</span>
                    <input
                      className="mt-1 w-full rounded-xl border border-black/10 px-3 py-3 bg-white"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      value={requestAmount}
                      onChange={(e) => setRequestAmount(e.target.value)}
                    />
                  </label>
                  
                  <label className="block">
                    <span className="text-sm font-medium">Optional Note</span>
                    <input
                      className="mt-1 w-full rounded-xl border border-black/10 px-3 py-3 bg-white"
                      placeholder="Dinner bill"
                      value={requestNote}
                      onChange={(e) => setRequestNote(e.target.value)}
                    />
                  </label>
                  
                  <div className="pt-4">
                    <AnimatedButton onClick={generateRequest} className="w-full">
                      Generate Request
                    </AnimatedButton>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl p-4 border border-black/10">
                    <p className="text-sm font-semibold">Payment ID (6-digit)</p>
                    <div className="mt-2 text-center">
                      <div className="text-3xl font-bold text-blue-600 font-mono bg-blue-50 px-4 py-2 rounded-lg tracking-widest">
                        {getPaymentId()}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Share this 6-digit payment ID with the payer</p>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm font-semibold mb-2">Payment Details</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Amount:</span>
                          <span className="font-medium">{requestAmount} USDC</span>
                        </div>
                        {requestNote && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Note:</span>
                            <span className="font-medium">{requestNote}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          <span className="font-medium text-orange-600">UNPAID</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex gap-2">
                      <button 
                        className="text-sm underline text-blue-600 hover:text-blue-800" 
                        onClick={() => navigator.clipboard.writeText(getPaymentId())}
                      >
                        Copy Payment ID
                      </button>
                      <button 
                        className="text-sm underline text-blue-600 hover:text-blue-800" 
                        onClick={() => navigator.clipboard.writeText(generatedRequest)}
                      >
                        Copy Full URL
                      </button>
                      {"share" in navigator && (
                        <button
                          className="text-sm underline text-blue-600 hover:text-blue-800"
                          onClick={() => {
                            (navigator as any).share({
                              title: "Quirk Payment",
                              text: `Pay me ${requestAmount} USDC via Quirk. Use payment ID: ${getPaymentId()}`,
                              url: generatedRequest,
                            })
                          }}
                        >
                          Share
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <QRCard value={generatedRequest} />
                  
                  <div className="pt-4 space-y-3">
                    <AnimatedButton variant="secondary" onClick={resetRequestModal} className="w-full">
                      Create Another Request
                    </AnimatedButton>
                    <AnimatedButton onClick={resetRequestModal} className="w-full">
                      Done
                    </AnimatedButton>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
