// Script to push user email to database after successful Google login
import axios from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_QUIRK_API_URL || 'http://localhost:3001'

export async function pushUserEmailToDB(email: string): Promise<boolean> {
  try {
    console.log(`📧 Posting mail: ${email}`)
    
    const response = await axios.post(`${BASE_URL}/api/quirk`, {
      mail: email
    })

    console.log('✅ Success!')
    console.log('📋 Response:', response.data)
    
    return true
  } catch (error: any) {
    console.error('❌ Failed to post mail:', error.response?.data || error.message)
    return false
  }
}
