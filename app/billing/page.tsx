'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  name: string
  approved: boolean
}

interface Subscription {
  plan: string
  status: string
  nextBilling: string
  amount: number
  currency: string
}

interface PaymentMethod {
  id: string
  type: string
  last4: string
  brand: string
  expiryMonth: number
  expiryYear: number
}

export default function BillingPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [subscription, setSubscription] = useState<Subscription>({
    plan: 'Free',
    status: 'active',
    nextBilling: '2024-02-15',
    amount: 0,
    currency: 'USD'
  })
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [billingHistory, setBillingHistory] = useState<any[]>([])
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
          // Mock data - in real app, fetch from API
          setPaymentMethods([
            {
              id: 'pm_1',
              type: 'card',
              last4: '4242',
              brand: 'visa',
              expiryMonth: 12,
              expiryYear: 2025
            }
          ])
          setBillingHistory([
            {
              id: 'inv_1',
              date: '2024-01-15',
              amount: 29.99,
              status: 'paid',
              description: 'Pro Plan - Monthly'
            },
            {
              id: 'inv_2',
              date: '2023-12-15',
              amount: 29.99,
              status: 'paid',
              description: 'Pro Plan - Monthly'
            }
          ])
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

  const handleUpgradePlan = (plan: string) => {
    setSuccess(`Upgrading to ${plan} plan...`)
    // In real app, integrate with payment processor
    setTimeout(() => setSuccess(null), 3000)
  }

  const handleAddPaymentMethod = () => {
    setSuccess('Redirecting to add payment method...')
    // In real app, integrate with payment processor
    setTimeout(() => setSuccess(null), 3000)
  }

  const handleDownloadInvoice = (invoiceId: string) => {
    setSuccess(`Downloading invoice ${invoiceId}...`)
    // In real app, generate and download PDF
    setTimeout(() => setSuccess(null), 3000)
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
              <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Current Plan */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Current Plan</h2>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{subscription.plan} Plan</h3>
                    <p className="text-sm text-gray-600">
                      Status: <span className={`font-medium ${
                        subscription.status === 'active' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      ${subscription.amount}
                      <span className="text-sm font-normal text-gray-600">/month</span>
                    </p>
                  </div>
                </div>

                {subscription.plan === 'Free' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-blue-900 mb-2">Upgrade to Pro</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      Get unlimited access to all features, priority support, and advanced analytics.
                    </p>
                    <button
                      onClick={() => handleUpgradePlan('Pro')}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Upgrade Now
                    </button>
                  </div>
                )}

                <div className="text-sm text-gray-600">
                  <p>Next billing: {new Date(subscription.nextBilling).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Available Plans */}
            <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Available Plans</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Free Plan</h3>
                    <p className="text-3xl font-bold text-gray-900 mb-2">$0<span className="text-sm font-normal">/month</span></p>
                    <ul className="text-sm text-gray-600 space-y-1 mb-4">
                      <li>• 10 minutes trial sessions</li>
                      <li>• Basic interview questions</li>
                      <li>• Email support</li>
                    </ul>
                    <button
                      onClick={() => handleUpgradePlan('Free')}
                      className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Current Plan
                    </button>
                  </div>

                  <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Pro Plan</h3>
                    <p className="text-3xl font-bold text-gray-900 mb-2">$29.99<span className="text-sm font-normal">/month</span></p>
                    <ul className="text-sm text-gray-600 space-y-1 mb-4">
                      <li>• Unlimited interview sessions</li>
                      <li>• Advanced AI features</li>
                      <li>• Priority support</li>
                      <li>• Analytics dashboard</li>
                    </ul>
                    <button
                      onClick={() => handleUpgradePlan('Pro')}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Upgrade to Pro
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Methods & Billing History */}
          <div className="space-y-6">
            {/* Payment Methods */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Payment Methods</h2>
              </div>
              <div className="p-6">
                {paymentMethods.length > 0 ? (
                  <div className="space-y-3">
                    {paymentMethods.map((method) => (
                      <div key={method.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                            <span className="text-xs font-semibold text-gray-600">
                              {method.brand.toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              •••• {method.last4}
                            </p>
                            <p className="text-xs text-gray-600">
                              Expires {method.expiryMonth}/{method.expiryYear}
                            </p>
                          </div>
                        </div>
                        <button className="text-sm text-red-600 hover:text-red-700">
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 mb-4">No payment methods on file</p>
                )}
                <button
                  onClick={handleAddPaymentMethod}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Add Payment Method
                </button>
              </div>
            </div>

            {/* Billing History */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Billing History</h2>
              </div>
              <div className="p-6">
                {billingHistory.length > 0 ? (
                  <div className="space-y-3">
                    {billingHistory.map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{invoice.description}</p>
                          <p className="text-xs text-gray-600">{new Date(invoice.date).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-gray-900">${invoice.amount}</span>
                          <button
                            onClick={() => handleDownloadInvoice(invoice.id)}
                            className="text-sm text-blue-600 hover:text-blue-700"
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">No billing history available</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


