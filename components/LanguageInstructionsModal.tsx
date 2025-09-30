'use client'

import { useState } from 'react'
import SelectResumeModal from './SelectResumeModal'

interface LanguageInstructionsModalProps {
  isOpen: boolean
  onClose: () => void
  onNext: (settings: {
    language: string
    simpleEnglish: boolean
    extraContext: string
    aiModel: string
    selectedResumeId?: string
  }) => void
  onBack: () => void
  userId?: string
  company?: string
  position?: string
}

export default function LanguageInstructionsModal({ 
  isOpen, 
  onClose, 
  onNext, 
  onBack,
  userId,
  company,
  position
}: LanguageInstructionsModalProps) {
  const [language, setLanguage] = useState('English')
  const [simpleEnglish, setSimpleEnglish] = useState(false)
  const [extraContext, setExtraContext] = useState('')
  const [aiModel, setAiModel] = useState('Gemini 2.0 Flash')
  const [isLoading, setIsLoading] = useState(false)
  const [showSelectResumeModal, setShowSelectResumeModal] = useState(false)
  const [languageSettings, setLanguageSettings] = useState<{
    language: string
    simpleEnglish: boolean
    extraContext: string
    aiModel: string
  } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Store language settings and show select resume modal
    const settings = {
      language,
      simpleEnglish,
      extraContext: extraContext.trim(),
      aiModel
    }
    setLanguageSettings(settings)
    setShowSelectResumeModal(true)
  }

  const handleResumeNext = async (selectedResumeId?: string) => {
    if (!languageSettings) return

    setIsLoading(true)
    
    try {
      // Call the onNext function with both language settings and resume selection
      await onNext({
        ...languageSettings,
        selectedResumeId
      })
      
    } catch (error) {
      console.error('Error processing language and resume settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResumeBack = () => {
    setShowSelectResumeModal(false)
  }

  const handleClose = () => {
    setLanguage('English')
    setSimpleEnglish(false)
    setExtraContext('')
    setAiModel('Gemini 2.0 Flash')
    setLanguageSettings(null)
    setShowSelectResumeModal(false)
    // Close the side panel but keep interview running
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
          <h2 className="text-xl font-bold text-gray-900">Language & Instructions</h2>
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
            Choose your language and provide special instructions for the AI when generating answers.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Language Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language
              </label>
              <div className="relative">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                  <option value="Italian">Italian</option>
                  <option value="Portuguese">Portuguese</option>
                  <option value="Chinese">Chinese</option>
                  <option value="Japanese">Japanese</option>
                  <option value="Korean">Korean</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Simple English Toggle */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Simple English (Optional)
                </label>
                <button
                  type="button"
                  onClick={() => setSimpleEnglish(!simpleEnglish)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    simpleEnglish ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      simpleEnglish ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                If English is not your first language, you can use this option to make sure the AI doesn't use complex words.
              </p>
            </div>

            {/* Extra Context/Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Extra Context/Instructions (Optional)
              </label>
              <textarea
                value={extraContext}
                onChange={(e) => setExtraContext(e.target.value)}
                placeholder="Be more technical, use a more casual tone, etc."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* AI Model Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Model (Optional)
              </label>
              <div className="relative">
                <select
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="Gemini 2.0 Flash">Gemini 2.0 Flash</option>
                  <option value="Gemini 2.0 Flash Thinking">Gemini 2.0 Flash Thinking</option>
                  <option value="Gemini 2.5 Flash">Gemini 2.5 Flash</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
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
          </form>
        </div>
      </div>

      {/* Select Resume Modal */}
      <SelectResumeModal
        isOpen={showSelectResumeModal}
        onClose={handleClose}
        onNext={handleResumeNext}
        onBack={handleResumeBack}
        userId={userId}
        interviewData={{
          company: company || 'Unknown Company',
          position: position || 'Unknown Position',
          language: languageSettings?.language || 'English',
          simpleEnglish: languageSettings?.simpleEnglish || false,
          aiModel: languageSettings?.aiModel || 'Gemini 2.0 Flash',
          extraContext: languageSettings?.extraContext || ''
        }}
      />
    </div>
  )
}
