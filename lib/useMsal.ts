import { useState, useEffect } from 'react'
import { PublicClientApplication } from '@azure/msal-browser'

interface MsalState {
  msalInstance: PublicClientApplication | null
  msalConfig: any
  loginRequest: any
  isLoading: boolean
  error: string | null
}

export function useMsal(): MsalState {
  const [state, setState] = useState<MsalState>({
    msalInstance: null,
    msalConfig: null,
    loginRequest: null,
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const initializeMsal = async () => {
      try {
        console.log('Initializing MSAL 2.0...')
        
        // Dynamic import of config
        const { msalConfig, loginRequest } = await import('./msalConfig')
        console.log('MSAL config imported successfully')
        
        // Create MSAL instance with error handling
        let msal
        try {
          msal = new PublicClientApplication(msalConfig)
          await msal.initialize()
          console.log('MSAL instance created and initialized successfully')
        } catch (msalError) {
          console.error('Error creating MSAL instance:', msalError)
          throw new Error(`Failed to create MSAL instance: ${msalError instanceof Error ? msalError.message : 'Unknown error'}`)
        }
        
        setState({
          msalInstance: msal,
          msalConfig,
          loginRequest,
          isLoading: false,
          error: null,
        })
      } catch (error) {
        console.error('Error initializing MSAL:', error)
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to initialize MSAL',
        }))
      }
    }

    initializeMsal()
  }, [])

  return state
}
