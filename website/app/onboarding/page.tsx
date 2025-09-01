"use client"
import { AnimatedButton } from "@/components/animated-button"
import { MobileHeader } from "@/components/header"
import { saveConfig } from "@/lib/store"
import { useEffect, useMemo, useState, Suspense } from "react"
import { GlobalFX } from "@/components/global-fx"
import { Canvas } from '@react-three/fiber'
import { useGLTF, OrbitControls, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { useAuth } from "@/lib/auth-context"
import { updateQuirkData } from "@/lib/quirk-update"
import { createWalletsMasterRealtime, WalletCreationResult } from "@/lib/wallet-creator"
import { pushToSmartWallets } from "@/lib/smartwallets-update"
import axios from "axios"

// 3D Model Component
function Model({ url, position, onPositionChange }: { url: string; position: number[]; onPositionChange: (pos: number[]) => void }) {
  const { scene } = useGLTF(url)
  const [rotation, setRotation] = useState(0)
  
  // Debug logging
  console.log('Model position:', position)
  
  // Rotate model on Y axis at 1x speed (left to right)
  useEffect(() => {
    const interval = setInterval(() => {
      setRotation(prev => prev + 0.02) // 1x speed rotation
    }, 16) // 60fps for smooth rotation
    
    return () => clearInterval(interval)
  }, [])
  
  return (
    <group position={[position[0], position[1], position[2]]}>
      <primitive 
        object={scene} 
        scale={1}
        rotation={[0, rotation, 0]}
        onPointerDown={(e: any) => {
          e.stopPropagation()
        }}
        onPointerMove={(e: any) => {
          if (e.buttons === 1) { // Left mouse button
            const newX = position[0] + e.movementX * 0.01
            const newY = position[1] - e.movementY * 0.01
            onPositionChange([newX, newY, position[2]])
          }
        }}
      />
    </group>
  )
}

// Preload the model
useGLTF.preload('/3d-model/axolotl_friend.glb')

const CHAINS = ["Base", "Arbitrum", "Avalanche", "Ethereum"]

type ChainMeta = {
  name: string
  logo: string
}
const CHAIN_META: ChainMeta[] = [
  { name: "Base", logo: "/base.png" },
  { name: "Arbitrum", logo: "/ava.png" },
  { name: "Avalanche", logo: "/aval.png" },
  { name: "Ethereum", logo: "/eth.png" },
]

export default function Onboarding() {
  const [chains, setChains] = useState<string[]>([])
  const [settlementChain, setSettlementChain] = useState("")
  const [settlementAddress, setSettlementAddress] = useState("")

  const [showError, setShowError] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdatingDB, setIsUpdatingDB] = useState(false)
  const [currentChainIndex, setCurrentChainIndex] = useState(0)
  const [createdWallets, setCreatedWallets] = useState<{ [chain: string]: string }>({})
  const [walletCreationError, setWalletCreationError] = useState<string | null>(null)
  const [databaseSuccess, setDatabaseSuccess] = useState(false)
  const [modelPosition, setModelPosition] = useState({ x: 1.44, y: 4.59, z: 9.86 })
  const [modelRotation, setModelRotation] = useState({ x: 0.12, y: 0.17, z: -0.02 })
  const [modelScale, setModelScale] = useState({ x: 1.00, y: 1.00, z: 1.00 })
  const [modelLocalPosition, setModelLocalPosition] = useState([0, 0, 0])
  const { userEmail } = useAuth()

  // When settlement chain changes, automatically add it to selected chains if not already there
  useEffect(() => {
    if (settlementChain && !chains.includes(settlementChain)) {
      setChains([settlementChain])
    }
  }, [settlementChain, chains])

  // Update chain index based on actual wallet creation progress
  useEffect(() => {
    if (isCreating && chains.length > 0) {
      const createdCount = Object.keys(createdWallets).length
      if (createdCount > 0 && createdCount <= chains.length) {
        setCurrentChainIndex(createdCount - 1)
      }
    }
  }, [createdWallets, isCreating, chains])



  const toggle = (c: string) => {
    setChains((prev) => {
      const exists = prev.includes(c)
      if (exists) {
        // If removing a chain that's currently the settlement chain, clear settlement
        if (c === settlementChain) {
          setSettlementChain("")
        }
        return prev.filter((x) => x !== c)
      } else {
        return [...prev, c]
      }
    })
  }

  // Check if user has selected at least 2 chains (including settlement chain)
  // Function to validate EVM address format
  const isValidEVMAddress = (address: string): boolean => {
    // Check if it's a valid Ethereum address format (0x followed by 40 hex characters)
    const evmAddressRegex = /^0x[a-fA-F0-9]{40}$/
    return evmAddressRegex.test(address)
  }

  const canProceed = chains.length >= 2 && settlementChain && settlementAddress && isValidEVMAddress(settlementAddress)



  const create = async () => {
    if (!canProceed) {
      setShowError(true)
      const timer = setTimeout(() => setShowError(false), 3000)
      return
    }
    
    const BASE_URL = process.env.NEXT_PUBLIC_QUIRK_API_URL || 'http://localhost:3001'

    // Check if user email is available
    if (!userEmail) {
      console.error('No user email found. User must be logged in first.')
      setShowError(true)
      const timer = setTimeout(() => setShowError(false), 3000)
      return
    }

    try {
      console.log('🚀 Creating Quirk account with data:')
      console.log('📧 Email:', userEmail)
      console.log('🔗 Chains:', chains)
      console.log('⚡ Settlement Chain:', settlementChain)
      console.log('📍 Settlement Address:', settlementAddress)

      // Set database updating state
      setIsUpdatingDB(true)

      // Update quirk data in database
      const updateSuccess = await updateQuirkData(
        userEmail,
        chains,
        settlementChain,
        settlementAddress
      )

      if (updateSuccess) {
        console.log('✅ Quirk data updated successfully in database')
        // Reset database updating state
        setIsUpdatingDB(false)
        
        // Start real wallet creation
        console.log('🔐 Starting real wallet creation...')
        setIsCreating(true)
        setCurrentChainIndex(0)
        
        // Reset created wallets for fresh start
        setCreatedWallets({})
        setDatabaseSuccess(false) // Reset database success state
        
        try {
          // Create real wallets using quirk server with real-time updates
          const walletResult = await createWalletsMasterRealtime(
            chains,
            settlementChain,
            settlementAddress,
            // Real-time callback for UI updates
            (chain, address) => {
              console.log(`🎯 Real-time update: ${chain} wallet created: ${address}`)
              setCreatedWallets(prev => ({
                ...prev,
                [chain]: address
              }))
            }
          )
          
          if (walletResult.success) {
            console.log('✅ Wallets created successfully:', walletResult.wallets)
            console.log('📡 Full API response:', walletResult.fullResponse)
            // Don't overwrite the real-time updates - they're already set via callback
            
            // Check if we have valid data to push
            if (!walletResult.fullResponse || Object.keys(walletResult.fullResponse).length === 0) {
              console.error('❌ No fullResponse data from wallet creation')
              setWalletCreationError('Wallet creation succeeded but no data returned')
              setIsCreating(false)
              setShowError(true)
              const timer = setTimeout(() => setShowError(false), 5000)
              return
            }
            
            // Push to smartwallets table with complete API response
            const smartWalletSuccess = await pushToSmartWallets({
              email: userEmail!,
              wallets: walletResult.wallets,
              settlementChain,
              settlementAddress,
              fullResponse: walletResult.fullResponse // Pass the complete API response
            })
            
            if (smartWalletSuccess) {
              console.log('✅ Successfully pushed to smartwallets table')
              
              // Update account status to true
              try {
                console.log('📝 Updating account status to true...')
                const accountUpdateResponse = await axios.patch(`${BASE_URL}/api/quirk/${encodeURIComponent(userEmail!)}`, {
                  account: true
                })
                
                if (accountUpdateResponse.status === 200) {
                  console.log('✅ Account status updated successfully')
                  setDatabaseSuccess(true)
                  
                  // Wait 3 seconds to show completion, then redirect to home
                  setTimeout(() => {
                    console.log('🚀 Redirecting to home page...')
                    window.location.href = '/'
                  }, 3000)
                } else {
                  console.warn('⚠️ Account status update failed, but continuing...')
                  setDatabaseSuccess(true)
                  
                  // Still redirect since smartwallets were saved
                  setTimeout(() => {
                    console.log('🚀 Redirecting to home page...')
                    window.location.href = '/'
                  }, 3000)
                }
              } catch (error) {
                console.warn('⚠️ Account status update failed, but continuing...', error)
                setDatabaseSuccess(true)
                
                // Still redirect since smartwallets were saved
                setTimeout(() => {
                  console.log('🚀 Redirecting to home page...')
                  window.location.href = '/'
                }, 3000)
              }
              
            } else {
              console.error('❌ Failed to push to smartwallets table')
              setWalletCreationError('Failed to save wallet data to database')
              setIsCreating(false)
              setShowError(true)
              const timer = setTimeout(() => setShowError(false), 5000)
              return // Don't redirect if database push fails
            }
            
          } else {
            console.error('❌ Wallet creation failed:', walletResult.error)
            setWalletCreationError(walletResult.error || 'Wallet creation failed')
            setIsCreating(false)
            setShowError(true)
            const timer = setTimeout(() => setShowError(false), 3000)
            return
          }
          
        } catch (error) {
          console.error('❌ Error during wallet creation:', error)
          setWalletCreationError('Wallet creation error')
          setIsCreating(false)
          setShowError(true)
          const timer = setTimeout(() => setShowError(false), 3000)
          return
        }
        
      } else {
        console.error('❌ Failed to update quirk data in database')
        setIsUpdatingDB(false)
        setShowError(true)
        const timer = setTimeout(() => setShowError(false), 3000)
        return
      }
    } catch (error) {
      console.error('❌ Error creating account:', error)
      setIsUpdatingDB(false)
      setShowError(true)
      const timer = setTimeout(() => setShowError(false), 3000)
      return
    }
  }

  const selectedSet = useMemo(() => new Set(chains), [chains])

  return (
    <main className="mobile-page">
      <GlobalFX />
              <MobileHeader title="" />
      
      {/* Phone notification error message */}
      {showError && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-1/2 z-10 bg-red-500 text-white px-3 py-2 rounded-xl shadow-lg animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <div className="text-xs flex-1">
              {chains.length < 2 && <p className="font-medium">Select at least 2 chains</p>}
              {!settlementChain && <p className="font-medium">Choose settlement chain</p>}
              {!settlementAddress && <p className="font-medium">Enter settlement address</p>}
              {settlementAddress && !isValidEVMAddress(settlementAddress) && <p className="font-medium">Enter valid EVM address (0x...)</p>}

              {walletCreationError && <p className="font-medium">Wallet creation failed: {walletCreationError}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Chain selector as 2x2 square tiles with logos - only show when not creating */}
      {!isCreating && (
      <section className="mt-2">
          <h2 className="text-base font-semibold text-center mb-4">Select Chains to Accept USDC</h2>
          <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
          {CHAIN_META.map((m) => {
            const isSelected = selectedSet.has(m.name)
            return (
              <button
                key={m.name}
                type="button"
                onClick={() => toggle(m.name)}
                  className={`relative aspect-square w-24 h-24 rounded-xl border transition-colors flex flex-col items-center justify-center gap-2
                  ${isSelected ? 
                    (m.name === settlementChain ? "bg-gray-100 border-gray-300" : "bg-white border-[var(--color-quirk-primary)]") 
                    : "bg-white/80 border-black/10"}
                  ${m.name === "Base" ? "ml-8" : m.name === "Avalanche" ? "ml-8" : m.name === "Arbitrum" ? "ml-6" : m.name === "Ethereum" ? "ml-6" : ""}`}
                aria-pressed={isSelected}
              >
                <img
                  src={m.logo || "/placeholder.svg"}
                  alt={`${m.name} logo`}
                    className={`h-12 w-12 rounded-md ${m.name === "Base" || m.name === "Avalanche" ? "ml-3" : ""}`}
                  crossOrigin="anonymous"
                />
                <span className="text-sm font-medium">{m.name}</span>
                {isSelected && (
                  <span
                    className="absolute top-2 left-2 inline-flex items-center justify-center h-5 w-5 rounded-md bg-[var(--color-quirk-primary)] text-white text-[10px] font-bold"
                    aria-label="Selected"
                  >
                    ✓
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Other EVM chains, Solana, etc. coming soon.</p>
      </section>
      )}

      {/* Show settlement section only when not creating */}
      {!isCreating && (
        <>
      <section className="mt-6 space-y-3">
        <h2 className="text-base font-semibold">Select Settlement</h2>
        <div className="p-3 rounded-xl bg-white border border-black/10 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm w-28">Chain</span>
            <select
                  className="flex-1 rounded-lg border border-black/10 px-3 py-2 bg-white"
              value={settlementChain}
              onChange={(e) => setSettlementChain(e.target.value)}
            >
                  <option value="">No chain selected</option>
              {CHAINS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                </option>
              ))}
            </select>
          </div>
              <p className="text-xs text-muted-foreground">Choose any chain for settlement. You must select at least 2 chains total.</p>
          <div className="flex items-center gap-2">
            <span className="text-sm w-28">Address</span>
            <input
                  className={`flex-1 rounded-lg border px-3 py-2 ${
                    settlementAddress && !isValidEVMAddress(settlementAddress)
                      ? 'border-red-500 bg-red-50'
                      : 'border-black/10'
                  }`}
              placeholder="0x..."
              value={settlementAddress}
              onChange={(e) => setSettlementAddress(e.target.value)}
            />
          </div>
              {settlementAddress && !isValidEVMAddress(settlementAddress) && (
                <p className="text-xs text-red-500">Please enter a valid EVM address (0x followed by 40 hex characters)</p>
              )}

        </div>
      </section>

          <div className="mt-4">
            <AnimatedButton 
              onClick={create}
              disabled={isUpdatingDB || isCreating}
            >
              {isUpdatingDB || isCreating ? "Creating Account..." : "Create Account"}
            </AnimatedButton>
            <div className="mt-3 text-center">
              <p className="text-xs text-gray-500">
                Powered by Quirk Payments
              </p>
            </div>
          </div>
        </>
      )}

      {/* Show 3D model and creation experience when creating */}
      {isCreating && (
        <div className="mt-6 text-center">
          <div className="w-full h-96 mx-auto mb-6 relative overflow-hidden">
            <Canvas camera={{ position: [3.06, 2.60, 17.14], fov: 65 }} style={{ background: 'transparent' }}>
              <Suspense fallback={null}>
                <ambientLight intensity={0.6} />
                <directionalLight position={[10, 10, 5]} intensity={1.2} />
                <pointLight position={[-10, -10, -5]} intensity={0.5} />
                <Model 
                  url="/3d-model/axolotl_friend.glb" 
                  position={modelLocalPosition}
                  onPositionChange={setModelLocalPosition}
                />
                <OrbitControls
                  enableZoom={true}
                  enablePan={true}
                  autoRotate={false}
                  enableRotate={true}
                  zoomSpeed={1.0}
                  panSpeed={1.0}
                  rotateSpeed={1.0}
                  minDistance={1}
                  maxDistance={20}
                  maxPolarAngle={Math.PI}
                  minPolarAngle={0}
                  onChange={(e) => {
                    if (e?.target?.object) {
                      const camera = e.target.object
                      setModelPosition({ x: camera.position.x, y: camera.position.y, z: camera.position.z })
                      setModelRotation({ x: camera.rotation.x, y: camera.rotation.y, z: camera.rotation.z })
                    }
                  }}
                />
                <Environment preset="city" />
              </Suspense>
            </Canvas>
            
                          {/* 3D Frame Layer with Creating Account content */}
              <div className="absolute bottom-0 left-0 right-0 h-49 bg-[#fceed1] z-10 rounded-3xl shadow-2xl border-4 border-white/20 mx-4">
              {/* 3D Frame Effect - All sides */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/20 to-transparent rounded-3xl"></div>
              <div className="absolute inset-0 bg-gradient-to-tl from-black/5 to-transparent rounded-3xl"></div>
              
              {/* Content on the layer */}
              <div className="relative z-20 text-center pt-8">
                {/* Current chain logo */}
                {chains[currentChainIndex] && (
                  <div className="mb-4">
                    <img
                      src={CHAIN_META.find(m => m.name === chains[currentChainIndex])?.logo || "/placeholder.svg"}
                      alt={`${chains[currentChainIndex]} logo`}
                      className="h-16 w-16 mx-auto rounded-lg shadow-lg"
                      crossOrigin="anonymous"
                    />
                  </div>
                )}
                
                {/* Creating Account text */}
                <h2 className="text-xl font-bold text-[#6b46ff] mb-2">
                  {Object.keys(createdWallets).length === chains.length ? 
                    "Account Created Successfully! 🎉" : 
                    "Creating Onchain Account ..."
                  }
                </h2>
                <p className="text-sm text-gray-600">
                  {Object.keys(createdWallets).length === chains.length ? 
                    "All wallets have been created and are ready to use" :
                    `Setting up ${chains[currentChainIndex]} for USDC settlement`
                  }
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {Object.keys(createdWallets).length === chains.length ? 
                    (databaseSuccess ? "Setup complete!" : "Updating account status...") :
                    "This can take a few minutes, please be patient"
                  }
                </p>
              </div>
            </div>
            

          </div>
          
          {/* Chain creation status messages below the 3D layer */}
          <div className="mt-6 text-center space-y-2">
            {chains.map((chain, index) => (
              <div key={chain} className={`transition-opacity duration-500 ${index <= currentChainIndex ? 'opacity-100' : 'opacity-30'}`}>
                {index <= currentChainIndex ? (
                  <p className="text-xs text-gray-500">
                    {createdWallets[chain] ? (
                      <>
                        ✅ {chain} address created: {createdWallets[chain]}
                      </>
                    ) : (
                      <>
                        ⏳ Creating {chain} address...
                      </>
                    )}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">
                    Waiting to create {chain} address...
                  </p>
                )}
              </div>
            ))}
            
            {/* Completion message when all wallets are created */}
            {Object.keys(createdWallets).length === chains.length && chains.length > 0 && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700 font-medium">
                  🎉 All wallets created successfully!
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {databaseSuccess ? 
                    "Account setup complete!" :
                    "Updating account status..."
                  }
                </p>
              </div>
            )}
            
            {/* Settlement info when all chains are done */}
            {currentChainIndex >= chains.length - 1 && chains.length > 0 && (
              <>
                <p className="text-xs text-gray-500">
                  Settlement chain: {settlementChain}
                </p>
                <p className="text-xs text-gray-500">
                  Settlement address: {settlementAddress}
                </p>

                <p className="text-xs text-gray-500">
                  Powered by Quirk Payments
                </p>
              </>
            )}
            


          </div>
      </div>
      )}
    </main>
  )
}
