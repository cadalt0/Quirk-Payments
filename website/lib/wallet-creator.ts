// Function to create real wallets using quirk server
import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_QUIRK_API_URL || 'http://localhost:3001'

// Chain name to domain ID mapping
const CHAIN_DOMAIN_MAP: { [key: string]: number } = {
  'Ethereum': 0,
  'Avalanche': 1,
  'Arbitrum': 3,
  'Base': 6
}

// Chain name to API chain format mapping
const CHAIN_API_MAP: { [key: string]: string } = {
  'Ethereum': 'eth',
  'Avalanche': 'avalanche',
  'Arbitrum': 'arbitrum',
  'Base': 'base'
}

export interface WalletCreationResult {
  success: boolean
  wallets: { [chain: string]: string }
  fullResponse?: any // The complete API response data
  error?: string
}

export async function createWalletsMasterRealtime(
  selectedChains: string[],
  destinationChain: string,
  mintRecipient: string,
  onWalletCreated?: (chain: string, address: string) => void
): Promise<WalletCreationResult> {
  try {
    console.log('🚀 Starting Master Wallet Creation (Real-time)...')
    
    // Convert chain names to API format
    const apiChains = selectedChains.map(chain => CHAIN_API_MAP[chain]).filter(Boolean)
    
    // Get destination domain from chain name
    const destinationDomain = CHAIN_DOMAIN_MAP[destinationChain]
    
    if (destinationDomain === undefined) {
      throw new Error(`Invalid destination chain: ${destinationChain}`)
    }
    
    // Format mintRecipient as 0x + 24 zeros + 40 hex characters = 66 total characters
    // Remove 0x prefix from original address, then add 0x + 24 zeros + the 40 hex chars
    const addressWithoutPrefix = mintRecipient.replace('0x', '')
    const mintRecipientFormatted = `0x${'0'.repeat(24)}${addressWithoutPrefix}`
    
    console.log(`📋 Creating wallets for chains: ${apiChains.join(', ')}`)
    console.log(`🌐 Domain: ${destinationDomain}`)
    console.log(`👤 Original Recipient: ${mintRecipient}`)
    console.log(`👤 Formatted Recipient: ${mintRecipientFormatted}`)
    console.log(`📏 Length: ${mintRecipientFormatted.length} characters`)
    console.log('─'.repeat(60))
    console.log('📡 Calling API...\n')

    const postData = {
      chains: apiChains,
      destinationDomain: destinationDomain,
      mintRecipient: mintRecipientFormatted
    }

    console.log('📤 Request data:', postData)
    console.log('🌐 API URL:', `${API_BASE_URL}/api/create-wallet-master`)

    // Use the EXACT same method as your working example
    return new Promise((resolve, reject) => {
      const postDataString = JSON.stringify(postData)
      
      // For browser environment, we'll use fetch with streaming
      fetch(`${API_BASE_URL}/api/create-wallet-master`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': postDataString.length.toString()
        },
        body: postDataString
      }).then(response => {
        if (!response.body) {
          reject(new Error('No response body'))
          return
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        const wallets: { [key: string]: string } = {}
        const fullResponse: { [key: string]: any } = {
          success: true,
          wallets: {},
          timestamp: new Date().toISOString(),
          rawStream: ''
        }
        
        // Helper function to map API chain names back to original chain names
        const getOriginalChainName = (apiChain: string): string | undefined => {
          return selectedChains.find(chain => CHAIN_API_MAP[chain] === apiChain)
        }
        


        function processChunk() {
          reader.read().then(({ done, value }) => {
            if (done) {
              // Process any remaining data in buffer
              if (buffer) {
                const lines = buffer.split('\n')
                for (const line of lines) {
                  if (line.includes(':')) {
                    const [chain, address] = line.split(': ')
                    if (address && address.length > 10) {
                      const cleanAddress = address.trim()
                      const chainLower = chain.toLowerCase()
                      const originalChainName = getOriginalChainName(chainLower)
                      
                      if (originalChainName) {
                        // Store in wallets with original chain names for UI consistency
                        wallets[originalChainName] = cleanAddress
                        fullResponse.wallets[originalChainName] = cleanAddress
                        fullResponse.rawStream += line + '\n'
                        
                        console.log(`${chain.toUpperCase()}: ${cleanAddress}`)
                        
                        // Call callback for real-time UI updates
                        if (onWalletCreated) {
                          onWalletCreated(originalChainName, cleanAddress)
                        }
                      }
                    }
                  }
                }
              }

              console.log('\n─'.repeat(60))
              console.log('🎉 All Wallets Created Successfully!')
              console.log(`📊 Total wallets created: ${Object.keys(wallets).length}`)
              console.log(`📊 Expected wallets: ${selectedChains.length}`)
              console.log(`📊 Missing wallets: ${selectedChains.filter(chain => !wallets[chain]).join(', ')}`)
              
              if (Object.keys(wallets).length > 0) {
                console.log('\n📋 Final Wallet List:')
                Object.entries(wallets).forEach(([chain, address]) => {
                  console.log(`   ${chain}: ${address}`)
                })
              }
              
              // Check if we got all expected wallets
              if (Object.keys(wallets).length < selectedChains.length) {
                console.warn(`⚠️ Warning: Only ${Object.keys(wallets).length} of ${selectedChains.length} wallets were created`)
              }

              resolve({
                success: true,
                wallets: wallets,
                fullResponse: fullResponse,
                error: undefined
              })
              return
            }

            // Process the chunk
            const chunk = decoder.decode(value, { stream: true })
            buffer += chunk
            
            // Process complete lines
            const lines = buffer.split('\n')
            buffer = lines.pop() || '' // Keep incomplete line in buffer
            
            for (const line of lines) {
              if (line.includes(':')) {
                const [chain, address] = line.split(': ')
                if (address && address.length > 10) {
                  const cleanAddress = address.trim()
                  const chainLower = chain.toLowerCase()
                  const originalChainName = getOriginalChainName(chainLower)
                  
                  if (originalChainName) {
                    // Store in wallets with original chain names for UI consistency
                    wallets[originalChainName] = cleanAddress
                    fullResponse.wallets[originalChainName] = cleanAddress
                    fullResponse.rawStream += line + '\n'
                    
                    console.log(`${chain.toUpperCase()}: ${cleanAddress}`)
                    
                    // Call callback for real-time UI updates
                    if (onWalletCreated) {
                      onWalletCreated(originalChainName, cleanAddress)
                    }
                  }
                }
              }
            }

            // Continue reading
            processChunk()
          }).catch(error => {
            reject(error)
          })
        }

        // Start reading the stream
        processChunk()
      }).catch(error => {
        reject(error)
      })
    })

  } catch (error: any) {
    console.error('❌ Error creating wallets:', error.message)
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n🔧 Troubleshooting:')
      console.error('   1. Ensure quirk-server is running: npm start')
      console.error('   2. Check if port 3001 is available')
      console.error('   3. Verify the server is not blocked by firewall')
    }
    
    return {
      success: false,
      wallets: {},
      error: error.message
    }
  }
}
