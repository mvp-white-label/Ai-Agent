'use client'

import { useRouter } from 'next/navigation'

interface OutOfCreditsModalProps {
  isOpen: boolean
  onClose: () => void
  onGetCredits: () => void
}

export default function OutOfCreditsModal({ 
  isOpen, 
  onClose, 
  onGetCredits 
}: OutOfCreditsModalProps) {
  const router = useRouter()
  
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 relative shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Modal content */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Out of Interview Credits
          </h2>
          
          <p className="text-gray-600 mb-8 leading-relaxed">
            You don't have any Interview Credits. To start an Interview Session you need to get some credits.
          </p>

          {/* Action buttons */}
          <div className="flex space-x-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            
            <button
              onClick={() => {
                onClose()
                router.push('/billing')
              }}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-green-500 text-white rounded-lg hover:from-blue-700 hover:to-green-600 transition-all duration-200 shadow-lg relative overflow-hidden"
            >
              <span className="relative z-10">Get Credits</span>
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-green-400 opacity-20 blur-sm"></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
