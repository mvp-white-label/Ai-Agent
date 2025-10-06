'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ConnectModal from './ConnectModal'
import InterviewInterface from './InterviewInterface'

interface Resume {
  id: string
  title: string
  filename: string
  file_size: number
  file_type: string
  created_at: string
  user_id: string
}

interface SelectResumeModalProps {
  isOpen: boolean
  onClose: () => void
  onNext: (selectedResumeId?: string) => void
  onBack: () => void
  userId?: string
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

export default function SelectResumeModal({ 
  isOpen, 
  onClose, 
  onNext, 
  onBack,
  userId,
  interviewData 
}: SelectResumeModalProps) {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [selectedResumeId, setSelectedResumeId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingResumes, setIsLoadingResumes] = useState(true)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [showInterviewInterface, setShowInterviewInterface] = useState(false)
  const [interviewStream, setInterviewStream] = useState<MediaStream | null>(null)
  const [interviewPlatform, setInterviewPlatform] = useState<string>('')
  const [resumeData, setResumeData] = useState<string | undefined>(undefined)
  const [sessionData, setSessionData] = useState<any>(null)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [currentInterviewData, setCurrentInterviewData] = useState<{
    company: string
    position: string
    language: string
    simpleEnglish: boolean
    aiModel: string
    extraContext?: string
    selectedResumeId?: string
  } | null>(null)
  const router = useRouter()

  // Load resumes when modal opens
  useEffect(() => {
    if (isOpen && userId) {
      loadResumes()
    }
  }, [isOpen, userId])

  // Refresh resumes when modal becomes visible (in case resumes were deleted)
  useEffect(() => {
    if (isOpen && userId) {
      // Add a small delay to ensure any deletion operations have completed
      const timer = setTimeout(() => {
        console.log('Refreshing resume list...')
        loadResumes()
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Also refresh when the component mounts (in case user navigated back from CVs page)
  useEffect(() => {
    if (isOpen && userId) {
      // Listen for focus events to refresh when user returns to the tab
      const handleFocus = () => {
        console.log('Window focused, refreshing resume list...')
        // Don't load resumes if interview interface is active
        if (!showInterviewInterface) {
          loadResumes()
        } else {
          console.log('Interview interface is active, skipping resume refresh')
        }
      }
      
      window.addEventListener('focus', handleFocus)
      
      return () => {
        window.removeEventListener('focus', handleFocus)
      }
    }
  }, [isOpen, userId, showInterviewInterface])

  const loadResumes = async () => {
    if (!userId) return

    try {
      setIsLoadingResumes(true)
      const response = await fetch(`/api/resumes/list?userId=${userId}`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setResumes(data.resumes || [])
        }
      }
    } catch (error) {
      console.error('Error loading resumes:', error)
    } finally {
      setIsLoadingResumes(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
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
          sessionToken: sessionToken, // Include session token for authentication
          company: interviewData?.company || 'Unknown Company',
          position: interviewData?.position || 'Unknown Position',
          language: interviewData?.language || 'English',
          aiModel: interviewData?.aiModel || 'Gemini 2.0 Flash',
          extraContext: interviewData?.extraContext || '',
          resumeId: selectedResumeId || null,
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
      setCurrentUserId(validateData.user.id)
      
      // Set interview data for the interview interface
      setCurrentInterviewData({
        company: interviewData?.company || 'Unknown Company',
        position: interviewData?.position || 'Unknown Position',
        language: interviewData?.language || 'English',
        simpleEnglish: true,
        aiModel: interviewData?.aiModel || 'Gemini 2.0 Flash',
        extraContext: interviewData?.extraContext || '',
        selectedResumeId: selectedResumeId || undefined
      })
      
      // Store resume data and show connect modal
      setResumeData(selectedResumeId || undefined)
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

  const handleStartInterview = (stream: MediaStream, platform: string) => {
    setInterviewStream(stream)
    setInterviewPlatform(platform)
    setShowConnectModal(false)
    setShowInterviewInterface(true)
    
  }

  const handleExitInterview = () => {
    console.log('Exiting interview and stopping screen sharing...')
    
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
    
    console.log('Interview exited and screen sharing stopped')
    
    // Close the modal
    onClose()
  }

  const handleConnectBack = () => {
    setShowConnectModal(false)
  }

  const handleUploadResume = () => {
    // Close the modal and redirect to CVs page
    onClose()
    router.push('/cvs')
  }

  const handleClose = () => {
    setSelectedResumeId('')
    setResumeData(undefined)
    setShowConnectModal(false)
    
    // If interview interface is running, don't close it
    if (showInterviewInterface) {
      // Just reset the modal state but keep interview running
      // Don't call onClose() to avoid closing the interview
      return
    }
    
    // Otherwise, close the entire flow
    onClose()
  }

  const handleBack = () => {
    onBack()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (!isOpen) return null

  // If interview interface is running, render both the modal and interview interface
  if (showInterviewInterface) {
    return (
      <>
        {/* Interview Interface */}
        {interviewStream && currentInterviewData && (
          <InterviewInterface
            stream={interviewStream}
            platform={interviewPlatform}
            interviewData={currentInterviewData}
            sessionId={sessionData?.id}
            userId={currentUserId}
            onExit={handleExitInterview}
          />
        )}
      </>
    )
  }

  // If connect modal is showing, render it
  if (showConnectModal) {
    return (
      <ConnectModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onBack={() => setShowConnectModal(false)}
        onStartInterview={handleStartInterview}
        onConnect={handleConnect}
        interviewData={interviewData}
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      {/* Hide the modal content when interview is running */}
      {!showInterviewInterface && (
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Select Resume</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadResumes}
              disabled={isLoadingResumes}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              title="Refresh resume list"
            >
              {isLoadingResumes ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
            </button>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-6">
            Choose a resume to help the AI provide more personalized answers based on your experience.
          </p>

          {isLoadingResumes ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : resumes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">You don't have any resumes yet.</p>
              <button
                onClick={handleUploadResume}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Upload Resume
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {resumes.map((resume) => (
                  <label
                    key={resume.id}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedResumeId === resume.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="resume"
                      value={resume.id}
                      checked={selectedResumeId === resume.id}
                      onChange={(e) => setSelectedResumeId(e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{resume.title}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(resume.file_size)} • {formatDate(resume.created_at)}
                          </p>
                        </div>
                        {selectedResumeId === resume.id && (
                          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleUploadResume}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors mb-3"
                >
                  Upload New Resume
                </button>
              </div>
            </form>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-6">
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
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Next</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Connect Modal - Hide when interview is running */}
      {!showInterviewInterface && (
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
      )}

    </div>
  )
}
