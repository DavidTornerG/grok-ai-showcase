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
  Swords,
  Trophy,
  Crown,
  Zap,
  Timer,
  Users,
  ThumbsUp,
  ThumbsDown,
  Star,
  Medal,
  Target,
  Flame,
  TrendingUp,
  BarChart3,
  Play,
  Pause,
  RefreshCw,
  Eye,
  Coins,
  Award,
  ChevronUp,
  ChevronDown,
  Clock,
  Brain,
  Sparkles,
  Rocket,
  Shield,
  Sword,
  Settings,
  Filter,
  Search,
  Calendar,
  MapPin,
  Globe
} from 'lucide-react';

interface BattleResult {
  id: string;
  prompt: string;
  model1: string;
  model2: string;
  response1: string;
  response2: string;
  votes: {
    model1: number;
    model2: number;
  };
  metrics: {
    model1: BattleMetrics;
    model2: BattleMetrics;
  };
  winner?: string;
  timestamp: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  status: 'live' | 'completed' | 'upcoming';
  spectators: number;
  totalVotes: number;
}

interface BattleMetrics {
  responseTime: number;
  quality: number;
  creativity: number;
  accuracy: number;
  relevance: number;
  overall: number;
}

interface LeaderboardEntry {
  model: string;
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
  avgScore: number;
  totalBattles: number;
  streak: number;
  rank: number;
  trend: 'up' | 'down' | 'stable';
  category: string;
}

interface User {
  id: string;
  name: string;
  avatar: string;
  level: number;
  xp: number;
  coins: number;
  badges: string[];
  votingAccuracy: number;
  predictions: number;
  correctPredictions: number;
}

