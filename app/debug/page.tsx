'use client'

import { useState } from 'react'

export default function DebugPage() {
  const [testResults, setTestResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testDatabase = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test-db')
      const data = await response.json()
      setTestResults(data)
    } catch (error) {
      setTestResults({ error: 'Failed to test database', details: error })
    } finally {
      setLoading(false)
    }
  }

  const testSessionsAPI = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/sessions/test')
      const data = await response.json()
      setTestResults(data)
    } catch (error) {
      setTestResults({ error: 'Failed to test sessions API', details: error })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Database Debug Page</h1>
        
        <div className="space-y-4 mb-8">
          <button
            onClick={testDatabase}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Database Connection'}
          </button>
          
          <button
            onClick={testSessionsAPI}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 ml-4"
          >
            {loading ? 'Testing...' : 'Test Sessions API'}
          </button>
        </div>

        {testResults && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Test Results:</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">Next Steps:</h2>
          <ol className="list-decimal list-inside space-y-2 text-yellow-700">
            <li>Click "Test Database Connection" to check if Supabase is working</li>
            <li>If that fails, check your environment variables</li>
            <li>Click "Test Sessions API" to check if the sessions table exists</li>
            <li>If sessions table doesn't exist, create it using the schema file</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
