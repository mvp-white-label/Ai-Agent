'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface CreditTransaction {
  id: string
  transaction_type: string
  amount: number
  description: string
  status: string
  created_at: string
  reference_id?: string
}

interface Credits {
  total: number
  used: number
  available: number
}

export default function CreditHistoryPage() {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [credits, setCredits] = useState<Credits | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filterType, setFilterType] = useState('all')
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
          await fetchCreditHistory()
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
  }, [router, currentPage, filterType])

  const fetchCreditHistory = async () => {
    try {
      // Get session token from localStorage
      const sessionToken = localStorage.getItem('session')
      if (!sessionToken) {
        setError('No session token found')
        return
      }

      const response = await fetch('/api/credits/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionToken: sessionToken,
          page: currentPage,
          limit: 10,
          type: filterType
        }),
      })

      const data = await response.json()

      if (data.success) {
        setTransactions(data.transactions)
        setTotalPages(data.pagination.totalPages)
      } else {
        setError(data.error || 'Failed to fetch credit history')
      }
    } catch (error) {
      console.error('Error fetching credit history:', error)
      setError('Failed to fetch credit history')
    }
  }

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
      }
    } catch (error) {
      console.error('Error fetching credits:', error)
    }
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return '💳'
      case 'bonus':
        return '🎁'
      case 'refund':
        return '↩️'
      case 'usage':
        return '🎯'
      case 'expiration':
        return '⏰'
      case 'admin_adjustment':
        return '⚙️'
      default:
        return '💰'
    }
  }

  const getTransactionColor = (type: string, amount: number) => {
    if (amount > 0) {
      return 'text-green-600'
    } else {
      return 'text-red-600'
    }
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

  const handleFilterChange = (newFilter: string) => {
    setFilterType(newFilter)
    setCurrentPage(1)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
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
                onClick={() => router.push('/profile')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Profile
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Credit History</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Error Message */}
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

        {/* Current Credits Summary */}
        {credits && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Credit Balance</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{credits.available}</p>
                <p className="text-sm text-gray-500">Available</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{credits.total}</p>
                <p className="text-sm text-gray-500">Total Earned</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{credits.used}</p>
                <p className="text-sm text-gray-500">Used</p>
              </div>
            </div>
          </div>
        )}

        {/* Filter and Transactions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-0">Transaction History</h3>
              
              {/* Filter Buttons */}
              <div className="flex space-x-2">
                {['all', 'bonus', 'usage', 'purchase', 'refund'].map((type) => (
                  <button
                    key={type}
                    onClick={() => handleFilterChange(type)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      filterType === type
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Transactions List */}
          <div className="divide-y divide-gray-200">
            {transactions.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <p>No transactions found for the selected filter.</p>
              </div>
            ) : (
              transactions.map((transaction) => (
                <div key={transaction.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl">
                        {getTransactionIcon(transaction.transaction_type)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {transaction.description}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(transaction.created_at)}
                        </p>
                        {transaction.reference_id && (
                          <p className="text-xs text-gray-400">
                            Ref: {transaction.reference_id.slice(0, 8)}...
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-semibold ${getTransactionColor(transaction.transaction_type, transaction.amount)}`}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                      </p>
                      <p className="text-sm text-gray-500 capitalize">
                        {transaction.transaction_type.replace('_', ' ')}
                      </p>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        transaction.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : transaction.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
