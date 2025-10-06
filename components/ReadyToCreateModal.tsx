'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ConnectModal from './ConnectModal'
import InterviewInterface from './InterviewInterface'
import OutOfCreditsModal from './OutOfCreditsModal'

interface ReadyToCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: () => void
  onBack: () => void
  interviewData?: {
    company: string
    position: string
    language: string
    simpleEnglish: boolean
    aiModel: string
    extraContext?: string
    selectedResumeId?: string
  }
}

export default function ReadyToCreateModal({ 
  isOpen, 
  onClose, 
  onCreate, 
  onBack,
  interviewData 
}: ReadyToCreateModalProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [showInterviewInterface, setShowInterviewInterface] = useState(false)
  const [interviewStream, setInterviewStream] = useState<MediaStream | null>(null)
  const [interviewPlatform, setInterviewPlatform] = useState<string>('')
  const [sessionData, setSessionData] = useState<any>(null)
  const [userId, setUserId] = useState<string>('')

  const handleCreate = async () => {
    setIsLoading(true)
    
    try {
      // Get user ID from session token
      const sessionToken = localStorage.getItem('session')
      if (!sessionToken) {
        throw new Error('No session token found')
      }

      // Validate session to get user ID
      const validateResponse = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionToken }),
      })

      if (!validateResponse.ok) {
        throw new Error('Session validation failed')
      }

      const validateData = await validateResponse.json()
      if (!validateData.valid || !validateData.user) {
        throw new Error('Invalid session')
      }

      // Create interview session in database
      const sessionResponse = await fetch('/api/sessions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: validateData.user.id,
          company: interviewData?.company || 'Unknown Company',
          position: interviewData?.position || 'Unknown Position',
          language: interviewData?.language || 'English',
          aiModel: interviewData?.aiModel || 'Gemini 2.0 Flash',
          extraContext: interviewData?.extraContext || '',
          resumeId: interviewData?.selectedResumeId || null,
          sessionType: 'trial',
          durationMinutes: 10
        }),
      })

      if (!sessionResponse.ok) {
        throw new Error('Failed to create interview session')
      }

      const sessionData = await sessionResponse.json()
      console.log('Interview session created:', sessionData)

      // Store session data and user ID for passing to InterviewInterface
      setSessionData(sessionData.session) // Store the actual session object, not the full response
      setUserId(validateData.user.id)

      // Call the onCreate function to start the trial session
      await onCreate()
      
      // Show connect modal after session is created
      setShowConnectModal(true)
    } catch (error) {
      console.error('Error creating trial session:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnect = async (stream?: MediaStream, platform?: string) => {
    // This function is called when screen sharing is successfully connected
    if (stream && platform) {
      console.log('Screen sharing stream received:', stream)
      console.log('Platform detected:', platform)
      handleStartInterview(stream, platform)
    } else {
      console.log('No stream or platform provided, cannot start interview interface')
    }
  }

  const handleConnectBack = () => {
    setShowConnectModal(false)
  }

  const handleStartInterview = (stream: MediaStream, platform: string) => {
    setInterviewStream(stream)
    setInterviewPlatform(platform)
    setShowConnectModal(false)
    setShowInterviewInterface(true)
  }

  const handleExitInterview = () => {
    // Additional cleanup to ensure stream is stopped
    if (interviewStream) {
      console.log('Parent: Additional stream cleanup...')
      interviewStream.getTracks().forEach(track => {
        console.log('Parent: Stopping track:', track.kind, track.label)
        track.stop()
      })
    }
    
    // Reset all interview state
    setInterviewStream(null)
    setInterviewPlatform('')
    setShowInterviewInterface(false)
    onClose()
  }

  const handleClose = () => {
    setShowConnectModal(false)
    onClose()
  }

  const handleBack = () => {
    onBack()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Ready to Create</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            {/* Trial Session Info */}
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm text-gray-700">
                This is a 10 minute trial session.
              </p>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              </div>
              <p className="text-sm text-gray-700">
                The timer will not start until you connect your screen sharing.
              </p>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              </div>
              <p className="text-sm text-gray-700">
                You won't be able to create another trial session for the next 15 minutes.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-8">
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>
            <button
              onClick={handleCreate}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </div>
              ) : (
                'Create Trial Session'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Connect Modal */}
      <ConnectModal
        isOpen={showConnectModal}
        onClose={handleClose}
        onConnect={handleConnect}
        onBack={handleConnectBack}
        onStartInterview={() => {}} // Not used - session creation happens in handleConnect
        interviewData={interviewData || {
          company: 'Unknown Company',
          position: 'Unknown Position',
          language: 'English',
          simpleEnglish: false,
          aiModel: 'Gemini 2.0 Flash'
        }}
      />

      {/* Interview Interface */}
      {showInterviewInterface && interviewStream && interviewData && (
        <InterviewInterface
          stream={interviewStream}
          platform={interviewPlatform}
          interviewData={interviewData}
          sessionId={sessionData?.id}
          userId={userId}
          onExit={handleExitInterview}
        />
      )}
    </div>
  )
}
