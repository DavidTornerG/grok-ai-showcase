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
  Zap,
  Brain,
  Dna,
  TestTube,
  BarChart3,
  Target,
  Sparkles,
  TrendingUp,
  FlaskConical,
  Beaker,
  RefreshCw,
  Play,
  Pause,
  Save,
  Download,
  Upload,
  Star,
  Trophy,
  Crown,
  Lightbulb,
  Rocket,
  Settings,
  Eye,
  Copy,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Clock,
  Users,
  Coins,
  ShoppingCart,
  Store
} from 'lucide-react';

interface PromptVariant {
  id: string;
  content: string;
  score: number;
  generation: number;
  parent?: string;
  mutations: string[];
  testResults: TestResult[];
  createdAt: string;
}

interface TestResult {
  model: string;
  responseTime: number;
  quality: number;
  relevance: number;
  creativity: number;
  accuracy: number;
  overall: number;
  response: string;
  tokensUsed: number;
}

interface ABTest {
  id: string;
  name: string;
  variants: string[];
  results: Map<string, TestResult[]>;
  winner?: string;
  confidence: number;
  isRunning: boolean;
  testCount: number;
}

interface MarketplacePrompt {
  id: string;
  title: string;
  content: string;
  category: string;
  author: string;
  price: number;
  rating: number;
  downloads: number;
  tags: string[];
  description: string;
  testResults: TestResult[];
}

const MODELS = [
  'grok-3-mini-fast-latest',
  'grok-3-mini-latest',
  'gpt-4o-mini',
  'claude-3-haiku-20240307'
];

const PROMPT_CATEGORIES = [
  'Creative Writing',
  'Code Generation',
  'Analysis & Research',
  'Business & Marketing',
  'Education & Learning',
  'Problem Solving',
  'Entertainment',
  'Data Processing'
];

const STORAGE_KEY = 'quantum-prompt-lab';
const MARKETPLACE_KEY = 'quantum-prompt-marketplace';