const MODELS = [
  { id: 'grok-3-mini-fast-latest', name: 'Grok 3 Mini Fast', color: 'rgb(59, 130, 246)', icon: '⚡' },
  { id: 'grok-3-mini-latest', name: 'Grok 3 Mini', color: 'rgb(147, 51, 234)', icon: '🧠' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', color: 'rgb(34, 197, 94)', icon: '🤖' },
  { id: 'claude-3-haiku', name: 'Claude Haiku', color: 'rgb(249, 115, 22)', icon: '🎭' }
];

const BATTLE_CATEGORIES = [
  'Creative Writing',
  'Code Generation',
  'Problem Solving',
  'Analysis & Research',
  'Humor & Entertainment',
  'Technical Explanation',
  'Storytelling',
  'Math & Logic'
];

const DIFFICULTIES = [
  { level: 'Easy', color: 'rgb(34, 197, 94)', points: 10 },
  { level: 'Medium', color: 'rgb(249, 115, 22)', points: 25 },
  { level: 'Hard', color: 'rgb(239, 68, 68)', points: 50 },
  { level: 'Expert', color: 'rgb(147, 51, 234)', points: 100 }
];

const STORAGE_KEY = 'ai-battle-arena';
const USER_STORAGE_KEY = 'ai-battle-user';

export default function AIBattleArena() {
  // Core battle state
  const [battles, setBattles] = useState<BattleResult[]>([]);
  const [currentBattle, setCurrentBattle] = useState<BattleResult | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isGeneratingBattle, setIsGeneratingBattle] = useState(false);
  const [battleProgress, setBattleProgress] = useState(0);

  // User state
  const [user, setUser] = useState<User>({
    id: 'user-1',
    name: 'AI Enthusiast',
    avatar: '🎯',
    level: 1,
    xp: 0,
    coins: 500,
    badges: [],
    votingAccuracy: 0,
    predictions: 0,
    correctPredictions: 0
  });

  // UI state
  const [activeTab, setActiveTab] = useState<'live' | 'create' | 'leaderboard' | 'history'>('live');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Load saved data
  useEffect(() => {
    try {
      const savedBattles = localStorage.getItem(STORAGE_KEY);
      if (savedBattles) {
        const data = JSON.parse(savedBattles);
        setBattles(data.battles || []);
        setLeaderboard(data.leaderboard || []);
      } else {
        // Initialize with sample battles
        initializeSampleData();
      }

      const savedUser = localStorage.getItem(USER_STORAGE_KEY);
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.error('Failed to load Battle Arena data:', error);
      initializeSampleData();
    }
  }, []);

  // Save data when it changes
  const saveData = useCallback(() => {
    try {
      const data = { battles, leaderboard };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to save Battle Arena data:', error);
    }
  }, [battles, leaderboard, user]);

  useEffect(() => {
    saveData();
  }, [saveData]);

  // Initialize sample data
  const initializeSampleData = useCallback(() => {
    const sampleBattles: BattleResult[] = [
      {
        id: 'battle-1',
        prompt: 'Write a haiku about artificial intelligence',
        model1: 'grok-3-mini-fast-latest',
        model2: 'gpt-4o-mini',
        response1: 'Silicon neurons spark,\nThoughts emerge from code and dream—\nMind meets its mirror.',
        response2: 'Digital wisdom,\nLearning patterns in the void—\nAI awakens.',
        votes: { model1: 234, model2: 189 },
        metrics: {
          model1: { responseTime: 1200, quality: 4.5, creativity: 4.8, accuracy: 4.2, relevance: 4.6, overall: 4.5 },
          model2: { responseTime: 1800, quality: 4.2, creativity: 4.1, accuracy: 4.4, relevance: 4.3, overall: 4.25 }
        },
        winner: 'grok-3-mini-fast-latest',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        category: 'Creative Writing',
        difficulty: 'Medium',
        status: 'completed',
        spectators: 1247,
        totalVotes: 423
      },
      {
        id: 'battle-2',
        prompt: 'Explain quantum computing in simple terms',
        model1: 'claude-3-haiku',
        model2: 'grok-3-mini-latest',
        response1: 'Quantum computing uses quantum bits that can be 0, 1, or both simultaneously...',
        response2: 'Think of quantum computers as magical calculators that explore all possible answers...',
        votes: { model1: 156, model2: 198 },
        metrics: {
          model1: { responseTime: 2100, quality: 4.1, creativity: 3.8, accuracy: 4.6, relevance: 4.4, overall: 4.2 },
          model2: { responseTime: 1600, quality: 4.3, creativity: 4.2, accuracy: 4.1, relevance: 4.3, overall: 4.22 }
        },
        winner: 'grok-3-mini-latest',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        category: 'Technical Explanation',
        difficulty: 'Hard',
        status: 'completed',
        spectators: 892,
        totalVotes: 354
      }
    ];

    const sampleLeaderboard: LeaderboardEntry[] = [
      {
        model: 'grok-3-mini-fast-latest',
        wins: 45,
        losses: 23,
        ties: 2,
        winRate: 0.643,
        avgScore: 4.32,
        totalBattles: 70,
        streak: 3,
        rank: 1,
        trend: 'up',
        category: 'Overall'
      },
      {
        model: 'grok-3-mini-latest',
        wins: 38,
        losses: 28,
        ties: 4,
        winRate: 0.543,
        avgScore: 4.18,
        totalBattles: 70,
        streak: 1,
        rank: 2,
        trend: 'stable',
        category: 'Overall'
      },
      {
        model: 'gpt-4o-mini',
        wins: 41,
        losses: 26,
        ties: 3,
        winRate: 0.586,
        avgScore: 4.25,
        totalBattles: 70,
        streak: 2,
        rank: 3,
        trend: 'down',
        category: 'Overall'
      },
      {
        model: 'claude-3-haiku',
        wins: 32,
        losses: 35,
        ties: 3,
        winRate: 0.457,
        avgScore: 4.02,
        totalBattles: 70,
        streak: 0,
        rank: 4,
        trend: 'down',
        category: 'Overall'
      }
    ];

    setBattles(sampleBattles);
    setLeaderboard(sampleLeaderboard);
    setCurrentBattle(sampleBattles[0]);
  }, []);

  // Generate new battle
  const generateBattle = useCallback(async () => {
    if (selectedModels.length !== 2) {
      toast.warning('Please select exactly 2 models for battle');
      return;
    }

    if (!customPrompt.trim()) {
      toast.warning('Please enter a prompt for the battle');
      return;
    }

    setIsGeneratingBattle(true);
    setBattleProgress(0);

    try {
      // Simulate battle generation
      for (let i = 0; i <= 100; i += 10) {
        setBattleProgress(i);
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      const newBattle: BattleResult = {
        id: `battle-${Date.now()}`,
        prompt: customPrompt,
        model1: selectedModels[0],
        model2: selectedModels[1],
        response1: 'Model response will be generated...',
        response2: 'Model response will be generated...',
        votes: { model1: 0, model2: 0 },
        metrics: {
          model1: {
            responseTime: 1000 + Math.random() * 2000,
            quality: 3 + Math.random() * 2,
            creativity: 3 + Math.random() * 2,
            accuracy: 3 + Math.random() * 2,
            relevance: 3 + Math.random() * 2,
            overall: 3 + Math.random() * 2
          },
          model2: {
            responseTime: 1000 + Math.random() * 2000,
            quality: 3 + Math.random() * 2,
            creativity: 3 + Math.random() * 2,
            accuracy: 3 + Math.random() * 2,
            relevance: 3 + Math.random() * 2,
            overall: 3 + Math.random() * 2
          }
        },
        timestamp: new Date().toISOString(),
        category: selectedCategory === 'all' ? 'Creative Writing' : selectedCategory,
        difficulty: selectedDifficulty === 'all' ? 'Medium' : selectedDifficulty as any,
        status: 'live',
        spectators: Math.floor(Math.random() * 1000) + 100,
        totalVotes: 0
      };

      setBattles(prev => [newBattle, ...prev]);
      setCurrentBattle(newBattle);
      setActiveTab('live');

      // Award user XP for creating battle
      setUser(prev => ({
        ...prev,
        xp: prev.xp + 25,
        coins: prev.coins + 10
      }));

      toast.success('Battle created! Responses are being generated...');
      setCustomPrompt('');
      setSelectedModels([]);

    } catch (error) {
      console.error('Battle generation error:', error);
      toast.error('Failed to create battle');
    } finally {
      setIsGeneratingBattle(false);
      setBattleProgress(0);
    }
  }, [customPrompt, selectedModels, selectedCategory, selectedDifficulty]);

  // Vote on battle
  const voteOnBattle = useCallback((battleId: string, modelChoice: string) => {
    setBattles(prev => prev.map(battle => {
      if (battle.id === battleId) {
        const updatedVotes = { ...battle.votes };
        const modelKey = modelChoice === battle.model1 ? 'model1' : 'model2';
        updatedVotes[modelKey]++;

        // Determine winner
        const totalVotes = updatedVotes.model1 + updatedVotes.model2;
        let winner;
        if (updatedVotes.model1 > updatedVotes.model2) {
          winner = battle.model1;
        } else if (updatedVotes.model2 > updatedVotes.model1) {
          winner = battle.model2;
        }

        return {
          ...battle,
          votes: updatedVotes,
          totalVotes,
          winner,
          status: totalVotes >= 10 ? 'completed' : 'live'
        };
      }
      return battle;
    }));

    // Award user XP for voting
    setUser(prev => ({
      ...prev,
      xp: prev.xp + 5,
      coins: prev.coins + 2,
      predictions: prev.predictions + 1
    }));

    toast.success('Vote cast! +5 XP, +2 coins');
  }, []);

  // Get model info
  const getModelInfo = useCallback((modelId: string) => {
    return MODELS.find(m => m.id === modelId) || MODELS[0];
  }, []);

  // Filter battles
  const filteredBattles = battles.filter(battle => {
    const matchesSearch = battle.prompt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || battle.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'all' || battle.difficulty === selectedDifficulty;
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  return (
    <div className="w-full p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-3">
          <Swords className="w-8 h-8 text-red-500" />
          AI Model Battle Arena
          <Trophy className="w-8 h-8 text-yellow-500" />
        </h1>
        <p className="text-muted-foreground">
          Watch AI models compete head-to-head in epic battles • Vote, predict, and climb the leaderboards!
        </p>
      </div>

      {/* User Profile Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-2xl">
                {user.avatar}
              </div>
              <div>
                <h3 className="font-semibold">{user.name}</h3>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Level {user.level}
                  </span>
                  <span className="flex items-center gap-1">
                    <Coins className="w-3 h-3 text-yellow-500" />
                    {user.coins}
                  </span>
                  <span className="flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    {user.votingAccuracy > 0 ? `${(user.votingAccuracy * 100).toFixed(1)}%` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">{user.xp}</div>
                <div className="text-xs text-muted-foreground">XP</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{user.correctPredictions}/{user.predictions}</div>
                <div className="text-xs text-muted-foreground">Predictions</div>
              </div>
              <Progress value={(user.xp % 100)} className="w-20 h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <Card>
        <CardContent className="p-2">
          <div className="flex items-center justify-center gap-2">
            {[
              { id: 'live', label: 'Live Battles', icon: <Flame className="w-4 h-4" /> },
              { id: 'create', label: 'Create Battle', icon: <Swords className="w-4 h-4" /> },
              { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy className="w-4 h-4" /> },
              { id: 'history', label: 'Battle History', icon: <Clock className="w-4 h-4" /> }
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

      {/* Live Battles Tab */}
      {activeTab === 'live' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Battle */}
          <div className="lg:col-span-2">
            {currentBattle ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Flame className="w-5 h-5 text-red-500" />
                      Live Battle
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="animate-pulse border-red-500 text-red-500">
                        <div className="w-2 h-2 bg-red-500 rounded-full mr-1" />
                        LIVE
                      </Badge>
                      <Badge variant="secondary">
                        <Eye className="w-3 h-3 mr-1" />
                        {currentBattle.spectators}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Battle Prompt */}
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <h3 className="font-medium mb-2">Battle Prompt:</h3>
                    <p className="text-sm">{currentBattle.prompt}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="outline">{currentBattle.category}</Badge>
                      <Badge
                        variant="outline"
                        style={{
                          color: DIFFICULTIES.find(d => d.level === currentBattle.difficulty)?.color,
                          borderColor: DIFFICULTIES.find(d => d.level === currentBattle.difficulty)?.color
                        }}
                      >
                        {currentBattle.difficulty}
                      </Badge>
                    </div>
                  </div>

                  {/* Model Responses */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Model 1 */}
                    <Card className="border-2 hover:border-primary/50 transition-colors">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
                              style={{ backgroundColor: getModelInfo(currentBattle.model1).color + '20' }}
                            >
                              {getModelInfo(currentBattle.model1).icon}
                            </div>
                            <span className="font-medium text-sm">{getModelInfo(currentBattle.model1).name}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {currentBattle.votes.model1} votes
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm bg-muted/20 p-3 rounded">{currentBattle.response1}</p>

                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>Response Time:</span>
                            <span>{Math.round(currentBattle.metrics.model1.responseTime)}ms</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span>Overall Score:</span>
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              {currentBattle.metrics.model1.overall.toFixed(1)}
                            </span>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => voteOnBattle(currentBattle.id, currentBattle.model1)}
                          style={{ backgroundColor: getModelInfo(currentBattle.model1).color }}
                        >
                          <ThumbsUp className="w-3 h-3 mr-1" />
                          Vote for {getModelInfo(currentBattle.model1).icon}
                        </Button>
                      </CardContent>
                    </Card>

                    {/* VS Divider */}
                    <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 hidden md:block">
                      <div className="bg-background border border-border rounded-full w-12 h-12 flex items-center justify-center shadow-lg">
                        <span className="font-bold text-lg">VS</span>
                      </div>
                    </div>

                    {/* Model 2 */}
                    <Card className="border-2 hover:border-primary/50 transition-colors">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
                              style={{ backgroundColor: getModelInfo(currentBattle.model2).color + '20' }}
                            >
                              {getModelInfo(currentBattle.model2).icon}
                            </div>
                            <span className="font-medium text-sm">{getModelInfo(currentBattle.model2).name}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {currentBattle.votes.model2} votes
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm bg-muted/20 p-3 rounded">{currentBattle.response2}</p>

                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>Response Time:</span>
                            <span>{Math.round(currentBattle.metrics.model2.responseTime)}ms</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span>Overall Score:</span>
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              {currentBattle.metrics.model2.overall.toFixed(1)}
                            </span>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => voteOnBattle(currentBattle.id, currentBattle.model2)}
                          style={{ backgroundColor: getModelInfo(currentBattle.model2).color }}
                        >
                          <ThumbsUp className="w-3 h-3 mr-1" />
                          Vote for {getModelInfo(currentBattle.model2).icon}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Vote Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Community Vote Progress</span>
                      <span>{currentBattle.totalVotes} total votes</span>
                    </div>
                    <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="absolute left-0 top-0 h-full transition-all duration-500"
                        style={{
                          width: `${(currentBattle.votes.model1 / Math.max(currentBattle.totalVotes, 1)) * 100}%`,
                          backgroundColor: getModelInfo(currentBattle.model1).color
                        }}
                      />
                      <div
                        className="absolute right-0 top-0 h-full transition-all duration-500"
                        style={{
                          width: `${(currentBattle.votes.model2 / Math.max(currentBattle.totalVotes, 1)) * 100}%`,
                          backgroundColor: getModelInfo(currentBattle.model2).color
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{currentBattle.votes.model1} votes ({((currentBattle.votes.model1 / Math.max(currentBattle.totalVotes, 1)) * 100).toFixed(1)}%)</span>
                      <span>{currentBattle.votes.model2} votes ({((currentBattle.votes.model2 / Math.max(currentBattle.totalVotes, 1)) * 100).toFixed(1)}%)</span>
                    </div>
                  </div>

                  {/* Winner Announcement */}
                  {currentBattle.winner && (
                    <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                        <Crown className="w-5 h-5" />
                        <span className="font-bold">Winner: {getModelInfo(currentBattle.winner).name} {getModelInfo(currentBattle.winner).icon}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Swords className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-lg font-medium mb-2">No Active Battle</p>
                  <p className="text-muted-foreground mb-4">Create a new battle to get started!</p>
                  <Button onClick={() => setActiveTab('create')}>
                    <Rocket className="w-4 h-4 mr-2" />
                    Create Battle
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Battle Queue & Stats */}
          <div className="space-y-4">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Arena Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Active Battles</span>
                  <Badge variant="secondary">{battles.filter(b => b.status === 'live').length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Total Spectators</span>
                  <Badge variant="secondary">{battles.reduce((sum, b) => sum + b.spectators, 0)}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Battles Today</span>
                  <Badge variant="secondary">{battles.filter(b => new Date(b.timestamp).toDateString() === new Date().toDateString()).length}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Recent Battles */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recent Battles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {battles.slice(0, 5).map((battle) => (
                    <Card
                      key={battle.id}
                      className="p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setCurrentBattle(battle)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <span className="text-xs">{getModelInfo(battle.model1).icon}</span>
                            <span className="text-xs font-medium">vs</span>
                            <span className="text-xs">{getModelInfo(battle.model2).icon}</span>
                          </div>
                          <Badge
                            variant={battle.status === 'live' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {battle.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {battle.prompt}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{battle.totalVotes} votes</span>
                          <span>{new Date(battle.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Create Battle Tab */}
      {activeTab === 'create' && (
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="w-5 h-5" />
                Create New Battle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Battle Prompt</label>
                <Textarea
                  placeholder="Enter an engaging prompt for the AI models to battle with..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="all">Select Category</option>
                    {BATTLE_CATEGORIES.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Difficulty</label>
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="all">Select Difficulty</option>
                    {DIFFICULTIES.map(diff => (
                      <option key={diff.level} value={diff.level}>{diff.level} (+{diff.points} points)</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Select Models (Choose 2)</label>
                <div className="grid grid-cols-2 gap-3">
                  {MODELS.map((model) => (
                    <Card
                      key={model.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedModels.includes(model.id)
                          ? 'ring-2 ring-primary border-primary'
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => {
                        if (selectedModels.includes(model.id)) {
                          setSelectedModels(prev => prev.filter(id => id !== model.id));
                        } else if (selectedModels.length < 2) {
                          setSelectedModels(prev => [...prev, model.id]);
                        } else {
                          setSelectedModels([selectedModels[1], model.id]);
                        }
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
                            style={{ backgroundColor: model.color + '20' }}
                          >
                            {model.icon}
                          </div>
                          <div>
                            <h3 className="font-medium text-sm">{model.name}</h3>
                            <p className="text-xs text-muted-foreground">AI Model</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Selected: {selectedModels.length}/2 models
                </p>
              </div>

              {isGeneratingBattle && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Creating battle...</span>
                    <span className="text-sm">{Math.round(battleProgress)}%</span>
                  </div>
                  <Progress value={battleProgress} className="h-2" />
                </div>
              )}

              <Button
                onClick={generateBattle}
                disabled={isGeneratingBattle || selectedModels.length !== 2 || !customPrompt.trim()}
                className="w-full"
              >
                {isGeneratingBattle ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Creating Battle...
                  </>
                ) : (
                  <>
                    <Swords className="w-4 h-4 mr-2" />
                    Start Battle Arena
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Global Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leaderboard.map((entry) => {
                const modelInfo = getModelInfo(entry.model);
                return (
                  <Card
                    key={entry.model}
                    className={`border-2 transition-all hover:shadow-md ${
                      entry.rank <= 3 ? 'border-yellow-500/30 bg-yellow-500/5' : ''
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <div className={`text-2xl font-bold ${
                              entry.rank === 1 ? 'text-yellow-500' :
                              entry.rank === 2 ? 'text-gray-400' :
                              entry.rank === 3 ? 'text-orange-500' : 'text-muted-foreground'
                            }`}>
                              #{entry.rank}
                            </div>
                            {entry.rank <= 3 && (
                              <Medal className={`w-4 h-4 mx-auto ${
                                entry.rank === 1 ? 'text-yellow-500' :
                                entry.rank === 2 ? 'text-gray-400' :
                                'text-orange-500'
                              }`} />
                            )}
                          </div>

                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                            style={{ backgroundColor: modelInfo.color + '20' }}
                          >
                            {modelInfo.icon}
                          </div>

                          <div>
                            <h3 className="font-semibold">{modelInfo.name}</h3>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span>Win Rate: {(entry.winRate * 100).toFixed(1)}%</span>
                              <span>Avg Score: {entry.avgScore.toFixed(2)}</span>
                              <span>Battles: {entry.totalBattles}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              {entry.wins}W
                            </Badge>
                            <Badge variant="outline" className="text-red-600 border-red-600">
                              {entry.losses}L
                            </Badge>
                            {entry.ties > 0 && (
                              <Badge variant="outline" className="text-gray-600 border-gray-600">
                                {entry.ties}T
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Streak:</span>
                            <Badge
                              variant={entry.streak > 0 ? 'default' : 'secondary'}
                              className={entry.streak > 0 ? 'bg-green-600' : ''}
                            >
                              {entry.streak > 0 ? `+${entry.streak}` : entry.streak}
                            </Badge>
                            {entry.trend === 'up' && <ChevronUp className="w-4 h-4 text-green-500" />}
                            {entry.trend === 'down' && <ChevronDown className="w-4 h-4 text-red-500" />}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Battle History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search battles..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">All Categories</option>
                  {BATTLE_CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>

                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="px-3 py-2 border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">All Difficulties</option>
                  {DIFFICULTIES.map(diff => (
                    <option key={diff.level} value={diff.level}>{diff.level}</option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Battle History List */}
          <div className="space-y-4">
            {filteredBattles.map((battle) => (
              <Card
                key={battle.id}
                className="cursor-pointer hover:shadow-md transition-all"
                onClick={() => {
                  setCurrentBattle(battle);
                  setActiveTab('live');
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span>{getModelInfo(battle.model1).icon}</span>
                        <span className="text-sm font-medium">vs</span>
                        <span>{getModelInfo(battle.model2).icon}</span>
                      </div>
                      <Badge variant="outline">{battle.category}</Badge>
                      <Badge
                        variant="outline"
                        style={{
                          color: DIFFICULTIES.find(d => d.level === battle.difficulty)?.color,
                          borderColor: DIFFICULTIES.find(d => d.level === battle.difficulty)?.color
                        }}
                      >
                        {battle.difficulty}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={battle.status === 'live' ? 'default' : 'secondary'}
                        className={battle.status === 'live' ? 'animate-pulse' : ''}
                      >
                        {battle.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(battle.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm mb-3 line-clamp-2">{battle.prompt}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {battle.spectators}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" />
                        {battle.totalVotes}
                      </span>
                    </div>

                    {battle.winner && (
                      <div className="flex items-center gap-1 text-sm">
                        <Crown className="w-3 h-3 text-yellow-500" />
                        <span className="font-medium">Winner: {getModelInfo(battle.winner).icon}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
