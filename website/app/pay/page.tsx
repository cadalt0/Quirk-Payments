"use client"

// 🧪 TESTNET CONFIGURATION
// This payment system uses testnet networks for all transactions:
// - Ethereum: Sepolia (0xaa36a7)
// - Base: Base Sepolia (0x14a33) 
// - Arbitrum: Arbitrum Sepolia (0x66eed)
// - Avalanche: Fuji (0xa869)

import { useMemo, useState, useEffect } from "react"
import { AnimatedButton } from "@/components/animated-button"
import { ChainBadges } from "@/components/chain-badges"
import { ConfettiBurst } from "@/components/confetti"
import { GlobalFX } from "@/components/global-fx"
import axios from "axios"

// MetaMask types
declare global {
  interface Window {
    ethereum?: any
  }
}

type Stage = "display" | "connected" | "payment_confirmation" | "paying" | "confirming" | "success" | "fail"

// Payment data structure
type PaymentData = {
  payid: string
  amount: string
  mail: string
  status: string
  hash: string
  note: string
  created_at: string
  updated_at: string
}

// Smartwallets structure
type SmartWallets = {
  eth?: string
  base?: string
  arbitrum?: string
  avalanche?: string
}

function useParams() {
  const sp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "")
  return {
    payid: sp.get("payid") || "", // Only get payment ID from URL
  }
}

