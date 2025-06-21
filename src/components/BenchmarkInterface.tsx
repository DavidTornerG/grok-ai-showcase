'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  BarChart3,
  Zap,
  Clock,
  Trophy,
  Play,
  Loader2,
  Download,
  RotateCcw,
  Target,
  XCircle,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { GROK_MODELS } from '@/config/models';

interface BenchmarkResult {
  model: string;
  status: 'success' | 'error';
  totalTime?: number;
  tokensGenerated?: number;
  tokensPerSecond?: number;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: string;
  timestamp: string;
}

interface BenchmarkSession {
  id: string;
  prompt: string;
  results: BenchmarkResult[];
  totalTested: number;
  successful: number;
  timestamp: string;
  isRunning: boolean;
}

export default function BenchmarkInterface() {
  const [prompt, setPrompt] = useState('Hello, how are you? Please respond briefly.');
  const [isRunning, setIsRunning] = useState(false);
  const [currentSession, setCurrentSession] = useState<BenchmarkSession | null>(null);
  const [sessions, setSessions] = useState<BenchmarkSession[]>([]);
  const [progress, setProgress] = useState(0);

  const startBenchmark = async (includeAll = true) => {
    if (isRunning) return;

    setIsRunning(true);
    setProgress(0);

    const sessionId = Date.now().toString();
    const newSession: BenchmarkSession = {
      id: sessionId,
      prompt: prompt.trim(),
      results: [],
      totalTested: 0,
      successful: 0,
      timestamp: new Date().toISOString(),
      isRunning: true
    };

    setCurrentSession(newSession);

    try {
      const response = await fetch('/api/benchmark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          includeAll
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      const completedSession: BenchmarkSession = {
        ...newSession,
        results: result.results,
        totalTested: result.totalTested,
        successful: result.successful,
        isRunning: false
      };

      setCurrentSession(completedSession);
      setSessions(prev => [completedSession, ...prev]);
      setProgress(100);

      toast.success(`Benchmark completed! Tested ${result.totalTested} models`);

    } catch (error) {
      console.error('Benchmark error:', error);
      toast.error('Failed to run benchmark. Please try again.');
    } finally {
      setIsRunning(false);
    }
  };

  const copyPrompt = (promptText: string) => {
    navigator.clipboard.writeText(promptText);
    setPrompt(promptText);
    toast.success('Prompt copied and set for re-use');
  };

  const clearBenchmarks = () => {
    setSessions([]);
    setCurrentSession(null);
    setProgress(0);
    toast.success('Benchmarks cleared');
  };

  const exportResults = (session: BenchmarkSession) => {
    const csv = [
      'Model,Status,Time(ms),Tokens,Tokens/sec,Error',
      ...session.results.map(r =>
        `${r.model},${r.status},${r.totalTime || ''},${r.tokensGenerated || ''},${r.tokensPerSecond?.toFixed(2) || ''},${r.error || ''}`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grok-benchmark-${session.id}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Results exported');
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getSpeedRank = (time: number, results: BenchmarkResult[]) => {
    const successfulTimes = results
      .filter(r => r.status === 'success' && r.totalTime !== undefined)
      .map(r => r.totalTime as number)
      .sort((a, b) => a - b);

    const rank = successfulTimes.indexOf(time) + 1;
    return rank;
  };

  const getSpeedBadge = (rank: number) => {
    if (rank === 1) return <Badge className="bg-yellow-500 text-yellow-900"><Trophy className="h-3 w-3 mr-1" />Fastest</Badge>;
    if (rank <= 3) return <Badge variant="secondary"><Zap className="h-3 w-3 mr-1" />Top 3</Badge>;
    return <Badge variant="outline">#{rank}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Benchmark Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Model Speed Benchmark</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Test Prompt</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter a prompt to test all models..."
              className="min-h-[80px]"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Button
              onClick={() => startBenchmark(true)}
              disabled={!prompt.trim() || isRunning}
              className="flex items-center space-x-2"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              <span>Benchmark All Models</span>
            </Button>

            <Button
              variant="outline"
              onClick={clearBenchmarks}
              disabled={isRunning}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {isRunning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Running benchmark...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Session Results */}
      {currentSession && (
        <Card className="shadow-md border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg flex items-center space-x-2">
              <Target className="h-5 w-5 text-primary" />
              <span>Latest Results</span>
              <Badge variant="outline" className="ml-2 bg-muted/40">
                {currentSession.successful}/{currentSession.totalTested} successful
              </Badge>
            </CardTitle>
            {!currentSession.isRunning && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportResults(currentSession)}
                className="flex items-center space-x-1 hover:bg-muted/50 transition-colors"
              >
                <Download className="h-4 w-4 mr-1" />
                <span>Export CSV</span>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 bg-accent/40 rounded-lg border border-border/30 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-1">Test Prompt:</p>
                  <p className="text-sm text-muted-foreground">{currentSession.prompt}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-2"
                  onClick={() => copyPrompt(currentSession.prompt)}
                  title="Copy prompt for re-use"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {currentSession.results.map((result, index) => {
                    const modelData = GROK_MODELS.find(m => m.id === result.model);

                    return (
                      <div key={result.model} className="p-3 border rounded-lg transition-colors hover:bg-accent/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center
                            ${result.status === 'success' && result.totalTime !== undefined ?
                              (getSpeedRank(result.totalTime, currentSession.results) <= 1 ? 'bg-green-500/20 text-green-500' :
                               getSpeedRank(result.totalTime, currentSession.results) <= 3 ? 'bg-yellow-500/20 text-yellow-500' :
                               'bg-blue-500/20 text-blue-500') :
                              'bg-red-500/20 text-red-500'}`}>
                            {result.status === 'success' && result.totalTime !== undefined ?
                              (getSpeedRank(result.totalTime, currentSession.results) <= 1 ? <Trophy className="h-4 w-4" /> :
                               getSpeedRank(result.totalTime, currentSession.results) <= 3 ? <Zap className="h-4 w-4" /> :
                               <Clock className="h-4 w-4" />) :
                              <XCircle className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{modelData?.name || result.model}</p>
                            <p className="text-xs text-muted-foreground">{modelData?.category || ''}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          {result.status === 'success' && result.totalTime !== undefined ? (
                            <>
                              {getSpeedBadge(getSpeedRank(result.totalTime, currentSession.results))}
                              <Badge variant="outline" className="flex items-center space-x-1 bg-muted/40">
                                <Clock className="h-3 w-3 mr-1" />
                                <span>{formatTime(result.totalTime)}</span>
                              </Badge>
                              {result.tokensPerSecond && (
                                <Badge variant="outline" className="bg-muted/40 text-primary">
                                  {result.tokensPerSecond.toFixed(1)} t/s
                                </Badge>
                              )}
                            </>
                          ) : (
                            <Badge variant="destructive" className="opacity-90">
                              {result.error?.substring(0, 30) || 'Error'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Previous Sessions */}
      {sessions.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Previous Benchmarks</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {sessions.slice(1).map((session, index) => (
                  <div key={session.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm">
                          {new Date(session.timestamp).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {session.successful}/{session.totalTested} models successful
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyPrompt(session.prompt)}
                          title="Copy prompt for re-use"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => exportResults(session)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      "{session.prompt}"
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Speed Estimates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Expected Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {GROK_MODELS.filter(m => m.category !== 'image-generation').map((model) => (
              <div key={model.id} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{model.name}</p>
                  <Badge
                    variant={model.speed === 'fastest' ? 'default' : 'outline'}
                    className="text-xs"
                  >
                    {model.speed}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{model.description}</p>
                <div className="flex justify-between text-xs">
                  <span>Input: {model.pricing.input}</span>
                  <span>Output: {model.pricing.output}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
