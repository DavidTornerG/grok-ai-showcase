'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  Volume2,
  VolumeX,
  Send,
  Play,
  Pause,
  Square,
  Settings,
  Download,
  Trash2,
  Camera,
  Maximize2,
  Minimize2,
  PhoneCall,
  Phone,
  Radio
} from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  isPlaying?: boolean;
  audioUrl?: string;
  pausedAt?: number;
}

interface StreamStats {
  fps: number;
  framesAnalyzed: number;
  isLive: boolean;
  lastAnalysis: string;
  totalFramesCaptured: number;
  analysisSuccessRate: number;
}

interface AudioSettings {
  enabled: boolean;
  autoPlay: boolean;
  volume: number;
  voice: string;
  speed: number;
}

interface AnalysisSettings {
  autoAnalysis: boolean;
  analysisInterval: number;
  contextLength: number;
  sensitivity: 'low' | 'medium' | 'high';
}

interface AudioPlaybackState {
  messageId: string;
  audio: HTMLAudioElement;
  pausedAt: number;
  isPlaying: boolean;
}

export default function LiveViewInterface() {
  // Stream state
  const [isStreaming, setIsStreaming] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [streamStats, setStreamStats] = useState<StreamStats>({
    fps: 0,
    framesAnalyzed: 0,
    isLive: false,
    lastAnalysis: '',
    totalFramesCaptured: 0,
    analysisSuccessRate: 100
  });

  // Enhanced audio state with playback management
  const [audioPlaybackStates, setAudioPlaybackStates] = useState<Map<string, AudioPlaybackState>>(new Map());
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const [isVoiceCallActive, setIsVoiceCallActive] = useState(false);
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    enabled: true,
    autoPlay: true,
    volume: 80,
    voice: 'Rachel',
    speed: 1.0
  });

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Analysis settings
  const [analysisSettings, setAnalysisSettings] = useState<AnalysisSettings>({
    autoAnalysis: true,
    analysisInterval: 5,
    contextLength: 10,
    sensitivity: 'medium'
  });

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const voiceCallStreamRef = useRef<MediaStream | null>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fpsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const frameCountRef = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll with better dependency management
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
        inline: 'nearest'
      });
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages.length, scrollToBottom]);

  // Enhanced audio management with resume capability
  const toggleAudioPlayback = useCallback(async (messageId: string, content: string) => {
    const existingState = audioPlaybackStates.get(messageId);

    if (existingState) {
      // Toggle existing audio
      if (existingState.isPlaying) {
        // Pause and save position
        existingState.audio.pause();
        const pausedAt = existingState.audio.currentTime;

        setAudioPlaybackStates(prev => {
          const newMap = new Map(prev);
          newMap.set(messageId, {
            ...existingState,
            isPlaying: false,
            pausedAt
          });
          return newMap;
        });

        setCurrentlyPlayingId(null);
        setMessages(prev => prev.map(msg =>
          msg.id === messageId ? { ...msg, isPlaying: false, pausedAt } : msg
        ));
      } else {
        // Resume from paused position
        existingState.audio.currentTime = existingState.pausedAt;
        await existingState.audio.play();

        setAudioPlaybackStates(prev => {
          const newMap = new Map(prev);
          newMap.set(messageId, {
            ...existingState,
            isPlaying: true
          });
          return newMap;
        });

        setCurrentlyPlayingId(messageId);
        setMessages(prev => prev.map(msg =>
          msg.id === messageId ? { ...msg, isPlaying: true } : { ...msg, isPlaying: false }
        ));
      }
    } else {
      // Create new audio and start playing
      try {
        const response = await fetch('/api/live-view/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: content,
            voice: audioSettings.voice,
            speed: audioSettings.speed
          })
        });

        if (response.ok) {
          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          audio.volume = audioSettings.volume / 100;

          // Stop any currently playing audio
          if (currentlyPlayingId) {
            const currentState = audioPlaybackStates.get(currentlyPlayingId);
            if (currentState) {
              currentState.audio.pause();
            }
          }

          const newState: AudioPlaybackState = {
            messageId,
            audio,
            pausedAt: 0,
            isPlaying: true
          };

          audio.onended = () => {
            setAudioPlaybackStates(prev => {
              const newMap = new Map(prev);
              newMap.delete(messageId);
              return newMap;
            });
            setCurrentlyPlayingId(null);
            setMessages(prev => prev.map(msg =>
              msg.id === messageId ? { ...msg, isPlaying: false } : msg
            ));
            URL.revokeObjectURL(audioUrl);
          };

          await audio.play();

          setAudioPlaybackStates(prev => {
            const newMap = new Map(prev);
            newMap.set(messageId, newState);
            return newMap;
          });

          setCurrentlyPlayingId(messageId);
          setMessages(prev => prev.map(msg =>
            msg.id === messageId ? { ...msg, isPlaying: true, audioUrl } : { ...msg, isPlaying: false }
          ));
        }
      } catch (error) {
        console.error('TTS error:', error);
        toast.error('Failed to play audio');
      }
    }
  }, [audioPlaybackStates, audioSettings, currentlyPlayingId]);

  const stopAllAudio = useCallback(() => {
    audioPlaybackStates.forEach((state) => {
      state.audio.pause();
      if (state.audio.src) {
        URL.revokeObjectURL(state.audio.src);
      }
    });
    setAudioPlaybackStates(new Map());
    setCurrentlyPlayingId(null);
    setMessages(prev => prev.map(msg => ({ ...msg, isPlaying: false })));
  }, [audioPlaybackStates]);

  // Enhanced message management
  const addMessage = useCallback((type: 'user' | 'assistant' | 'system', content: string) => {
    const message: Message = {
      id: `${type}-${Date.now()}-${Math.random()}`,
      type,
      content,
      timestamp: new Date().toISOString(),
      isPlaying: false
    };
    setMessages(prev => [...prev, message]);
    return message;
  }, []);

  const clearMessages = useCallback(() => {
    stopAllAudio();
    setMessages([]);
    toast.success('Conversation cleared');
  }, [stopAllAudio]);

  const exportMessages = useCallback(() => {
    const exportData = {
      timestamp: new Date().toISOString(),
      messages: messages,
      stats: streamStats
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `live-view-session-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Session exported');
  }, [messages, streamStats]);

  // Enhanced frame capture with quality settings
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isStreaming) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) return null;

    const quality = analysisSettings.sensitivity === 'high' ? 0.9 :
                   analysisSettings.sensitivity === 'medium' ? 0.8 : 0.7;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/jpeg', quality);
  }, [isStreaming, analysisSettings.sensitivity]);

  // Enhanced frame analysis
  const analyzeFrame = useCallback(async (frame: string) => {
    if (!frame || isAnalyzing || !analysisSettings.autoAnalysis) return;

    try {
      setIsAnalyzing(true);

      const response = await fetch('/api/live-view/stream-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frame,
          context: messages.slice(-analysisSettings.contextLength),
          sensitivity: analysisSettings.sensitivity
        })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.shouldRespond && result.analysis) {
        const message = addMessage('assistant', result.analysis);

        setStreamStats(prev => ({
          ...prev,
          framesAnalyzed: prev.framesAnalyzed + 1,
          lastAnalysis: new Date().toLocaleTimeString(),
          analysisSuccessRate: Math.round(((prev.framesAnalyzed + 1) / prev.totalFramesCaptured) * 100)
        }));

        // Auto-play with priority for high-priority messages
        if (audioSettings.enabled && audioSettings.autoPlay) {
          setTimeout(() => {
            toggleAudioPlayback(message.id, result.analysis);
          }, 500);
        }
      }

      setStreamStats(prev => ({
        ...prev,
        totalFramesCaptured: prev.totalFramesCaptured + 1
      }));

    } catch (error) {
      console.error('Analysis error:', error);
      setStreamStats(prev => ({
        ...prev,
        totalFramesCaptured: prev.totalFramesCaptured + 1,
        analysisSuccessRate: Math.round((prev.framesAnalyzed / (prev.totalFramesCaptured + 1)) * 100)
      }));
    } finally {
      setIsAnalyzing(false);
    }
  }, [messages, isAnalyzing, analysisSettings, audioSettings, addMessage, toggleAudioPlayback]);

  // Enhanced screen capture with isolated audio streams
  const startScreenCapture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: 30,
          width: { ideal: 1920, max: 2560 },
          height: { ideal: 1080, max: 1440 }
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;

        stream.getTracks()[0].addEventListener('ended', () => {
          stopScreenCapture();
        });
      }

      setIsStreaming(true);
      setStreamStats(prev => ({ ...prev, isLive: true, totalFramesCaptured: 0, framesAnalyzed: 0 }));
      addMessage('system', 'Screen capture started. AI will analyze your screen activity based on your settings.');

      // Start FPS counter
      frameCountRef.current = 0;
      fpsIntervalRef.current = setInterval(() => {
        setStreamStats(prev => ({
          ...prev,
          fps: frameCountRef.current
        }));
        frameCountRef.current = 0;
      }, 1000);

      // Start frame analysis
      let frameCounter = 0;
      const analysisFrameInterval = Math.round(30 / (10 / analysisSettings.analysisInterval));

      analysisIntervalRef.current = setInterval(() => {
        frameCountRef.current++;
        frameCounter++;

        if (frameCounter >= analysisFrameInterval) {
          frameCounter = 0;
          const frame = captureFrame();
          if (frame) {
            analyzeFrame(frame);
          }
        }
      }, 33);

      toast.success('Screen capture started successfully');

    } catch (error) {
      console.error('Screen capture error:', error);
      toast.error('Failed to start screen capture. Please allow screen sharing permissions.');
    }
  }, [captureFrame, analyzeFrame, addMessage, analysisSettings.analysisInterval]);

  const stopScreenCapture = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }

    if (fpsIntervalRef.current) {
      clearInterval(fpsIntervalRef.current);
      fpsIntervalRef.current = null;
    }

    setIsStreaming(false);
    setStreamStats({
      fps: 0,
      framesAnalyzed: 0,
      isLive: false,
      lastAnalysis: '',
      totalFramesCaptured: 0,
      analysisSuccessRate: 100
    });
    addMessage('system', 'Screen capture stopped.');
    toast.success('Screen capture stopped');
  }, [addMessage]);

  // REWRITTEN VOICE CALL - SIMPLE & WORKING
  const startVoiceCall = useCallback(async () => {
    try {
      console.log('[Voice] Starting voice call...');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      voiceCallStreamRef.current = stream;
      setIsVoiceCallActive(true);

      toast.success('🎤 Voice call started! Speak for up to 10 seconds, then click "End Call"');
      addMessage('system', 'Voice call activated. Speak naturally, then click "End Call" to process your speech.');

      console.log('[Voice] Voice call started successfully');

    } catch (error) {
      console.error('[Voice] Failed to start voice call:', error);
      toast.error('Failed to start voice call. Please allow microphone access.');
    }
  }, [addMessage]);

  const stopVoiceCall = useCallback(async () => {
    if (!voiceCallStreamRef.current || !isVoiceCallActive) {
      console.log('[Voice] No active voice call to stop');
      return;
    }

    console.log('[Voice] Stopping voice call and processing audio...');
    setIsVoiceProcessing(true);

    try {
      // Create MediaRecorder to capture the audio
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(voiceCallStreamRef.current, { mimeType });
      const audioChunks: BlobPart[] = [];

      return new Promise<void>((resolve) => {
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          console.log('[Voice] Recording stopped, processing audio...');

          if (audioChunks.length > 0) {
            const audioBlob = new Blob(audioChunks, { type: mimeType });
            console.log('[Voice] Created audio blob:', audioBlob.size, 'bytes');

            if (audioBlob.size > 1000) {
              await processVoiceInput(audioBlob);
            } else {
              toast.warning('Recording too short. Please try again.');
            }
          }

          // Clean up
          if (voiceCallStreamRef.current) {
            voiceCallStreamRef.current.getTracks().forEach(track => track.stop());
            voiceCallStreamRef.current = null;
          }

          setIsVoiceCallActive(false);
          setIsVoiceProcessing(false);
          addMessage('system', 'Voice call ended.');
          resolve();
        };

        // Start recording and auto-stop after 10 seconds
        mediaRecorder.start();
        toast.info('🎙️ Recording for up to 10 seconds...');

        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, 10000);
      });

    } catch (error) {
      console.error('[Voice] Error processing voice call:', error);
      toast.error('Failed to process voice call');

      // Clean up on error
      if (voiceCallStreamRef.current) {
        voiceCallStreamRef.current.getTracks().forEach(track => track.stop());
        voiceCallStreamRef.current = null;
      }

      setIsVoiceCallActive(false);
      setIsVoiceProcessing(false);
    }
  }, [addMessage, isVoiceCallActive]);

  // Process voice input with ElevenLabs Scribe
  const processVoiceInput = useCallback(async (audioBlob: Blob) => {
    console.log('[Voice] Processing audio blob of size:', audioBlob.size);

    try {
      // Step 1: Transcribe with ElevenLabs Scribe
      console.log('[Voice] Transcribing audio...');
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-recording.webm');

      const transcribeResponse = await fetch('/api/live-view/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!transcribeResponse.ok) {
        const errorData = await transcribeResponse.json();
        console.error('[Voice] Transcription failed:', errorData);
        throw new Error(`Transcription failed: ${transcribeResponse.status}`);
      }

      const transcriptionResult = await transcribeResponse.json();
      const userText = transcriptionResult.text?.trim();

      if (!userText || userText.length < 3) {
        toast.warning('No speech detected. Please try again.');
        return;
      }

      console.log('[Voice] Transcribed text:', userText);
      toast.success(`🎤 Heard: "${userText}"`);

      // Add user message
      addMessage('user', userText);

      // Step 2: Get AI response
      console.log('[Voice] Getting AI response...');
      const screenshot = isStreaming ? captureFrame() : null;

      const chatResponse = await fetch('/api/live-view/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          screenshot: screenshot,
          context: messages.slice(-5)
        })
      });

      if (!chatResponse.ok) {
        throw new Error(`AI response failed: ${chatResponse.status}`);
      }

      const chatResult = await chatResponse.json();
      const aiResponse = chatResult.response;

      if (!aiResponse) {
        throw new Error('No AI response received');
      }

      console.log('[Voice] AI response received:', aiResponse);

      // Add AI message
      addMessage('assistant', aiResponse);

      // Step 3: Convert to speech and play
      if (audioSettings.enabled) {
        console.log('[Voice] Converting response to speech...');

        const ttsResponse = await fetch('/api/live-view/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: aiResponse })
        });

        if (ttsResponse.ok) {
          const audioBuffer = await ttsResponse.arrayBuffer();
          const responseAudioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
          const audioUrl = URL.createObjectURL(responseAudioBlob);

          const audio = new Audio(audioUrl);
          audio.volume = audioSettings.volume / 100;

          audio.onended = () => URL.revokeObjectURL(audioUrl);
          await audio.play();

          toast.success('🔊 AI responded with voice');
        } else {
          console.warn('[Voice] TTS failed, but got text response');
          toast.warning('Got AI response (text only - audio generation failed)');
        }
      }

    } catch (error) {
      console.error('[Voice] Voice processing error:', error);
      toast.error(`Voice processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [messages, audioSettings, addMessage, captureFrame, isStreaming]);

  // Enhanced message sending
  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || isSendingMessage) return;

    const userMessage = inputText.trim();
    setInputText('');
    setIsSendingMessage(true);

    const message = addMessage('user', userMessage);

    try {
      const screenshot = isStreaming ? captureFrame() : null;

      const response = await fetch('/api/live-view/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          screenshot: screenshot,
          context: messages.slice(-5)
        })
      });

      if (!response.ok) {
        throw new Error(`Chat failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.response) {
        const assistantMessage = addMessage('assistant', result.response);

        if (audioSettings.enabled && audioSettings.autoPlay) {
          setTimeout(() => {
            toggleAudioPlayback(assistantMessage.id, result.response);
          }, 500);
        }
      } else {
        throw new Error('No response received');
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to send message');
      addMessage('system', 'Error: Failed to get AI response. Please try again.');
    } finally {
      setIsSendingMessage(false);
    }
  }, [inputText, messages, audioSettings, addMessage, toggleAudioPlayback, isStreaming, captureFrame, isSendingMessage]);

  // Enhanced keyboard shortcuts
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else if (e.key === 'Escape') {
      stopAllAudio();
    }
  }, [sendMessage, stopAllAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (voiceCallStreamRef.current) {
        voiceCallStreamRef.current.getTracks().forEach(track => track.stop());
        voiceCallStreamRef.current = null;
      }
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
        analysisIntervalRef.current = null;
      }
      if (fpsIntervalRef.current) {
        clearInterval(fpsIntervalRef.current);
        fpsIntervalRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Advanced Live View</h1>
        <p className="text-muted-foreground">
          Real-time screen analysis with AI interaction - Enhanced with voice communication using ElevenLabs Scribe
        </p>
      </div>

      {/* Enhanced Controls Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={isStreaming ? stopScreenCapture : startScreenCapture}
                variant={isStreaming ? "destructive" : "default"}
                className="flex items-center gap-2"
              >
                {isStreaming ? (
                  <>
                    <MonitorOff className="w-4 h-4" />
                    Stop Stream
                  </>
                ) : (
                  <>
                    <Monitor className="w-4 h-4" />
                    Start Stream
                  </>
                )}
              </Button>

              {/* Voice Call Button */}
              <Button
                onClick={isVoiceCallActive ? stopVoiceCall : startVoiceCall}
                variant={isVoiceCallActive ? "destructive" : "secondary"}
                className={`flex items-center gap-2 ${isVoiceProcessing ? 'animate-pulse' : ''}`}
                disabled={isVoiceProcessing}
              >
                {isVoiceCallActive ? (
                  <>
                    <Phone className="w-4 h-4" />
                    {isVoiceProcessing ? 'Processing...' : 'End Call'}
                  </>
                ) : (
                  <>
                    <PhoneCall className="w-4 h-4" />
                    Voice Call
                  </>
                )}
              </Button>

              {/* Audio Controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAudioSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                >
                  {audioSettings.enabled ? (
                    <Volume2 className="w-4 h-4" />
                  ) : (
                    <VolumeX className="w-4 h-4" />
                  )}
                </Button>

                {currentlyPlayingId && (
                  <Button variant="outline" size="sm" onClick={stopAllAudio}>
                    <Square className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)}>
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={exportMessages}>
                <Download className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={clearMessages}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Enhanced Settings Panel */}
          {showSettings && (
            <>
              <Separator className="my-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <h4 className="font-semibold text-lg">Audio Settings</h4>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Auto-play responses</label>
                      <Switch
                        checked={audioSettings.autoPlay}
                        onCheckedChange={(checked) =>
                          setAudioSettings(prev => ({ ...prev, autoPlay: checked }))
                        }
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium">Volume: {audioSettings.volume}%</label>
                      <Slider
                        value={[audioSettings.volume]}
                        onValueChange={(value) =>
                          setAudioSettings(prev => ({ ...prev, volume: value[0] }))
                        }
                        max={100}
                        min={0}
                        step={5}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium">Speech Speed: {audioSettings.speed}x</label>
                      <Slider
                        value={[audioSettings.speed]}
                        onValueChange={(value) =>
                          setAudioSettings(prev => ({ ...prev, speed: value[0] }))
                        }
                        max={2}
                        min={0.5}
                        step={0.1}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="font-semibold text-lg">Analysis Settings</h4>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Auto-analysis</label>
                      <Switch
                        checked={analysisSettings.autoAnalysis}
                        onCheckedChange={(checked) =>
                          setAnalysisSettings(prev => ({ ...prev, autoAnalysis: checked }))
                        }
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium">Analysis Interval: {analysisSettings.analysisInterval}s</label>
                      <Slider
                        value={[analysisSettings.analysisInterval]}
                        onValueChange={(value) =>
                          setAnalysisSettings(prev => ({ ...prev, analysisInterval: value[0] }))
                        }
                        max={15}
                        min={3}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium">Context Length: {analysisSettings.contextLength} messages</label>
                      <Slider
                        value={[analysisSettings.contextLength]}
                        onValueChange={(value) =>
                          setAnalysisSettings(prev => ({ ...prev, contextLength: value[0] }))
                        }
                        max={20}
                        min={5}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Full-width Live Screen Capture */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">Live Screen Capture</CardTitle>
          <div className="flex items-center gap-2">
            {streamStats.isLive && (
              <Badge variant="destructive" className="animate-pulse">
                LIVE
              </Badge>
            )}
            {streamStats.fps > 0 && (
              <Badge variant="secondary">
                {streamStats.fps} FPS
              </Badge>
            )}
            {isVoiceCallActive && (
              <Badge variant="default" className="animate-pulse">
                <Radio className="w-3 h-3 mr-1" />
                VOICE ACTIVE
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`relative bg-black rounded-lg overflow-hidden transition-all duration-300 ${
              isFullscreen ? 'fixed inset-4 z-50' : 'w-full'
            }`}
            style={{ aspectRatio: isFullscreen ? 'auto' : '16/9' }}
          >
            <video
              ref={videoRef}
              autoPlay
              muted
              className="w-full h-full object-contain"
            />
            {!isStreaming && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <Monitor className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No screen capture active</p>
                  <p className="text-sm mt-2">Click "Start Stream" to begin</p>
                </div>
              </div>
            )}

            {isStreaming && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 text-white hover:bg-black/50"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>

          {/* Enhanced Stats */}
          {streamStats.isLive && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Frames Analyzed</p>
                <p className="font-medium">{streamStats.framesAnalyzed}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Captured</p>
                <p className="font-medium">{streamStats.totalFramesCaptured}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Success Rate</p>
                <p className="font-medium">{streamStats.analysisSuccessRate}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Analysis</p>
                <p className="font-medium">{streamStats.lastAnalysis || 'None'}</p>
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </CardContent>
      </Card>

      {/* AI Conversation Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">AI Conversation</CardTitle>
          <div className="flex items-center gap-2">
            {isAnalyzing && (
              <Badge variant="secondary" className="animate-pulse">
                Analyzing
              </Badge>
            )}
            {currentlyPlayingId && (
              <Badge variant="secondary" className="animate-pulse">
                Speaking
              </Badge>
            )}
            {isVoiceProcessing && (
              <Badge variant="default" className="animate-pulse">
                Processing Voice
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-96 w-full border rounded-lg p-4 overflow-y-auto">
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <p>Start a conversation, begin screen capture, or start a voice call</p>
                  <p className="text-sm mt-2">AI will analyze your screen and provide insights</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.type === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 relative ${
                        message.type === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : message.type === 'system'
                          ? 'bg-muted text-muted-foreground text-sm'
                          : 'bg-muted'
                      } ${message.isPlaying ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs opacity-70">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                        {message.type === 'assistant' && audioSettings.enabled && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 ml-2"
                            onClick={() => toggleAudioPlayback(message.id, message.content)}
                          >
                            {message.isPlaying ? (
                              <Pause className="w-3 h-3" />
                            ) : (
                              <Volume2 className="w-3 h-3" />
                            )}
                          </Button>
                        )}
                      </div>
                      {message.isPlaying && (
                        <div className="absolute -top-1 -right-1">
                          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Text Input */}
          <div className="flex items-center gap-2">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a message or use the Voice Call feature for speech-to-text conversation..."
              onKeyPress={handleKeyPress}
              className="flex-1"
              disabled={isSendingMessage}
            />
            <Button
              onClick={sendMessage}
              disabled={!inputText.trim() || isSendingMessage}
              className="min-w-[44px]"
            >
              {isSendingMessage ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Press Enter to send, Escape to stop all audio</p>
            <p>• Click volume icons on messages to play/pause/resume</p>
            <p>• Use "Voice Call" for speech-to-text conversation with ElevenLabs Scribe</p>
            <p>• AI analyzes your screen every {analysisSettings.analysisInterval}s when streaming</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
