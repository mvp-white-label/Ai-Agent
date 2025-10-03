'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  name: string
  approved: boolean
}

interface Resume {
  id: string
  title: string
  filename: string
  file_size: number
  file_type: string
  created_at: string
  user_id: string
}

interface ParsedResumeData {
  id: string
  resume_id: string
  skills: string[]
  experience: any[]
  education: any[]
  certifications: any[]
  projects: any[]
  summary: string
  suggestedQuestions: string[]
  ai_model_used: string
  parsing_status: string
  created_at: string
}

export default function CVsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [resumes, setResumes] = useState<Resume[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [parsingResume, setParsingResume] = useState<string | null>(null)
  const [parsedData, setParsedData] = useState<ParsedResumeData | null>(null)
  const [showParsedData, setShowParsedData] = useState(false)
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null)
  const [generatedAnswer, setGeneratedAnswer] = useState<string | null>(null)
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false)
  const [resumeText, setResumeText] = useState<string>('')
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
          // loadResumes() will be called by useEffect when user state is set
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

  // Load resumes when user is available
  useEffect(() => {
    if (user?.id) {
      console.log('User available, loading resumes for:', user.id)
      loadResumes()
    }
  }, [user?.id])


  const loadResumes = async () => {
    if (!user?.id) {
      console.log('User ID not available, skipping resume load')
      return
    }

    try {
      console.log('Loading resumes for user:', user.id)
      const response = await fetch(`/api/resumes/list?userId=${user.id}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error Response:', errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()

      if (data.success) {
        setResumes(data.resumes || [])
        setError(null)
      } else {
        console.error('API Error:', data.error)
        setError(data.error || 'Failed to load resumes')
      }
    } catch (error) {
      console.error('Error loading resumes:', error)
      setError(`Failed to load resumes: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a PDF or Word document')
      return
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', user?.id || '')
      formData.append('title', file.name.replace(/\.[^/.]+$/, '')) // Remove file extension

      const response = await fetch('/api/resumes/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Resume uploaded successfully!')
        await loadResumes() // Reload the list
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(data.error || 'Failed to upload resume')
      }
    } catch (error) {
      console.error('Error uploading resume:', error)
      setError('Failed to upload resume')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteResume = async (resumeId: string) => {
    if (!confirm('Are you sure you want to delete this resume?')) return

    try {
      const response = await fetch(`/api/resumes/delete?id=${resumeId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Resume deleted successfully!')
        await loadResumes() // Reload the list
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(data.error || 'Failed to delete resume')
      }
    } catch (error) {
      console.error('Error deleting resume:', error)
      setError('Failed to delete resume')
    }
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Function to extract text from resume file
  const extractTextFromResume = async (fileBlob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = async (e) => {
        try {
          const dataUrl = e.target?.result as string
          
          // Extract base64 data from data URL
          const base64 = dataUrl.split(',')[1]
          
          // Send to PDF text extraction API
          const response = await fetch('/api/extract-text', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fileData: base64 }),
          })
          
          const data = await response.json()
          
          if (data.success) {
            resolve(data.text)
          } else {
            throw new Error(data.error || 'Failed to extract text')
          }
        } catch (error) {
          reject(error)
        }
      }
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }
      
      // Use readAsDataURL to get base64 directly
      reader.readAsDataURL(fileBlob)
    })
  }

  const handleParseResume = async (resumeId: string) => {
    setParsingResume(resumeId)
    setError(null)

    console.log('Starting parse for resume ID:', resumeId)
    console.log('User ID:', user?.id)

    try {
      // First, get the resume file content
      console.log('Fetching resume file...')
      const resumeResponse = await fetch(`/api/resumes/download?id=${resumeId}`)
      if (!resumeResponse.ok) {
        console.error('Failed to download resume:', resumeResponse.status, resumeResponse.statusText)
        throw new Error('Failed to download resume')
      }

      // Extract text from the actual resume file
      console.log('Extracting text from resume file...')
      const resumeBlob = await resumeResponse.blob()
      
      // Check if it's a PDF file
      if (resumeBlob.type === 'application/pdf') {
        try {
          const resumeText = await extractTextFromResume(resumeBlob)
          console.log('Extracted resume text length:', resumeText.length)
          console.log('Resume text preview:', resumeText.substring(0, 200) + '...')
          
          // Check if text extraction was successful
          if (resumeText && resumeText.length > 50) {
            // Store resume text for answer generation
            setResumeText(resumeText)
            
            // Use the extracted text for parsing
            const parseResponse = await fetch('/api/resumes/parse', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                resumeId,
                resumeText,
                userId: user?.id
              }),
            })

            const parseData = await parseResponse.json()
            console.log('Parse response status:', parseResponse.status)
            console.log('Parse response data:', parseData)

            if (parseData.success) {
              console.log('Setting parsed data:', parseData.data)
              setParsedData(parseData.data)
              setShowParsedData(true)
              setSuccess('Resume parsed successfully!')
              setTimeout(() => setSuccess(null), 3000)
            } else {
              setError(parseData.error || 'Failed to parse resume')
            }
          } else {
            setError('Could not extract meaningful text from the PDF. Please ensure the PDF contains readable text.')
          }
        } catch (extractError) {
          console.error('Text extraction error:', extractError)
          setError('Failed to extract text from PDF. Please try with a different PDF file.')
        }
      } else {
        // For non-PDF files, show a message
        setError('Only PDF files are supported for text extraction. Please upload a PDF resume.')
      }
    } catch (error) {
      console.error('Error parsing resume:', error)
      setError('Failed to parse resume')
    } finally {
      setParsingResume(null)
    }
  }

  const handleViewParsedData = async (resumeId: string) => {
    try {
      const response = await fetch(`/api/resumes/parsed-data?resumeId=${resumeId}&userId=${user?.id}`)
      const data = await response.json()

      if (data.success) {
        setParsedData(data.data)
        setShowParsedData(true)
      } else {
        setError(data.error || 'Failed to load parsed data')
      }
    } catch (error) {
      console.error('Error loading parsed data:', error)
      setError('Failed to load parsed data')
    }
  }

  const handleQuestionClick = async (question: string) => {
    if (!parsedData || !resumeText) return

    setSelectedQuestion(question)
    setGeneratedAnswer(null)
    setIsGeneratingAnswer(true)

    try {
      const response = await fetch('/api/generate-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          resumeText,
          skills: parsedData.skills,
          experience: parsedData.experience
        }),
      })

      const data = await response.json()

      if (data.success) {
        setGeneratedAnswer(data.answer)
      } else {
        setError(data.error || 'Failed to generate answer')
      }
    } catch (error) {
      console.error('Error generating answer:', error)
      setError('Failed to generate answer')
    } finally {
      setIsGeneratingAnswer(false)
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-100 shadow-lg">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <span className="text-xl font-bold text-gray-900">ParakeetAI</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-4">
          <div className="space-y-2">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center space-x-3 px-3 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors w-full text-left"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Home</span>
            </button>
            <button
              onClick={() => router.push('/interview-sessions')}
              className="flex items-center space-x-3 px-3 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors w-full text-left"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Interview Sessions</span>
            </button>
            <div className="flex items-center space-x-3 px-3 py-2 bg-gray-200 rounded-lg text-gray-900 font-medium">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>CVs / Resumes</span>
            </div>
            <button className="flex items-center space-x-3 px-3 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors w-full text-left">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Email Support</span>
            </button>
          </div>
        </nav>

        {/* Interview Credits Card */}
        <div className="mt-8 mx-4">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center space-x-2 mb-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="font-semibold text-gray-900">Interview Credits</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Start a <span className="font-semibold">10min</span> free trial session or buy credits for full-length interview sessions.
            </p>
            <button 
              onClick={() => router.push('/billing')}
              className="w-full bg-gradient-to-r from-blue-600 to-green-500 text-white py-2 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-green-600 transition-all duration-200 shadow-md"
            >
              Get Credits
            </button>
          </div>
        </div>

        {/* User Profile */}
        <div className="mt-auto p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span className="text-sm text-gray-600 truncate">{user.email}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h1 className="text-2xl font-bold text-gray-900">CVs / Resumes</h1>
              </div>
              <div className="flex items-center space-x-4">
                <label className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors cursor-pointer">
                  {isUploading ? 'Uploading...' : 'Upload Resume'}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6">
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

          {/* Resumes Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Your Resumes</h2>
                <p className="text-sm text-gray-600">Upload your resume to get personalized interview questions</p>
              </div>
            </div>

            {resumes.length === 0 ? (
              <div className="p-12 text-center">
                <h3 className="text-sm font-medium text-gray-900">No Resumes yet.</h3>
              </div>
            ) : (
              <>
                {/* Table Headers */}
                <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-6">
                      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Title</h3>
                    </div>
                    <div className="col-span-4">
                      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</h3>
                    </div>
                    <div className="col-span-2">
                      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</h3>
                    </div>
                  </div>
                </div>

                {/* Table Body */}
                <div className="divide-y divide-gray-200">
                  {resumes.map((resume) => (
                    <div key={resume.id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-6">
                          <div className="flex items-center space-x-3">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{resume.title}</p>
                              <p className="text-xs text-gray-500">{formatFileSize(resume.file_size)} • {resume.file_type}</p>
                            </div>
                          </div>
                        </div>
                        <div className="col-span-4">
                          <p className="text-sm text-gray-500">{formatDate(resume.created_at)}</p>
                        </div>
                        <div className="col-span-2">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleParseResume(resume.id)}
                              disabled={parsingResume === resume.id}
                              className="text-green-600 hover:text-green-900 text-sm disabled:opacity-50"
                            >
                              {parsingResume === resume.id ? 'Parsing...' : 'Parse Resume'}
                            </button>
                            <button
                              onClick={() => window.open(`/api/resumes/download?id=${resume.id}`, '_blank')}
                              className="text-blue-600 hover:text-blue-900 text-sm"
                            >
                              Download
                            </button>
                            <button
                              onClick={() => handleDeleteResume(resume.id)}
                              className="text-red-600 hover:text-red-900 text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Parsed Resume Data Modal */}
      {showParsedData && parsedData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">AI-Parsed Resume Data</h2>
                <button
                  onClick={() => setShowParsedData(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Skills */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {parsedData.skills && parsedData.skills.length > 0 ? (
                      parsedData.skills.map((skill, index) => (
                        <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {skill}
                        </span>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">No skills extracted</p>
                    )}
                  </div>
                </div>

                {/* Summary */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Summary</h3>
                  <p className="text-gray-700 text-sm">
                    {parsedData.summary || 'No summary available'}
                  </p>
                </div>

                {/* Experience */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Experience</h3>
                  <div className="space-y-3">
                    {parsedData.experience && parsedData.experience.length > 0 ? (
                      parsedData.experience.map((exp, index) => (
                        <div key={index} className="border-l-4 border-blue-500 pl-4">
                          <h4 className="font-medium text-gray-900 text-sm">{exp.position}</h4>
                          <p className="text-xs text-gray-600">{exp.company}</p>
                          <p className="text-xs text-gray-500">{exp.duration}</p>
                          <p className="text-xs text-gray-700 mt-1">{exp.description}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">No experience data extracted</p>
                    )}
                  </div>
                </div>

                {/* Education */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Education</h3>
                  <div className="space-y-2">
                    {parsedData.education && parsedData.education.length > 0 ? (
                      parsedData.education.map((edu, index) => (
                        <div key={index} className="border-l-4 border-green-500 pl-4">
                          <h4 className="font-medium text-gray-900 text-sm">{edu.degree}</h4>
                          <p className="text-xs text-gray-600">{edu.institution}</p>
                          <p className="text-xs text-gray-500">{edu.field} - {edu.year}</p>
                          {edu.cgpa && (
                            <p className="text-xs text-blue-600 font-medium">CGPA: {edu.cgpa}</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">No education data extracted</p>
                    )}
                  </div>
                </div>

                {/* Certifications */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Certifications</h3>
                  <div className="space-y-2">
                    {parsedData.certifications && parsedData.certifications.length > 0 ? (
                      parsedData.certifications.map((cert, index) => (
                        <div key={index} className="border-l-4 border-orange-500 pl-4">
                          <h4 className="font-medium text-gray-900 text-sm">{cert.name}</h4>
                          <p className="text-xs text-gray-600">{cert.issuer}</p>
                          <p className="text-xs text-gray-500">{cert.year}</p>
                          {cert.validity && (
                            <p className="text-xs text-green-600">Valid until: {cert.validity}</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">No certifications found</p>
                    )}
                  </div>
                </div>

                {/* Projects */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Projects</h3>
                  <div className="space-y-3">
                    {parsedData.projects && parsedData.projects.length > 0 ? (
                      parsedData.projects.map((project, index) => (
                        <div key={index} className="border-l-4 border-purple-500 pl-4">
                          <h4 className="font-medium text-gray-900 text-sm">{project.name}</h4>
                          <p className="text-xs text-gray-700">{project.description}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {project.technologies?.map((tech: string, techIndex: number) => (
                              <span key={techIndex} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">No projects data extracted</p>
                    )}
                  </div>
                </div>

                {/* Suggested Questions */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Suggested Interview Questions</h3>
                  <div className="space-y-2">
                    {parsedData.suggestedQuestions && parsedData.suggestedQuestions.length > 0 ? (
                      parsedData.suggestedQuestions.map((questionObj: any, index: number) => {
                        const question = typeof questionObj === 'string' ? questionObj : questionObj.question
                        const category = typeof questionObj === 'object' ? questionObj.category : 'general'
                        const difficulty = typeof questionObj === 'object' ? questionObj.difficulty : 'medium'
                        
                        return (
                          <div key={index} className="space-y-2">
                            <div 
                              className="p-3 bg-yellow-50 border border-yellow-200 rounded cursor-pointer hover:bg-yellow-100 transition-colors"
                              onClick={() => handleQuestionClick(question)}
                            >
                              <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-700 font-medium">{question}</p>
                                <div className="flex items-center space-x-2">
                                  <span className={`px-2 py-1 text-xs rounded ${
                                    category === 'technical' ? 'bg-blue-100 text-blue-800' :
                                    category === 'project' ? 'bg-green-100 text-green-800' :
                                    category === 'behavioral' ? 'bg-purple-100 text-purple-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {category}
                                  </span>
                                  <span className={`px-2 py-1 text-xs rounded ${
                                    difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                                    difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {difficulty}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Show answer if this question is selected */}
                            {selectedQuestion === question && (
                              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                                {isGeneratingAnswer ? (
                                  <div className="flex items-center space-x-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                    <p className="text-sm text-blue-600">Generating answer...</p>
                                  </div>
                                ) : generatedAnswer ? (
                                  <div>
                                    <h4 className="text-sm font-medium text-blue-900 mb-2">AI-Generated Answer:</h4>
                                    <div className="text-sm text-gray-700 whitespace-pre-wrap">{generatedAnswer}</div>
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-gray-500 text-sm">No questions generated</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Parsed using {parsedData.ai_model_used} • {parsedData.created_at ? new Date(parsedData.created_at).toLocaleString() : 'Just now'}
                  </div>
                  <button
                    onClick={() => setShowParsedData(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
