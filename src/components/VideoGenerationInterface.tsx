'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ModelSelector from './ModelSelector';
import type { GeneratedImage } from '@/types';
import {
  Video as VideoIcon,
  Image as ImageIcon,
  Play,
  Pause,
  Loader2,
  Download,
  Copy,
  RotateCcw,
  Clock,
  Sparkles,
  Upload,
  X,
  Monitor,
  Smartphone,
  Square
} from 'lucide-react';
import { toast } from 'sonner';
import { useClipboard } from '@/lib/useClipboard';

interface GeneratedVideo {
  url: string;
  revised_prompt?: string;
  metadata?: {
    duration: number;
    quality: string;
    aspectRatio: string;
    model: string;
    status: string;
  };
}

interface GeneratedImageData {
  url: string;
  revised_prompt?: string;
}

interface GenerationResult {
  id: string;
  prompt: string;
  type: 'image' | 'video';
  images?: GeneratedImageData[];
  videos?: GeneratedVideo[];
  model: string;
  timestamp: Date;
  responseTime: number;
  referenceImage?: string;
}

export default function GenerationInterface() {
  const [generationType, setGenerationType] = useState<'image' | 'video'>('image');
  const [selectedModel, setSelectedModel] = useState('dall-e-3');
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [quality, setQuality] = useState('standard');
  const [imageSize, setImageSize] = useState('1024x1024');
  const [isLoading, setIsLoading] = useState(false);
  const [generations, setGenerations] = useState<GenerationResult[]>([]);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageSize, setSelectedImageSize] = useState<number | null>(null);
  const [compressedImageSize, setCompressedImageSize] = useState<number | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [playingVideos, setPlayingVideos] = useState<Set<string>>(new Set());
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize clipboard functionality
  useClipboard({
    onImagePaste: (file: File) => {
      console.log('📋 Image pasted in Generation:', file.name, file.type, file.size);
      processImageFile(file);
      toast.success('Reference image pasted from clipboard!');
    },
    enableImagePaste: true,
    enableTextPaste: false,
    enabled: true
  });

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);

    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const copyPrompt = (promptText: string) => {
    navigator.clipboard.writeText(promptText);
    setPrompt(promptText);
    toast.success('Prompt copied and set for re-use');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const downloadMedia = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast.success(`${generationType === 'video' ? 'Video' : 'Image'} downloaded`);
    } catch (error) {
      toast.error(`Failed to download ${generationType === 'video' ? 'video' : 'image'}`);
    }
  };

  const toggleVideoPlayback = (videoId: string) => {
    const videoElement = document.getElementById(videoId) as HTMLVideoElement;
    if (videoElement) {
      if (playingVideos.has(videoId)) {
        videoElement.pause();
        setPlayingVideos(prev => {
          const newSet = new Set(prev);
          newSet.delete(videoId);
          return newSet;
        });
      } else {
        videoElement.play();
        setPlayingVideos(prev => new Set(prev).add(videoId));
      }
    }
  };

  const clearGenerations = () => {
    setGenerations([]);
    setPrompt('');
    setResponseTime(null);
    setSelectedImage(null);
    setSelectedImageSize(null);
    setCompressedImageSize(null);
    setPlayingVideos(new Set());
    toast.success('Generations cleared');
  };

  // Image upload and drag-and-drop logic for reference images
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processImageFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await processImageFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const processImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file');
      return;
    }
    setIsProcessingImage(true);
    setSelectedImageSize(file.size);
    
    try {
      let imageUrl: string | undefined;
      let compressedSize: number;
      
      if (file.size > 2 * 1024 * 1024) {
        // Compress image using canvas
        const img = document.createElement('img');
        const reader = new FileReader();
        
        await new Promise<void>((resolve) => {
          reader.onload = async (ev) => {
            img.src = ev.target?.result as string;
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const maxDim = 512;
              let { width, height } = img;
              
              if (width > maxDim || height > maxDim) {
                if (width > height) {
                  height = (height * maxDim) / width;
                  width = maxDim;
                } else {
                  width = (width * maxDim) / height;
                  height = maxDim;
                }
              }
              
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              
              if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(
                  (blob) => {
                    if (blob) {
                      imageUrl = URL.createObjectURL(blob);
                      setSelectedImage(imageUrl);
                      setCompressedImageSize(blob.size);
                      compressedSize = blob.size;
                    }
                    resolve();
                  },
                  'image/jpeg',
                  0.85
                );
              } else {
                resolve();
              }
            };
          };
          reader.readAsDataURL(file);
        });
      } else {
        imageUrl = URL.createObjectURL(file);
        setSelectedImage(imageUrl);
        setCompressedImageSize(file.size);
        compressedSize = file.size;
      }
      
      setIsProcessingImage(false);
      
      // Generate suggested prompts after image is processed
      if (imageUrl) {
        generateSuggestedPrompts(imageUrl);
      }
    } catch (err) {
      setIsProcessingImage(false);
      toast.error('Failed to process reference image');
    }
  };

  const removeSelectedImage = () => {
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage);
    }
    setSelectedImage(null);
    setSelectedImageSize(null);
    setCompressedImageSize(null);
    setSuggestedPrompts([]);
  };

  const generateSuggestedPrompts = async (imageUrl: string) => {
    setIsGeneratingPrompts(true);
    try {
      const response = await fetch('/api/vision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'grok-2-vision-latest',
          imageUrl: imageUrl,
          prompt: `Analyze this image and suggest 4 creative ${generationType} generation prompts based on what you see. Focus on:
- Visual style and aesthetics
- Subject matter and composition
- Mood and atmosphere
- Technical aspects (lighting, colors, etc.)

Return only the prompts as a JSON array of strings, each 50-100 characters long. Make them specific and creative for ${generationType} generation.`,
          detail: 'high'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0].message.content;
        
        try {
          // Try to parse as JSON first
          const prompts = JSON.parse(content);
          if (Array.isArray(prompts)) {
            setSuggestedPrompts(prompts.slice(0, 4));
          } else {
            throw new Error('Not an array');
          }
        } catch {
          // If JSON parsing fails, extract prompts from text
          const lines = content.split('\n').filter((line: string) => line.trim().length > 10);
          const prompts = lines.slice(0, 4).map((line: string) => 
            line.replace(/^\d+\.?\s*/, '').replace(/^[-*]\s*/, '').replace(/^["']|["']$/g, '').trim()
          );
          setSuggestedPrompts(prompts);
        }
      }
    } catch (error) {
      console.error('Failed to generate suggested prompts:', error);
      // Fallback to generic prompts based on generation type
      const fallbackPrompts = generationType === 'video' ? [
        'Cinematic close-up with dramatic lighting',
        'Smooth camera movement revealing the scene',
        'Dynamic action sequence with motion blur',
        'Atmospheric mood with rich colors'
      ] : [
        'Photorealistic style with perfect lighting',
        'Artistic interpretation with vibrant colors',
        'Minimalist composition with clean lines',
        'Dramatic contrast and bold composition'
      ];
      setSuggestedPrompts(fallbackPrompts);
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsLoading(true);
    const startTime = Date.now();

    try {
      const requestBody = generationType === 'video' ? {
        model: selectedModel,
        prompt: prompt.trim(),
        duration: duration,
        quality: quality,
        aspectRatio: aspectRatio,
        type: 'video',
        ...(selectedImage && { referenceImage: selectedImage })
      } : {
        model: selectedModel,
        prompt: prompt.trim(),
        size: imageSize,
        quality: quality,
        type: 'image',
        n: 1
      };

      const response = await fetch('/api/image-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const endTime = Date.now();
      const actualResponseTime = endTime - startTime;

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to generate ${generationType}`);
      }

      const result = await response.json();
      
      setResponseTime(result.responseTime || actualResponseTime);

      const newGeneration: GenerationResult = {
        id: Date.now().toString(),
        prompt: prompt.trim(),
        type: generationType,
        ...(generationType === 'video' ? { videos: result.data || [] } : { images: result.data || [] }),
        model: selectedModel,
        timestamp: new Date(),
        responseTime: result.responseTime || actualResponseTime,
        referenceImage: selectedImage || undefined
      };

      setGenerations(prev => [newGeneration, ...prev]);
      toast.success(`${generationType === 'video' ? 'Video' : 'Image'} generated successfully!`);

    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error instanceof Error ? error.message : `Failed to generate ${generationType}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getAspectRatioIcon = (ratio: string) => {
    switch (ratio) {
      case '16:9': return <Monitor className="h-4 w-4" />;
      case '9:16': return <Smartphone className="h-4 w-4" />;
      case '1:1': return <Square className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const getModelOptions = () => {
    if (generationType === 'video') {
      return [
        { value: 'sora-1', label: 'Sora', description: 'OpenAI\'s flagship video model' },
        { value: 'runway-gen3', label: 'Runway Gen-3 Alpha', description: 'High-quality cinematic videos' },
        { value: 'luma-dream', label: 'Luma Dream Machine', description: 'Creative video generation' }
      ];
    } else {
      return [
        { value: 'dall-e-3', label: 'DALL-E 3', description: 'OpenAI\'s advanced image model' },
        { value: 'dall-e-2', label: 'DALL-E 2', description: 'OpenAI\'s image generation model' }
      ];
    }
  };

  // Update model when switching generation type
  const handleGenerationTypeChange = (type: 'image' | 'video') => {
    setGenerationType(type);
    if (type === 'video') {
      setSelectedModel('runway-gen3');
    } else {
      setSelectedModel('dall-e-3');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Left Sidebar - Controls */}
      <div className="w-full lg:w-80 flex-shrink-0">
        <Card className="h-full">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <CardTitle>AI Generation</CardTitle>
            </div>
            <CardDescription>
              Create stunning images and videos from text prompts
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Generation Type Toggle */}
            <Tabs value={generationType} onValueChange={(value) => handleGenerationTypeChange(value as 'image' | 'video')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="image" className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Images
                </TabsTrigger>
                <TabsTrigger value="video" className="flex items-center gap-2">
                  <VideoIcon className="h-4 w-4" />
                  Videos
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Model Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Model</label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getModelOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Prompt Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Prompt</label>
              <Textarea
                placeholder={`Describe the ${generationType} you want to create...`}
                value={prompt}
                onChange={handlePromptChange}
                className="min-h-[80px] resize-none"
                rows={4}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{prompt.length} characters</span>
                <Badge variant="outline" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Ctrl+V to paste
                </Badge>
              </div>
            </div>

            {/* Suggested Prompts (only show when reference image is uploaded) */}
            {selectedImage && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Suggested Prompts</label>
                {isGeneratingPrompts ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Analyzing image for suggestions...</span>
                  </div>
                ) : suggestedPrompts.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {suggestedPrompts.map((suggestion, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => setPrompt(suggestion)}
                        className="h-auto p-3 text-left justify-start whitespace-normal"
                      >
                        <div className="flex items-start gap-2 w-full">
                          <Sparkles className="h-3 w-3 mt-0.5 flex-shrink-0 text-primary" />
                          <span className="text-xs leading-relaxed">{suggestion}</span>
                        </div>
                      </Button>
                    ))}
                  </div>
                ) : null}
              </div>
            )}

            {/* Video-specific controls */}
            {generationType === 'video' && (
              <>
                {/* Duration Control */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Duration: {duration}s</label>
                  <Slider
                    value={[duration]}
                    onValueChange={(value) => setDuration(value[0])}
                    min={3}
                    max={selectedModel === 'sora-1' ? 20 : 10}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>3s</span>
                    <span>{selectedModel === 'sora-1' ? '20s' : '10s'} max</span>
                  </div>
                </div>

                {/* Aspect Ratio */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Aspect Ratio</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: '16:9', label: 'Landscape', icon: <Monitor className="h-4 w-4" /> },
                      { value: '9:16', label: 'Portrait', icon: <Smartphone className="h-4 w-4" /> },
                      { value: '1:1', label: 'Square', icon: <Square className="h-4 w-4" /> }
                    ].map((option) => (
                      <Button
                        key={option.value}
                        variant={aspectRatio === option.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAspectRatio(option.value)}
                        className="flex flex-col gap-1 h-auto py-2"
                      >
                        {option.icon}
                        <span className="text-xs">{option.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Image-specific controls */}
            {generationType === 'image' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Size</label>
                <Select value={imageSize} onValueChange={setImageSize}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1024x1024">Square (1024x1024)</SelectItem>
                    <SelectItem value="1024x1792">Portrait (1024x1792)</SelectItem>
                    <SelectItem value="1792x1024">Landscape (1792x1024)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Quality Setting */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Quality</label>
              <Select value={quality} onValueChange={setQuality}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft (Fast)</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="high">High Quality</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reference Image Upload (for videos) */}
            {generationType === 'video' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Reference Image (Optional)</label>
                <div
                  className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                    selectedImage ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  {isProcessingImage ? (
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Processing...</span>
                    </div>
                  ) : selectedImage ? (
                    <div className="space-y-2">
                      <img
                        src={selectedImage}
                        alt="Reference"
                        className="w-full h-20 object-cover rounded"
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatFileSize(compressedImageSize || 0)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={removeSelectedImage}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Drop an image here or{' '}
                          <button
                            type="button"
                            onClick={handleImageUploadClick}
                            className="text-primary hover:underline"
                          >
                            browse
                          </button>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Supports JPG, PNG (max 10MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
            )}

            {/* Generate Button */}
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !prompt.trim()}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating {generationType}...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {generationType === 'video' ? <VideoIcon className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                  Generate {generationType === 'video' ? 'Video' : 'Image'}
                </div>
              )}
            </Button>

            {/* Response Time */}
            {responseTime && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Last generation: {formatTime(responseTime)}</span>
              </div>
            )}

            {/* Clear Button */}
            {generations.length > 0 && (
              <Button
                variant="outline"
                onClick={clearGenerations}
                className="w-full"
                size="sm"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Content - Generated Content */}
      <div className="flex-1 min-w-0">
        <ScrollArea className="h-full">
          <div className="space-y-6 p-1">
            {generations.length === 0 ? (
              <Card className="h-[400px] flex items-center justify-center">
                <div className="text-center space-y-4">
                  <Sparkles className="h-16 w-16 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-medium">No content generated yet</h3>
                    <p className="text-muted-foreground">
                      Enter a prompt and click "Generate" to create your first AI content
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              generations.map((generation) => (
                <Card key={generation.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary">{generation.model}</Badge>
                          <Badge variant="outline" className="text-xs">
                            {generation.type === 'video' ? <VideoIcon className="h-3 w-3 mr-1" /> : <ImageIcon className="h-3 w-3 mr-1" />}
                            {generation.type}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatTime(generation.responseTime)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground break-words">
                          {generation.prompt}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyPrompt(generation.prompt)}
                        className="flex-shrink-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Render Videos */}
                    {generation.type === 'video' && generation.videos?.map((video, videoIndex) => {
                      const videoId = `video-${generation.id}-${videoIndex}`;
                      const isPlaying = playingVideos.has(videoId);
                      
                      return (
                        <div key={videoIndex} className="space-y-3">
                          <div className="relative group">
                            <video
                              id={videoId}
                              src={video.url}
                              className="w-full rounded-lg shadow-lg"
                              controls
                              preload="metadata"
                              onPlay={() => setPlayingVideos(prev => new Set(prev).add(videoId))}
                              onPause={() => setPlayingVideos(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(videoId);
                                return newSet;
                              })}
                            />
                          </div>
                          
                          {/* Video Metadata */}
                          {video.metadata && (
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {video.metadata.duration}s
                              </div>
                              <div className="flex items-center gap-1">
                                {getAspectRatioIcon(video.metadata.aspectRatio)}
                                {video.metadata.aspectRatio}
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {video.metadata.quality}
                              </Badge>
                            </div>
                          )}
                          
                          {/* Action Buttons */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadMedia(
                                video.url,
                                `video-${generation.id}-${videoIndex}.mp4`
                              )}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(video.url)}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy URL
                            </Button>
                            
                            {video.revised_prompt && video.revised_prompt !== generation.prompt && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyPrompt(video.revised_prompt!)}
                              >
                                <Sparkles className="h-4 w-4 mr-2" />
                                Revised Prompt
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Render Images */}
                    {generation.type === 'image' && generation.images?.map((image, imageIndex) => (
                      <div key={imageIndex} className="space-y-3">
                        <div className="relative group">
                          <img
                            src={image.url}
                            alt={generation.prompt}
                            className="w-full rounded-lg shadow-lg"
                          />
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadMedia(
                              image.url,
                              `image-${generation.id}-${imageIndex}.png`
                            )}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(image.url)}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy URL
                          </Button>
                          
                          {image.revised_prompt && image.revised_prompt !== generation.prompt && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyPrompt(image.revised_prompt!)}
                            >
                              <Sparkles className="h-4 w-4 mr-2" />
                              Revised Prompt
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
} 