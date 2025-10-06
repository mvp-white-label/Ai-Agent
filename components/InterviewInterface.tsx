'use client'

import { useState, useEffect, useRef } from 'react'
import DeepgramSTT, { TranscriptionResult } from '../lib/deepgramClient'

interface InterviewInterfaceProps {
  stream: MediaStream
  platform: string
  interviewData: {
    company: string
    position: string
    language: string
    simpleEnglish: boolean
    aiModel: string
    extraContext?: string
    selectedResumeId?: string
  }
  sessionId?: string
  userId?: string
  onExit: () => void
}

export default function InterviewInterface({ 
  stream, 
  platform, 
  interviewData, 
  sessionId,
  userId,
  onExit 
}: InterviewInterfaceProps) {
  const [transcript, setTranscript] = useState<string>('')
  const [messages, setMessages] = useState<Array<{id: string, type: 'user' | 'ai', content: string, timestamp: Date}>>([])
  const [manualMessage, setManualMessage] = useState('')
  const [timeRemaining, setTimeRemaining] = useState(10 * 60) // 10 minutes in seconds
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isAiAnswering, setIsAiAnswering] = useState(false)
  const [screenAnalysis, setScreenAnalysis] = useState<{
    question: string
    answer: string[]
    timestamp: Date
  } | null>(null)
  const [showReconnectModal, setShowReconnectModal] = useState(false)
  const [isVideoLoading, setIsVideoLoading] = useState(true)
  const [showStopSharingOptions, setShowStopSharingOptions] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  
  // Voice detection states
  const [isVoiceDetectionActive, setIsVoiceDetectionActive] = useState(false)
  const [transcribedText, setTranscribedText] = useState<string>('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcriptionConfidence, setTranscriptionConfidence] = useState<number>(0)
  const [aiAnswer, setAiAnswer] = useState<string>('')
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false)
  const [pareeketAnswers, setPareeketAnswers] = useState<Array<{question: string, answer: string, timestamp: Date}>>([])
  
  // Deepgram STT instance
  const deepgramSTTRef = useRef<DeepgramSTT | null>(null)

  // Debug logging for state changes
  console.log('InterviewInterface render - stream:', !!stream, 'isVideoLoading:', isVideoLoading)
  console.log('SessionId:', sessionId, 'UserId:', userId)
  console.log('Stream details:', stream ? {
    active: stream.active,
    id: stream.id,
    tracks: stream.getTracks().length,
    trackStates: stream.getTracks().map(t => ({ kind: t.kind, readyState: t.readyState, enabled: t.enabled }))
  } : 'No stream')
  
  // Immediate check for stream status on render
  useEffect(() => {
    if (stream && stream.active) {
      console.log('Immediate stream check - stream is active')
      setIsVideoLoading(false)
    } else if (stream) {
      console.log('Immediate stream check - stream exists but not active:', stream.active)
    } else {
      console.log('Immediate stream check - no stream provided')
    }
  }, [])

  const [currentDuration, setCurrentDuration] = useState(0)
  const [currentDurationSeconds, setCurrentDurationSeconds] = useState(0)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const transcriptRef = useRef<HTMLDivElement>(null)
  const stopSharingRef = useRef<HTMLDivElement>(null)

  // Handle click outside to close stop sharing options
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (stopSharingRef.current && !stopSharingRef.current.contains(event.target as Node)) {
        setShowStopSharingOptions(false)
      }
    }

    if (showStopSharingOptions) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showStopSharingOptions])

  // Cleanup effect to ensure stream is stopped when component unmounts
  useEffect(() => {
    return () => {
      console.log('InterviewInterface: Component unmounting, cleaning up stream...')
      if (stream) {
        stream.getTracks().forEach(track => {
          console.log('InterviewInterface: Cleaning up track:', track.kind, track.label)
          track.stop()
        })
      }
      
      // Also clear video element
      if (videoRef.current) {
        console.log('InterviewInterface: Clearing video element on unmount')
        videoRef.current.pause()
        videoRef.current.srcObject = null
        videoRef.current.load()
      }
    }
  }, [stream])

  // Initialize video stream
  useEffect(() => {
    if (videoRef.current && stream) {
      console.log('Setting video stream:', stream)
      console.log('Video tracks:', stream.getVideoTracks())
      console.log('Stream active:', stream.active)
      console.log('Stream id:', stream.id)
      
      // Validate stream has video tracks
      const videoTracks = stream.getVideoTracks()
      if (videoTracks.length === 0) {
        console.error('No video tracks found in stream')
        return
      }
      
      const mainVideoTrack = videoTracks[0]
      console.log('Video track settings:', mainVideoTrack.getSettings())
      console.log('Video track constraints:', mainVideoTrack.getConstraints())
      
      const videoElement = videoRef.current
      
      // Stop any existing video playback first
      if (videoElement.srcObject) {
        console.log('Clearing existing video stream before setting new one')
        videoElement.pause()
        videoElement.srcObject = null
        videoElement.load() // Force clear any cached stream
        
        // Small delay to ensure the old stream is completely cleared
        setTimeout(() => {
          if (videoRef.current && stream) {
            console.log('Setting new video stream after cleanup delay')
            videoRef.current.srcObject = stream
            playVideo()
          }
        }, 100)
        return // Exit early, the timeout will handle setting the new stream
      }
      
      // Set new stream immediately if no existing stream
      videoElement.srcObject = stream
      
      // Set video properties for better display
      videoElement.style.width = '100%'
      videoElement.style.height = '100%'
      videoElement.style.objectFit = 'contain'
      videoElement.style.backgroundColor = 'black'
      videoElement.style.minHeight = '300px' // Ensure minimum height
      videoElement.style.display = 'block' // Ensure it's visible
      
      // Set video attributes
      videoElement.setAttribute('playsinline', 'true')
      videoElement.setAttribute('autoplay', 'true')
      videoElement.setAttribute('muted', 'true')
      
      // Force video to load
      videoElement.load()
      
      // Debug: Check video element after setup
      console.log('Video element after setup:', {
        srcObject: !!videoElement.srcObject,
        videoWidth: videoElement.videoWidth,
        videoHeight: videoElement.videoHeight,
        readyState: videoElement.readyState,
        networkState: videoElement.networkState,
        paused: videoElement.paused,
        muted: videoElement.muted
      })
      
      // Play video with better error handling
      const playVideo = async () => {
        try {
          setIsVideoLoading(true)
          
          // Wait for metadata to load
          videoElement.addEventListener('loadedmetadata', () => {
            console.log('Video metadata loaded, dimensions:', {
              videoWidth: videoElement.videoWidth,
              videoHeight: videoElement.videoHeight,
              clientWidth: videoElement.clientWidth,
              clientHeight: videoElement.clientHeight,
              readyState: videoElement.readyState,
              networkState: videoElement.networkState
            })
            setIsVideoLoading(false)
          })
          
          // Wait for data to load
          videoElement.addEventListener('canplay', () => {
            console.log('Video can play, readyState:', videoElement.readyState)
          })
          
          // Handle video load errors
          videoElement.addEventListener('error', (e) => {
            console.error('Video load error:', e)
            console.error('Video error details:', videoElement.error)
            setIsVideoLoading(false)
          })
          
          // Add a small delay to ensure stream is ready
          setTimeout(async () => {
            try {
              await videoElement.play()
              console.log('Video started playing successfully')
            } catch (playError) {
              console.log('Video play error:', playError)
              // Try to play again after a short delay
              setTimeout(async () => {
                try {
                  await videoElement.play()
                  console.log('Video started playing on retry')
                } catch (retryError) {
                  console.log('Video play retry failed:', retryError)
                }
              }, 500)
            }
          }, 100)
          
        } catch (error) {
          console.log('Video play error (this is often normal):', error)
          setIsVideoLoading(false)
          // Don't throw error, just log it
        }
      }
      
      playVideo()
      
      // Handle video track end event (screen sharing stopped)
      const endVideoTrack = stream.getVideoTracks()[0]
      if (endVideoTrack) {
        endVideoTrack.addEventListener('ended', () => {
          console.log('Screen sharing ended by user')
          setShowReconnectModal(true)
        })
      }
      
      // Auto-analyze screen after a short delay
      setTimeout(() => {
        handleAnalyzeScreen()
      }, 2000)
      
      // Set session status to active when interview starts
      if (sessionId && userId) {
        console.log('Interview started - setting session status to active')
        console.log('SessionId:', sessionId, 'UserId:', userId)
        const startTime = new Date()
        setSessionStartTime(startTime)
        updateSessionStatus('active', 0) // Initialize AI usage to 0 and set started_at
      } else {
        console.log('Cannot update session status - missing sessionId or userId')
        console.log('SessionId:', sessionId, 'UserId:', userId)
      }
    } else {
      console.log('Video stream not available:', { videoRef: !!videoRef.current, stream: !!stream })
    }
  }, [stream, sessionId, userId])

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Time's up - end interview
          handleEndInterview()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Cleanup effect - stop screen sharing when component unmounts
  useEffect(() => {
    return () => {
      console.log('InterviewInterface: Component unmounting, cleaning up...')
      if (stream) {
        stream.getTracks().forEach(track => {
          console.log('InterviewInterface: Cleanup - stopping track:', track.kind)
          track.stop()
        })
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
  }, [stream])

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
    }
  }, [transcript])

  // Track session duration with precise seconds
  useEffect(() => {
    if (sessionStartTime) {
      const interval = setInterval(() => {
        const now = new Date()
        const durationMs = now.getTime() - sessionStartTime.getTime()
        const durationSeconds = Math.floor(durationMs / 1000)
        const durationMinutes = Math.floor(durationSeconds / 60)
        const remainingSeconds = durationSeconds % 60
        
        setCurrentDuration(durationMinutes)
        setCurrentDurationSeconds(remainingSeconds)
      }, 1000) // Update every second

      return () => clearInterval(interval)
    }
  }, [sessionStartTime])



  // Handle screen sharing stream changes - simplified for Deepgram focus
  useEffect(() => {
    console.log('InterviewInterface: Stream changed:', stream)
    if (stream) {
      console.log('Stream active status:', stream.active)
      console.log('Stream tracks:', stream.getTracks().map(track => ({
        kind: track.kind,
        enabled: track.enabled,
        readyState: track.readyState
      })))
      
      // For Deepgram, we only need audio tracks to exist - don't check readyState
      // Sometimes tracks appear ended but still work for voice detection
      const hasAudioTracks = stream.getAudioTracks().length > 0
      
      console.log('Stream is active:', stream.active, 'Has audio tracks:', hasAudioTracks)
      
      console.log('Audio track details:', stream.getAudioTracks().map(track => ({
        kind: track.kind,
        enabled: track.enabled,
        readyState: track.readyState,
        muted: track.muted
      })))
      
      if (hasAudioTracks) {
        console.log('🎯 Stream has audio tracks - voice detection available')
        setIsVideoLoading(false)
        // Note: Voice detection is now manual only - user must click the button to start
      } else {
        console.log('InterviewInterface: No audio tracks - stopping voice detection')
        // Stop voice detection if it's running
        if (isVoiceDetectionActive) {
          stopVoiceDetection()
        }
        setIsVideoLoading(false)
      }
    } else {
      console.log('InterviewInterface: No stream - stopping voice detection')
      // Stop voice detection if it's running
      if (isVoiceDetectionActive) {
        stopVoiceDetection()
      }
    }
  }, [stream])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup voice detection
      if (deepgramSTTRef.current) {
        deepgramSTTRef.current.stopTranscription()
      }
    }
  }, [])


  // Voice detection functions
  const startVoiceDetection = async () => {
    console.log('🎤 START VOICE DETECTION CALLED')
    try {
      if (!stream) {
        console.error('No stream available for voice detection')
        alert('No screen sharing stream available. Please start screen sharing first.')
        return
      }

      // Check if stream has audio tracks (for Deepgram voice detection)
      const hasAudioTracks = stream.getAudioTracks().length > 0
      const hasEnabledAudioTracks = stream.getAudioTracks().some(track => track.enabled && !track.muted)
      const hasLiveAudioTracks = stream.getAudioTracks().some(track => track.readyState === 'live')
      
      console.log('Stream active:', stream.active, 'Has audio tracks:', hasAudioTracks, 'Has enabled audio tracks:', hasEnabledAudioTracks, 'Has live audio tracks:', hasLiveAudioTracks)
      console.log('Audio track details:', stream.getAudioTracks().map(track => ({
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
        label: track.label
      })))
      
      // For Deepgram, we only need audio tracks to exist - don't check if they're enabled/muted
      // Sometimes tracks appear disabled but still work for voice detection
      if (!hasAudioTracks) {
        console.error('No audio tracks available for voice detection')
        alert('No audio tracks found in screen sharing. Please restart screen sharing with audio enabled to use voice detection.')
        return
      }
      
      // For screen sharing, even "ended" tracks can sometimes work with Deepgram
      // Only block if there are absolutely no audio tracks
      if (!hasAudioTracks) {
        console.error('No audio tracks at all - screen sharing session has ended')
        alert('Screen sharing session has ended. Please restart screen sharing to use voice detection.')
        return
      }
      
      console.log('Audio tracks exist (even if ended) - proceeding with voice detection for screen sharing')
      
      console.log('Proceeding with voice detection for screen sharing - attempting to use ended tracks')

      // Check if stream has audio tracks
      const audioTracks = stream.getAudioTracks()
      console.log('Audio tracks found:', audioTracks.length)
      console.log('Audio track details:', audioTracks.map(track => ({
        id: track.id,
        kind: track.kind,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
        settings: track.getSettings()
      })))

      if (audioTracks.length === 0) {
        console.error('No audio tracks in stream')
        alert('No audio detected in screen sharing. Please enable audio when sharing your screen.')
        return
      }

      // For screen sharing, proceed even with ended tracks - Deepgram might still work
      console.log('Attempting voice detection with current audio tracks (even if ended)')
      console.log('All audio track states:', audioTracks.map(track => ({
        readyState: track.readyState,
        muted: track.muted,
        enabled: track.enabled
      })))

      console.log('Starting voice detection...')
      
      // Show warning if tracks are ended
      const hasEndedTracks = audioTracks.some(track => track.readyState === 'ended')
      if (hasEndedTracks) {
        console.warn('⚠️ Audio tracks appear ended but attempting voice detection anyway')
      }

      // Initialize Deepgram STT
      if (!deepgramSTTRef.current) {
        deepgramSTTRef.current = new DeepgramSTT()
      }

      // Start transcription first, then set state only if successful
      await deepgramSTTRef.current.startTranscription(
        stream,
        (result: TranscriptionResult) => {
          console.log('InterviewInterface - Transcription result received:', result)
          console.log('InterviewInterface - Setting transcribed text:', result.text)
          setTranscribedText(result.text)
          setTranscriptionConfidence(result.confidence)
          
          if (result.isFinal) {
            console.log('InterviewInterface - Final transcription:', result.text)
            // Auto-generate AI answer for final transcriptions
            generateAIAnswer(result.text)
          }
        },
        (error: Error) => {
          console.error('InterviewInterface - Transcription error:', error)
          setIsVoiceDetectionActive(false)
          setIsTranscribing(false)
          alert('Voice detection error: ' + error.message)
        }
      )

      // Only set state to active after successful transcription start
      console.log('Voice detection started successfully')
      setIsVoiceDetectionActive(true)
      setIsTranscribing(true)

    } catch (error) {
      console.error('Error starting voice detection:', error)
      setIsVoiceDetectionActive(false)
      setIsTranscribing(false)
      alert('Failed to start voice detection: ' + (error as Error).message)
    }
  }

  const stopVoiceDetection = () => {
    console.log('🎤 STOPPING voice detection...')
    console.log('🎤 Before stop - isVoiceDetectionActive:', isVoiceDetectionActive)
    
    // Stop Deepgram transcription first
    if (deepgramSTTRef.current) {
      console.log('🎤 Stopping Deepgram transcription')
      deepgramSTTRef.current.stopTranscription()
    }
    
    // Reset all voice detection states
    console.log('🎤 Resetting voice detection states')
    setIsVoiceDetectionActive(false)
    setIsTranscribing(false)
    setTranscribedText('')
    setTranscriptionConfidence(0)
    
    console.log('🎤 Voice detection stopped successfully - isVoiceDetectionActive should now be false')
  }

  const generateAIAnswer = async (text: string) => {
    if (!text.trim()) return

    try {
      setIsGeneratingAnswer(true)
      console.log('Generating AI answer for:', text)

      const response = await fetch('/api/ai/generate-answer-from-transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: text,
          context: `Interview for ${interviewData.company} - ${interviewData.position}`,
          sessionId: sessionId
        }),
      })

      const data = await response.json()

      if (data.success) {
        setAiAnswer(data.answer)
        console.log('AI answer generated:', data.answer)
      } else {
        console.error('Error generating AI answer:', data.error)
        setAiAnswer('Error generating AI response')
      }
    } catch (error) {
      console.error('Error generating AI answer:', error)
      setAiAnswer('Error generating AI response')
    } finally {
      setIsGeneratingAnswer(false)
    }
  }


  const clearTranscript = () => {
    setTranscript('')
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleSendMessage = () => {
    if (manualMessage.trim()) {
      const newMessage = {
        id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'user' as const,
        content: manualMessage.trim(),
        timestamp: new Date()
      }
      setMessages(prev => [...prev, newMessage])
      setManualMessage('')
    }
  }

  const handleAiAnswer = async () => {
    setIsAiAnswering(true)
    
    try {
      // Simulate AI response
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const aiResponse = {
        id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'ai' as const,
        content: `Based on your interview for ${interviewData.position} at ${interviewData.company}, I can see you're discussing your experience. Could you elaborate more on your technical skills and how they relate to this role?`,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, aiResponse])
    } catch (error) {
      console.error('AI answer error:', error)
    } finally {
      setIsAiAnswering(false)
    }
  }

  // Function to update session status
  const updateSessionStatus = async (status: string, aiUsage?: number) => {
    console.log('updateSessionStatus called with:', { sessionId, userId, status, aiUsage })
    
    if (!sessionId || !userId) {
      console.log('Missing sessionId or userId - cannot update session status')
      console.log('sessionId:', sessionId, 'userId:', userId)
      return
    }

    try {
      console.log('Making API call to update session status...')
      
      const response = await fetch('/api/sessions/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          userId,
          status,
          aiUsage
        }),
      })

      const data = await response.json()
      console.log('Session status update response:', data)
      console.log('Response status:', response.status)
      
      if (data.success) {
        console.log('Session status updated successfully:', data.session)
      } else {
        console.error('Failed to update session status:', data.error)
        console.error('Full response:', data)
      }
    } catch (error) {
      console.error('Error updating session status:', error)
    }
  }

  const handleAnalyzeScreen = async () => {
    setIsAnalyzing(true)
    
    try {
      // Update AI usage count if sessionId and userId are available
      console.log('Analyze Screen clicked - sessionId:', sessionId, 'userId:', userId)
      
      if (sessionId && userId) {
        console.log('Calling API to update AI usage count...')
        console.log('SessionId type:', typeof sessionId, 'Value:', sessionId)
        console.log('UserId type:', typeof userId, 'Value:', userId)
        
        // Update session status to active (API will handle AI usage increment)
        await updateSessionStatus('active')
      } else {
        console.log('Missing sessionId or userId - cannot update AI usage count')
      }
      
      // Simulate screen analysis
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Generate dynamic analysis based on platform
      const analysisData = generateScreenAnalysis(platform)
      
      setScreenAnalysis(analysisData)
      
      const analysisResponse = {
        id: `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'ai' as const,
        content: `Screen Analysis Complete: ${analysisData.answer.join(' ')}`,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, analysisResponse])
    } catch (error) {
      console.error('Screen analysis error:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const generateScreenAnalysis = (platform: string) => {
    const analyses = {
      'Google Meet': {
        question: "What is currently being shown on the interviewer's shared screen?",
        answer: [
          "The interviewer is sharing their Google Meet homepage.",
          "The screen shows options to start a new meeting or join one using a code or link.",
          "There is a notification prompt asking to allow desktop notifications for incoming calls and updates.",
          "The left sidebar has options for 'Meetings' and 'Calls'.",
          "This is the main dashboard for Google Meet, where users can manage video calls and meetings."
        ]
      },
      'Zoom': {
        question: "What is currently being shown on the interviewer's shared screen?",
        answer: [
          "The interviewer is sharing their Zoom application interface.",
          "The screen displays meeting controls and participant options.",
          "There are options to start a new meeting, join with ID, or schedule meetings.",
          "The interface shows current meeting status and participant count.",
          "This appears to be the main Zoom dashboard for managing video conferences."
        ]
      },
      'Microsoft Teams': {
        question: "What is currently being shown on the interviewer's shared screen?",
        answer: [
          "The interviewer is sharing their Microsoft Teams interface.",
          "The screen shows team channels, chat options, and meeting controls.",
          "There are notifications and activity indicators visible.",
          "The left sidebar displays teams, channels, and recent conversations.",
          "This is the Teams workspace for collaboration and video meetings."
        ]
      },
      'Browser Tab': {
        question: "What is currently being shown on the interviewer's shared screen?",
        answer: [
          "The interviewer is sharing a web browser tab.",
          "The content appears to be a web application or website.",
          "There are various UI elements and navigation options visible.",
          "The page seems to be related to their work or the interview process.",
          "This is a browser-based application being used during the interview."
        ]
      },
      'Application Window': {
        question: "What is currently being shown on the interviewer's shared screen?",
        answer: [
          "The interviewer is sharing an application window.",
          "The screen shows a desktop application interface.",
          "There are various tools and features visible in the application.",
          "The content appears to be work-related software or tools.",
          "This is a desktop application being used during the interview process."
        ]
      }
    }
    
    return {
      question: analyses[platform as keyof typeof analyses]?.question || analyses['Browser Tab'].question,
      answer: analyses[platform as keyof typeof analyses]?.answer || analyses['Browser Tab'].answer,
      timestamp: new Date()
    }
  }

  const handleReconnect = async () => {
    try {
      // Request new screen sharing
      const newStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      })

      // Update the stream
      if (videoRef.current) {
        videoRef.current.srcObject = newStream
        await videoRef.current.play()
      }

      // Handle new stream end event
      const videoTrack = newStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.addEventListener('ended', () => {
          console.log('Screen sharing ended again')
          setShowReconnectModal(true)
        })
      }

      setShowReconnectModal(false)
      
      // Auto-analyze new screen
      setTimeout(() => {
        handleAnalyzeScreen()
      }, 1000)
      
    } catch (error) {
      console.error('Error reconnecting screen share:', error)
      // Keep the reconnect modal open if reconnection fails
    }
  }

  const handleEndInterview = () => {
    console.log('🚨 EXIT BUTTON CLICKED - STARTING EXIT PROCESS')
    setIsExiting(true) // Show visual indicator immediately
    
    console.log('InterviewInterface: Ending interview...')
    console.log('InterviewInterface: Stream exists:', !!stream)
    console.log('InterviewInterface: Stream tracks:', stream?.getTracks().length || 0)
    
    // Clear video element IMMEDIATELY for instant visual feedback
    if (videoRef.current) {
      console.log('🚨 CLEARING VIDEO ELEMENT IMMEDIATELY')
      videoRef.current.pause()
      videoRef.current.srcObject = null
      videoRef.current.load()
      // Show a black screen immediately
      videoRef.current.style.backgroundColor = 'black'
      videoRef.current.style.display = 'none' // Hide the video element completely
      console.log('🚨 VIDEO ELEMENT CLEARED AND HIDDEN')
    } else {
      console.log('🚨 NO VIDEO REF FOUND!')
    }
    
    // Stop voice detection
    if (isVoiceDetectionActive) {
      stopVoiceDetection()
    }
    
    // Stop screen sharing if stream exists - IMMEDIATELY
    if (stream) {
      console.log('🚨 STOPPING SCREEN SHARING IMMEDIATELY')
      const tracks = stream.getTracks()
      console.log('InterviewInterface: Found tracks to stop:', tracks.length)
      
      // Stop all tracks immediately and aggressively
      tracks.forEach(track => {
        console.log('🚨 STOPPING TRACK:', track.kind, track.label, 'State:', track.readyState)
        try {
          track.stop()
          console.log('🚨 TRACK STOPPED:', track.kind, 'New state:', track.readyState)
        } catch (error) {
          console.log('🚨 ERROR STOPPING TRACK:', error)
        }
      })
      
      // Also try to stop the stream itself
      try {
        if (stream.getTracks) {
          stream.getTracks().forEach(track => {
            if (track.readyState === 'live') {
              console.log('🚨 FORCE STOPPING LIVE TRACK:', track.kind)
              track.stop()
            }
          })
        }
      } catch (error) {
        console.log('🚨 ERROR IN FORCE STOP:', error)
      }
    } else {
      console.log('🚨 NO STREAM TO STOP')
    }
    
    // Also try to find and clear any other video elements that might be using the stream
    const allVideoElements = document.querySelectorAll('video')
    allVideoElements.forEach(video => {
      if (video.srcObject === stream) {
        console.log('InterviewInterface: Clearing additional video element')
        video.srcObject = null
        video.load()
      }
    })
    
    // Update session status to completed
    if (sessionId && userId) {
      console.log('Interview ended - setting session status to completed')
      updateSessionStatus('completed')
    }
    
    console.log('InterviewInterface: Calling onExit...')
    onExit()
  }

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Left Panel - Screen Sharing & Transcript */}
      <div className="w-2/5 bg-white border-r border-gray-200 flex flex-col">
        {/* Screen Share Preview */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-700">Screen Share</h3>
            <div className="flex space-x-2">
              {/* Voice Detection Toggle */}
        <button
          onClick={async (e) => {
            e.preventDefault()
            e.stopPropagation()
            console.log('🎤 VOICE BUTTON CLICKED - Current state:', {
              isVoiceDetectionActive,
              isTranscribing,
              hasStream: !!stream,
              hasAudioTracks: stream?.getAudioTracks().length || 0
            })
            
            // Prevent multiple rapid clicks
            if (isTranscribing) {
              console.log('🎤 Voice detection already starting, ignoring click')
              return
            }
            
            if (isVoiceDetectionActive) {
              console.log('🎤 TURNING OFF voice detection')
              stopVoiceDetection()
            } else {
              console.log('🎤 TURNING ON voice detection')
              try {
                await startVoiceDetection()
                console.log('🎤 Voice detection started successfully')
              } catch (error) {
                console.error('🎤 Error starting voice detection:', error)
                // State will be reset in the catch block of startVoiceDetection
              }
            }
          }}
          className={`px-3 py-1 text-xs rounded ${
            isVoiceDetectionActive 
              ? 'bg-green-100 hover:bg-green-200 text-green-700' 
              : isTranscribing
                ? 'bg-yellow-100 text-yellow-700 cursor-wait'
                : stream && stream.getAudioTracks().length > 0
                  ? 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                  : 'bg-red-100 text-red-500 cursor-not-allowed'
          }`}
          title={
            isVoiceDetectionActive 
              ? 'Stop Voice Detection' 
              : stream && stream.getAudioTracks().length > 0
                ? 'Start Voice Detection'
                : 'Screen sharing session ended - restart to use voice detection'
          }
          disabled={!stream || stream.getAudioTracks().length === 0 || isTranscribing}
        >
          {isVoiceDetectionActive ? '🎤 Voice ON' : isTranscribing ? '🎤 Starting...' : '🎤 Voice OFF'}
        </button>
        
        {/* Debug button to force voice detection */}
        {stream && stream.getAudioTracks().length > 0 && (
          <button
            onClick={() => {
              console.log('DEBUG: Force starting voice detection')
              console.log('Stream details:', {
                active: stream.active,
                tracks: stream.getTracks().length,
                audioTracks: stream.getAudioTracks().length,
                trackStates: stream.getAudioTracks().map(track => ({
                  readyState: track.readyState,
                  enabled: track.enabled,
                  muted: track.muted
                }))
              })
              startVoiceDetection()
            }}
            className="px-2 py-1 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded ml-1"
            title="Debug: Force start voice detection"
          >
            🔧 Debug
          </button>
        )}
              
              <div className="relative" ref={stopSharingRef}>
                <button 
                  onClick={() => setShowStopSharingOptions(!showStopSharingOptions)}
                  className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded"
                >
                  Stop Sharing
                </button>
                {showStopSharingOptions && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <button
                      onClick={() => {
                        console.log('User chose to reconnect screen sharing')
                        setShowStopSharingOptions(false)
                        // Stop current stream and show reconnect modal
                        if (stream) {
                          stream.getTracks().forEach(track => track.stop())
                          setShowReconnectModal(true)
                        }
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg"
                    >
                      🔄 Reconnect
                    </button>
                    <button
                      onClick={() => {
                        console.log('User chose to end interview')
                        setShowStopSharingOptions(false)
                        handleEndInterview()
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 rounded-b-lg"
                    >
                      ❌ End Interview
                    </button>
                  </div>
                )}
              </div>
              <button className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded">
                Fullscreen
              </button>
              <button className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded">
                Change Tab
              </button>
            </div>
          </div>
          <div className="text-xs text-gray-500 mb-2">2:29 - Tue 30 Sept</div>
          <div className="relative bg-black rounded-lg overflow-hidden" style={{ 
            aspectRatio: '16/9', 
            minHeight: '300px',
            maxHeight: '500px',
            width: '100%'
          }}>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain bg-black"
              style={{ 
                width: '100%', 
                height: '100%',
                minHeight: '300px',
                maxHeight: '500px',
                objectFit: 'contain'
              }}
            />
            {isExiting && (
              <div className="absolute inset-0 flex items-center justify-center text-white bg-red-600">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mb-2 mx-auto bg-red-700 animate-pulse">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <p className="text-sm font-bold">ENDING INTERVIEW...</p>
                </div>
              </div>
            )}
            
            {stream && isVideoLoading && (
              <div className="absolute inset-0 flex items-center justify-center text-white bg-black bg-opacity-50">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2 mx-auto"></div>
                  <p className="text-sm">Loading screen share...</p>
                  </div>
                </div>
            )}
              </div>
        </div>

        {/* Voice Detection Section */}
        {isVoiceDetectionActive && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Voice Detection</h4>
            
            {/* Transcription Status */}
            <div className="mb-3">
              <div className="flex items-center space-x-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${isTranscribing ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="text-xs text-gray-600">
                  {isTranscribing ? 'Listening...' : 'Voice detection active'}
                </span>
                {transcriptionConfidence > 0 && (
                  <span className="text-xs text-gray-500">
                    (Confidence: {Math.round(transcriptionConfidence * 100)}%)
                  </span>
                )}
              </div>
            </div>

            {/* Transcribed Text */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Transcribed Text:</label>
              <div className="bg-white p-2 rounded border text-sm text-gray-800 min-h-[60px] max-h-[120px] overflow-y-auto">
                {transcribedText || (isTranscribing ? 'Listening for speech...' : 'No speech detected yet')}
                </div>
              </div>

            {/* AI Answer */}
            {aiAnswer && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">AI Response:</label>
                <div className="bg-blue-50 p-2 rounded border text-sm text-gray-800 min-h-[60px] max-h-[120px] overflow-y-auto">
                  {isGeneratingAnswer ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span>Generating AI response...</span>
                    </div>
                  ) : (
                    aiAnswer
            )}
          </div>
        </div>
            )}

            {/* Pareeket AI Style Answers */}
            {pareeketAnswers.length > 0 && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">🎯 Pareeket AI - Interviewer Questions & Answers:</label>
                <div className="bg-green-50 p-2 rounded border text-sm text-gray-800 max-h-[200px] overflow-y-auto">
                  {pareeketAnswers.map((item, index) => (
                    <div key={index} className="mb-3 p-2 bg-white rounded border-l-4 border-green-500">
                      <div className="text-xs text-gray-500 mb-1">
                        {item.timestamp.toLocaleTimeString()}
                      </div>
                      <div className="font-medium text-gray-700 mb-1">
                        <strong>Q:</strong> {item.question}
                      </div>
                      <div className="text-gray-600">
                        <strong>A:</strong> {item.answer}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manual AI Answer Button */}
            {transcribedText && !isGeneratingAnswer && (
              <button
                onClick={() => generateAIAnswer(transcribedText)}
                className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
              >
                Generate AI Answer
              </button>
            )}
          </div>
        )}

        {/* Transcript Section */}
        <div className="flex-1 p-4 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <div className="flex space-x-4">
              <button className="text-sm font-medium text-blue-600 border-b-2 border-blue-600 pb-1">
                Transcript
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <label className="flex items-center text-xs text-gray-600">
                <input type="checkbox" className="mr-1" defaultChecked />
                AutoScroll
              </label>
            </div>
          </div>
          
          <div className="flex space-x-2 mb-3">
            <button
              onClick={() => {
                // This is the Connect button - it should start screen sharing
                console.log('Connect button clicked - this should start screen sharing')
              }}
              className="flex-1 px-3 py-2 text-sm rounded-md flex items-center justify-center space-x-2 bg-blue-100 text-blue-700 hover:bg-blue-200"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
              <span>Connect</span>
            </button>
            <button
              onClick={clearTranscript}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md flex items-center"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div 
            ref={transcriptRef}
            className="flex-1 bg-gray-50 rounded-lg p-3 overflow-y-auto text-sm text-gray-700 min-h-0"
          >
            {transcript ? (
              <p className="whitespace-pre-wrap">{transcript}</p>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <p>Listening...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - AI Chat Interface */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-gray-900">ParakeetAI</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              {formatTime(timeRemaining)} (Trial)
            </div>
            {currentDuration > 0 && (
              <div className="text-sm text-blue-600 font-medium">
                Elapsed: {currentDuration}m {currentDurationSeconds}s
              </div>
            )}
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>{interviewData.language}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <button
              onClick={handleEndInterview}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-md"
            >
              Exit
            </button>
          </div>
        </div>


        {/* Chat Messages Area */}
        <div className="flex-1 p-4 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-lg font-medium mb-2">No messages yet.</p>
                <p className="text-sm">Click 'AI Answer' to start!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex space-x-2 mb-3">
            <input
              type="text"
              value={manualMessage}
              onChange={(e) => setManualMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type a manual message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSendMessage}
              disabled={!manualMessage.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleAiAnswer}
              disabled={isAiAnswering}
              className="flex-1 px-4 py-3 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isAiAnswering ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>AI Thinking...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <span>AI Answer (Space)</span>
                </>
              )}
            </button>
            
            <button
              onClick={handleAnalyzeScreen}
              disabled={isAnalyzing}
              className="flex-1 px-4 py-3 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>Analyze Screen</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Reconnect Modal */}
      {showReconnectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Screen Sharing Disconnected</h3>
              <p className="text-gray-600 mb-6">
                Your screen sharing has been stopped. You can reconnect to continue the interview or end the session.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={handleReconnect}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Reconnect Screen
                </button>
                <button
                  onClick={handleEndInterview}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  End Interview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
