'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PublicClientApplication } from '@azure/msal-browser'
import { msalConfig, loginRequest } from '../../../lib/msalConfig'
import axios from 'axios'

export default function AuthRedirectPage() {
  const [status, setStatus] = useState('Processing authentication...')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    handleRedirect()
  }, [])

  const handleRedirect = async () => {
    try {
      const msalInstance = new PublicClientApplication(msalConfig)
      await msalInstance.initialize()

      // Handle the redirect response
      const response = await msalInstance.handleRedirectPromise()

      if (response && response.idToken) {
        setStatus('Validating authentication...')
        
        // Send token to our backend for validation
        const authResponse = await axios.post('/api/auth/callback', {
          idToken: response.idToken,
          accessToken: response.accessToken,
        })

        if (authResponse.data.success) {
          const { redirectTo } = authResponse.data
          
          if (redirectTo === '/dashboard') {
            setStatus('Redirecting to dashboard...')
            router.push('/dashboard')
          } else {
            setStatus('Redirecting to login...')
            router.push('/login?message=waiting-approval')
          }
        } else {
          setError(authResponse.data.error || 'Authentication failed')
          setTimeout(() => router.push('/login'), 3000)
        }
      } else {
        setError('No authentication response received')
        setTimeout(() => router.push('/login'), 3000)
      }
    } catch (error: any) {
      console.error('Redirect error:', error)
      setError(error.message || 'Authentication failed')
      setTimeout(() => router.push('/login'), 3000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <div className="mb-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
        
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {status}
        </h2>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <p className="text-sm">{error}</p>
            <p className="text-xs mt-1">Redirecting to login page...</p>
          </div>
        )}
        
        {!error && (
          <p className="text-gray-600 text-sm">
            Please wait while we complete your authentication...
          </p>
        )}
      </div>
    </div>
  )
}



