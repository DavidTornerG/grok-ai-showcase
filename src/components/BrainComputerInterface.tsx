'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Brain,
  Zap,
  Heart,
  Activity,
  Waves,
  Eye,
  Smile,
  Frown,
  Meh,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Settings,
  Play,
  Pause,
  RefreshCw,
  Power,
  Wifi,
  WifiOff,
  Target,
  Lightbulb,
  Sparkles,
  Cpu,
  MonitorSpeaker,
  Headphones,
  Radio,
  Gauge,
  Timer,
  CircleDot,
  FlashIcon as Flash,
  Atom,
  Braces,
  Code,
  MessageSquare,
  Send,
  Download,
  Upload,
  Save,
  FileText,
  Users,
  Shield,
  Clock,
  Calendar,
  Database
} from 'lucide-react';

interface BiometricData {
  timestamp: number;
  heartRate: number;
  brainActivity: number;
  stressLevel: number;
  focusLevel: number;
  emotionalState: 'happy' | 'sad' | 'neutral' | 'excited' | 'anxious' | 'calm';
  cognitiveLoad: number;
  mentalFatigue: number;
}

interface ThoughtPattern {
  id: string;
  text: string;
  confidence: number;
  emotionalTone: string;
  intensity: number;
  timestamp: number;
  category: 'creative' | 'analytical' | 'emotional' | 'memory' | 'planning';
  processed: boolean;
}

interface EmotionMapping {
  emotion: string;
  color: string;
  icon: React.ReactNode;
  description: string;
  promptModifier: string;
}

interface BCISession {
  id: string;
  name: string;
  startTime: number;
  duration: number;
  thoughtsProcessed: number;
  promptsGenerated: number;
  averageConfidence: number;
  dominantEmotion: string;
  biometricData: BiometricData[];
}

const EMOTION_MAPPINGS: EmotionMapping[] = [
  {
    emotion: 'happy',
    color: 'rgb(34, 197, 94)',
    icon: <Smile className="w-4 h-4" />,
    description: 'Positive, optimistic state',
    promptModifier: 'with enthusiasm and positivity'
  },
  {
    emotion: 'sad',
    color: 'rgb(59, 130, 246)',
    icon: <Frown className="w-4 h-4" />,
    description: 'Melancholic, introspective state',
    promptModifier: 'with depth and emotional nuance'
  },
  {
    emotion: 'neutral',
    color: 'rgb(107, 114, 128)',
    icon: <Meh className="w-4 h-4" />,
    description: 'Balanced, objective state',
    promptModifier: 'with clarity and objectivity'
  },
  {
    emotion: 'excited',
    color: 'rgb(249, 115, 22)',
    icon: <Zap className="w-4 h-4" />,
    description: 'High energy, enthusiastic state',
    promptModifier: 'with energy and dynamic creativity'
  },
  {
    emotion: 'anxious',
    color: 'rgb(239, 68, 68)',
    icon: <AlertCircle className="w-4 h-4" />,
    description: 'Concerned, heightened awareness',
    promptModifier: 'with careful consideration and attention to detail'
  },
  {
    emotion: 'calm',
    color: 'rgb(147, 51, 234)',
    icon: <Heart className="w-4 h-4" />,
    description: 'Peaceful, centered state',
    promptModifier: 'with tranquility and wisdom'
  }
];

const THOUGHT_CATEGORIES = [
  { name: 'creative', color: 'rgb(147, 51, 234)', icon: <Lightbulb className="w-4 h-4" /> },
  { name: 'analytical', color: 'rgb(59, 130, 246)', icon: <Brain className="w-4 h-4" /> },
  { name: 'emotional', color: 'rgb(239, 68, 68)', icon: <Heart className="w-4 h-4" /> },
  { name: 'memory', color: 'rgb(34, 197, 94)', icon: <Database className="w-4 h-4" /> },
  { name: 'planning', color: 'rgb(249, 115, 22)', icon: <Target className="w-4 h-4" /> }
];

const STORAGE_KEY = 'brain-computer-interface';

