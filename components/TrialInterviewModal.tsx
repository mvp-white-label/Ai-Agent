'use client'

import { useState } from 'react'
import LanguageInstructionsModal from './LanguageInstructionsModal'

interface TrialInterviewModalProps {
  isOpen: boolean
  onClose: () => void
  onStart: (company: string, jobDescription: string) => void
  userId?: string
}

export default function TrialInterviewModal({ isOpen, onClose, onStart, userId }: TrialInterviewModalProps) {
  const [company, setCompany] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showLanguageModal, setShowLanguageModal] = useState(false)
  const [trialData, setTrialData] = useState<{company: string, jobDescription: string} | null>(null)
  const [isInterviewRunning, setIsInterviewRunning] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!company.trim() || !jobDescription.trim()) {
      return
    }

    // Store the trial data and show language modal
    setTrialData({
      company: company.trim(),
      jobDescription: jobDescription.trim()
    })
    setShowLanguageModal(true)
  }

  const handleLanguageNext = async (settings: {
    language: string
    simpleEnglish: boolean
    extraContext: string
    aiModel: string
  }) => {
    if (!trialData) return

    setIsLoading(true)
    
    try {
      // Call the onStart function with both trial data and language settings
      await onStart(trialData.company, trialData.jobDescription)
      
      // Reset form and close modals
      setCompany('')
      setJobDescription('')
      setTrialData(null)
      setShowLanguageModal(false)
      onClose()
    } catch (error) {
      console.error('Error starting trial interview:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLanguageBack = () => {
    setShowLanguageModal(false)
  }

  const handleClose = () => {
    setCompany('')
    setJobDescription('')
    setTrialData(null)
    setShowLanguageModal(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Trial Interview (10 min)</h2>
          </div>
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
            Type in the what company you are interviewing with and for what position. This lets the AI know what kind of answers to suggest.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Company Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>Company</span>
                </div>
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Microsoft..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Job Description Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Job Description</span>
                </div>
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Software Engineer versed in Python, SQL, and AWS..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                required
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={!company.trim() || !jobDescription.trim() || isLoading}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Starting...</span>
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

      {/* Language & Instructions Modal */}
      <LanguageInstructionsModal
        isOpen={showLanguageModal}
        onClose={handleClose}
        onNext={handleLanguageNext}
        onBack={handleLanguageBack}
        userId={userId}
        company={trialData?.company}
        position={trialData?.jobDescription}
      />
    </div>
  )
}
