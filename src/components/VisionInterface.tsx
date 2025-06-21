'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import ModelSelector from './ModelSelector';
import type { ImageMessage } from '@/types';
import {
  Upload,
  Eye,
  User,
  Bot,
  Image as ImageIcon,
  Loader2,
  Copy,
  RotateCcw,
  Clock,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { useClipboard } from '@/lib/useClipboard';

interface SelectedImage {
  id: string;
  url: string;
  originalSize: number;
  compressedSize: number;
  name: string;
}

export default function VisionInterface() {
  const [selectedModel, setSelectedModel] = useState('grok-2-vision-latest');
  const [messages, setMessages] = useState<ImageMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize clipboard functionality
  useClipboard({
    onImagePaste: (file: File) => {
      console.log('📋 Image pasted in Vision:', file.name, file.type, file.size);
      processImageFile(file);
      toast.success('Image pasted from clipboard!');
    },
    enableImagePaste: true,
    enableTextPaste: false,
    enabled: true
  });

  const processImageFile = (file: File) => {
    if (file.size > 50 * 1024 * 1024) { // 50MB limit for initial upload
      toast.error('Image must be less than 50MB');
      return;
    }

    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) {
      toast.error('Please upload a JPG, PNG, or WebP image');
      return;
    }

    setIsProcessingImage(true);

    // More aggressive compression function
    const compressImage = (canvas: HTMLCanvasElement): string => {
      // Always convert to JPEG for better compression
      const outputFormat = 'image/jpeg';
      let quality = 0.6; // Start with 60% quality
      let compressedDataUrl = canvas.toDataURL(outputFormat, quality);

      // Keep reducing quality until we get under 2MB
      while (compressedDataUrl.length > 2 * 1024 * 1024 && quality > 0.1) {
        quality -= 0.1;
        compressedDataUrl = canvas.toDataURL(outputFormat, quality);
      }

      return compressedDataUrl;
    };

    // Create canvas and process image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      try {
        // Calculate new dimensions (more aggressive sizing)
        let { width, height } = img;
        const maxSize = 600; // More aggressive than before

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        if (!ctx) {
          throw new Error('Could not get canvas context');
        }

        // Draw with image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Compress the image
        const compressedDataUrl = compressImage(canvas);

        // Check final size
        const finalSize = (compressedDataUrl.length * 3) / 4;

        if (finalSize > 2.5 * 1024 * 1024) { // 2.5MB absolute limit
          toast.error('Image is still too large after maximum compression. Please use a smaller or simpler image.');
          setIsProcessingImage(false);
          return;
        }

        // Create new image object
        const newImage: SelectedImage = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          url: compressedDataUrl,
          originalSize: file.size,
          compressedSize: finalSize,
          name: file.name || 'pasted-image'
        };

        setSelectedImages(prev => [...prev, newImage]);
        toast.success(`Image processed successfully (${Math.round(finalSize / 1024)}KB)`);
        setIsProcessingImage(false);

      } catch (error) {
        console.error('Image processing error:', error);
        toast.error('Failed to process image. Please try a different image.');
        setIsProcessingImage(false);
      }
    };

    img.onerror = () => {
      toast.error('Failed to load image. Please try a different format.');
      setIsProcessingImage(false);
    };

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        img.src = e.target?.result as string;
      } catch (error) {
        toast.error('Failed to read image file');
        setIsProcessingImage(false);
      }
    };
    reader.onerror = () => {
      toast.error('Failed to read image file');
      setIsProcessingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (imageId: string) => {
    setSelectedImages(prev => prev.filter(img => img.id !== imageId));
    toast.success('Image removed');
  };

  const clearAllImages = () => {
    setSelectedImages([]);
    toast.success('All images cleared');
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    files.forEach(file => processImageFile(file));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.match(/^image\/(jpeg|jpg|png|webp)$/));

    if (imageFiles.length > 0) {
      imageFiles.forEach(file => processImageFile(file));
    } else if (files.length > 0) {
      toast.error('Please drop JPG, PNG, or WebP image files');
    }
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);

    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const copyUserMessage = async (message: ImageMessage) => {
    try {
      // Find text content
      const textContent = message.content.find(c => c.type === 'text')?.text || '';
      
      // Find image content
      const imageContents = message.content.filter(c => c.type === 'image_url');

      if (imageContents.length > 0) {
        // Convert image URLs back to SelectedImage format for re-use
        const restoredImages: SelectedImage[] = imageContents.map((content, index) => ({
          id: Date.now().toString() + index,
          url: content.image_url?.url || '',
          originalSize: 0, // We don't store this info
          compressedSize: 0, // We don't store this info
          name: `restored-image-${index + 1}`
        }));
        
        setSelectedImages(restoredImages);
        setPrompt(textContent);
        toast.success('Message copied! Images and prompt restored for re-use.');
      } else {
        // Just copy text if no image
        await navigator.clipboard.writeText(textContent);
        toast.success('Text copied to clipboard');
      }
    } catch (error) {
      toast.error('Failed to copy message');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const clearChat = () => {
    setMessages([]);
    setSelectedImages([]);
    setPrompt('');
    setResponseTime(null);
    toast.success('Vision chat cleared');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || selectedImages.length === 0 || isLoading) return;

    // Create user message with multiple images
    const userMessage: ImageMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: [
        ...selectedImages.map(img => ({
          type: 'image_url' as const,
          image_url: {
            url: img.url,
            detail: 'high' as const
          }
        })),
        {
          type: 'text' as const,
          text: prompt.trim()
        }
      ],
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setPrompt('');
    setIsLoading(true);

    try {
      const startTime = Date.now();

      // For now, send only the first image (API limitation)
      const response = await fetch('/api/vision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          imageUrl: selectedImages[0].url,
          prompt: selectedImages.length > 1 
            ? `[Note: Analyzing the first of ${selectedImages.length} images] ${prompt.trim()}`
            : prompt.trim(),
          detail: 'high'
        }),
      });

      if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData?.error) {
            errorMsg = errorData.error;
          }
        } catch {
          // ignore JSON parse error
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      const endTime = Date.now();
      setResponseTime(endTime - startTime);

      const assistantMessage: ImageMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: result.choices?.[0]?.message?.content || 'No response from model.'
          }
        ],
        timestamp: new Date(),
        model: selectedModel
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error: unknown) {
      console.error('Vision error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze image. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatSize = (bytes: number | null) => {
    if (bytes == null) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
      {/* Vision Chat Area */}
      <div className="lg:col-span-2 flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>Image Analysis</span>
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
                          {message.role === 'user' ? 'You' : 'Grok Vision'}
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

                      <div className={`message-bubble ${message.role === 'user' ? 'message-bubble-user' : 'message-bubble-assistant'}`}>
                        <div className="space-y-3">
                          {message.content.map((content, index) => (
                            <div key={index}>
                              {content.type === 'image_url' && content.image_url && (
                                <div className="relative mb-3">
                                  <img
                                    src={content.image_url.url}
                                    alt="User uploaded"
                                    className="max-w-full h-auto rounded-lg border shadow-sm"
                                    style={{ maxHeight: '200px' }}
                                  />
                                </div>
                              )}
                              {content.type === 'text' && (
                                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                  {content.text}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {message.role === 'user' && (
                          <div className="flex space-x-2 mt-3 pt-2 border-t border-border/50">
                          <Button
                            variant="ghost"
                              size="sm"
                              onClick={() => copyUserMessage(message)}
                              className="h-7 px-2 text-xs"
                          >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy & Reuse
                          </Button>
                          </div>
                        )}

                        {message.role === 'assistant' && (
                          <div className="flex space-x-2 mt-3 pt-2 border-t border-border/50">
                          <Button
                            variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(
                                message.content.find(c => c.type === 'text')?.text || ''
                              )}
                              className="h-7 px-2 text-xs"
                          >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                          </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Image Preview Section */}
            {selectedImages.length > 0 && (
              <div className="border-t bg-muted/30 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">
                    Selected Images ({selectedImages.length})
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllImages}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                  >
                    Clear All
                  </Button>
                    </div>
                <div className="flex space-x-3 overflow-x-auto pb-2">
                  {selectedImages.map((image) => (
                    <div key={image.id} className="relative flex-shrink-0">
                      <img
                        src={image.url}
                        alt={image.name}
                        className="h-20 w-20 object-cover rounded-lg border shadow-sm"
                      />
                    <Button
                        variant="destructive"
                      size="sm"
                        onClick={() => removeImage(image.id)}
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                    >
                        <X className="h-3 w-3" />
                    </Button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 rounded-b-lg truncate">
                        {formatSize(image.compressedSize)}
                  </div>
                </div>
                  ))}
                </div>
              </div>
            )}

            {/* Input Section */}
            <div className="border-t p-4">
              <form onSubmit={handleSubmit} className="space-y-3">
                <Textarea
                  placeholder={selectedImages.length > 0 
                    ? `Ask about your ${selectedImages.length} image${selectedImages.length > 1 ? 's' : ''}... (Ctrl+V to paste more)` 
                    : "Upload or paste images (Ctrl+V) to analyze with Grok Vision..."
                  }
                  value={prompt}
                  onChange={handlePromptChange}
                  className="min-h-[80px] resize-none"
                  disabled={isLoading || selectedImages.length === 0}
                />
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <ModelSelector 
                      selectedModel={selectedModel}
                      onModelChange={setSelectedModel}
                      modelType="vision"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!prompt.trim() || selectedImages.length === 0 || isLoading}
                    className="flex items-center space-x-2"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                    <Eye className="h-4 w-4" />
                    )}
                    <span>
                      {isLoading ? 'Analyzing...' : 
                       selectedImages.length === 0 ? 'Upload Images First' :
                       selectedImages.length === 1 ? 'Analyze Image' :
                       `Analyze ${selectedImages.length} Images`}
                    </span>
                  </Button>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Sidebar - Image Upload */}
      <div className="flex flex-col space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ImageIcon className="h-5 w-5" />
              <span>Upload Images</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="space-y-4">
                {isProcessingImage ? (
                  <div className="flex flex-col items-center space-y-2">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Processing image...</p>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        Drop images here or click to upload
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Also supports Ctrl+V paste from clipboard
                      </p>
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG, WebP (max 50MB each)
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <Input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />

            {selectedImages.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Loaded Images ({selectedImages.length})
                  </span>
                  {selectedImages.length > 1 && (
                    <Badge variant="secondary" className="text-xs">
                      Multi-image analysis
                    </Badge>
                  )}
                </div>
                
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {selectedImages.map((image, index) => (
                    <div key={image.id} className="flex items-center space-x-3 text-xs bg-muted/50 rounded p-2">
                      <img
                        src={image.url}
                        alt={image.name}
                        className="h-10 w-10 object-cover rounded border"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{image.name}</p>
                        <p className="text-muted-foreground">
                          {formatSize(image.originalSize)} → {formatSize(image.compressedSize)}
                        </p>
                      </div>
              <Button
                        variant="ghost"
                size="sm"
                        onClick={() => removeImage(image.id)}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
              >
                        <X className="h-3 w-3" />
              </Button>
                    </div>
            ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