export default function QuantumPromptLab() {
  // Core state
  const [basePrompt, setBasePrompt] = useState('');
  const [variants, setVariants] = useState<PromptVariant[]>([]);
  const [currentGeneration, setCurrentGeneration] = useState(0);
  const [isEvolving, setIsEvolving] = useState(false);
  const [evolutionProgress, setEvolutionProgress] = useState(0);

  // A/B Testing state
  const [abTests, setAbTests] = useState<ABTest[]>([]);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [isRunningTest, setIsRunningTest] = useState(false);

  // Analytics state
  const [analytics, setAnalytics] = useState({
    totalTests: 0,
    averageImprovement: 0,
    bestVariant: null as PromptVariant | null,
    modelPerformance: new Map<string, number>()
  });

  // Marketplace state
  const [marketplacePrompts, setMarketplacePrompts] = useState<MarketplacePrompt[]>([]);
  const [userCredits, setUserCredits] = useState(1000);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // UI state
  const [activeTab, setActiveTab] = useState<'evolution' | 'testing' | 'analytics' | 'marketplace'>('evolution');
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

  // Load saved data
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        setVariants(data.variants || []);
        setCurrentGeneration(data.generation || 0);
        setAbTests(data.abTests || []);
        setAnalytics(data.analytics || {
          totalTests: 0,
          averageImprovement: 0,
          bestVariant: null,
          modelPerformance: new Map()
        });
      }

      const marketplace = localStorage.getItem(MARKETPLACE_KEY);
      if (marketplace) {
        setMarketplacePrompts(JSON.parse(marketplace));
      } else {
        // Initialize with sample marketplace prompts
        const samplePrompts: MarketplacePrompt[] = [
          {
            id: 'mp-1',
            title: 'Ultimate Code Review Assistant',
            content: 'Act as a senior software engineer reviewing code. Analyze the following code for bugs, performance issues, security vulnerabilities, and style improvements...',
            category: 'Code Generation',
            author: 'CodeMaster',
            price: 50,
            rating: 4.9,
            downloads: 1234,
            tags: ['code', 'review', 'bugs', 'security'],
            description: 'Professional-grade code review prompts used by top tech companies',
            testResults: []
          },
          {
            id: 'mp-2',
            title: 'Creative Story Generator Pro',
            content: 'You are a master storyteller. Create an engaging story with the following elements...',
            category: 'Creative Writing',
            author: 'StoryWeaver',
            price: 30,
            rating: 4.7,
            downloads: 892,
            tags: ['creative', 'story', 'fiction', 'narrative'],
            description: 'Generate compelling stories across any genre with perfect pacing',
            testResults: []
          }
        ];
        setMarketplacePrompts(samplePrompts);
        localStorage.setItem(MARKETPLACE_KEY, JSON.stringify(samplePrompts));
      }
    } catch (error) {
      console.error('Failed to load Quantum Lab data:', error);
    }
  }, []);

  // Save data when it changes
  const saveData = useCallback(() => {
    try {
      const data = {
        variants,
        generation: currentGeneration,
        abTests,
        analytics
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save Quantum Lab data:', error);
    }
  }, [variants, currentGeneration, abTests, analytics]);

  useEffect(() => {
    saveData();
  }, [saveData]);

  // Genetic Evolution Functions
  const mutatePrompt = useCallback((prompt: string): { content: string; mutations: string[] } => {
    const mutations = [];
    let mutated = prompt;

    // Random mutations
    const mutationTypes = [
      'add_adjective', 'add_context', 'change_tone', 'add_examples',
      'modify_structure', 'add_constraints', 'enhance_clarity'
    ];

    const selectedMutation = mutationTypes[Math.floor(Math.random() * mutationTypes.length)];
    mutations.push(selectedMutation);

    switch (selectedMutation) {
      case 'add_adjective':
        const adjectives = ['detailed', 'comprehensive', 'creative', 'analytical', 'thorough', 'innovative'];
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        mutated = `Please provide a ${adj} response. ${mutated}`;
        break;
      case 'add_context':
        mutated += ' Consider the broader context and implications.';
        break;
      case 'change_tone':
        const tones = ['professional', 'casual', 'technical', 'creative', 'analytical'];
        const tone = tones[Math.floor(Math.random() * tones.length)];
        mutated = `Respond in a ${tone} tone. ${mutated}`;
        break;
      case 'add_examples':
        mutated += ' Please include specific examples to illustrate your points.';
        break;
      case 'modify_structure':
        mutated = `Structure your response clearly. ${mutated} Organize your answer logically.`;
        break;
      case 'add_constraints':
        mutated += ' Keep your response concise but informative.';
        break;
      case 'enhance_clarity':
        mutated = `Please be clear and specific in your response. ${mutated}`;
        break;
    }

    return { content: mutated, mutations };
  }, []);

  const evolveGeneration = useCallback(async () => {
    if (!basePrompt.trim()) {
      toast.warning('Please enter a base prompt to evolve');
      return;
    }

    setIsEvolving(true);
    setEvolutionProgress(0);

    try {
      const newVariants: PromptVariant[] = [];

      // If first generation, create initial variants
      if (variants.length === 0) {
        for (let i = 0; i < 5; i++) {
          const { content, mutations } = mutatePrompt(basePrompt);
          newVariants.push({
            id: `gen-0-${i}`,
            content,
            score: 0,
            generation: 0,
            mutations,
            testResults: [],
            createdAt: new Date().toISOString()
          });
          setEvolutionProgress((i + 1) / 5 * 100);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } else {
        // Evolve from top performing variants
        const topVariants = variants
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);

        for (let i = 0; i < topVariants.length; i++) {
          const parent = topVariants[i];
          // Create 2 children from each top variant
          for (let j = 0; j < 2; j++) {
            const { content, mutations } = mutatePrompt(parent.content);
            newVariants.push({
              id: `gen-${currentGeneration + 1}-${i}-${j}`,
              content,
              score: 0,
              generation: currentGeneration + 1,
              parent: parent.id,
              mutations,
              testResults: [],
              createdAt: new Date().toISOString()
            });
          }
          setEvolutionProgress((i + 1) / topVariants.length * 100);
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      setVariants(prev => [...prev, ...newVariants]);
      setCurrentGeneration(prev => prev + 1);
      toast.success(`Generation ${currentGeneration + 1} evolved! Created ${newVariants.length} new variants.`);

    } catch (error) {
      console.error('Evolution error:', error);
      toast.error('Failed to evolve prompts');
    } finally {
      setIsEvolving(false);
      setEvolutionProgress(0);
    }
  }, [basePrompt, variants, currentGeneration, mutatePrompt]);

  // Testing Functions
  const runPromptTest = useCallback(async (variantId: string, model: string): Promise<TestResult> => {
    // Simulate API call to test prompt
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    return {
      model,
      responseTime: 500 + Math.random() * 2000,
      quality: 3 + Math.random() * 2,
      relevance: 3.5 + Math.random() * 1.5,
      creativity: 2.5 + Math.random() * 2.5,
      accuracy: 3 + Math.random() * 2,
      overall: 3.2 + Math.random() * 1.8,
      response: 'Sample AI response for testing...',
      tokensUsed: 100 + Math.floor(Math.random() * 400)
    };
  }, []);

  const startABTest = useCallback(async (testName: string, variantIds: string[]) => {
    const newTest: ABTest = {
      id: `test-${Date.now()}`,
      name: testName,
      variants: variantIds,
      results: new Map(),
      confidence: 0,
      isRunning: true,
      testCount: 0
    };

    setAbTests(prev => [...prev, newTest]);
    setIsRunningTest(true);

    try {
      // Run tests across all models
      for (const variantId of variantIds) {
        const results: TestResult[] = [];
        for (const model of MODELS) {
          const result = await runPromptTest(variantId, model);
          results.push(result);
        }
        newTest.results.set(variantId, results);
        newTest.testCount += results.length;
      }

      // Calculate winner
      let bestVariant = '';
      let bestScore = 0;

      newTest.results.forEach((results, variantId) => {
        const avgScore = results.reduce((sum, r) => sum + r.overall, 0) / results.length;
        if (avgScore > bestScore) {
          bestScore = avgScore;
          bestVariant = variantId;
        }
      });

      newTest.winner = bestVariant;
      newTest.confidence = 70 + Math.random() * 30; // Simulate confidence calculation
      newTest.isRunning = false;

      setAbTests(prev => prev.map(t => t.id === newTest.id ? newTest : t));
      toast.success(`A/B Test "${testName}" completed! Winner: ${bestVariant}`);

    } catch (error) {
      console.error('A/B Test error:', error);
      toast.error('A/B Test failed');
    } finally {
      setIsRunningTest(false);
    }
  }, [runPromptTest]);

  return (
    <div className="w-full p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-3">
          <Dna className="w-8 h-8 text-purple-500" />
          Quantum Prompt Engineering Lab
          <Sparkles className="w-8 h-8 text-yellow-500" />
        </h1>
        <p className="text-muted-foreground">
          Revolutionary AI-powered prompt optimization using genetic algorithms and advanced analytics
        </p>
      </div>

      {/* Navigation Tabs */}
      <Card>
        <CardContent className="p-2">
          <div className="flex items-center justify-center gap-2">
            {[
              { id: 'evolution', label: 'Genetic Evolution', icon: <Dna className="w-4 h-4" /> },
              { id: 'testing', label: 'A/B Testing', icon: <TestTube className="w-4 h-4" /> },
              { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
              { id: 'marketplace', label: 'Marketplace', icon: <Store className="w-4 h-4" /> }
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

      {/* Genetic Evolution Tab */}
      {activeTab === 'evolution' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Evolution Control Panel */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Evolution Control
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Base Prompt</label>
                  <Textarea
                    placeholder="Enter your base prompt to evolve..."
                    value={basePrompt}
                    onChange={(e) => setBasePrompt(e.target.value)}
                    className="min-h-[120px]"
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Current Generation</span>
                    <Badge variant="outline">{currentGeneration}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Variants</span>
                    <Badge variant="outline">{variants.length}</Badge>
                  </div>
                </div>

                {isEvolving && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Evolving...</span>
                      <span className="text-sm">{Math.round(evolutionProgress)}%</span>
                    </div>
                    <Progress value={evolutionProgress} className="h-2" />
                  </div>
                )}

                <Button
                  onClick={evolveGeneration}
                  disabled={isEvolving || !basePrompt.trim()}
                  className="w-full"
                >
                  {isEvolving ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Evolving...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4 mr-2" />
                      Evolve Generation
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Save className="w-4 h-4 mr-2" />
                  Save Session
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Upload className="w-4 h-4 mr-2" />
                  Import Session
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Variants Display */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FlaskConical className="w-5 h-5" />
                  Prompt Variants ({variants.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {variants.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Beaker className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg mb-2">No variants yet</p>
                    <p className="text-sm">Create your first generation to start evolving prompts!</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {variants
                      .sort((a, b) => b.generation - a.generation || b.score - a.score)
                      .map((variant) => (
                        <Card
                          key={variant.id}
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            selectedVariant === variant.id ? 'ring-2 ring-primary' : ''
                          }`}
                          onClick={() => setSelectedVariant(variant.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">Gen {variant.generation}</Badge>
                                {variant.score > 0 && (
                                  <Badge
                                    variant="outline"
                                    className="text-yellow-600 border-yellow-600"
                                  >
                                    ⭐ {variant.score.toFixed(1)}
                                  </Badge>
                                )}
                                {variant.parent && (
                                  <Badge variant="outline" className="text-xs">
                                    Child of {variant.parent}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(variant.content);
                                    toast.success('Prompt copied!');
                                  }}
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setVariants(prev => prev.filter(v => v.id !== variant.id));
                                    toast.success('Variant deleted');
                                  }}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>

                            <p className="text-sm mb-3 line-clamp-3">{variant.content}</p>

                            {variant.mutations.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-3">
                                {variant.mutations.map((mutation, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {mutation.replace('_', ' ')}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{new Date(variant.createdAt).toLocaleString()}</span>
                              <span>{variant.testResults.length} tests</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* A/B Testing Tab */}
      {activeTab === 'testing' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="w-5 h-5" />
                  Create A/B Test
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="Test name..." />
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Variants</label>
                  {variants.slice(0, 5).map((variant) => (
                    <div key={variant.id} className="flex items-center space-x-2">
                      <input type="checkbox" id={variant.id} />
                      <label htmlFor={variant.id} className="text-sm truncate">
                        Gen {variant.generation} - {variant.content.substring(0, 30)}...
                      </label>
                    </div>
                  ))}
                </div>
                <Button
                  className="w-full"
                  disabled={isRunningTest}
                  onClick={() => {
                    if (variants.length >= 2) {
                      startABTest('Test ' + (abTests.length + 1), variants.slice(0, 2).map(v => v.id));
                    }
                  }}
                >
                  {isRunningTest ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Running Test...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Start A/B Test
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>A/B Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                {abTests.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <TestTube className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No A/B tests yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {abTests.map((test) => (
                      <Card key={test.id} className="border">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-medium">{test.name}</h3>
                            <div className="flex items-center gap-2">
                              {test.isRunning ? (
                                <Badge variant="outline" className="animate-pulse">
                                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                  Running
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  <Trophy className="w-3 h-3 mr-1" />
                                  Complete
                                </Badge>
                              )}
                              {test.confidence && (
                                <Badge variant="secondary">
                                  {Math.round(test.confidence)}% confidence
                                </Badge>
                              )}
                            </div>
                          </div>

                          {test.winner && (
                            <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
                              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                                <Crown className="w-4 h-4" />
                                <span className="font-medium">Winner: {test.winner}</span>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-950/20 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics.totalTests}</p>
                  <p className="text-sm text-muted-foreground">Total Tests</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-950/20 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics.averageImprovement.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">Avg Improvement</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-950/20 rounded-lg">
                  <Dna className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{currentGeneration}</p>
                  <p className="text-sm text-muted-foreground">Generations</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-950/20 rounded-lg">
                  <Star className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{variants.length}</p>
                  <p className="text-sm text-muted-foreground">Variants Created</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Marketplace Tab */}
      {activeTab === 'marketplace' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Coins className="w-4 h-4" />
                  Your Credits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{userCredits}</div>
                <p className="text-xs text-muted-foreground">Available to spend</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`w-full text-left p-2 rounded text-sm transition-colors ${
                    selectedCategory === 'all' ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'
                  }`}
                >
                  All Categories
                </button>
                {PROMPT_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`w-full text-left p-2 rounded text-sm transition-colors ${
                      selectedCategory === category ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  Prompt Marketplace
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {marketplacePrompts
                    .filter(p => selectedCategory === 'all' || p.category === selectedCategory)
                    .map((prompt) => (
                      <Card key={prompt.id} className="border hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-medium mb-1">{prompt.title}</h3>
                              <p className="text-xs text-muted-foreground">by {prompt.author}</p>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-yellow-600">{prompt.price}💰</div>
                              <div className="flex items-center gap-1 text-xs">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                {prompt.rating}
                              </div>
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {prompt.description}
                          </p>

                          <div className="flex flex-wrap gap-1 mb-3">
                            {prompt.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="text-xs text-muted-foreground">
                              {prompt.downloads} downloads
                            </div>
                            <Button
                              size="sm"
                              disabled={userCredits < prompt.price}
                              onClick={() => {
                                if (userCredits >= prompt.price) {
                                  setUserCredits(prev => prev - prompt.price);
                                  setBasePrompt(prompt.content);
                                  setActiveTab('evolution');
                                  toast.success(`Purchased "${prompt.title}"! Added to evolution lab.`);
                                }
                              }}
                            >
                              <ShoppingCart className="w-3 h-3 mr-1" />
                              Buy
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
