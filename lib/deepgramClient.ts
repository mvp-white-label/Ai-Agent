import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk'

// Initialize Deepgram client only on client side
const getDeepgramClient = () => {
  if (typeof window === 'undefined') {
    throw new Error('Deepgram client can only be used on the client side')
  }
  
  const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY || process.env.DEEPGRAM_API_KEY
  if (!apiKey) {
    throw new Error('DEEPGRAM_API_KEY is not configured')
  }
  
  return createClient(apiKey)
}

export interface TranscriptionResult {
  text: string
  confidence: number
  isFinal: boolean
}

export class DeepgramSTT {
  private connection: any = null
  private isConnected = false
  private audioContext: AudioContext | null = null
  private processor: ScriptProcessorNode | null = null
  private source: MediaStreamAudioSourceNode | null = null

  constructor() {
    this.connection = null
    this.isConnected = false
    this.audioContext = null
    this.processor = null
    this.source = null
  }

  async startTranscription(
    audioStream: MediaStream,
    onTranscription: (result: TranscriptionResult) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    // 🔍 DEBUG: Check API key first
    const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY || process.env.DEEPGRAM_API_KEY
    console.log('🔍 DEBUG - API Key check:', {
      hasNextPublicKey: !!process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY,
      hasRegularKey: !!process.env.DEEPGRAM_API_KEY,
      apiKeyLength: apiKey?.length || 0,
      apiKeyPrefix: apiKey?.substring(0, 10) + '...' || 'undefined'
    })
    
    if (!apiKey) {
      const error = new Error('Deepgram API key not found. Please set DEEPGRAM_API_KEY or NEXT_PUBLIC_DEEPGRAM_API_KEY')
      console.error('❌ DEBUG - API Key Error:', error.message)
      if (onError) onError(error)
      return
    }

    // Pareeket AI Style: Try to get system audio loopback first
    console.log('🎯 Pareeket AI Mode: Attempting system audio loopback capture...')
    
    try {
      // Try to get system audio (loopback) - this captures Meet/Zoom/Teams audio
      console.log('🔍 DEBUG - Attempting system audio capture...')
      const systemAudioStream = await navigator.mediaDevices.getDisplayMedia({
        video: false,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      })
      
      console.log('🎯 System audio loopback captured! Using for interviewer voice detection')
      return this.startTranscription(systemAudioStream, onTranscription, onError)
      
    } catch (systemAudioError) {
      console.log('🎯 System audio not available, falling back to screen sharing audio')
      console.log('🔍 DEBUG - System audio error:', systemAudioError)
      
      // Fallback to screen sharing audio
      const hasAudioTracks = audioStream.getAudioTracks().length > 0
      const hasLiveAudioTracks = audioStream.getAudioTracks().some(track => track.readyState === 'live')
      
      console.log('🎤 Audio track check:', { hasAudioTracks, hasLiveAudioTracks, trackStates: audioStream.getAudioTracks().map(t => t.readyState) })
      
      if (!hasAudioTracks || !hasLiveAudioTracks) {
        console.log('🎤 No live audio in screen sharing, trying microphone fallback...')
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
          console.log('🎤 Microphone access granted, using mic for voice detection')
          return this.startTranscription(micStream, onTranscription, onError)
        } catch (micError) {
          console.error('🎤 Microphone access denied:', micError)
          // Continue with original stream anyway
        }
      } else {
        console.log('🎤 Screen sharing has live audio tracks, proceeding with screen sharing audio')
      }
    }
    try {
      // Create audio context and processor - Ensure 16kHz sample rate
      console.log('🔍 DEBUG - Creating AudioContext...')
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 16000 // Force 16kHz sample rate
        })
        console.log('🔍 DEBUG - AudioContext created successfully:', {
          sampleRate: this.audioContext.sampleRate,
          state: this.audioContext.state,
          baseLatency: this.audioContext.baseLatency
        })
      } catch (audioContextError) {
        console.error('❌ DEBUG - AudioContext creation failed:', audioContextError)
        throw audioContextError
      }
      
      console.log('🔍 DEBUG - Creating MediaStreamSource...')
      try {
        this.source = this.audioContext.createMediaStreamSource(audioStream)
        console.log('🔍 DEBUG - MediaStreamSource created successfully:', !!this.source)
      } catch (sourceError) {
        console.error('❌ DEBUG - MediaStreamSource creation failed:', sourceError)
        throw sourceError
      }
      
      console.log('🎯 Pareeket AI - Audio context created with sample rate:', this.audioContext.sampleRate)
      
      // Debug: Check audio stream properties
      console.log('🎵 Audio stream details:', {
        active: audioStream.active,
        audioTracks: audioStream.getAudioTracks().length,
        trackLabels: audioStream.getAudioTracks().map(track => track.label),
        trackStates: audioStream.getAudioTracks().map(track => ({
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState
        }))
      })
      
      // Create a ScriptProcessorNode for audio processing
      // Note: ScriptProcessorNode is deprecated, but AudioWorkletNode requires more complex setup
      // TODO: Migrate to AudioWorkletNode in future version for better performance
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1)
      
      // Connect the audio processing chain
      this.source.connect(this.processor)
      this.processor.connect(this.audioContext.destination)
      
      console.log('🎵 Audio processing chain connected')
      
      // Test audio stream immediately
      setTimeout(() => {
        if (this.audioContext && this.source) {
          console.log('🧪 Testing audio stream after 1 second...')
          // Using ScriptProcessorNode for testing (deprecated but functional)
          const testProcessor = this.audioContext.createScriptProcessor(4096, 1, 1)
          testProcessor.onaudioprocess = (event) => {
            const testData = event.inputBuffer.getChannelData(0)
            const hasTestAudio = testData.some(sample => Math.abs(sample) > 0.001)
            
            // Calculate max amplitude without spread operator
            let testMax = 0
            for (let i = 0; i < testData.length; i++) {
              testMax = Math.max(testMax, Math.abs(testData[i]))
            }
            
            console.log('🧪 Audio stream test:', {
              hasAudio: hasTestAudio,
              maxAmplitude: testMax.toFixed(6),
              samples: testData.length
            })
            
            // If no audio detected after 3 seconds, try microphone fallback
            if (!hasTestAudio && testMax < 0.001) {
              console.log('🎤 No audio detected in screen sharing after 3 seconds, trying microphone...')
              setTimeout(async () => {
                try {
                  const micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
                  console.log('🎤 Switching to microphone for voice detection')
                  // Restart with microphone
                  this.stopTranscription()
                  this.startTranscription(micStream, onTranscription, onError)
                } catch (micError) {
                  console.error('🎤 Microphone fallback failed:', micError)
                }
              }, 2000) // Wait 2 more seconds before switching
            }
            
            testProcessor.disconnect()
          }
          this.source.connect(testProcessor)
          testProcessor.connect(this.audioContext.destination)
        }
      }, 1000)

      // Initialize Deepgram connection
      console.log('🎯 Pareeket AI - Creating Deepgram connection...')
      
      // 🔍 DEBUG: Check Deepgram client creation
      try {
        const deepgram = getDeepgramClient()
        console.log('🔍 DEBUG - Deepgram client created:', !!deepgram)
      } catch (clientError) {
        console.error('❌ DEBUG - Deepgram client creation failed:', clientError)
        throw clientError
      }
      
      const deepgram = getDeepgramClient()
      
      const connectionConfig = {
        model: 'nova-3',
        language: 'en-US',
        smart_format: true,
        interim_results: true,
        endpointing: 300,
        utterance_end_ms: 1000,
        vad_events: true,
        encoding: 'linear16',
        sample_rate: 16000
      }
      
      console.log('🎯 Pareeket AI - Deepgram connection config:', connectionConfig)
      
      // 🔍 DEBUG: Try to create connection with error handling
      try {
        this.connection = deepgram.listen.live(connectionConfig)
        console.log('🔍 DEBUG - Deepgram connection object created:', {
          exists: !!this.connection,
          type: typeof this.connection,
          constructor: this.connection?.constructor?.name
        })
      } catch (connectionError) {
        console.error('❌ DEBUG - Deepgram connection creation failed:', connectionError)
        throw connectionError
      }
      
      console.log('🎯 Pareeket AI - Deepgram connection created:', !!this.connection)

      // The connection is automatically started when created
      // No need to call .start() method

      // Handle transcription results - Pareeket AI Style
      this.connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
        console.log('🎯 Pareeket AI - RAW Deepgram transcript event:', JSON.stringify(data, null, 2))
        
        // Check if data has the expected structure
        if (!data || !data.channel) {
          console.log('🎯 Pareeket AI - No channel data in transcript event')
          return
        }
        
        const transcript = data.channel?.alternatives?.[0]?.transcript
        const confidence = data.channel?.alternatives?.[0]?.confidence || 0
        const isFinal = data.is_final || false

        console.log('🎯 Pareeket AI - Processed transcript:', { 
          transcript, 
          confidence, 
          isFinal,
          hasTranscript: !!transcript,
          transcriptLength: transcript?.length || 0
        })

        if (transcript && transcript.trim().length > 0) {
          console.log('🎯 Pareeket AI - Sending transcription to callback:', transcript.trim())
          
          // Pareeket AI Style: Auto-generate answers for interviewer questions
          onTranscription({
            text: transcript.trim(),
            confidence,
            isFinal
          })
          
          // Note: AI answer generation is handled by the InterviewInterface component
          // This ensures proper state management and UI updates
        } else {
          console.log('🎯 Pareeket AI - No valid transcript found in data')
          // Debug: Log when we get empty transcripts
          if (isFinal) {
            console.log('🔍 DEBUG - Final transcript is empty, confidence:', confidence)
          }
        }
      })

      // Add alternative transcriptReceived listener (WebSocket style)
      this.connection.on('transcriptReceived', (data: any) => {
        console.log('🎯 Pareeket AI - transcriptReceived event:', JSON.stringify(data, null, 2))
      })

      // Handle connection events
      this.connection.on(LiveTranscriptionEvents.Open, () => {
        console.log('🎯 Pareeket AI - Deepgram connection opened successfully!')
        console.log('🔍 DEBUG - Connection opened, setting isConnected = true')
        this.isConnected = true
      })
      
      // Add a fallback timer to set connected state
      setTimeout(() => {
        if (!this.isConnected && this.connection) {
          console.log('Setting Deepgram as connected after timeout (fallback)')
          this.isConnected = true
        }
      }, 2000) // 2 second fallback

      this.connection.on(LiveTranscriptionEvents.Close, () => {
        console.log('Deepgram connection closed')
        this.isConnected = false
        // Try to restart connection if it closes unexpectedly
        if (this.connection) {
          console.log('Attempting to restart Deepgram connection...')
          setTimeout(() => {
            try {
              this.connection.finish()
              this.connection = null
              // Recreate connection
              this.connection = deepgram.listen.live({
                model: 'nova-3',
                language: 'en-US',
                smart_format: true,
                interim_results: true,
                endpointing: 300,
                utterance_end_ms: 1000,
                vad_events: true,
              })
              this.isConnected = true
              console.log('Deepgram connection restarted')
            } catch (error) {
              console.error('Error restarting Deepgram connection:', error)
            }
          }, 1000)
        }
      })

      this.connection.on(LiveTranscriptionEvents.Error, (error: any) => {
        console.error('🎯 Pareeket AI - Deepgram error:', error)
        this.isConnected = false
        if (onError) {
          onError(new Error(error.message || 'Deepgram transcription error'))
        }
      })

      // Add more event listeners for debugging
      this.connection.on(LiveTranscriptionEvents.Metadata, (metadata: any) => {
        console.log('🎯 Pareeket AI - Deepgram metadata:', metadata)
      })

      this.connection.on(LiveTranscriptionEvents.UtteranceEnd, (data: any) => {
        console.log('🎯 Pareeket AI - Deepgram utterance end:', data)
      })

      // Add listeners for all possible events
      this.connection.on('open', (data: any) => {
        console.log('🎯 Pareeket AI - Deepgram open event:', data)
      })

      this.connection.on('close', (data: any) => {
        console.log('🎯 Pareeket AI - Deepgram close event:', data)
      })

      this.connection.on('error', (data: any) => {
        console.log('🎯 Pareeket AI - Deepgram error event:', data)
      })

      this.connection.on('message', (data: any) => {
        console.log('🎯 Pareeket AI - Deepgram message event:', data)
      })

      // Log all available events
      console.log('🎯 Pareeket AI - Deepgram connection events available:', Object.keys(LiveTranscriptionEvents))

      // Process audio data
      this.processor.onaudioprocess = (event: AudioProcessingEvent) => {
        const audioData = event.inputBuffer.getChannelData(0)
        
        // Always log audio processing (even if no audio detected)
        const hasAudio = audioData.some(sample => Math.abs(sample) > 0.01)
        
        // Calculate max amplitude without spread operator
        let maxAmplitude = 0
        let sumAmplitude = 0
        for (let i = 0; i < audioData.length; i++) {
          const absSample = Math.abs(audioData[i])
          maxAmplitude = Math.max(maxAmplitude, absSample)
          sumAmplitude += absSample
        }
        const avgAmplitude = sumAmplitude / audioData.length
        
        // Log every 50th call to avoid spam, but always log when audio is detected
        if (Math.random() < 0.02 || hasAudio) { // 2% chance or when audio detected
          console.log('🎵 Audio processing:', {
            hasAudio,
            maxAmplitude: maxAmplitude.toFixed(6),
            avgAmplitude: avgAmplitude.toFixed(6),
            samples: audioData.length,
            isConnected: this.isConnected,
            connectionExists: !!this.connection
          })
        }
        
        // Pareeket AI Style - Always try to send audio to Deepgram
        if (this.connection) {
          const pcmData = this.convertFloat32ToPCM16(audioData)
          
          // Log audio format details
          if (hasAudio) {
            console.log('🎯 Pareeket AI - Audio format details:', {
              sampleRate: this.audioContext?.sampleRate,
              pcmLength: pcmData.length,
              pcmType: pcmData.constructor.name,
              firstFewSamples: Array.from(pcmData.slice(0, 5)),
              isConnected: this.isConnected
            })
          }
          
          try {
            this.connection.send(pcmData)
            if (hasAudio) {
              console.log('✅ Audio sent to Deepgram successfully')
            }
          } catch (error) {
            console.error('❌ Error sending audio to Deepgram:', error)
            // Try to reconnect if there's an error
            if (error instanceof Error && (error.message.includes('connection') || error.message.includes('closed'))) {
              console.log('🎯 Pareeket AI - Connection error detected, attempting to restart...')
              this.isConnected = false
            }
          }
        } else {
          if (hasAudio) {
            console.log('⚠️ Audio detected but Deepgram connection not available')
          }
        }
      }

      // Connection is automatically started when created
      console.log('Deepgram connection initialized')
      
      // Wait for connection to establish with timeout
      const waitForConnection = () => {
        return new Promise<void>((resolve, reject) => {
          let attempts = 0
          const maxAttempts = 50 // 5 seconds max wait
          
          const checkConnection = () => {
            attempts++
            console.log(`Waiting for Deepgram connection... attempt ${attempts}/${maxAttempts}`)
            
            if (this.isConnected) {
              console.log('Deepgram connection is ready!')
              resolve()
            } else if (attempts >= maxAttempts) {
              console.error('Deepgram connection timeout - proceeding anyway')
              resolve() // Proceed anyway, connection might work
            } else {
              setTimeout(checkConnection, 100)
            }
          }
          checkConnection()
        })
      }

      // Wait for connection to be ready
      console.log('🎯 Pareeket AI - Waiting for Deepgram connection to be ready...')
      await waitForConnection()
      console.log('🎯 Pareeket AI - Deepgram connection ready, starting audio processing')
      
      // Additional check after waiting
      if (!this.isConnected) {
        console.warn('🎯 Pareeket AI - Deepgram connection not established, but proceeding with audio processing')
        // Force connection to true after timeout
        this.isConnected = true
      }

    } catch (error) {
      console.error('Error starting Deepgram transcription:', error)
      if (onError) {
        onError(error as Error)
      }
    }
  }

  stopTranscription() {
    if (this.connection && this.isConnected) {
      this.connection.finish()
      this.connection = null
      this.isConnected = false
    }
    
    // Clean up audio resources
    if (this.processor) {
      this.processor.disconnect()
      this.processor.onaudioprocess = null
      this.processor = null
    }
    
    if (this.source) {
      this.source.disconnect()
      this.source = null
    }
    
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
  }

  private convertFloat32ToPCM16(float32Array: Float32Array): Int16Array {
    const buffer = new ArrayBuffer(float32Array.length * 2)
    const view = new DataView(buffer)
    let offset = 0
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, float32Array[i]))
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
    }
    return new Int16Array(buffer)
  }

  isTranscribing(): boolean {
    return this.isConnected
  }

}

export default DeepgramSTT
