// Function to update quirk data with chains, settlement chain, and settlement address
import axios from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_QUIRK_API_URL || 'http://localhost:3001'

export async function updateQuirkData(
  email: string, 
  chains: string[], 
  settlementChain: string, 
  settlementAddress: string
): Promise<boolean> {
  try {
    console.log(`📧 Updating quirk data for: ${email}`)
    console.log(`🔗 Chains: ${chains.join(', ')}`)
    console.log(`⚡ Settlement Chain: ${settlementChain}`)
    console.log(`📍 Settlement Address: ${settlementAddress}`)
    
    // Update with chains, yeschain, and yesaddress
    const response = await axios.patch(`${BASE_URL}/api/quirk/${email}`, {
      chains: chains.join(','),
      yeschain: settlementChain,
      yesaddress: settlementAddress
    })

    console.log('✅ Successfully updated quirk data!')
    console.log('📋 Updated data:', response.data.quirk)
    
    return true
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.error('❌ Email not found. Please ensure the user has logged in first.')
    } else {
      console.error('❌ Failed to update quirk data:', error.response?.data || error.message)
    }
    return false
  }
}
