'use client'

import { useState } from 'react'

interface TranscriptSummaryModalProps {
  isOpen: boolean
  onClose: () => void
  onNext: (settings: {
    saveTranscript: boolean
  }) => void
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

export default function TranscriptSummaryModal({ 
  isOpen, 
  onClose, 
  onNext, 
  onBack,
  interviewData 
}: TranscriptSummaryModalProps) {
  const [saveTranscript, setSaveTranscript] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [transcriptSettings, setTranscriptSettings] = useState<{
    saveTranscript: boolean
  } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Store transcript settings and go directly to connect modal
    const settings = {
      saveTranscript
    }
    setTranscriptSettings(settings)
    
    // Skip ReadyToCreateModal and go directly to ConnectModal
    await onNext(settings)
  }


  const handleClose = () => {
    setSaveTranscript(false)
    setTranscriptSettings(null)
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
          <h2 className="text-xl font-bold text-gray-900">AI Interview Transcript/Summary</h2>
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
          <p className="text-sm text-gray-600 mb-6">
            Choose whether to save the transcript/summary of your interview.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Save Transcript Toggle */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Save Transcript/Summary (Optional)
                </label>
                <button
                  type="button"
                  onClick={() => setSaveTranscript(!saveTranscript)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    saveTranscript ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      saveTranscript ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                If you check this option, a transcript/summary of the interview will be saved with an AI analysis of the interview. You will be able to view and analyze the summary in your dashboard.
              </p>
            </div>

            {/* Legal Disclaimer */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Legal Disclaimer</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      You must comply with all applicable recording laws when using this transcription app. Many jurisdictions require consent from all parties being recorded. Recording without proper consent may be illegal.
                    </p>
                  </div>
                </div>
              </div>
            </div>

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
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
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
          </form>
        </div>
      </div>

    </div>
  )
}