export default function BrainComputerInterface() {
  // Core BCI state
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState(0);
  const [currentBiometrics, setCurrentBiometrics] = useState<BiometricData | null>(null);
  const [thoughtPatterns, setThoughtPatterns] = useState<ThoughtPattern[]>([]);
  const [sessions, setSessions] = useState<BCISession[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState<'monitor' | 'thoughts' | 'prompts' | 'sessions' | 'settings'>('monitor');
  const [selectedThought, setSelectedThought] = useState<ThoughtPattern | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isProcessingThought, setIsProcessingThought] = useState(false);

  // Settings
  const [sensitivityLevel, setSensitivityLevel] = useState(5);
  const [emotionAmplification, setEmotionAmplification] = useState(3);
  const [noiseFilter, setNoiseFilter] = useState(7);
  const [autoProcessing, setAutoProcessing] = useState(true);

  // Real-time data simulation
  const dataIntervalRef = useRef<NodeJS.Timeout>();
  const thoughtGenerationRef = useRef<NodeJS.Timeout>();

  // Load saved data
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        setSessions(data.sessions || []);
        setThoughtPatterns(data.thoughtPatterns || []);
      }
    } catch (error) {
      console.error('Failed to load BCI data:', error);
    }
  }, []);

  // Save data when it changes
  const saveData = useCallback(() => {
    try {
      const data = {
        sessions,
        thoughtPatterns: thoughtPatterns.slice(-100) // Keep only last 100
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save BCI data:', error);
    }
  }, [sessions, thoughtPatterns]);

  useEffect(() => {
    saveData();
  }, [saveData]);

  // Simulate BCI connection
  const connectBCI = useCallback(async () => {
    setIsConnected(false);
    setConnectionQuality(0);

    // Simulate connection process
    for (let i = 0; i <= 100; i += 10) {
      setConnectionQuality(i);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setIsConnected(true);
    toast.success('Brain-Computer Interface connected successfully!');

    // Start real-time data simulation
    dataIntervalRef.current = setInterval(() => {
      if (isRecording) {
        const newBiometrics: BiometricData = {
          timestamp: Date.now(),
          heartRate: 60 + Math.random() * 40,
          brainActivity: Math.random() * 100,
          stressLevel: Math.random() * 100,
          focusLevel: Math.random() * 100,
          emotionalState: EMOTION_MAPPINGS[Math.floor(Math.random() * EMOTION_MAPPINGS.length)].emotion as any,
          cognitiveLoad: Math.random() * 100,
          mentalFatigue: Math.random() * 100
        };
        setCurrentBiometrics(newBiometrics);
      }
    }, 1000);

    // Simulate thought pattern detection
    thoughtGenerationRef.current = setInterval(() => {
      if (isRecording && Math.random() > 0.7) {
        generateThoughtPattern();
      }
    }, 3000);

  }, [isRecording]);

  // Disconnect BCI
  const disconnectBCI = useCallback(() => {
    setIsConnected(false);
    setIsRecording(false);
    setConnectionQuality(0);
    setCurrentBiometrics(null);

    if (dataIntervalRef.current) {
      clearInterval(dataIntervalRef.current);
    }
    if (thoughtGenerationRef.current) {
      clearInterval(thoughtGenerationRef.current);
    }

    toast.info('Brain-Computer Interface disconnected');
  }, []);

  // Start/stop recording
  const toggleRecording = useCallback(() => {
    if (!isConnected) {
      toast.warning('Please connect BCI device first');
      return;
    }

    setIsRecording(!isRecording);

    if (!isRecording) {
      // Start new session
      const newSession: BCISession = {
        id: `session-${Date.now()}`,
        name: `Session ${new Date().toLocaleString()}`,
        startTime: Date.now(),
        duration: 0,
        thoughtsProcessed: 0,
        promptsGenerated: 0,
        averageConfidence: 0,
        dominantEmotion: 'neutral',
        biometricData: []
      };
      setSessions(prev => [newSession, ...prev]);
      toast.success('Brain monitoring started');
    } else {
      toast.info('Brain monitoring stopped');
    }
  }, [isConnected, isRecording]);

  // Generate thought pattern
  const generateThoughtPattern = useCallback(() => {
    const thoughtTexts = [
      'I wonder how AI consciousness might emerge',
      'The relationship between creativity and technology',
      'Memory formation in neural networks',
      'What makes human intelligence unique',
      'The future of human-AI collaboration',
      'Emotions as drivers of innovation',
      'The nature of artificial creativity',
      'How thoughts become reality',
      'The intersection of mind and machine',
      'Exploring the unknown frontiers of AI'
    ];

    const categories: Array<ThoughtPattern['category']> = ['creative', 'analytical', 'emotional', 'memory', 'planning'];

    const newThought: ThoughtPattern = {
      id: `thought-${Date.now()}`,
      text: thoughtTexts[Math.floor(Math.random() * thoughtTexts.length)],
      confidence: 0.3 + Math.random() * 0.7,
      emotionalTone: currentBiometrics?.emotionalState || 'neutral',
      intensity: Math.random() * 100,
      timestamp: Date.now(),
      category: categories[Math.floor(Math.random() * categories.length)],
      processed: false
    };

    setThoughtPatterns(prev => [newThought, ...prev.slice(0, 49)]);

    if (autoProcessing && newThought.confidence > 0.7) {
      processThoughtToPrompt(newThought);
    }
  }, [currentBiometrics, autoProcessing]);

  // Process thought into prompt
  const processThoughtToPrompt = useCallback(async (thought: ThoughtPattern) => {
    setIsProcessingThought(true);
    setSelectedThought(thought);

    try {
      // Simulate neural processing
      await new Promise(resolve => setTimeout(resolve, 1500));

      const emotionMapping = EMOTION_MAPPINGS.find(em => em.emotion === thought.emotionalTone);
      const modifier = emotionMapping?.promptModifier || 'thoughtfully';

      const enhancedPrompt = `${thought.text} - Please explore this concept ${modifier}, considering both the technical and human aspects. Include insights about innovation, creativity, and the future implications.`;

      setGeneratedPrompt(enhancedPrompt);

      // Mark thought as processed
      setThoughtPatterns(prev => prev.map(t =>
        t.id === thought.id ? { ...t, processed: true } : t
      ));

      // Update session stats
      setSessions(prev => prev.map(session => {
        if (session.startTime === Math.max(...prev.map(s => s.startTime))) {
          return {
            ...session,
            promptsGenerated: session.promptsGenerated + 1,
            thoughtsProcessed: session.thoughtsProcessed + 1
          };
        }
        return session;
      }));

      toast.success('Thought processed into prompt!');

    } catch (error) {
      console.error('Thought processing error:', error);
      toast.error('Failed to process thought');
    } finally {
      setIsProcessingThought(false);
    }
  }, []);

  // Get emotion mapping
  const getEmotionMapping = useCallback((emotion: string) => {
    return EMOTION_MAPPINGS.find(em => em.emotion === emotion) || EMOTION_MAPPINGS[2];
  }, []);

  // Get thought category info
  const getThoughtCategory = useCallback((category: string) => {
    return THOUGHT_CATEGORIES.find(tc => tc.name === category) || THOUGHT_CATEGORIES[0];
  }, []);

  // Cleanup intervals
  useEffect(() => {
    return () => {
      if (dataIntervalRef.current) {
        clearInterval(dataIntervalRef.current);
      }
      if (thoughtGenerationRef.current) {
        clearInterval(thoughtGenerationRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-3">
          <Brain className="w-8 h-8 text-purple-500" />
          Brain-Computer Interface
          <Atom className="w-8 h-8 text-blue-500" />
        </h1>
        <p className="text-muted-foreground">
          Revolutionary thought-to-prompt technology with advanced emotion detection and neural analysis
        </p>
      </div>

      {/* Connection Status Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                isConnected ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
              }`}>
                {isConnected ? <Wifi className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="font-semibold">
                  {isConnected ? 'BCI Connected' : 'BCI Disconnected'}
                </h3>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>Quality: {connectionQuality}%</span>
                  <span className={`flex items-center gap-1 ${isRecording ? 'text-red-500' : ''}`}>
                    <CircleDot className="w-3 h-3" />
                    {isRecording ? 'Recording' : 'Standby'}
                  </span>
                  {currentBiometrics && (
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3 text-red-500" />
                      {Math.round(currentBiometrics.heartRate)} BPM
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isConnected ? (
                <Button onClick={connectBCI} className="bg-green-600 hover:bg-green-700">
                  <Power className="w-4 h-4 mr-2" />
                  Connect BCI
                </Button>
              ) : (
                <>
                  <Button
                    onClick={toggleRecording}
                    variant={isRecording ? 'destructive' : 'default'}
                  >
                    {isRecording ? (
                      <>
                        <Pause className="w-4 h-4 mr-2" />
                        Stop Recording
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Start Recording
                      </>
                    )}
                  </Button>
                  <Button onClick={disconnectBCI} variant="outline">
                    <Power className="w-4 h-4 mr-2" />
                    Disconnect
                  </Button>
                </>
              )}
            </div>
          </div>

          {connectionQuality > 0 && connectionQuality < 100 && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Connecting...</span>
                <span>{connectionQuality}%</span>
              </div>
              <Progress value={connectionQuality} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <Card>
        <CardContent className="p-2">
          <div className="flex items-center justify-center gap-2">
            {[
              { id: 'monitor', label: 'Neural Monitor', icon: <Activity className="w-4 h-4" /> },
              { id: 'thoughts', label: 'Thought Patterns', icon: <Brain className="w-4 h-4" /> },
              { id: 'prompts', label: 'Generated Prompts', icon: <MessageSquare className="w-4 h-4" /> },
              { id: 'sessions', label: 'Sessions', icon: <Calendar className="w-4 h-4" /> },
              { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> }
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab(tab.id as any)}
                className="flex items-center gap-2"
              >
                {tab.icon}
                {tab.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Neural Monitor Tab */}
      {activeTab === 'monitor' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Real-time Biometrics */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-500" />
                  Real-time Biometrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentBiometrics ? (
                  <div className="space-y-4">
                    {/* Heart Rate */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-medium">Heart Rate</span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{Math.round(currentBiometrics.heartRate)} BPM</div>
                        <Progress value={currentBiometrics.heartRate / 100 * 100} className="w-20 h-1 mt-1" />
                      </div>
                    </div>

                    {/* Brain Activity */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Brain className="w-4 h-4 text-purple-500" />
                        <span className="text-sm font-medium">Brain Activity</span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{Math.round(currentBiometrics.brainActivity)}%</div>
                        <Progress value={currentBiometrics.brainActivity} className="w-20 h-1 mt-1" />
                      </div>
                    </div>

                    {/* Focus Level */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium">Focus Level</span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{Math.round(currentBiometrics.focusLevel)}%</div>
                        <Progress value={currentBiometrics.focusLevel} className="w-20 h-1 mt-1" />
                      </div>
                    </div>

                    {/* Stress Level */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-medium">Stress Level</span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{Math.round(currentBiometrics.stressLevel)}%</div>
                        <Progress value={currentBiometrics.stressLevel} className="w-20 h-1 mt-1" />
                      </div>
                    </div>

                    {/* Emotional State */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm font-medium">Emotional State</span>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          {getEmotionMapping(currentBiometrics.emotionalState).icon}
                          <span className="text-sm font-medium capitalize">
                            {currentBiometrics.emotionalState}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg mb-2">No biometric data</p>
                    <p className="text-sm">Connect and start recording to see real-time data</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Emotion Visualization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Waves className="w-5 h-5 text-blue-500" />
                  Emotion Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {EMOTION_MAPPINGS.map((emotion) => (
                    <div
                      key={emotion.emotion}
                      className={`p-3 rounded-lg border transition-all ${
                        currentBiometrics?.emotionalState === emotion.emotion
                          ? 'ring-2 ring-primary border-primary bg-primary/5'
                          : 'border-border'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div style={{ color: emotion.color }}>
                          {emotion.icon}
                        </div>
                        <span className="text-sm font-medium capitalize">{emotion.emotion}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{emotion.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Neural Activity Visualization */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-blue-500" />
                  Neural Activity Waves
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center mb-4">
                  <div className="text-center text-muted-foreground">
                    <Waves className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">EEG Wave Visualization</p>
                    <p className="text-xs">Real-time neural activity patterns</p>
                  </div>
                </div>

                {/* Neural Frequency Bands */}
                <div className="space-y-3">
                  {[
                    { name: 'Alpha (8-12 Hz)', value: Math.random() * 100, color: 'rgb(147, 51, 234)' },
                    { name: 'Beta (12-30 Hz)', value: Math.random() * 100, color: 'rgb(59, 130, 246)' },
                    { name: 'Gamma (30-100 Hz)', value: Math.random() * 100, color: 'rgb(34, 197, 94)' },
                    { name: 'Theta (4-8 Hz)', value: Math.random() * 100, color: 'rgb(249, 115, 22)' }
                  ].map((band) => (
                    <div key={band.name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{band.name}</span>
                        <span>{Math.round(band.value)}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all duration-1000"
                          style={{
                            width: `${band.value}%`,
                            backgroundColor: band.color
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Cognitive Load */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-orange-500" />
                  Cognitive Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentBiometrics ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold mb-2">
                        {Math.round(currentBiometrics.cognitiveLoad)}%
                      </div>
                      <p className="text-sm text-muted-foreground">Cognitive Load</p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Mental Fatigue</span>
                        <span className="text-sm font-medium">
                          {Math.round(currentBiometrics.mentalFatigue)}%
                        </span>
                      </div>
                      <Progress value={currentBiometrics.mentalFatigue} className="h-2" />

                      <div className="text-xs text-muted-foreground text-center mt-4">
                        {currentBiometrics.cognitiveLoad < 30 ? 'Low cognitive load - Optimal for learning' :
                         currentBiometrics.cognitiveLoad < 70 ? 'Moderate cognitive load - Good focus state' :
                         'High cognitive load - Consider taking a break'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Gauge className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No cognitive data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Thought Patterns Tab */}
      {activeTab === 'thoughts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-500" />
                  Detected Thought Patterns ({thoughtPatterns.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {thoughtPatterns.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg mb-2">No thought patterns detected</p>
                    <p className="text-sm">Start recording to capture neural activity</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {thoughtPatterns.map((thought) => {
                      const emotionMapping = getEmotionMapping(thought.emotionalTone);
                      const categoryInfo = getThoughtCategory(thought.category);

                      return (
                        <Card
                          key={thought.id}
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            selectedThought?.id === thought.id ? 'ring-2 ring-primary' : ''
                          } ${thought.processed ? 'bg-green-50 dark:bg-green-950/20' : ''}`}
                          onClick={() => setSelectedThought(thought)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div style={{ color: categoryInfo.color }}>
                                  {categoryInfo.icon}
                                </div>
                                <Badge variant="outline" className="capitalize text-xs">
                                  {thought.category}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className="text-xs"
                                  style={{
                                    color: emotionMapping.color,
                                    borderColor: emotionMapping.color
                                  }}
                                >
                                  {emotionMapping.icon}
                                  {thought.emotionalTone}
                                </Badge>
                                {thought.processed && (
                                  <Badge variant="default" className="text-xs bg-green-600">
                                    Processed
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {(thought.confidence * 100).toFixed(0)}% confidence
                                </span>
                                {!thought.processed && (
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      processThoughtToPrompt(thought);
                                    }}
                                    disabled={isProcessingThought}
                                  >
                                    <Zap className="w-3 h-3 mr-1" />
                                    Process
                                  </Button>
                                )}
                              </div>
                            </div>

                            <p className="text-sm mb-3">{thought.text}</p>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Progress value={thought.confidence * 100} className="w-20 h-1" />
                                <span className="text-xs text-muted-foreground">
                                  Intensity: {Math.round(thought.intensity)}%
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(thought.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Thought Analysis Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Thought Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {THOUGHT_CATEGORIES.map((category) => {
                    const count = thoughtPatterns.filter(t => t.category === category.name).length;
                    return (
                      <div key={category.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div style={{ color: category.color }}>
                            {category.icon}
                          </div>
                          <span className="text-sm capitalize">{category.name}</span>
                        </div>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Processing Queue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Pending thoughts:</span>
                    <Badge variant="outline">
                      {thoughtPatterns.filter(t => !t.processed).length}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Processed:</span>
                    <Badge variant="outline">
                      {thoughtPatterns.filter(t => t.processed).length}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Avg confidence:</span>
                    <Badge variant="outline">
                      {thoughtPatterns.length > 0
                        ? Math.round(thoughtPatterns.reduce((sum, t) => sum + t.confidence, 0) / thoughtPatterns.length * 100)
                        : 0}%
                    </Badge>
                  </div>
                </div>

                {thoughtPatterns.filter(t => !t.processed).length > 0 && (
                  <Button
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => {
                      const unprocessed = thoughtPatterns.find(t => !t.processed);
                      if (unprocessed) processThoughtToPrompt(unprocessed);
                    }}
                    disabled={isProcessingThought}
                  >
                    <Flash className="w-3 h-3 mr-1" />
                    Process Next
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Generated Prompts Tab */}
      {activeTab === 'prompts' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-green-500" />
                Neural Prompt Generator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedThought && (
                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Source Thought:</h3>
                  <p className="text-sm text-muted-foreground mb-3">{selectedThought.text}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {selectedThought.category}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {selectedThought.emotionalTone}
                    </Badge>
                    <Badge variant="outline">
                      {(selectedThought.confidence * 100).toFixed(0)}% confidence
                    </Badge>
                  </div>
                </div>
              )}

              {isProcessingThought && (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-purple-500" />
                  <p className="text-lg font-medium mb-2">Processing Neural Patterns</p>
                  <p className="text-sm text-muted-foreground">
                    Converting thoughts into AI-optimized prompts...
                  </p>
                </div>
              )}

              {generatedPrompt && (
                <div className="space-y-4">
                  <h3 className="font-medium">Generated Prompt:</h3>
                  <Textarea
                    value={generatedPrompt}
                    onChange={(e) => setGeneratedPrompt(e.target.value)}
                    className="min-h-[120px]"
                    placeholder="Generated prompt will appear here..."
                  />

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedPrompt);
                        toast.success('Prompt copied to clipboard!');
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Copy Prompt
                    </Button>
                    <Button variant="outline">
                      <Send className="w-4 h-4 mr-2" />
                      Send to Chat
                    </Button>
                    <Button variant="outline">
                      <Save className="w-4 h-4 mr-2" />
                      Save to Library
                    </Button>
                  </div>
                </div>
              )}

              {!selectedThought && !isProcessingThought && !generatedPrompt && (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No prompt generated yet</p>
                  <p className="text-sm">Process a thought pattern to generate AI prompts</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Prompt Enhancement Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Enhancement Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Creativity Level</label>
                  <select className="w-full px-3 py-2 border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                    <option>Conservative</option>
                    <option>Balanced</option>
                    <option>Creative</option>
                    <option>Experimental</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Emotional Tone</label>
                  <select className="w-full px-3 py-2 border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                    <option>Auto-detect</option>
                    <option>Professional</option>
                    <option>Casual</option>
                    <option>Enthusiastic</option>
                    <option>Analytical</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Complexity</label>
                  <select className="w-full px-3 py-2 border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                    <option>Simple</option>
                    <option>Moderate</option>
                    <option>Complex</option>
                    <option>Expert</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              BCI Sessions History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No sessions recorded</p>
                <p className="text-sm">Start a recording session to see history</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => (
                  <Card key={session.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-medium">{session.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(session.startTime).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">
                            {Math.round(session.duration / 60000)}m
                          </div>
                          <div className="text-xs text-muted-foreground">Duration</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="font-medium">{session.thoughtsProcessed}</div>
                          <div className="text-muted-foreground">Thoughts</div>
                        </div>
                        <div>
                          <div className="font-medium">{session.promptsGenerated}</div>
                          <div className="text-muted-foreground">Prompts</div>
                        </div>
                        <div>
                          <div className="font-medium">{Math.round(session.averageConfidence * 100)}%</div>
                          <div className="text-muted-foreground">Avg Confidence</div>
                        </div>
                        <div>
                          <div className="font-medium capitalize">{session.dominantEmotion}</div>
                          <div className="text-muted-foreground">Dominant Emotion</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-500" />
                BCI Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sensitivity Settings */}
              <div className="space-y-4">
                <h3 className="font-medium">Neural Sensitivity</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Detection Sensitivity</span>
                      <span className="text-sm">{sensitivityLevel}/10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={sensitivityLevel}
                      onChange={(e) => setSensitivityLevel(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Emotion Amplification</span>
                      <span className="text-sm">{emotionAmplification}/10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={emotionAmplification}
                      onChange={(e) => setEmotionAmplification(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Noise Filter</span>
                      <span className="text-sm">{noiseFilter}/10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={noiseFilter}
                      onChange={(e) => setNoiseFilter(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Processing Options */}
              <div className="space-y-4">
                <h3 className="font-medium">Processing Options</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">Auto-process thoughts</span>
                      <p className="text-xs text-muted-foreground">
                        Automatically convert high-confidence thoughts to prompts
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoProcessing}
                      onChange={(e) => setAutoProcessing(e.target.checked)}
                      className="toggle"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Data Management */}
              <div className="space-y-4">
                <h3 className="font-medium">Data Management</h3>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export Sessions
                  </Button>
                  <Button variant="outline" size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Import Data
                  </Button>
                  <Button variant="destructive" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Clear All Data
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Device Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Device Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Device Type:</span>
                  <span className="font-medium">Neural Interface v2.1</span>
                </div>
                <div className="flex justify-between">
                  <span>Firmware:</span>
                  <span className="font-medium">BCI-2024.1.0</span>
                </div>
                <div className="flex justify-between">
                  <span>Calibration:</span>
                  <span className="font-medium text-green-600">Optimal</span>
                </div>
                <div className="flex justify-between">
                  <span>Battery:</span>
                  <span className="font-medium">87%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
