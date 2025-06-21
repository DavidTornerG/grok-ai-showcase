'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import ModelSelector from './ModelSelector';
import {
  Send,
  Bot,
  User,
  Clock,
  Zap,
  Settings,
  Loader2,
  Copy,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Code,
  Play
} from 'lucide-react';
import { toast } from 'sonner';

interface FunctionCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result: Record<string, unknown>;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'function';
  content: string;
  timestamp: Date;
  model?: string;
  functionCalls?: FunctionCall[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export default function FunctionCallingInterface() {
  const [selectedModel, setSelectedModel] = useState('grok-3-fast-latest');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [toolsExpanded, setToolsExpanded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const copyUserMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    setInput(content); // Also set it as current input for easy re-use
    toast.success('Message copied and set for re-use');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const clearChat = () => {
    setMessages([]);
    setResponseTime(null);
    toast.success('Function chat cleared');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const startTime = Date.now();

      const response = await fetch('/api/functions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          toolChoice: 'auto'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const endTime = Date.now();
      setResponseTime(endTime - startTime);

      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: result.choices[0].message.content || 'Function call initiated',
        timestamp: new Date(),
        model: selectedModel,
        functionCalls: result.toolCallResults || undefined,
        usage: result.usage
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Function calling error:', error);
      toast.error('Failed to execute function call. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const availableTools = [
    {
      name: 'get_weather',
      description: 'Get current weather for a location',
      parameters: ['location', 'unit (optional)']
    },
    {
      name: 'calculate',
      description: 'Perform mathematical calculations',
      parameters: ['expression']
    },
    {
      name: 'search_web',
      description: 'Search the web for information',
      parameters: ['query']
    }
  ];

  return (
    <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
      {/* Function Chat Area */}
      <div className="lg:col-span-2 flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>Function Calling</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              {responseTime && (
                <Badge variant="outline" className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatTime(responseTime)}</span>
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={clearChat}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0">
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-4 py-4">
                {messages.map((message) => (
                  <div key={message.id} className="flex space-x-3">
                    <div className="flex-shrink-0">
                      {message.role === 'user' ? (
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-primary-foreground" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                          <Bot className="h-4 w-4" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {message.role === 'user' ? 'You' : 'Grok'}
                        </span>
                        {message.model && (
                          <Badge variant="outline" className="text-xs">
                            {message.model}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="prose prose-sm max-w-none">
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>

                      {message.functionCalls && message.functionCalls.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                            <Zap className="h-4 w-4 text-yellow-500" />
                            <span>Function Calls Executed</span>
                          </p>
                          {message.functionCalls.map((call, index) => (
                            <Collapsible key={index} className="border border-border/50 rounded-lg shadow-sm">
                              <CollapsibleTrigger className="flex items-center justify-between p-3 w-full text-left hover:bg-muted/40 transition-colors rounded-t-lg">
                                <div className="flex items-center space-x-2">
                                  <Code className="h-4 w-4 text-blue-400" />
                                  <span className="font-medium">{call.name}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline" className="bg-muted/50">
                                    {Object.keys(call.arguments).length} args
                                  </Badge>
                                  <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="function-result">
                                <div className="space-y-3">
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Arguments:</p>
                                    <div className="code-block">
                                      <pre className="text-xs">
                                        {JSON.stringify(call.arguments, null, 2)}
                                      </pre>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Result:</p>
                                    <div className="code-block bg-green-950/20 dark:bg-green-900/10 border-green-900/20 dark:border-green-700/20">
                                      <pre className="text-xs">
                                        {JSON.stringify(call.result, null, 2)}
                                      </pre>
                                    </div>
                                  </div>
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          ))}
                        </div>
                      )}

                      {message.usage && (
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>Tokens: {message.usage.total_tokens}</span>
                          <span>Input: {message.usage.prompt_tokens}</span>
                          <span>Output: {message.usage.completion_tokens}</span>
                        </div>
                      )}

                      {message.role === 'user' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyUserMessage(message.content)}
                          className="w-fit h-6 px-2"
                        >
                          <Copy className="h-3 w-3" />
                          <span className="ml-1 text-xs">Copy &amp; Re-use</span>
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(message.content)}
                          className="w-fit h-6 px-2"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing function calls...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <Separator />

            <form onSubmit={handleSubmit} className="p-4">
              <div className="flex space-x-2">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Type or speak to ask for functions like: 'What's the weather in New York?' or 'Calculate 15 * 23'"
                  className="min-h-[44px] max-h-[120px] resize-none flex-1"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                <Button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  className="h-[44px] w-[44px] shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Model Selection and Tools Sidebar */}
      <div className="space-y-4">
        <ModelSelector
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          category="text"
          showDetails={true}
        />

        {/* Available Tools */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Available Functions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {availableTools.map((tool, index) => (
              <div key={index} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-center space-x-2">
                  <Code className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">{tool.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">{tool.description}</p>
                <div className="flex flex-wrap gap-1">
                  {tool.parameters.map((param, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {param}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Function Examples */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Function Examples</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              "What's the weather in San Francisco?",
              "Calculate 25 * 18 + 42",
              "Search for information about quantum computing",
              "Get weather for Tokyo in celsius",
              "What's 2^10?",
              "Search for latest AI news"
            ].map((example, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="w-full text-left justify-start h-auto p-2"
                onClick={() => setInput(example)}
              >
                <div className="flex items-center space-x-2">
                  <Play className="h-3 w-3" />
                  <span className="text-xs truncate">{example}</span>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
