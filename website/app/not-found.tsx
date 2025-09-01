'use client'

import Link from 'next/link'
import { GlobalFX } from '@/components/global-fx'

export default function NotFound() {
  return (
    <main className="mobile-page relative">
      <GlobalFX />
      
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-6">
        {/* 404 Icon */}
        <div className="text-8xl mb-6">🔍</div>
        
        {/* 404 Title */}
        <h1 className="text-4xl font-extrabold text-[#6b46ff] mb-4">
          Page Not Found
        </h1>
        
        {/* 404 Subtitle */}
        <p className="text-xl text-gray-600 mb-8 max-w-md">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>
        
        {/* Error Code */}
        <div className="bg-gray-100 rounded-lg px-4 py-2 mb-8">
          <p className="text-sm font-mono text-gray-600">
            Error 404
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="space-y-4">
          <Link 
            href="/"
            className="inline-block bg-[#6b46ff] text-white font-semibold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity"
          >
            🏠 Go Home
          </Link>
          
          <div className="text-sm text-gray-500">
            <p>Or try one of these pages:</p>
            <div className="flex gap-4 mt-2 justify-center">
              <Link href="/auth" className="text-[#6b46ff] hover:underline">
                Login
              </Link>
              <Link href="/onboarding" className="text-[#6b46ff] hover:underline">
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