export default function PayPage() {
  const { payid } = useParams() // Only get payment ID from URL
  const [stage, setStage] = useState<Stage>("display")
  const [chain, setChain] = useState<string>("Base") // Default chain
  const [txHash, setTxHash] = useState<string | null>(null)
  
  // Debug amount values on component mount
  useEffect(() => {
    console.log(`🔍 COMPONENT MOUNT DEBUG:`)
    console.log(`  - payid: "${payid}"`)
    console.log(`  - All payment data will come from database`)
  }, [payid])
  
  // New state for payment data and smartwallets
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [smartWallets, setSmartWallets] = useState<SmartWallets | null>(null)
  const [selectedWallet, setSelectedWallet] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  
  // MetaMask connection state
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string>("")
  const [walletError, setWalletError] = useState<string | null>(null)

  const best = useMemo(() => "Base", [])

  // MetaMask connection functions
  const connectToMetaMask = async () => {
    if (!window.ethereum) {
      setWalletError('MetaMask is not installed. Please install MetaMask to continue.')
      return
    }

    try {
      setWalletError(null)
      setIsLoading(true)
      
      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      })
      
      if (accounts && accounts.length > 0) {
        const address = accounts[0]
        setWalletAddress(address)
        setIsWalletConnected(true)
        // Don't automatically go to payment stage - user must select chain first
        console.log('✅ MetaMask connected:', address)
      } else {
        throw new Error('No accounts found')
      }
    } catch (err: any) {
      console.error('❌ MetaMask connection failed:', err)
      setWalletError(err.message || 'Failed to connect to MetaMask')
    } finally {
      setIsLoading(false)
    }
  }

  const disconnectWallet = () => {
    setIsWalletConnected(false)
    setWalletAddress("")
    setWalletError(null)
    setStage("display")
  }

  const proceedToPayment = async () => {
    if (!selectedWallet) {
      setWalletError('Please select a wallet address to receive payment')
      return
    }

    // Just proceed to payment confirmation - no network switching
    setStage("payment_confirmation")
  }

  // Helper function to get chain parameters for adding new networks (testnet)
  const getChainParams = (chainName: string) => {
    const chainParams: { [key: string]: any } = {
      'eth': {
        chainId: '0xaa36a7',
        chainName: 'Sepolia Testnet',
        nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://sepolia.infura.io/v3/your-project-id'],
        blockExplorerUrls: ['https://sepolia.etherscan.io']
      },
      'base': {
        chainId: '0x14a33', // 84532 decimal
        chainName: 'Base Sepolia Testnet',
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://sepolia.base.org'],
        blockExplorerUrls: ['https://sepolia.basescan.org']
      },
      'arbitrum': {
        chainId: '0x66eed',
        chainName: 'Arbitrum Sepolia Testnet',
        nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
        blockExplorerUrls: ['https://sepolia.arbiscan.io']
      },
      'avalanche': {
        chainId: '0xa869',
        chainName: 'Avalanche Fuji Testnet',
        nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
        rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
        blockExplorerUrls: ['https://testnet.snowtrace.io']
      }
    }
    return chainParams[chainName]
  }

  // Fetch payment details and smartwallets when payid is present
  useEffect(() => {
    if (payid) {
      fetchPaymentAndSmartWallets()
    }
  }, [payid])

  // Check for existing MetaMask connection on page load
  useEffect(() => {
    const checkExistingConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' })
          if (accounts && accounts.length > 0) {
            setWalletAddress(accounts[0])
            setIsWalletConnected(true)
            // Don't automatically go to payment stage - user must select chain first
            console.log('✅ MetaMask already connected:', accounts[0])
          }
        } catch (err) {
          console.log('No existing MetaMask connection')
        }
      }
    }

    checkExistingConnection()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isDropdownOpen && !(event.target as Element).closest('.relative')) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isDropdownOpen])

  const fetchPaymentAndSmartWallets = async (retryAttempt = 0) => {
    if (!payid) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      // Fetch payment details by payid using the API endpoint
      const BASE_URL = process.env.NEXT_PUBLIC_QUIRK_API_URL || 'http://localhost:3001'
      
      console.log(`🔍 Fetching payment details for payid: ${payid} (attempt ${retryAttempt + 1}/3)`)
      const response = await axios.get(`${BASE_URL}/api/quirk-pay/${payid}`)
      
              if (response.data && response.data.payment) {
          const payment = response.data.payment
          console.log('✅ Payment details fetched:', payment)
          console.log(`🔍 RAW PAYMENT FROM API:`)
          console.log(`  - payment.amount: "${payment.amount}"`)
          console.log(`  - payment.amount type: ${typeof payment.amount}`)
          console.log(`  - payment.amount exact: ${JSON.stringify(payment.amount)}`)
          
          const paymentData: PaymentData = {
            payid: payment.payid,
            amount: payment.amount,
            mail: payment.mail,
            status: payment.status,
            hash: payment.hash || "",
            note: payment.note || "",
            created_at: payment.created_at,
            updated_at: payment.updated_at
          }
          
          setPaymentData(paymentData)
          setRetryCount(0) // Reset retry count on success
          
          // Debug payment data
          console.log(`🔍 PAYMENT DATA SET:`)
          console.log(`  - paymentData.amount: "${paymentData.amount}"`)
          console.log(`  - paymentData.amount type: ${typeof paymentData.amount}`)
          console.log(`  - paymentData.amount as number: ${Number(paymentData.amount)}`)
          
          // Now fetch smartwallets for the user
          if (paymentData.mail) {
            await fetchSmartWallets(paymentData.mail)
          }
          
          // Success - stop loading
          setIsLoading(false)
        } else {
          throw new Error('Invalid payment data received')
        }
      
    } catch (err: any) {
      console.error(`❌ Error fetching payment data (attempt ${retryAttempt + 1}):`, err)
      
      // Retry logic - max 2 retries with 2 second gap
      if (retryAttempt < 2) {
        console.log(`🔄 Retrying in 2 seconds... (${retryAttempt + 1}/3)`)
        setRetryCount(retryAttempt + 1)
        setError(`Connection failed, retrying... (${retryAttempt + 1}/3)`)
        
        setTimeout(() => {
          fetchPaymentAndSmartWallets(retryAttempt + 1)
        }, 2000)
        return
      }
      
      // Max retries reached
      if (err.response?.status === 404) {
        setError('Payment not found')
      } else {
        setError('Failed to fetch payment details after 3 attempts')
      }
      setRetryCount(0)
      setIsLoading(false) // Stop loading on final failure
    }
  }

  const fetchSmartWallets = async (email: string, retryAttempt = 0) => {
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_QUIRK_API_URL || 'http://localhost:3001'
      
      console.log(`🔍 Fetching smartwallets for: ${email} (attempt ${retryAttempt + 1}/3)`)
      const response = await axios.get(`${BASE_URL}/api/quirk/${encodeURIComponent(email)}`)
      
      if (response.data && response.data.quirk && response.data.quirk.smartwallets) {
        setSmartWallets(response.data.quirk.smartwallets)
        console.log('✅ Smartwallets fetched:', response.data.quirk.smartwallets)
      } else {
        console.log('⚠️ No smartwallets found for user')
        setSmartWallets(null)
      }
    } catch (err: any) {
      console.error(`❌ Error fetching smartwallets (attempt ${retryAttempt + 1}):`, err)
      
      // Retry logic - max 2 retries with 2 second gap
      if (retryAttempt < 2) {
        console.log(`🔄 Retrying smartwallets fetch in 2 seconds... (${retryAttempt + 1}/3)`)
        
        setTimeout(() => {
          fetchSmartWallets(email, retryAttempt + 1)
        }, 2000)
        return
      }
      
      // Max retries reached
      setError('Failed to fetch wallet addresses after 3 attempts')
      // Don't set loading to false here as it's controlled by the parent function
    }
  }

  const connect = () => connectToMetaMask()
  const pay = async () => {
    if (!window.ethereum || !walletAddress) {
      setError('Wallet not connected')
      return
    }

    try {
      setStage("paying")
      setError(null)
      
      // Get the selected chain details
      const selectedChain = Object.entries(smartWallets || {}).find(([_, addr]) => addr === selectedWallet)?.[0]
      if (!selectedChain) {
        throw new Error('No chain selected for payment')
      }
      
      console.log('🔍 DEBUG CHAIN SELECTION:')
      console.log('  - Selected Wallet:', selectedWallet)
      console.log('  - Selected Chain Key:', selectedChain)
      console.log('  - Available Chain Keys:', Object.keys(smartWallets || {}))
      console.log('  - SmartWallets Data:', smartWallets)

      // Get the amount in USDC from database only
      const amountInUSDC = Number(paymentData?.amount)
      if (!amountInUSDC || isNaN(amountInUSDC)) {
        throw new Error('Invalid amount from database')
      }
      
      // Debug the amount values
      console.log(`🔍 DEBUG AMOUNT VALUES:`)
      console.log(`  - paymentData?.amount: "${paymentData?.amount}"`)
      console.log(`  - amountInUSDC (converted): ${amountInUSDC}`)
      console.log(`  - amountInUSDC type: ${typeof amountInUSDC}`)
      console.log(`  - Raw paymentData object:`, paymentData)
      console.log(`  - paymentData.amount type: ${typeof paymentData?.amount}`)
      console.log(`  - paymentData.amount length: ${paymentData?.amount?.toString().length}`)
      console.log(`  - paymentData.amount exact value: ${JSON.stringify(paymentData?.amount)}`)
      
      // Handle decimal amounts properly (e.g., "1.00000000" should become 1 USDC)
      let amountInSmallestUnit: string
      
      console.log(`🔍 AMOUNT ANALYSIS:`)
      console.log(`  - Raw database value: "${paymentData?.amount}"`)
      console.log(`  - Converted to number: ${amountInUSDC}`)
      console.log(`  - Is decimal? ${amountInUSDC % 1 !== 0}`)
      console.log(`  - Decimal places: ${amountInUSDC.toString().split('.')[1]?.length || 0}`)
      
      // If the amount is a decimal (like 1.00000000) or a small number (like 1), it's in USDC format
      // We need to convert it to smallest units by multiplying by 1,000,000
      if (amountInUSDC % 1 !== 0 || amountInUSDC < 1000000) {
        // This is a decimal amount (e.g., 1.00000000) or small number (e.g., 1)
        // Convert to smallest units: 1.00000000 × 1,000,000 = 1,000,000
        amountInSmallestUnit = Math.floor(amountInUSDC * 1000000).toString()
        console.log(`💰 Decimal/small amount detected, converting: ${amountInUSDC} × 1,000,000 = ${amountInSmallestUnit}`)
        console.log(`💰 This represents: ${Number(amountInSmallestUnit) / 1000000} USDC`)
      } else {
        // This is already in smallest units (e.g., 1000000)
        amountInSmallestUnit = amountInUSDC.toString()
        console.log(`💰 Amount already in smallest units: ${amountInSmallestUnit}`)
        console.log(`💰 This represents: ${Number(amountInSmallestUnit) / 1000000} USDC`)
      }
      
      console.log(`💰 FINAL TRANSACTION AMOUNT:`)
      console.log(`  - Database amount: ${amountInUSDC}`)
      console.log(`  - Final units to send: ${amountInSmallestUnit}`)
      console.log(`  - USDC equivalent: ${Number(amountInSmallestUnit) / 1000000} USDC`)
      console.log(`  - Transaction data will contain: ${amountInSmallestUnit} units`)
      
      // Encode the transaction data properly
      const functionSignature = '0xa9059cbb' // transfer(address,uint256)
      
      // Validate recipient address
      if (!selectedWallet || selectedWallet.length !== 42 || !selectedWallet.startsWith('0x')) {
        throw new Error('Invalid recipient address format')
      }
      
      const recipientAddress = selectedWallet.slice(2).toLowerCase().padStart(64, '0') // 32 bytes
      
      // Convert amount to proper hex format (32 bytes = 64 hex characters)
      const amountBigInt = BigInt(amountInSmallestUnit)
      const amountHex = amountBigInt.toString(16).padStart(64, '0') // 32 bytes
      
      console.log(`🔢 Amount Encoding Debug:`)
      console.log(`  - amountInSmallestUnit: ${amountInSmallestUnit}`)
      console.log(`  - amountBigInt: ${amountBigInt}`)
      console.log(`  - amountHex: ${amountHex}`)
      console.log(`  - amountHex length: ${amountHex.length}`)
      console.log(`  - Decoded amount: ${parseInt(amountHex, 16)}`)
      console.log(`  - Should equal: ${amountInSmallestUnit}`)
      
      // Get USDC contract address for the selected chain
      const usdcContractAddress = getUSDCAddress(selectedChain)
      if (!usdcContractAddress) {
        throw new Error(`USDC contract not found for ${selectedChain} testnet`)
      }
      
      // Prepare transaction parameters
      const transactionParameters = {
        to: usdcContractAddress, // USDC contract address (not wallet address)
        from: walletAddress, // Sender address (user's MetaMask)
        value: '0x0', // USDC transfers use value 0, amount is in data field
        data: functionSignature + recipientAddress + amountHex,
        chainId: getChainId(selectedChain)
      }

      console.log('🚀 Initiating payment transaction:', transactionParameters)
      console.log('📊 Transaction data breakdown:')
      console.log('  - Function signature:', functionSignature)
      console.log('  - Recipient address:', recipientAddress)
      console.log('  - Amount in hex:', amountHex)
      console.log('  - Amount in decimal:', parseInt(amountHex, 16))
      console.log('  - Amount in USDC:', parseInt(amountHex, 16) / 1000000)
      console.log('  - Total data length:', (functionSignature + recipientAddress + amountHex).length)
      console.log('🔗 Chain Configuration:')
      console.log('  - Selected Chain:', selectedChain)
      console.log('  - Chain ID:', transactionParameters.chainId)
      console.log('  - Network Name:', getChainParams(selectedChain)?.chainName || 'Unknown')
      console.log('🪙 USDC Contract Address:', usdcContractAddress)
      console.log('👤 Recipient Wallet:', selectedWallet)
      
      // Validate transaction data length (should be 138 characters: 10 + 64 + 64)
      const expectedDataLength = 138
      const actualDataLength = transactionParameters.data.length
      if (actualDataLength !== expectedDataLength) {
        throw new Error(`Invalid transaction data length: expected ${expectedDataLength}, got ${actualDataLength}`)
      }
      
      // Use the chain ID from the selected chain
      const expectedChainId = getChainId(selectedChain)
      transactionParameters.chainId = expectedChainId
      
      console.log(`✅ Using chain ID: ${expectedChainId} for ${selectedChain}`)
      
      // Send transaction through MetaMask
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [transactionParameters]
      })
      
      console.log('✅ Transaction sent to MetaMask:', txHash)
      setTxHash(txHash)
      
      // Wait for transaction confirmation on blockchain
      console.log('⏳ Waiting for blockchain confirmation...')
      setStage("confirming")
      
      // Wait for transaction to be mined
      const receipt = await waitForTransaction(txHash)
      
      if (receipt.status === '0x1') {
        console.log('✅ Transaction confirmed on blockchain:', receipt)
        setStage("success")
      } else {
        console.log('❌ Transaction failed on blockchain:', receipt)
        setError('Transaction failed on blockchain')
        setStage("fail")
      }
      
    } catch (err: any) {
      console.error('❌ Payment failed:', err)
      setError(err.message || 'Payment failed')
      setStage("fail")
    }
  }

  // Helper function to get chain ID (testnet)
  const getChainId = (chainName: string): string => {
    const chainIds: { [key: string]: string } = {
      'eth': '0xaa36a7',    // Sepolia testnet
      'base': '0x14a33',    // Base Sepolia testnet
      'arbitrum': '0x66eed', // Arbitrum Sepolia testnet
      'avalanche': '0xa869'  // Fuji testnet
    }
    
    console.log(`🔗 getChainId called with: "${chainName}"`)
    console.log(`🔗 Available keys:`, Object.keys(chainIds))
    console.log(`🔗 Returning: ${chainIds[chainName] || '0xaa36a7'}`)
    
    return chainIds[chainName] || '0xaa36a7'
  }

  // Helper function to wait for transaction confirmation
  const waitForTransaction = async (txHash: string) => {
    console.log(`⏳ Waiting for transaction ${txHash} to be mined...`)
    
    // Get current network
    const chainId = await window.ethereum.request({ method: 'eth_chainId' })
    let blockTime = 2000 // Default 2 seconds
    
    // Adjust block time based on network
    if (chainId === '0xaa36a7') blockTime = 12000      // Sepolia: ~12 seconds
    if (chainId === '0x14a33') blockTime = 2000        // Base Sepolia: ~2 seconds
    if (chainId === '0x66eed') blockTime = 1000        // Arbitrum Sepolia: ~1 second
    if (chainId === '0xa869') blockTime = 3000         // Fuji: ~3 seconds
    
    let attempts = 0
    const maxAttempts = 60 // Wait up to 2 minutes
    
    while (attempts < maxAttempts) {
      try {
        const receipt = await window.ethereum.request({
          method: 'eth_getTransactionReceipt',
          params: [txHash]
        })
        
        if (receipt && receipt.blockNumber) {
          console.log(`✅ Transaction mined in block ${receipt.blockNumber}`)
          return receipt
        }
        
        console.log(`⏳ Transaction not yet mined, waiting ${blockTime}ms... (attempt ${attempts + 1}/${maxAttempts})`)
        await new Promise(resolve => setTimeout(resolve, blockTime))
        attempts++
        
      } catch (error) {
        console.log(`⚠️ Error checking transaction status:`, error)
        await new Promise(resolve => setTimeout(resolve, blockTime))
        attempts++
      }
    }
    
    throw new Error('Transaction confirmation timeout after 2 minutes')
  }

  // Helper function to get USDC contract address for each testnet
  const getUSDCAddress = (chainName: string): string => {
    const usdcAddresses: { [key: string]: string } = {
      'eth': '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',      // Ethereum Sepolia USDC
      'base': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',     // Base Sepolia USDC
      'arbitrum': '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', // Arbitrum Sepolia USDC
      'avalanche': '0x5425890298aed601595a70AB815c96711a31Bc65' // Avalanche Fuji USDC
    }
    
    console.log(`🪙 getUSDCAddress called with: "${chainName}"`)
    console.log(`🪙 USDC Address: ${usdcAddresses[chainName] || 'Not found'}`)
    
    return usdcAddresses[chainName] || ''
  }

  const explorerLink = (() => {
    if (!txHash) return "#"
    
    const selectedChain = Object.entries(smartWallets || {}).find(([_, addr]) => addr === selectedWallet)?.[0]
    if (!selectedChain) return "#"
    
    const chainExplorers: { [key: string]: string } = {
      'eth': 'https://sepolia.etherscan.io',
      'base': 'https://sepolia.basescan.org',
      'arbitrum': 'https://sepolia.arbiscan.io',
      'avalanche': 'https://testnet.snowtrace.io'
    }
    
    const baseUrl = chainExplorers[selectedChain] || 'https://sepolia.etherscan.io'
    return `${baseUrl}/tx/${txHash}`
  })()

  // Chain logo mapping
  const chainLogos: { [key: string]: string } = {
    'eth': '/eth.png',
    'base': '/base.png',
    'arbitrum': '/ava.png',
    'avalanche': '/aval.png'
  }

  return (
    <main className="mobile-page relative" style={{ overflow: 'hidden' }}>
      <GlobalFX />

      {/* Quirk Payments Header */}
      <section className="text-center mt-4 mb-6">
        <h1 className="text-2xl font-extrabold tracking-wide text-[#6b46ff]">Quirk Payments</h1>
        <p className="text-sm text-gray-500 mt-1">🧪 Testnet Mode - Sepolia/Fuji Networks</p>
      </section>
      


      {stage === "success" && <ConfettiBurst />}
      
      {/* Payment ID Display */}
      {payid && (
        <section className="text-center mt-2 mb-4">
          <div className="inline-block bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <p className="text-sm text-blue-700">
              <span className="font-medium">Payment ID:</span> {payid}
            </p>
          </div>
        </section>
      )}



      {/* Loading State */}
      {isLoading && (
        <section className="text-center mt-4">
          <div className="inline-flex items-center gap-2 text-gray-600">
            <Spinner />
            <span>
              {retryCount > 0 
                ? `Retrying payment details... (${retryCount}/3)` 
                : 'Loading payment details...'
              }
            </span>
          </div>
        </section>
      )}

      {/* Error State */}
      {error && (
        <section className="text-center mt-4">
          <div className="inline-block bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            <p className="text-sm text-red-700">{error}</p>
            {error.includes('retrying') && (
              <p className="text-xs text-red-600 mt-1">Retry {retryCount}/3</p>
            )}
            {!error.includes('retrying') && retryCount > 0 && (
              <button
                onClick={() => {
                  setError(null)
                  setRetryCount(0)
                  fetchPaymentAndSmartWallets()
                }}
                className="mt-2 px-3 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        </section>
      )}

      {/* Wallet Error State */}
      {walletError && (
        <section className="text-center mt-4">
          <div className="inline-block bg-orange-50 border border-orange-200 rounded-lg px-4 py-2">
            <p className="text-sm text-orange-700">{walletError}</p>
            <button
              onClick={() => setWalletError(null)}
              className="mt-2 px-3 py-1 bg-orange-100 text-orange-700 text-xs rounded hover:bg-orange-200 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </section>
      )}

      <section className="space-y-1 text-center mt-2">
        {paymentData?.note && (
          <p className="text-xs mt-1">Note: "{paymentData.note}"</p>
        )}
      </section>



      {stage === "display" && (
        <div className="flex-1 flex flex-col items-center justify-center space-y-6 px-6 -mt-20">
          {/* User Avatar */}
          <div className="w-20 h-20 bg-gradient-to-br from-[#6b46ff] to-[#7d3cff] rounded-full flex items-center justify-center">
            <div className="text-white text-3xl">👤</div>
          </div>
          
          {/* Payment Info */}
          <div className="text-center space-y-2">
            <p className="text-gray-700 text-lg">You are paying</p>
            <h2 className="text-2xl font-bold text-[#6b46ff]">
              {paymentData?.mail || 'Recipient'}
            </h2>
            {selectedWallet && (
              <p className="text-gray-500 text-sm font-mono break-all">
                To: {selectedWallet}
              </p>
            )}
          </div>
          
          {/* Amount Input */}
          <div className="w-full max-w-sm space-y-2">
            <label className="text-gray-700 text-sm font-medium">Amount</label>
            <div className="flex items-center bg-white rounded-lg px-4 py-3 border border-gray-200">
              <input 
                type="number" 
                value={paymentData ? Number(paymentData.amount) : 0} 
                readOnly
                className="flex-1 bg-transparent text-gray-800 text-lg font-semibold outline-none"
              />
              <span className="text-gray-500 font-medium">USDC</span>
            </div>
          </div>
          
          {/* SmartWallets Dropdown */}
          {smartWallets && Object.keys(smartWallets).length > 0 ? (
            <div className="w-full max-w-sm space-y-2">
              <div className="flex items-center justify-center gap-2">
                <span className="text-gray-700 text-sm font-medium">Choose a chain to pay</span>
                <span className="text-yellow-500">⚡</span>
              </div>
              {/* Custom Dropdown Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-left text-gray-800 focus:outline-none focus:border-[#6b46ff] hover:border-[#6b46ff] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {selectedWallet ? (
                        <>
                          <img
                            src={chainLogos[Object.entries(smartWallets).find(([_, addr]) => addr === selectedWallet)?.[0] || ''] || "/placeholder.svg"}
                            alt="Selected chain"
                            className="h-6 w-6 rounded-md"
                            crossOrigin="anonymous"
                          />
                          <span className="font-medium">
                            {(() => {
                              const selectedChain = Object.entries(smartWallets).find(([_, addr]) => addr === selectedWallet)?.[0]
                              return selectedChain ? selectedChain.charAt(0).toUpperCase() + selectedChain.slice(1) : ''
                            })()} - 
                            {selectedWallet.slice(0, 8)}...{selectedWallet.slice(-6)}
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-500">Choose a wallet to receive payment</span>
                      )}
                    </div>
                    <svg 
                      className={`w-5 h-5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7" />
                    </svg>
                  </div>
                </button>
                
                                {/* Custom Dropdown Options */}
                {isDropdownOpen && (
                  <div className="fixed inset-0 flex items-center justify-center z-50">
                    {/* Backdrop */}
                    <div 
                      className="absolute inset-0 bg-black/20" 
                      onClick={() => setIsDropdownOpen(false)}
                    />
                    
                    {/* Dropdown List - Centered in middle of screen */}
                    <div className="relative bg-white border border-gray-200 rounded-lg shadow-xl max-h-80 w-full max-w-sm mx-4 overflow-y-auto">
                      <div className="p-2 border-b border-gray-100">
                        <h3 className="text-sm font-medium text-gray-700 text-center">Select Wallet</h3>
                      </div>
                      {Object.entries(smartWallets).map(([chain, address]) => (
                        <button
                          key={chain}
                          type="button"
                          onClick={() => {
                            setSelectedWallet(address)
                            setChain(chain.charAt(0).toUpperCase() + chain.slice(1))
                            setIsDropdownOpen(false)
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-b-0 transition-colors"
                        >
                          <img
                            src={chainLogos[chain] || "/placeholder.svg"}
                            alt={`${chain} logo`}
                            className="h-6 w-6 rounded-md flex-shrink-0"
                            crossOrigin="anonymous"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-800 capitalize">{chain}</div>
                            <div className="text-sm text-gray-500 font-mono truncate">{address}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="w-full max-w-sm space-y-2">
              <div className="flex items-center justify-center gap-2">
                <span className="text-gray-700 text-sm font-medium">Choose a chain to pay</span>
                <span className="text-yellow-500">⚡</span>
              </div>
              <div className="relative" style={{ zIndex: 10 }}>
                <select 
                  value={chain} 
                  onChange={(e) => setChain(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:border-[#6b46ff] appearance-none"
                >
                  <option value="Base" className="bg-white text-gray-800">Base</option>
                  <option value="Arbitrum" className="bg-white text-gray-800">Arbitrum</option>
                  <option value="Avalanche" className="bg-white text-gray-800">Avalanche</option>
                  <option value="Ethereum" className="bg-white text-gray-800">Ethereum</option>
                </select>
                
                {/* Custom dropdown arrow */}
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7" />
                  </svg>
                </div>
              </div>
            </div>
          )}
          
          {/* Wallet Connection and Chain Selection */}
          <div className="w-full max-w-sm space-y-3">
            {!isWalletConnected ? (
              <button 
                onClick={connect}
                className="w-full bg-[#6b46ff] text-white font-semibold py-4 px-6 rounded-lg flex items-center justify-center gap-3 hover:opacity-90 transition-opacity"
              >
                <span className="text-xl">💳</span>
                Connect Wallet to Pay
              </button>
            ) : (
              <div className="space-y-3">
                                 {/* Wallet Connected Status */}
                 <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                   <div className="flex items-center justify-between">
                     <span className="text-sm text-green-700">✅ Wallet Connected</span>
                     <div className="flex items-center gap-2">
                       <span className="text-xs font-mono text-green-600 max-w-24 truncate">
                         {walletAddress}
                       </span>
                       <button
                         onClick={disconnectWallet}
                         className="text-xs text-green-600 hover:text-green-800 underline"
                       >
                         Disconnect
                       </button>
                     </div>
                   </div>
                 </div>
                
                {/* Chain Selection Required */}
                {!selectedWallet ? (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-700 text-center">
                      Please select a chain above to receive payment
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Selected Chain Info */}
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <img
                          src={chainLogos[Object.entries(smartWallets || {}).find(([_, addr]) => addr === selectedWallet)?.[0] || ''] || "/placeholder.svg"}
                          alt="Selected chain"
                          className="h-5 w-5 rounded-md"
                          crossOrigin="anonymous"
                        />
                                                 <span className="text-sm text-blue-700">
                           Payment will be sent to {(() => {
                             const selectedChain = Object.entries(smartWallets || {}).find(([_, addr]) => addr === selectedWallet)?.[0]
                             return selectedChain ? selectedChain.charAt(0).toUpperCase() + selectedChain.slice(1) : ''
                           })()} address
                         </span>
                      </div>
                    </div>
                    
                    {/* Proceed to Payment Button */}
                    <button 
                      onClick={proceedToPayment}
                      className="w-full bg-green-600 text-white font-semibold py-4 px-6 rounded-lg flex items-center justify-center gap-3 hover:bg-green-700 transition-colors"
                    >
                      <span className="text-xl">💸</span>
                      Proceed to Payment
                    </button>
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-gray-500 text-center">Powered by Quirk Payments</p>
          </div>
        </div>
      )}

      {stage === "payment_confirmation" && (
        <section className="mt-6 space-y-4">
          <div className="p-3 rounded-xl bg-white border border-black/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Connected Wallet</span>
              <span className="text-xs font-mono text-gray-600 max-w-32 truncate">
                {walletAddress}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Selected Chain</span>
            <div className="flex items-center gap-2">
                <img
                  src={chainLogos[Object.entries(smartWallets || {}).find(([_, addr]) => addr === selectedWallet)?.[0] || ''] || "/placeholder.svg"}
                  alt="Selected chain"
                  className="h-5 w-5 rounded-md"
                  crossOrigin="anonymous"
                />
                <span className="text-sm font-medium">
                  {(() => {
                    const selectedChain = Object.entries(smartWallets || {}).find(([_, addr]) => addr === selectedWallet)?.[0]
                    return selectedChain ? selectedChain.charAt(0).toUpperCase() + selectedChain.slice(1) : ''
                  })()}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Amount</span>
              <span className="text-base font-semibold">
                {paymentData ? Number(paymentData.amount).toFixed(2) : '0.00'} USDC
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">USDC Contract</span>
              <span className="text-xs font-mono text-gray-600 max-w-32 truncate">
                {(() => {
                  const selectedChain = Object.entries(smartWallets || {}).find(([_, addr]) => addr === selectedWallet)?.[0]
                  return selectedChain ? getUSDCAddress(selectedChain) : ''
                })()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Recipient Wallet</span>
              <span className="text-xs font-mono text-gray-600 max-w-32 truncate">
                {selectedWallet}
              </span>
            </div>
            
            {/* Testnet Notice */}
            <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700 text-center">
                🧪 <strong>Testnet Transaction</strong> - No real funds will be transferred
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            <AnimatedButton onClick={pay}>
              {`Pay ${paymentData ? Number(paymentData.amount).toFixed(2) : '0.00'} USDC`}
            </AnimatedButton>
            <button
              onClick={() => setStage("display")}
              className="w-full bg-gray-100 text-gray-700 font-medium py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Back to Selection
            </button>
          </div>
          
          <p className="text-xs text-center">
            Need USDC?{" "}
            <a className="underline" href="https://www.coinbase.com/buy/usdc" target="_blank" rel="noopener noreferrer">
              Buy or Bridge
            </a>
          </p>
        </section>
      )}

      {stage === "paying" && (
        <section className="mt-6 space-y-3">
          <div className="p-4 rounded-xl bg-white border border-black/10 flex items-center gap-3">
            <Spinner />
            <div>
              <div className="text-sm font-medium">Processing Payment...</div>
              <div className="text-xs text-muted-foreground">
                Please confirm the transaction in MetaMask
              </div>
              {selectedWallet && (
                <div className="text-xs text-blue-600 mt-1">
                  Sending to: {selectedWallet.slice(0, 8)}...{selectedWallet.slice(-6)}
                </div>
              )}
            </div>
          </div>
          
          {/* Testnet Notice */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700 text-center">
              🧪 <strong>Testnet Mode</strong> - Transaction will be processed on {(() => {
                const selectedChain = Object.entries(smartWallets || {}).find(([_, addr]) => addr === selectedWallet)?.[0]
                if (selectedChain === 'avalanche') return 'Fuji Testnet'
                if (selectedChain === 'eth') return 'Sepolia Testnet'
                if (selectedChain === 'base') return 'Base Sepolia Testnet'
                if (selectedChain === 'arbitrum') return 'Arbitrum Sepolia Testnet'
                return 'Testnet'
              })()}
            </p>
          </div>
        </section>
      )}

      {stage === "confirming" && (
        <section className="mt-6 space-y-3">
          <div className="p-4 rounded-xl bg-white border border-black/10 flex items-center gap-3">
            <Spinner />
            <div>
              <div className="text-sm font-medium">Confirming Transaction...</div>
              <div className="text-xs text-muted-foreground">
                Waiting for blockchain confirmation
              </div>
              {txHash && (
                <div className="text-xs text-blue-600 mt-1">
                  Transaction: {txHash.slice(0, 8)}...{txHash.slice(-6)}
                </div>
              )}
            </div>
          </div>
          
          {/* Testnet Notice */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700 text-center">
              🧪 <strong>Testnet Mode</strong> - Transaction will be processed on {(() => {
                const selectedChain = Object.entries(smartWallets || {}).find(([_, addr]) => addr === selectedWallet)?.[0]
                if (selectedChain === 'avalanche') return 'Fuji Testnet'
                if (selectedChain === 'eth') return 'Sepolia Testnet'
                if (selectedChain === 'base') return 'Base Sepolia Testnet'
                if (selectedChain === 'arbitrum') return 'Arbitrum Sepolia Testnet'
                return 'Testnet'
              })()}
            </p>
          </div>
        </section>
      )}

      {stage === "success" && (
        <section className="mt-6 space-y-4 text-center">
          <div className="text-4xl">✅</div>
          <h2 className="text-xl font-extrabold">Payment Sent!</h2>
          
          {/* Testnet Success Notice */}
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-700">
              🧪 <strong>Testnet Transaction Successful!</strong> View details on the testnet explorer
            </p>
          </div>
          
          <a className="underline" href={explorerLink} target="_blank" rel="noopener noreferrer">
            View on Explorer
          </a>
          <div className="pt-2">
            <AnimatedButton variant="secondary" onClick={() => (window.location.href = "/")}>
              Done
            </AnimatedButton>
          </div>
        </section>
      )}

      {stage === "fail" && (
        <section className="mt-6 space-y-3 text-center">
          <div className="text-4xl">❌</div>
          <h2 className="text-xl font-extrabold">Payment Failed</h2>
          <AnimatedButton onClick={() => setStage("connected")}>Retry</AnimatedButton>
        </section>
      )}
    </main>
  )
}

function Spinner() {
  return (
    <div
      className="size-6 rounded-full border-2 border-black/10 border-t-[var(--color-quirk-primary)] animate-spin"
      aria-label="Loading"
    />
  )
}
