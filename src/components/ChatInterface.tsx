'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useClipboard, processClipboardImage } from '@/lib/useClipboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import ModelSelector from './ModelSelector';
import type { ChatMessage } from '@/types';
import {
  Send,
  Bot,
  User,
  Clock,
  Zap,
  Brain,
  Loader2,
  Copy,
  RotateCcw,
  Database,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { toast } from 'sonner';

const CHAT_STORAGE_KEY = 'grok-chat-messages';
const MODEL_STORAGE_KEY = 'grok-selected-model';

export default function ChatInterface() {
  const [selectedModel, setSelectedModel] = useState('grok-3-mini-fast-latest');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [currentUsage, setCurrentUsage] = useState<{
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  } | undefined>(undefined);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [reasoning, setReasoning] = useState<string>('');
  const [pastedImages, setPastedImages] = useState<Array<{id: string, url: string, name: string}>>([]);
  const [isProcessingPaste, setIsProcessingPaste] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load saved chat and model on component mount
  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem(CHAT_STORAGE_KEY);
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages);
        // Ensure timestamps are Date objects for display
        const messagesWithDates = parsedMessages.map((msg: ChatMessage) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(messagesWithDates);
      }

      const savedModel = localStorage.getItem(MODEL_STORAGE_KEY);
      if (savedModel) {
        setSelectedModel(savedModel);
      }
    } catch (error) {
      console.error('Failed to load saved chat data:', error);
    }
  }, []);

  // Save messages when they change
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch (error) {
      console.error('Failed to save messages:', error);
    }
  }, [messages]);

  // Save selected model when it changes
  useEffect(() => {
    try {
      localStorage.setItem(MODEL_STORAGE_KEY, selectedModel);
    } catch (error) {
      console.error('Failed to save selected model:', error);
    }
  }, [selectedModel]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  const copyUserMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Message copied to clipboard');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const clearChat = () => {
    setMessages([]);
    setStreamingContent('');
    setReasoning('');
    setCurrentUsage(undefined);
    setResponseTime(null);
    setPastedImages([]);

    // Clear from localStorage as well
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear chat from storage:', error);
    }

    toast.success('Chat cleared');
  };

  // Handle image paste from clipboard
  const handleImagePaste = useCallback(async (file: File) => {
    setIsProcessingPaste(true);
    try {
      const result = await processClipboardImage(file, 2 * 1024 * 1024, 800, 0.8);
      const imageId = Date.now().toString();

      // Convert blob URL to base64 for persistence
      const response = await fetch(result.url);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const base64data = reader.result as string;
        setPastedImages(prev => [...prev, {
          id: imageId,
          url: base64data,
          name: file.name || `pasted-image-${imageId}.jpg`
        }]);
        URL.revokeObjectURL(result.url); // Clean up blob URL
      };

      toast.success(`Image pasted! ${Math.round(result.compressedSize / 1024)}KB`);
    } catch (error) {
      console.error('Failed to process pasted image:', error);
      toast.error('Failed to process pasted image');
    } finally {
      setIsProcessingPaste(false);
    }
  }, []);

  // Handle text paste from clipboard - but only if not in textarea
  const handleTextPaste = useCallback((text: string) => {
    // Check if the active element is our textarea
    const activeElement = document.activeElement;
    const isTextarea = activeElement?.tagName === 'TEXTAREA';
    
    if (!isTextarea) {
      // Only handle text paste if not already in a text input
      setInput(prev => prev + text);
      toast.success('Text pasted');
    }
  }, []);

  // Remove pasted image
  const removePastedImage = useCallback((imageId: string) => {
    setPastedImages(prev => {
      const updated = prev.filter(img => img.id !== imageId);
      // Revoke URL to prevent memory leaks
      const removedImage = prev.find(img => img.id === imageId);
      if (removedImage) {
        URL.revokeObjectURL(removedImage.url);
      }
      return updated;
    });
  }, []);

  // Initialize clipboard functionality
  useClipboard({
    onImagePaste: handleImagePaste,
    onTextPaste: handleTextPaste,
    enableImagePaste: true,
    enableTextPaste: false, // Disable text paste handling to allow normal textarea paste
    enabled: true
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && pastedImages.length === 0) || isLoading) return;

    // Check if we have images and need to use vision API
    const hasImages = pastedImages.length > 0;
    const needsVisionModel = hasImages && !selectedModel.includes('vision');
    
    if (needsVisionModel) {
      toast.warning('Switching to vision model for image analysis...');
      setSelectedModel('grok-2-vision-latest');
    }

    // Build the message content
    let messageContent: any = input.trim();
    
    // If we have images, the URLs are already base64
    if (hasImages) {
      messageContent = [
        { type: 'text', text: input.trim() || 'What can you tell me about these images?' },
        ...pastedImages.map(img => ({
          type: 'image_url',
          image_url: { url: img.url }
        }))
      ];
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: hasImages ? input.trim() || 'What can you tell me about these images?' : input.trim(),
      timestamp: new Date().toISOString(),
      images: hasImages ? pastedImages.map(img => ({
        url: img.url, // This will be a base64 URL
        name: img.name
      })) : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setPastedImages([]); // Clear pasted images after sending
    setIsLoading(true);
    setStreamingContent('');
    setReasoning('');
    setResponseTime(null);

    try {
      const startTime = Date.now();

      // Check if it's a reasoning model
      const isReasoningModel = selectedModel.includes('mini');
      const modelToUse = needsVisionModel ? 'grok-2-vision-latest' : selectedModel;

      // For now, handle single image with vision endpoint
      // TODO: Implement multi-image support
      if (hasImages && pastedImages.length > 0) {
        // Use vision endpoint for single image
        const firstImage = pastedImages[0].url; // Already base64

        const response = await fetch('/api/vision', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: modelToUse,
            imageUrl: firstImage,
            prompt: input.trim() || 'What can you tell me about this image?',
            detail: 'high'
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const endTime = Date.now();

        const assistantMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.choices[0].message.content,
          timestamp: new Date().toISOString(),
          model: modelToUse,
          usage: data.usage
        };

        setMessages(prev => [...prev, assistantMessage]);
        setResponseTime(data.responseTime || (endTime - startTime));

        // Don't revoke URLs yet - we need them for display in chat history
        // URLs will be cleaned up when chat is cleared or component unmounts
        
      } else {
        // Use regular chat endpoint for text
        const response = await fetch('/api/chat/stream', {
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
            maxTokens: 2000,
            temperature: 0.7,
            ...(isReasoningModel && { reasoningEffort: 'medium' })
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let content = '';
        let reasoningContent = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));

                  if (data.content) {
                    content += data.content;
                    setStreamingContent(content);
                  }

                  if (data.reasoning) {
                    reasoningContent += data.reasoning;
                    setReasoning(reasoningContent);
                  }

                  if (data.finish_reason) {
                    setCurrentUsage(data.usage);
                    setResponseTime(data.totalTime);
                  }
                } catch (e) {
                  // Ignore JSON parse errors
                }
              }
            }
          }
        }

        const assistantMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: content,
          timestamp: new Date().toISOString(),
          model: selectedModel,
          reasoning: reasoningContent || undefined,
          usage: currentUsage
        };

        setMessages(prev => [...prev, assistantMessage]);
        setStreamingContent('');
      }

    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Auto-resize textarea on input value change (for programmatic changes, e.g. quick examples)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, []);

  // Check for files from Files Manager on component mount
  useEffect(() => {
    const fileUrl = sessionStorage.getItem('chatFileUrl');
    const fileName = sessionStorage.getItem('chatFileName');
    const fileDescription = sessionStorage.getItem('chatFileDescription');
    
    if (fileUrl && fileName) {
      // Add the file to pasted images
      setPastedImages([{
        id: Date.now().toString(),
        url: fileUrl,
        name: fileName
      }]);
      
      // Set the input to the description if available
      if (fileDescription) {
        setInput(fileDescription);
      }
      
      // Clear session storage
      sessionStorage.removeItem('chatFileUrl');
      sessionStorage.removeItem('chatFileName');
      sessionStorage.removeItem('chatFileDescription');
    }
  }, []);

  return (
    <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
      {/* Chat Area */}
      <div className="lg:col-span-2 flex flex-col">
        <Card className="flex-1 flex flex-col shadow-lg border border-border bg-background/80">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Bot className="h-5 w-5" />
              <span>Chat with Grok</span>
              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                Ctrl+V to paste
              </Badge>
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
              <div className="space-y-6 py-4">
                {messages.map((message) => (
                  <div key={message.id} className="flex space-x-3">
                    <div className="flex-shrink-0">
                      {message.role === 'user' ? (
                        <div className="w-8 h-8 bg-primary/20 text-primary rounded-full flex items-center justify-center border border-primary/20">
                          <User className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-secondary/60 rounded-full flex items-center justify-center border border-border">
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
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className={`message-bubble ${message.role === 'user' ? 'message-bubble-user' : 'message-bubble-assistant'}`}>
                        {message.images && message.images.length > 0 && (
                          <div className="mb-3 flex gap-2 flex-wrap">
                            {message.images.map((img, idx) => (
                              <div key={idx} className="relative group">
                                <img
                                  src={img.url}
                                  alt={img.name}
                                  className="w-32 h-32 object-cover rounded-lg border border-border"
                                  onError={(e) => {
                                    // Handle broken images
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        </div>
                        {message.role === 'user' ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyUserMessage(message.content)}
                            className="copy-button"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToClipboard(message.content)}
                            className="copy-button"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>

                      {message.reasoning && (
                        <details className="mt-2 group">
                          <summary className="cursor-pointer text-sm font-medium text-muted-foreground flex items-center space-x-1 hover:text-primary transition-colors">
                            <Brain className="h-4 w-4" />
                            <span>View Reasoning Process</span>
                          </summary>
                          <div className="reasoning-section">
                            <p className="text-sm whitespace-pre-wrap">{message.reasoning}</p>
                          </div>
                        </details>
                      )}

                      {message.usage && (
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-2 bg-muted/50 rounded-md p-1.5 px-2">
                          <span className="flex items-center gap-1">
                            <Database className="h-3 w-3" />
                            Tokens: {message.usage.total_tokens}
                          </span>
                          <span>Input: {message.usage.prompt_tokens}</span>
                          <span>Output: {message.usage.completion_tokens}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Streaming message */}
                {isLoading && (streamingContent || reasoning) && (
                  <div className="flex space-x-3">
                    <div className="w-8 h-8 bg-secondary/60 rounded-full flex items-center justify-center border border-border">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">Grok</span>
                        <Badge variant="outline" className="text-xs">
                          {selectedModel}
                        </Badge>
                        <Loader2 className="h-3 w-3 animate-spin" />
                      </div>

                      {reasoning && (
                        <details className="mb-2 group">
                          <summary className="cursor-pointer text-sm font-medium text-muted-foreground flex items-center space-x-1 hover:text-primary transition-colors">
                            <Brain className="h-4 w-4" />
                            <span>Thinking...</span>
                          </summary>
                          <div className="reasoning-section">
                            <p className="text-sm whitespace-pre-wrap">{reasoning}</p>
                          </div>
                        </details>
                      )}

                      <div className="message-bubble message-bubble-assistant">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <p className="whitespace-pre-wrap">
                            {streamingContent}
                            <span className="animate-pulse">|</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isLoading && !streamingContent && !reasoning && (
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Grok is thinking...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <Separator />

            {/* Pasted Images Preview */}
            {pastedImages.length > 0 && (
              <div className="p-4 border-b">
                <div className="flex items-center gap-2 mb-2">
                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Pasted Images ({pastedImages.length})</span>
                  {isProcessingPaste && <Loader2 className="w-4 h-4 animate-spin" />}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {pastedImages.map((img) => (
                    <div key={img.id} className="relative group">
                      <div className="w-16 h-16 rounded-lg overflow-hidden border border-border bg-muted">
                        <img
                          src={img.url}
                          alt={img.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removePastedImage(img.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  💡 Paste images with Ctrl+V, then send your message to chat about them
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-4">
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleInputChange}
                    placeholder={pastedImages.length > 0 ? "Ask about your pasted images..." : "Type your message or paste images with Ctrl+V..."}
                    className="min-h-[44px] max-h-[120px] resize-none flex-1"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                    onPaste={(e) => {
                      console.log('📋 Paste event on textarea!', e);
                      // Don't prevent default for text paste in textarea
                      const items = Array.from(e.clipboardData.items);
                      const hasImage = items.some(item => item.type.startsWith('image/'));
                      if (hasImage) {
                        console.log('📋 Image detected in textarea paste');
                        // Let the global handler deal with images
                      }
                    }}
                  />
                  {pastedImages.length > 0 && (
                    <div className="absolute top-2 right-2 text-xs text-muted-foreground flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      {pastedImages.length}
                    </div>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={(!input.trim() && pastedImages.length === 0) || isLoading}
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

      {/* Model Selection Sidebar */}
      <div className="space-y-4">
        <ModelSelector
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          category={undefined}
          showDetails={true}
        />

        {/* Quick Examples */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quick Examples</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              "Explain quantum computing in simple terms",
              "Write a Python function to calculate fibonacci",
              "What are the key differences between Grok models?",
              "Solve this logic puzzle: If all roses are flowers...",
              "Create a business plan for a coffee shop"
            ].map((example) => (
              <Button
                key={example}
                variant="outline"
                size="sm"
                className="w-full text-left justify-start h-auto p-2"
                onClick={() => setInput(example)}
              >
                <span className="text-xs truncate">{example}</span>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Chat Styling */}
      <style jsx global>{`
        .message-bubble {
          position: relative;
          padding: 1rem 1.25rem 1rem 1.25rem;
          border-radius: 1.1rem;
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
          background: var(--bubble-bg, #f8fafc);
          box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.03);
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
        }
        .dark .message-bubble {
          background: var(--bubble-bg-dark, #23272f);
        }
        .message-bubble-user {
          background: var(--bubble-bg-user, #e0e7ff);
          color: var(--bubble-fg-user, #3730a3);
          align-self: flex-end;
        }
        .dark .message-bubble-user {
          background: var(--bubble-bg-user-dark, #312e81);
          color: var(--bubble-fg-user-dark, #c7d2fe);
        }
        .message-bubble-assistant {
          background: var(--bubble-bg-assistant, #f8fafc);
          color: var(--bubble-fg-assistant, #0f172a);
          align-self: flex-start;
        }
        .dark .message-bubble-assistant {
          background: var(--bubble-bg-assistant-dark, #23272f);
          color: var(--bubble-fg-assistant-dark, #f1f5f9);
        }
        .copy-button {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          opacity: 0.6;
          transition: opacity 0.15s;
          z-index: 2;
        }
        .message-bubble:hover .copy-button,
        .copy-button:focus {
          opacity: 1;
        }
        .reasoning-section {
          margin-top: 0.5rem;
          padding: 0.75rem 1rem;
          background: var(--reasoning-bg, #f1f5f9);
          border-radius: 0.75rem;
        }
        .dark .reasoning-section {
          background: var(--reasoning-bg-dark, #1e293b);
        }
      `}</style>
    </div>
  );
}
