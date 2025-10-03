'use client'

import { useState, useEffect } from 'react'

interface ConnectModalProps {
  isOpen: boolean
  onClose: () => void
  onConnect: (stream?: MediaStream, platform?: string) => void
  onBack: () => void
  onStartInterview: (stream: MediaStream, platform: string) => void
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

export default function ConnectModal({ 
  isOpen, 
  onClose, 
  onConnect, 
  onBack,
  onStartInterview,
  interviewData 
}: ConnectModalProps) {
  // Provide default values if interviewData is not provided
  const defaultInterviewData = {
    company: 'General Interview',
    position: 'Software Engineer',
    language: 'English',
    simpleEnglish: true,
    aiModel: 'Gemini 2.0 Flash',
    extraContext: '',
    selectedResumeId: undefined
  }
  
  const data = interviewData || defaultInterviewData
  
  const [language, setLanguage] = useState(data.language)
  const [simpleEnglish, setSimpleEnglish] = useState(data.simpleEnglish)
  const [aiModel, setAiModel] = useState(data.aiModel)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle')
  const [selectedTab, setSelectedTab] = useState<string>('')
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
  const [browserSupported, setBrowserSupported] = useState<boolean | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')

  // Check browser support when component mounts (without testing API)
  useEffect(() => {
    if (isOpen) {
      const basicSupport = checkBrowserSupport()
      if (!basicSupport) {
        setBrowserSupported(false)
        setConnectionStatus('error')
        setErrorMessage('Your browser or environment does not meet the basic requirements for screen sharing.')
        return
      }

      // Only check basic support, don't test the actual API call
      setBrowserSupported(true)
      setConnectionStatus('idle')
    }
  }, [isOpen])

  const checkBrowserSupport = () => {
    console.log('Checking browser support for screen sharing...')
    console.log('navigator.mediaDevices:', !!navigator.mediaDevices)
    console.log('getDisplayMedia:', !!navigator.mediaDevices?.getDisplayMedia)
    console.log('isSecureContext:', window.isSecureContext)
    console.log('protocol:', window.location.protocol)
    console.log('hostname:', window.location.hostname)
    
    // Check if getDisplayMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      console.log('❌ getDisplayMedia not supported')
      return false
    }
    
    // Check if we're in a secure context (HTTPS or localhost)
    if (!window.isSecureContext) {
      console.log('❌ Not in secure context - screen sharing requires HTTPS or localhost')
      return false
    }
    
    // Additional check for development environment
    if (typeof window !== 'undefined' && window.location.protocol === 'http:' && !window.location.hostname.includes('localhost')) {
      console.log('❌ Screen sharing requires HTTPS in production')
      return false
    }
    
    // Check for specific browser issues
    const userAgent = navigator.userAgent.toLowerCase()
    if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      console.log('❌ Safari has limited screen sharing support')
      return false
    }
    
