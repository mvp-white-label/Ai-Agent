'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ConnectModal from './ConnectModal'

interface ResumeModalProps {
  isOpen: boolean
  onClose: () => void
  sessionData: any
  userId: string
  onResume: (stream: MediaStream, platform: string, sessionData: any) => void
}

export default function ResumeModal({ 
  isOpen, 
  onClose, 
  sessionData, 
  userId,
  onResume 
}: ResumeModalProps) {
  const router = useRouter()

  const handleResumeNow = () => {
    // Redirect to the resume page with the session ID
    router.push(`/resume?sessionId=${sessionData.id}`)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 relative shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center">
          <div className="text-4xl mb-4">🔄</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Resume Interview</h3>
          <p className="text-gray-600 mb-6">
            Reconnect your screen sharing to resume your interview from where you left off.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h4 className="font-semibold text-gray-900 mb-2">Session Details:</h4>
            <p className="text-sm text-gray-600"><strong>Company:</strong> {sessionData.company}</p>
            <p className="text-sm text-gray-600"><strong>Position:</strong> {sessionData.position}</p>
            <p className="text-sm text-gray-600"><strong>Status:</strong> <span className="text-green-600 font-medium">Active</span></p>
            <p className="text-sm text-gray-600"><strong>AI Usage:</strong> {sessionData.aiUsage}%</p>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            
            <button
              onClick={handleResumeNow}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-blue-500 text-white rounded-lg hover:from-green-700 hover:to-blue-600 transition-all duration-200 shadow-lg relative overflow-hidden"
            >
              <span className="relative z-10">Resume Now</span>
              <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-blue-400 opacity-20 blur-sm"></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
