import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { mail } = await request.json()
    
    if (!mail) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(mail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // TODO: Add your database logic here
    // Example: await db.users.create({ email: mail })
    console.log('Received email for database storage:', mail)

    // For now, just return success
    // In production, you would save this to your actual database
    return NextResponse.json(
      { 
        success: true, 
        message: 'Email received successfully',
        email: mail 
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error processing request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
