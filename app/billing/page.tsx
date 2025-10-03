'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  name: string
  approved: boolean
}

export default function BillingPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const router = useRouter()

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showProfile && !target.closest('.profile-dropdown')) {
        setShowProfile(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showProfile])

  useEffect(() => {
    const validateSession = async () => {
      const sessionToken = localStorage.getItem('session')

      if (!sessionToken) {
        router.push('/login/')
        return
      }

      try {
        const response = await fetch('/api/auth/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionToken }),
        })

        const data = await response.json()

        if (data.valid && data.user) {
          setUser(data.user)
        } else {
          localStorage.removeItem('session')
          router.push('/login/')
        }
      } catch (error) {
        console.error('Error validating session:', error)
        setError('Session validation failed')
      } finally {
        setIsLoading(false)
      }
    }

    validateSession()
  }, [router])

  const handleLogout = async () => {
    try {
      localStorage.removeItem('session')
      router.push('/login/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const handleGetCredits = (plan: string) => {
    console.log(`Getting credits for plan: ${plan}`)
    // Here you would integrate with payment processing
    alert(`Redirecting to payment for ${plan} plan...`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error || 'Access denied'}</p>
          <button
            onClick={() => router.push('/login/')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Dashboard</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-xl font-semibold text-gray-900">Buy Interview Credits</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative profile-dropdown">
                <button
                  onClick={() => setShowProfile(!showProfile)}
                  className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                >
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium">{user.name}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Profile Dropdown */}
                {showProfile && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900">Profile</h3>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setShowProfile(false)
                          router.push('/profile')
                        }}
                        className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                      >
                        View Profile
                      </button>
                      <button
                        onClick={() => {
                          setShowProfile(false)
                          router.push('/settings')
                        }}
                        className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                      >
                        Settings
                      </button>
                      <hr className="my-2" />
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Special Offer Banner */}
        <div className="bg-yellow-100 border border-yellow-200 rounded-lg p-4 mb-8">
          <div className="text-center">
            <p className="text-yellow-800 font-medium">
              Special offer for India users: Use code <span className="font-bold">INDIA25</span> for 25% off!
            </p>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-green-600 mb-4">PRICING</h2>
          <div className="text-4xl font-bold text-green-700 mb-2">
            No Subscription
          </div>
          <div className="text-4xl font-bold text-green-700 mb-6">
            One-time payment ✨
          </div>
          
          {/* Features Bar */}
          <div className="bg-gray-100 rounded-lg p-4 mb-8 max-w-2xl mx-auto">
            <div className="flex justify-center items-center space-x-8 text-sm text-gray-600">
              <span className="flex items-center">
                <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                30-Day Money Back
              </span>
              <span className="flex items-center">
                <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Credits Never Expire
              </span>
              <span className="flex items-center">
                <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                1 Credit = 1h Interview
              </span>
            </div>
          </div>
        </div>

        {/* Pricing Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Basic Plan */}
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center shadow-sm">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Basic</h3>
            <div className="text-4xl font-bold text-gray-900 mb-2">₹2,650</div>
            <div className="text-lg text-gray-600 mb-6">($29.50)</div>
            <div className="text-lg text-gray-700 mb-8">3 Interview Credits</div>
            <button
              onClick={() => handleGetCredits('Basic')}
              className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Get Credits →
            </button>
          </div>

          {/* Plus Plan - Highlighted */}
          <div className="bg-green-600 rounded-lg border-2 border-green-600 p-8 text-center shadow-lg transform scale-105">
            <h3 className="text-2xl font-bold text-white mb-4">Plus</h3>
            <div className="text-4xl font-bold text-white mb-2">₹5,300</div>
            <div className="text-lg text-green-100 mb-6">($59.00)</div>
            <div className="text-lg text-white mb-8">6 Interview Credits + 2 Free</div>
            <button
              onClick={() => handleGetCredits('Plus')}
              className="w-full bg-white text-green-600 py-3 px-6 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              Get Credits →
            </button>
          </div>

          {/* Advanced Plan */}
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center shadow-sm">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Advanced</h3>
            <div className="text-4xl font-bold text-gray-900 mb-2">₹7,950</div>
            <div className="text-lg text-gray-600 mb-6">($88.50)</div>
            <div className="text-lg text-gray-700 mb-8">9 Interview Credits + 6 Free</div>
            <button
              onClick={() => handleGetCredits('Advanced')}
              className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Get Credits →
            </button>
          </div>
        </div>

        {/* Credit Usage Info */}
        <div className="text-center mb-16">
          <div className="bg-gray-100 rounded-lg p-4 max-w-md mx-auto">
            <div className="flex items-center justify-center text-gray-600">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>You can split credits into 30-minute sessions. →</span>
            </div>
          </div>
        </div>

        {/* Testimonials Section */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">People love ParakeetAI</h2>
          <div className="text-4xl mb-8">💬</div>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Testimonial 1 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                OK
              </div>
              <div className="ml-3">
                <div className="font-semibold text-gray-900">Oskar Kader</div>
                <div className="text-sm text-gray-500">Feb 14, 2025</div>
              </div>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed">
              "ParakeetAI is an absolute cheat! It's like having a backup when your mind goes blank. 
              Highly recommend for upcoming interviews."
            </p>
          </div>

          {/* Testimonial 2 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                PW
              </div>
              <div className="ml-3">
                <div className="font-semibold text-gray-900">Pat Walls</div>
                <div className="text-sm text-gray-500">11:06 PM - Jan 7, 2025</div>
              </div>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed mb-2">
              "Weekend AI project + a few $10k / month business. We're in the golden age of solopreneurship."
            </p>
            <div className="flex items-center text-gray-500 text-xs">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              1K
            </div>
          </div>

          {/* Testimonial 3 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                RD
              </div>
              <div className="ml-3">
                <div className="font-semibold text-gray-900">Rosie D.</div>
                <div className="text-sm text-gray-500">Jan 17, 2025</div>
              </div>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed">
              "Absolutely zero faults. It's really a game changer! I've recommended it to all my friends and family. 
              Thanks for creating such an amazing app!"
            </p>
          </div>

          {/* Testimonial 4 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                JS
              </div>
              <div className="ml-3">
                <div className="font-semibold text-gray-900">Jure Satorok</div>
                <div className="text-sm text-gray-500">9:11 PM - Feb 14, 2025</div>
              </div>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed mb-2">
              "Super-fast transcriptions and spot-on AI answers. No subscription, just pay as you go. Love it!"
            </p>
            <div className="flex items-center text-gray-500 text-xs">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              6
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}