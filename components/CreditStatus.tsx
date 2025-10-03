'use client'

import { useState, useEffect } from 'react'

interface Credits {
  total: number
  used: number
  available: number
}

interface CreditStatusProps {
  userId: string
  onCreditsChange?: (credits: Credits) => void
  showDetails?: boolean
  className?: string
}

export default function CreditStatus({ 
  userId, 
  onCreditsChange, 
  showDetails = false,
  className = '' 
}: CreditStatusProps) {
  const [credits, setCredits] = useState<Credits | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCredits = async () => {
    try {
      setIsLoading(true)
      
      // Get session token from localStorage
      const sessionToken = localStorage.getItem('session')
      if (!sessionToken) {
        setError('No session token found')
        return
      }

      const response = await fetch('/api/credits/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionToken: sessionToken
        }),
      })

      const data = await response.json()

      if (data.success) {
        setCredits(data.credits)
        onCreditsChange?.(data.credits)
      } else {
        setError(data.error || 'Failed to fetch credits')
      }
    } catch (error) {
      console.error('Error fetching credits:', error)
      setError('Failed to fetch credits')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (userId) {
      fetchCredits()
    }
  }, [userId])

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="animate-pulse bg-gray-200 h-4 w-16 rounded"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center space-x-2 text-red-600 ${className}`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm">Error loading credits</span>
      </div>
    )
  }

  if (!credits) {
    return null
  }

  const isLowCredits = credits.available <= 2
  const isNoCredits = credits.available === 0

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex items-center space-x-1">
        <svg 
          className={`w-4 h-4 ${isNoCredits ? 'text-red-500' : isLowCredits ? 'text-yellow-500' : 'text-green-500'}`} 
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
        </svg>
        <span className={`text-sm font-medium ${isNoCredits ? 'text-red-600' : isLowCredits ? 'text-yellow-600' : 'text-green-600'}`}>
          {credits.available}
        </span>
        <span className="text-xs text-gray-500">credits</span>
      </div>

      {showDetails && (
        <div className="text-xs text-gray-500">
          ({credits.used} used)
        </div>
      )}

      {isNoCredits && (
        <div className="text-xs text-red-600 font-medium">
          No credits available
        </div>
      )}

      {isLowCredits && !isNoCredits && (
        <div className="text-xs text-yellow-600 font-medium">
          Low credits
        </div>
      )}
    </div>
  )
}
