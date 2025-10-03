'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [credits, setCredits] = useState<Credits | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    email: ''
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

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
          setEditForm({
            name: data.user.name,
            email: data.user.email
          })
          
          // Fetch user credits
          await fetchCredits()
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

  const fetchCredits = async () => {
    try {
      // Get session token from localStorage
      const sessionToken = localStorage.getItem('session')
      if (!sessionToken) {
        console.error('No session token found for credits fetch')
        return
      }

      const response = await fetch('/api/credits/check', {
        method: 'POST',
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSave = async () => {
    if (!user) return

    try {
      const response = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          name: editForm.name,
          email: editForm.email
        }),
      })

      const data = await response.json()

      if (data.success) {
        setUser(prev => prev ? { ...prev, name: editForm.name, email: editForm.email } : null)
        setSuccess('Profile updated successfully!')
        setIsEditing(false)
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(data.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      setError('Failed to update profile')
    }
  }

  const handleCancel = () => {
    setEditForm({
      name: user?.name || '',
      email: user?.email || ''
    })
    setIsEditing(false)
    setError(null)
  }

  const handleDeleteAccount = async () => {
    if (!user) return

    const confirmed = confirm(
      'Are you sure you want to delete your account? This action cannot be undone and will permanently delete:\n\n' +
      '• Your profile and personal information\n' +
      '• All interview sessions and transcripts\n' +
      '• All uploaded resumes and parsed data\n' +
      '• All settings and preferences\n\n' +
      'Type "DELETE" to confirm:'
    )

    if (!confirmed) return

    // Double confirmation
    const doubleConfirm = prompt('Please type "DELETE" to confirm account deletion:')
    if (doubleConfirm !== 'DELETE') {
      alert('Account deletion cancelled. You must type "DELETE" exactly to confirm.')
      return
    }

    try {
      setError(null)
      setSuccess('Deleting account...')

      const response = await fetch('/api/profile/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Account deleted successfully. Redirecting to login...')
        
        // Clear session and redirect after a short delay
        setTimeout(() => {
          localStorage.removeItem('session')
          router.push('/login/')
        }, 2000)
      } else {
        setError(data.error || 'Failed to delete account')
        setSuccess(null)
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      setError('Failed to delete account. Please try again.')
      setSuccess(null)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
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
              <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('session')
                router.push('/login/')
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm">{success}</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Profile Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Email Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Email</h3>
            <p className="text-lg font-semibold text-gray-900">{user.email}</p>
          </div>

          {/* Interview Credits Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">Interview Credits</h3>
              <button
                onClick={fetchCredits}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                Refresh
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-3xl font-bold text-gray-900 mb-2">
                {credits?.available || 0}
              </p>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Total: {credits?.total || 0}</span>
                <span>Used: {credits?.used || 0}</span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => router.push('/billing')}
                className="w-full bg-gradient-to-r from-blue-600 to-green-500 text-white py-2 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-green-600 transition-all duration-200 shadow-md relative overflow-hidden"
              >
                <span className="relative z-10">Buy More Credits</span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-green-400 opacity-20 blur-sm"></div>
              </button>
              
              <button
                onClick={() => router.push('/credits/history')}
                className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                View Credit History
              </button>
            </div>
          </div>
        </div>

        {/* Account Management */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Account Management</h3>
          
          <div className="space-y-4">
            {/* Edit Profile */}
            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Personal Information</h4>
                <p className="text-sm text-gray-500">Update your name and email</p>
              </div>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {/* Edit Form */}
            {isEditing && (
              <div className="space-y-4 py-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={editForm.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={editForm.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your email"
                  />
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* Account Status */}
            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Account Status</h4>
                <p className="text-sm text-gray-500">Your account approval status</p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                user.approved 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {user.approved ? 'Approved' : 'Pending Approval'}
              </span>
            </div>

            {/* Delete Account */}
            <div className="flex items-center justify-between py-3">
              <div>
                <h4 className="text-sm font-medium text-red-600">Delete Account</h4>
                <p className="text-sm text-gray-500">Permanently delete your account and all data</p>
              </div>
              <button
                onClick={handleDeleteAccount}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


