'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import TrialInterviewModal from '../../components/TrialInterviewModal'
import OutOfCreditsModal from '../../components/OutOfCreditsModal'
import ResumeModal from '../../components/ResumeModal'
import CreditStatus from '../../components/CreditStatus'

interface User {
  id: string
  email: string
  name: string
  approved: boolean
}

interface Credits {
  total: number
  used: number
  available: number
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [credits, setCredits] = useState<Credits | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showTrialModal, setShowTrialModal] = useState(false)
  const [showCreditsModal, setShowCreditsModal] = useState(false)
  const [activeSession, setActiveSession] = useState<any>(null)
  const [showResumeModal, setShowResumeModal] = useState(false)
  const [isCreatingSession, setIsCreatingSession] = useState(false)
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
      // Get user info from localStorage
      const sessionToken = localStorage.getItem('session')

      if (!sessionToken) {
        router.push('/login/')
        return
      }

      try {
        // Validate session with API
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
          // Check for active sessions
          checkActiveSessions(data.user.id)
          // Fetch user credits
          fetchCredits()
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Handle search functionality
      console.log('Searching for:', searchQuery)
    }
  }

  const handleStartTrialInterview = async (company: string, jobDescription: string) => {
    try {
      console.log('Starting trial interview for:', { company, jobDescription })
      
      // Get session token from localStorage
      const sessionToken = localStorage.getItem('session')
      if (!sessionToken) {
        throw new Error('No session token found')
      }
      
      // Create trial session in database
      const response = await fetch('/api/sessions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionToken: sessionToken, // Include session token for authentication
          sessionType: 'trial',
          company: company,
          position: jobDescription,
          durationMinutes: 10,
          language: 'English',
          aiModel: 'Gemini 2.0 Flash',
          extraContext: '',
          resumeId: null
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create trial session')
      }

      const sessionData = await response.json()
      console.log('Trial session created:', sessionData)
      
      // Show success message and redirect to interview sessions
      alert(`Trial interview started for ${company} - ${jobDescription}`)
      router.push('/interview-sessions')
      
    } catch (error) {
      console.error('Error starting trial interview:', error)
      setError('Failed to start trial interview')
    }
  }

  const checkActiveSessions = async (userId: string) => {
    try {
      const response = await fetch(`/api/sessions/simple?userId=${userId}`)
      const data = await response.json()
      
      if (data.success && data.sessions) {
        const active = data.sessions.find((session: any) => session.status === 'active')
        if (active) {
          setActiveSession(active)
          console.log('Found active session:', active)
        }
      }
    } catch (error) {
      console.error('Error checking active sessions:', error)
    }
  }

  const fetchCredits = async () => {
    try {
      // Get session token from localStorage
      const sessionToken = localStorage.getItem('session')
      if (!sessionToken) {
        console.error('No session token found for credits fetch')
        return
      }

      const response = await fetch('/api/credits/check', {
        method: 'POST', // Change to POST to send session token in body
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
      } else {
        console.error('Error fetching credits:', data.error)
      }
    } catch (error) {
      console.error('Error fetching credits:', error)
    }
  }

  const handleStartSession = async () => {
    if (!user) return

    // For now, show credits modal since credit system is not set up
    setShowCreditsModal(true)
    return

    // TODO: Re-enable this when credit system is set up
    /*
    // Check if user has credits
    if (!credits || credits.available < 1) {
      setShowCreditsModal(true)
      return
    }

    try {
      setIsCreatingSession(true)
      
      // Create full interview session
      const response = await fetch('/api/sessions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionType: 'full',
          company: 'General Interview',
          position: 'Software Engineer',
          durationMinutes: 60,
          language: 'English',
          aiModel: 'Gemini 2.0 Flash',
          extraContext: '',
          resumeId: null
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.error === 'Insufficient credits') {
          setShowCreditsModal(true)
          return
        }
        throw new Error(errorData.message || 'Failed to create interview session')
      }

      const sessionData = await response.json()
      console.log('Full interview session created:', sessionData)
      
      // Redirect to interview sessions page
      router.push('/interview-sessions')
      
    } catch (error) {
      console.error('Error starting interview session:', error)
      setError('Failed to start interview session')
    } finally {
      setIsCreatingSession(false)
    }
    */
  }

  const handleGetCredits = () => {
    console.log('Redirecting to get credits')
    setShowCreditsModal(false)
    router.push('/billing')
  }

  const handleResumeSession = () => {
    if (activeSession) {
      setShowResumeModal(true)
    }
  }

  const handleResumeInterview = async (stream: MediaStream, platform: string, sessionData: any) => {
    try {
      console.log('Resuming interview with session data:', sessionData)
      
      // Update session status to active if it's not already
      const response = await fetch('/api/sessions/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: activeSession.id,
          userId: user?.id,
          status: 'active'
        }),
      })

      if (response.ok) {
        console.log('Session status updated, redirecting to resume page...')
        
        // Close the resume modal
        setShowResumeModal(false)
        
        // Redirect to the resume page with the session ID
        router.push(`/resume?sessionId=${activeSession.id}`)
      }
    } catch (error) {
      console.error('Error resuming session:', error)
      setError('Failed to resume interview session')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">You are not authorized to access this page.</p>
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-100 shadow-lg">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <span className="text-xl font-bold text-gray-900">ParakeetAI</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-4">
          <div className="space-y-2">
            <a href="#" className="flex items-center space-x-3 px-3 py-2 bg-gray-200 rounded-lg text-gray-900 font-medium">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Home</span>
            </a>
            <button
              onClick={() => router.push('/interview-sessions')}
              className="flex items-center space-x-3 px-3 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors w-full text-left"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Interview Sessions</span>
            </button>
            <button
              onClick={() => router.push('/cvs')}
              className="flex items-center space-x-3 px-3 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors w-full text-left"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>CVs / Resumes</span>
            </button>
            <button className="flex items-center space-x-3 px-3 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors w-full text-left">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Email Support</span>
            </button>
          </div>
        </nav>

        {/* Interview Credits Card */}
        <div className="mt-8 mx-4">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <h3 className="font-semibold text-gray-900">Interview Credits</h3>
              </div>
              <CreditStatus 
                userId={user?.id || ''} 
                onCreditsChange={setCredits}
                showDetails={true}
              />
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Start a <span className="font-semibold">10min</span> free trial session or buy credits for full-length interview sessions.
            </p>
            <button 
              onClick={() => router.push('/billing')}
              className="w-full bg-gradient-to-r from-blue-600 to-green-500 text-white py-2 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-green-600 transition-all duration-200 shadow-md"
            >
              Get Credits
            </button>
          </div>
        </div>

        {/* User Profile */}
        <div className="mt-auto p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span className="text-sm text-gray-600 truncate">{user.email}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Home</h1>
              <div className="flex items-center space-x-4">
                {activeSession && (
                  <button 
                    onClick={handleResumeSession}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-9-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Resume Interview</span>
                  </button>
                )}
                <button 
                  onClick={() => setShowTrialModal(true)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Start Trial Session
                </button>
                <button 
                  onClick={handleStartSession}
                  disabled={isCreatingSession}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isCreatingSession ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Start Interview</span>
                  )}
                </button>
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
                        <button
                          onClick={() => {
                            setShowProfile(false)
                            router.push('/billing')
                          }}
                          className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                        >
                          Billing
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

        {/* Main Content Area */}
        <main className="flex-1 p-6">
          {/* Welcome Message */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Hi, {user.name.split(' ')[0]} 👋
            </h2>
            <p className="text-gray-600">Welcome back! Ready to ace your next interview?</p>
          </div>

          {/* Search Bar */}
          <div className="mb-8">
            <form onSubmit={handleSearch} className="max-w-2xl">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ask me anything about interview preparation..."
                  className="w-full px-4 py-3 pl-12 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <button
                  type="submit"
                  className="absolute inset-y-0 right-0 px-4 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 transition-colors"
                >
                  Search
                </button>
              </div>
            </form>
          </div>

          {/* Main Workflow Steps */}
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Optional: Resume */}
              <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                <div className="text-center">
                  <div className="text-3xl mb-3">📝</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Optional: Resume</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Upload your resume so ParakeetAI can generate custom answers to the job interview questions.
                  </p>
                  <button 
                    onClick={() => router.push('/cvs')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Upload Resume
                  </button>
                </div>
              </div>

              {/* Step 1: Trial Session */}
              <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                <div className="text-center">
                  <div className="text-3xl mb-3">⏰</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Step 1: Trial Session</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    See how easy ParakeetAI is to use. Trial Sessions are free and limited to 10 minutes.
                  </p>
                  <button 
                    onClick={() => setShowTrialModal(true)}
                    className="w-full bg-gradient-to-r from-blue-600 to-green-500 text-white py-2 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-green-600 transition-all duration-200 shadow-md"
                  >
                    Try for Free
                  </button>
                </div>
              </div>

              {/* Step 2: Buy Credits */}
              <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                <div className="text-center">
                  <div className="text-3xl mb-3">💰</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Step 2: Buy Credits</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Buy credits to use for the real interview. No subscription!
                  </p>
                  <button 
                    onClick={() => router.push('/billing')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Get Credits
                  </button>
                </div>
              </div>

              {/* Step 3: Real Interview */}
              <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                <div className="text-center">
                  <div className="text-3xl mb-3">🚀</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Step 3: Real Interview</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Use ParakeetAI for a real interview to get the job you have always dreamed of.
                  </p>
                  <button 
                    onClick={handleStartSession}
                    disabled={isCreatingSession}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {isCreatingSession ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                        <span>Creating...</span>
                      </>
                    ) : (
                      <span>Start Interview</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Desktop App vs Browser Version */}
            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
              <div className="flex items-start space-x-3">
                <div className="text-2xl">💻</div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">Desktop App vs Browser Version</h3>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">New</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    ParakeetAI is available as both a Desktop App and a Browser/Web version. The Desktop App works seamlessly with any interview platform, while the Browser/Web version offers quick access.
                  </p>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Learn More
                  </button>
                </div>
              </div>
            </div>

            {/* Coding Interview Support */}
            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
              <div className="flex items-start space-x-3">
                <div className="text-2xl">💻</div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Coding Interview Support</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    You can use ParakeetAI for coding interviews. It can both listen for coding questions and capture the screen if a LeetCode-style question is being parsed.
                  </p>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Learn More
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Trial Interview Modal */}
      <TrialInterviewModal
        isOpen={showTrialModal}
        onClose={() => setShowTrialModal(false)}
        onStart={handleStartTrialInterview}
        userId={user?.id}
      />

      {/* Out of Credits Modal */}
      <OutOfCreditsModal
        isOpen={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
        onGetCredits={handleGetCredits}
      />

      {/* Resume Interview Modal */}
      <ResumeModal
        isOpen={showResumeModal}
        onClose={() => setShowResumeModal(false)}
        sessionData={activeSession}
        userId={user?.id || ''}
        onResume={handleResumeInterview}
      />
    </div>
  )
}