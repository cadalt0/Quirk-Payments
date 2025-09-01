// Function to push wallet addresses to smartwallets table
import axios from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_QUIRK_API_URL || 'http://localhost:3001'

export interface SmartWalletData {
  email: string
  wallets: { [chain: string]: string }
  settlementChain: string
  settlementAddress: string
  fullResponse?: any // The complete API response from create-wallet-master
}

export async function pushToSmartWallets(data: SmartWalletData): Promise<boolean> {
  try {
    console.log('📤 Pushing wallet data to quirk API...')
    console.log('📧 Email:', data.email)
    console.log('🔗 Wallets:', data.wallets)
    console.log('⚡ Settlement Chain:', data.settlementChain)
    console.log('📍 Settlement Address:', data.settlementAddress)
    
    // Push smartwallets data in the exact format expected by the API
    console.log('📡 Pushing smartwallets to database...')
    console.log('📧 Email:', data.email)
    console.log('🔗 Wallets:', data.wallets)
    
    // Convert wallet addresses to the format expected by the API
    // Map chain names to lowercase API format (eth, arbitrum, base, avalanche)
    const smartwallets: { [key: string]: string } = {}
    
    const chainMapping: { [key: string]: string } = {
      'Ethereum': 'eth',
      'Arbitrum': 'arbitrum', 
      'Base': 'base',
      'Avalanche': 'avalanche'
    }
    
    for (const [chain, address] of Object.entries(data.wallets)) {
      const apiChain = chainMapping[chain]
      if (apiChain) {
        smartwallets[apiChain] = address
      }
    }
    
    console.log('🔗 Formatted smartwallets:', smartwallets)
    
    // Use PATCH to /api/quirk/{email} with smartwallets field (exact format from your example)
    const response = await axios.patch(`${BASE_URL}/api/quirk/${data.email}`, {
      smartwallets: smartwallets
    })

    console.log('✅ Successfully pushed smartwallets to quirk API!')
    console.log('📋 Response:', response.data)
    
    return true
  } catch (error: any) {
    console.error('❌ Failed to push smartwallets to quirk API:', error.response?.data || error.message)
    return false
  }
}