    console.log('✅ Browser support check passed')
    return true
  }


  const handleConnect = async () => {
    setIsConnecting(true)
    setConnectionStatus('connecting')
    
    try {
      // Check browser support first - BEFORE attempting screen sharing
      if (!checkBrowserSupport()) {
        setConnectionStatus('error')
        setIsConnecting(false)
        return
      }

      // Request screen sharing with tab selection
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      })

      // Get information about the shared screen
      const videoTrack = stream.getVideoTracks()[0]
      const settings = videoTrack.getSettings()
      
      // Detect the platform based on the shared content
      const platform = detectVideoPlatform(settings.displaySurface || 'browser')
      
      setMediaStream(stream)
      setConnectionStatus('connected')
      setSelectedTab(platform || 'Screen Share')

      // Handle stream end event
      videoTrack.addEventListener('ended', () => {
        setConnectionStatus('idle')
        setSelectedTab('')
        setMediaStream(null)
      })

      // Call the onConnect function with stream data
      await onConnect(stream, platform)
      
    } catch (error: any) {
      console.error('Error connecting to interview:', error)
      setConnectionStatus('error')
      
      // Handle different error types
      if (error.name === 'NotAllowedError') {
        console.log('User cancelled screen sharing')
      } else if (error.name === 'NotSupportedError') {
        console.log('Screen sharing not supported in this browser')
      } else if (error.message && error.message.includes('not supported')) {
        console.log('Browser or environment does not support screen sharing')
      }
    } finally {
      setIsConnecting(false)
    }
  }

  const detectVideoPlatform = (displaySurface: string) => {
    // This is a basic detection - in a real implementation, you'd need
    // more sophisticated detection based on the actual shared content
    switch (displaySurface) {
      case 'browser':
        return 'Browser Tab'
      case 'window':
        return 'Application Window'
      case 'monitor':
        return 'Entire Screen'
      default:
        return 'Screen Share'
    }
  }

  const stopSharing = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop())
      setMediaStream(null)
      setConnectionStatus('idle')
      setSelectedTab('')
    }
  }

  const handleClose = () => {
    // Close the side panel but keep interview running
    onClose()
  }

  const handleBack = () => {
    onBack()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Connect</h2>
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
          {/* Interview Info */}
          <div className="mb-6">
            <p className="text-sm text-gray-700">
              This is an Interview Session for a position <span className="font-semibold">"{data.position}"</span> at <span className="font-semibold">"{data.company}"</span> and <span className="text-blue-600 underline cursor-pointer">extra context</span>.
            </p>
          </div>

          {/* Language Section */}
          <div className="flex items-center justify-between py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="font-medium text-gray-700">Language</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Simple</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9,12l2,2 4,-4" />
                </svg>
                <button
                  onClick={() => setSimpleEnglish(!simpleEnglish)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    simpleEnglish ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      simpleEnglish ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* AI Model Section */}
          <div className="flex items-center justify-between py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6" />
              </svg>
              <span className="font-medium text-gray-700">AI Model (Optional)</span>
            </div>
            <div className="relative">
              <select
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-2 pr-8 pl-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Gemini 2.0 Flash">Gemini 2.0 Flash</option>
                <option value="Gemini 2.0 Flash Thinking">Gemini 2.0 Flash Thinking</option>
                <option value="Gemini 2.5 Flash">Gemini 2.5 Flash</option>
              </select>
              <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Audio Sharing Instruction */}
          <div className="bg-gray-50 rounded-lg p-4 my-6">
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 4.663 12 5.109 12 6v12c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
              <p className="text-sm text-gray-700">
                Make sure to select the <span className="font-semibold">"Also share tab audio"</span> option when sharing the screen.
              </p>
            </div>
          </div>

          {/* Connection Status */}
          {(connectionStatus !== 'idle' || browserSupported === false) && (
            <div className={`rounded-lg p-4 my-6 ${
              connectionStatus === 'connected' ? 'bg-green-50 border border-green-200' :
              connectionStatus === 'connecting' ? 'bg-blue-50 border border-blue-200' :
              connectionStatus === 'error' ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
            }`}>
              <div className="flex items-center space-x-3">
                {connectionStatus === 'connected' && (
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                {connectionStatus === 'connecting' && (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                )}
                {connectionStatus === 'error' && (
                  <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                <div>
                  <p className={`text-sm font-medium ${
                    connectionStatus === 'connected' ? 'text-green-800' :
                    connectionStatus === 'connecting' ? 'text-blue-800' :
                    (connectionStatus === 'error' || browserSupported === false) ? 'text-red-800' : 'text-gray-800'
                  }`}>
                    {connectionStatus === 'connected' && `Connected to ${selectedTab}`}
                    {connectionStatus === 'connecting' && 'Connecting to screen share...'}
                    {(connectionStatus === 'error' || browserSupported === false) && (errorMessage || 'Screen sharing not supported. See instructions below.')}
                  </p>
                  {connectionStatus === 'connected' && (
                    <p className="text-xs text-green-600 mt-1">
                      Screen sharing is active. You can now start your interview.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Fallback Instructions for Unsupported Browsers */}
          {(connectionStatus === 'error' || browserSupported === false) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-yellow-800 mb-2">Screen Sharing Not Supported</h4>
                  <div className="text-sm text-yellow-700 space-y-2">
                    <p>To use ParakeetAI, you need:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li><strong>Chrome, Firefox, or Edge</strong> (latest versions)</li>
                      <li><strong>HTTPS connection</strong> (or localhost for development)</li>
                      <li><strong>Screen sharing permissions</strong> enabled</li>
                      <li><strong>Allow screen sharing</strong> when prompted</li>
                    </ul>
                    <div className="mt-3 p-3 bg-yellow-100 rounded border border-yellow-300">
                      <p className="font-medium text-yellow-800 mb-2">Troubleshooting:</p>
                      <ul className="text-xs space-y-1">
                        <li>• Try refreshing the page and allowing permissions</li>
                        <li>• Check if your browser blocks screen sharing</li>
                        <li>• Ensure you're not in incognito/private mode</li>
                        <li>• Try a different browser if issues persist</li>
                      </ul>
                    </div>
                    <p className="mt-2">
                      <strong>Alternative:</strong> You can still proceed with a mock interview by clicking "Start Interview" below.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* How to Connect Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">How to Connect:</h3>
            <div className="flex items-center space-x-4 mb-4">
              {/* Zoom */}
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16c-.169 0-.333.034-.483.096l-2.4 1.2c-.3.15-.5.45-.5.78v3.6c0 .33.2.63.5.78l2.4 1.2c.15.075.314.12.483.12.33 0 .63-.15.78-.45.15-.3.15-.66 0-.96l-1.8-3.6 1.8-3.6c.15-.3.15-.66 0-.96-.15-.3-.45-.45-.78-.45z"/>
                </svg>
              </div>
              {/* Google Meet */}
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16c-.169 0-.333.034-.483.096l-2.4 1.2c-.3.15-.5.45-.5.78v3.6c0 .33.2.63.5.78l2.4 1.2c.15.075.314.12.483.12.33 0 .63-.15.78-.45.15-.3.15-.66 0-.96l-1.8-3.6 1.8-3.6c.15-.3.15-.66 0-.96-.15-.3-.45-.45-.78-.45z"/>
                </svg>
              </div>
              {/* Microsoft Teams */}
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16c-.169 0-.333.034-.483.096l-2.4 1.2c-.3.15-.5.45-.5.78v3.6c0 .33.2.63.5.78l2.4 1.2c.15.075.314.12.483.12.33 0 .63-.15.78-.45.15-.3.15-.66 0-.96l-1.8-3.6 1.8-3.6c.15-.3.15-.66 0-.96-.15-.3-.45-.45-.78-.45z"/>
                </svg>
              </div>
              {/* Webex */}
              <div className="w-12 h-12 bg-blue-800 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">W</span>
              </div>
              {/* Phone */}
              <div className="w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div className="flex items-center space-x-2 text-blue-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="text-sm underline cursor-pointer">Video Tutorial</span>
              </div>
            </div>
          </div>

          {/* Mock Interview Section */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-32 h-20 bg-gray-300 rounded-lg flex items-center justify-center relative">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-600 text-center">ParakeetAI Mock Interview</div>
              </div>
              <div className="flex-1">
                <div className="flex items-start space-x-2">
                  <svg className="w-5 h-5 text-gray-500 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-700">
                      Instead of an interview tab, you can also share a mock interview on YouTube and test ParakeetAI that way. Example video: <span className="text-blue-600 underline cursor-pointer">Mock Interview</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <button
              onClick={handleBack}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>
            
            {connectionStatus === 'connected' ? (
              <div className="flex space-x-3">
                <button
                  onClick={stopSharing}
                  className="px-6 py-3 border border-red-300 rounded-lg text-red-700 bg-white hover:bg-red-50 transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Stop Sharing</span>
                </button>
                <button
                  onClick={() => {
                    if (mediaStream) {
                      onConnect(mediaStream, selectedTab)
                    }
                  }}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-9-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Start Interview</span>
                </button>
              </div>
            ) : (connectionStatus === 'error' || browserSupported === false) ? (
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setConnectionStatus('connecting')
                    const supported = checkBrowserSupport()
                    setBrowserSupported(supported)
                    if (supported) {
                      setConnectionStatus('idle')
                      setErrorMessage('')
                    } else {
                      setConnectionStatus('error')
                    }
                  }}
                  disabled={isConnecting}
                  className="px-6 py-3 border border-blue-300 rounded-lg text-blue-700 bg-white hover:bg-blue-50 transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Retry Test</span>
                </button>
                <button
                  onClick={() => onConnect()}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-9-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Start Mock Interview</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    <span>Activate and Connect</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
