'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ConnectModal from '../../components/ConnectModal'
import InterviewInterface from '../../components/InterviewInterface'

interface User {
  id: string
  email: string
  name: string
  approved: boolean
}

function ResumePageContent() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionData, setSessionData] = useState<any>(null)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [interviewStream, setInterviewStream] = useState<MediaStream | null>(null)
  const [interviewPlatform, setInterviewPlatform] = useState('')
  const [showInterviewInterface, setShowInterviewInterface] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams?.get('sessionId')

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
          if (sessionId) {
            await loadSessionData(sessionId, data.user.id)
          } else {
            setError('No session ID provided')
          }
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
  }, [router, sessionId])

  const loadSessionData = async (sessionId: string, userId: string) => {
    try {
      const response = await fetch(`/api/sessions/simple?userId=${userId}`)
      const data = await response.json()
      
      if (data.success && data.sessions) {
        const session = data.sessions.find((s: any) => s.id === sessionId)
        if (session) {
          setSessionData(session)
          console.log('Loaded session data for resume:', session)
        } else {
          setError('Session not found')
        }
      } else {
        setError('Failed to load session data')
      }
    } catch (error) {
      console.error('Error loading session data:', error)
      setError('Failed to load session data')
    }
  }

  const handleConnect = async (stream?: MediaStream, platform?: string) => {
    console.log('Resume: Screen sharing connected', { stream, platform })
    if (stream) {
      setInterviewStream(stream)
    }
    if (platform) {
      setInterviewPlatform(platform)
    }
    setShowConnectModal(false)
    setShowInterviewInterface(true)
  }

  const handleExitInterview = () => {
    console.log('Resume: Exiting interview')
    if (interviewStream) {
      interviewStream.getTracks().forEach(track => {
        console.log('Resume: Stopping track:', track.kind, track.label)
        track.stop()
      })
    }
    setInterviewStream(null)
    setInterviewPlatform('')
    setShowInterviewInterface(false)
    router.push('/dashboard')
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
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Session Not Found</h1>
          <p className="text-gray-600 mb-4">The interview session could not be found.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Resume Interview</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <div className="text-6xl mb-6">🔄</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Resume Your Interview</h2>
            <p className="text-gray-600 mb-8">
              Reconnect your screen sharing to continue your interview from where you left off.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left max-w-md mx-auto">
              <h3 className="font-semibold text-gray-900 mb-4">Session Details:</h3>
              <div className="space-y-2">
                <p className="text-sm text-gray-600"><strong>Company:</strong> {sessionData.company}</p>
                <p className="text-sm text-gray-600"><strong>Position:</strong> {sessionData.position}</p>
                <p className="text-sm text-gray-600"><strong>Status:</strong> <span className="text-green-600 font-medium">Active</span></p>
                <p className="text-sm text-gray-600"><strong>AI Usage:</strong> {sessionData.aiUsage}%</p>
                <p className="text-sm text-gray-600"><strong>Session ID:</strong> {sessionData.id}</p>
              </div>
            </div>

            <button
              onClick={() => setShowConnectModal(true)}
              className="px-8 py-4 bg-gradient-to-r from-green-600 to-blue-500 text-white rounded-lg hover:from-green-700 hover:to-blue-600 transition-all duration-200 shadow-lg relative overflow-hidden text-lg font-medium"
            >
              <span className="relative z-10">Reconnect Screen Sharing</span>
              <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-blue-400 opacity-20 blur-sm"></div>
            </button>
          </div>
        </div>
      </div>

      {/* Connect Modal for Screen Sharing */}
      {showConnectModal && (
        <ConnectModal
          isOpen={showConnectModal}
          onClose={() => setShowConnectModal(false)}
          onBack={() => setShowConnectModal(false)}
          onStartInterview={() => {}} // Not used in resume mode
          onConnect={handleConnect}
          interviewData={sessionData ? {
            company: sessionData.company,
            position: sessionData.position,
            language: 'English',
            simpleEnglish: true,
            aiModel: 'Gemini 2.0 Flash',
            extraContext: '',
            selectedResumeId: undefined
          } : undefined}
        />
      )}

      {/* Interview Interface */}
      {showInterviewInterface && interviewStream && sessionData && (
        <InterviewInterface
          stream={interviewStream}
          platform={interviewPlatform}
          interviewData={{
            company: sessionData.company,
            position: sessionData.position,
            language: 'English',
            simpleEnglish: true,
            aiModel: 'Gemini 2.0 Flash',
            extraContext: '',
            selectedResumeId: undefined
          }}
          sessionId={sessionData.id}
          userId={user?.id}
          onExit={handleExitInterview}
        />
      )}
    </div>
  )
}

export default function ResumePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResumePageContent />
    </Suspense>
  )
}
