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
import ModelSelector from './ModelSelector';
import type { GeneratedImage } from '@/types';
import {
  Image as ImageIcon,
  Loader2,
  Download,
  Copy,
  RotateCcw,
  Clock,
  Sparkles,
  Upload,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { useClipboard } from '@/lib/useClipboard';

interface GenerationResult {
  id: string;
  prompt: string;
  images: GeneratedImage[];
  model: string;
  timestamp: Date;
  responseTime: number;
  referenceImage?: string; // Store reference image if used
}

export default function ImageGenerationInterface() {
  const [selectedModel, setSelectedModel] = useState('dall-e-3');
  const [prompt, setPrompt] = useState('');
  const [numberOfImages, setNumberOfImages] = useState('1');
  const [isLoading, setIsLoading] = useState(false);
  const [generations, setGenerations] = useState<GenerationResult[]>([]);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageSize, setSelectedImageSize] = useState<number | null>(null);
  const [compressedImageSize, setCompressedImageSize] = useState<number | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize clipboard functionality
  useClipboard({
    onImagePaste: (file: File) => {
      console.log('📋 Image pasted in Image Generation:', file.name, file.type, file.size);
      processImageFile(file);
      toast.success('Image pasted from clipboard!');
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
    setPrompt(promptText); // Also set it as current prompt for easy re-generation
    toast.success('Prompt copied and set for re-use');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const downloadImage = async (url: string, filename: string) => {
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
      toast.success('Image downloaded');
    } catch (error) {
      toast.error('Failed to download image');
    }
  };

  const clearGenerations = () => {
    setGenerations([]);
    setPrompt('');
    setResponseTime(null);
    setSelectedImage(null);
    setSelectedImageSize(null);
    setCompressedImageSize(null);
    toast.success('Generations cleared');
  };

  // Image upload and drag-and-drop logic
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
    // Optionally compress/resize image if too large (e.g., >2MB)
    let imageUrl: string | null = null;
    let compressedSize: number | null = null;
    try {
      if (file.size > 2 * 1024 * 1024) {
        // Compress image using canvas
        const img = document.createElement('img');
        const reader = new FileReader();
        reader.onload = async (ev) => {
          img.src = ev.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxDim = 1024;
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
                  }
                  setIsProcessingImage(false);
                },
                'image/jpeg',
                0.85
              );
            } else {
              setIsProcessingImage(false);
              toast.error('Failed to process image');
            }
          };
        };
        reader.readAsDataURL(file);
      } else {
        imageUrl = URL.createObjectURL(file);
        setSelectedImage(imageUrl);
        setCompressedImageSize(file.size);
        setIsProcessingImage(false);
      }
    } catch (err) {
      setIsProcessingImage(false);
      toast.error('Failed to process image');
    }
  };

  const removeSelectedImage = () => {
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage);
    }
    setSelectedImage(null);
    setSelectedImageSize(null);
    setCompressedImageSize(null);
  };

  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);

    try {
      const startTime = Date.now();

      let result;
      if (selectedImage) {
        // Image-to-image generation
        const blob = await fetch(selectedImage).then((r) => r.blob());
        const formData = new FormData();
        formData.append('model', selectedModel);
        formData.append('prompt', prompt.trim());
        formData.append('n', numberOfImages);
        formData.append('responseFormat', 'url');
        formData.append('image', blob, 'reference.png');

        const response = await fetch('/api/image-to-image', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        result = await response.json();
      } else {
        // Text-to-image generation
        const response = await fetch('/api/image-generation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: selectedModel,
            prompt: prompt.trim(),
            n: Number.parseInt(numberOfImages),
            responseFormat: 'url'
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        result = await response.json();
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      setResponseTime(totalTime);

      console.log('Image generation result:', result);

      // Ensure we have valid image data
      if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
        throw new Error('No images returned from API');
      }

      // Log each image URL for debugging
      result.data.forEach((img: any, index: number) => {
        console.log(`Image ${index + 1} URL:`, img.url);
        if (!img.url) {
          console.error(`Image ${index + 1} has no URL:`, img);
        }
      });

      const generationResult: GenerationResult = {
        id: Date.now().toString(),
        prompt: prompt.trim(),
        images: result.data,
        model: selectedModel,
        timestamp: new Date(),
        responseTime: totalTime,
        referenceImage: selectedImage || undefined
      };

      setGenerations(prev => [generationResult, ...prev]);
      setPrompt('');
      removeSelectedImage();

      toast.success(`Generated ${result.data.length} image(s) in ${(totalTime / 1000).toFixed(1)}s`);

    } catch (error) {
      console.error('Image generation error:', error);
      toast.error('Failed to generate image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
      {/* Image Generation Area */}
      <div className="lg:col-span-2 flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center space-x-2">
              <ImageIcon className="h-5 w-5" />
              <span>Image Generation</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              {responseTime && (
                <Badge variant="outline" className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatTime(responseTime)}</span>
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={clearGenerations}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0">
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-6 py-4">
                {generations.map((generation) => (
                  <div key={generation.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="font-medium">Generated Images</span>
                        <Badge variant="outline" className="text-xs">
                          DALL-E 3
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {generation.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <Badge variant="outline" className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatTime(generation.responseTime)}</span>
                      </Badge>
                    </div>

                    {generation.referenceImage && (
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-xs text-muted-foreground">Reference:</span>
                        <div className="w-16 h-16 rounded overflow-hidden border bg-muted flex items-center justify-center">
                          <img
                            src={generation.referenceImage}
                            alt="Reference"
                            className="object-contain w-full h-full"
                          />
                        </div>
                      </div>
                    )}

                    <div className="p-3 bg-muted rounded-lg relative">
                      <p className="text-sm font-medium mb-2">Prompt:</p>
                      <p className="text-sm pr-8">{generation.prompt}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyPrompt(generation.prompt)}
                        className="absolute top-2 right-2 h-6 w-6 opacity-70 hover:opacity-100 transition-opacity"
                        title="Copy and set prompt for re-use"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {generation.images.map((image, index) => (
                        <div key={index} className="space-y-2">
                          <div className="image-card relative group rounded-lg overflow-hidden border">
                            <img
                              src={image.url}
                              alt={`Generated image ${index + 1}`}
                              className="w-full h-auto rounded-lg transition-transform duration-200 group-hover:scale-105"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                console.error('Image failed to load:', image.url);
                                target.style.display = 'none';
                                const container = target.parentElement;
                                if (container && !container.querySelector('.error-message')) {
                                  const errorDiv = document.createElement('div');
                                  errorDiv.className = 'error-message flex items-center justify-center h-48 bg-muted text-muted-foreground';
                                  errorDiv.innerHTML = `
                                    <div class="text-center">
                                      <div class="mb-2">❌</div>
                                      <p class="text-sm">Image failed to load</p>
                                      <button onclick="navigator.clipboard.writeText('${image.url}'); alert('URL copied!')" class="text-xs underline mt-1 cursor-pointer">Copy original URL</button>
                                      <p class="text-xs mt-1">Check browser console for details</p>
                                    </div>
                                  `;
                                  container.appendChild(errorDiv);
                                }
                              }}
                              onLoad={(e) => {
                                console.log('Image loaded successfully:', image.url);
                              }}
                            />
                            <div className="image-overlay absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => downloadImage(image.url, `generated-${generation.id}-${index + 1}.png`)}
                                className="bg-background/80 hover:bg-background flex items-center"
                              >
                                <Download className="h-4 w-4 mr-1" />
                                <span>Download</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => copyToClipboard(image.url)}
                                className="bg-background/80 hover:bg-background flex items-center"
                              >
                                <Copy className="h-4 w-4 mr-1" />
                                <span>Copy URL</span>
                              </Button>
                            </div>
                          </div>

                          {image.revised_prompt && (
                            <details className="text-xs">
                              <summary className="cursor-pointer text-muted-foreground hover:text-primary transition-colors">
                                Revised Prompt
                              </summary>
                              <p className="mt-1 p-2 bg-muted/50 rounded text-xs">
                                {image.revised_prompt}
                              </p>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>

                    <Separator />
                  </div>
                ))}

                {isLoading && (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="text-muted-foreground">Generating images with DALL-E 3...</p>
                    <p className="text-sm text-muted-foreground">This may take 10-30 seconds</p>
                  </div>
                )}

                {generations.length === 0 && !isLoading && (
                  <div className="text-center py-12">
                    <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No images generated yet</p>
                    <p className="text-sm text-muted-foreground">Enter a prompt below to get started</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            <Separator />

            {/* Generation Form */}
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Image upload area */}
              <div
                className={`relative flex items-center justify-between gap-2 mb-4 rounded-lg border-2 border-dashed px-6 py-4 transition-colors cursor-pointer ${
                  selectedImage
                    ? 'border-primary bg-primary/10'
                    : 'border-muted-foreground/50 hover:border-primary/70 bg-muted/50'
                }`}
                onClick={handleImageUploadClick}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                tabIndex={0}
                aria-label="Upload or drag and drop an image"
                style={{ outline: 'none' }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                  tabIndex={-1}
                />
                {!selectedImage && (
                  <div className="flex items-center gap-3 text-foreground/80 w-full justify-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                      <Upload className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium">Upload Reference Image</div>
                      <div className="text-xs text-muted-foreground">
                        Drag & drop an image, or <span className="underline font-medium">click to upload</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        For anime style replication and image-to-image generation
                      </div>
                    </div>
                  </div>
                )}
                {selectedImage && (
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-12 h-12 rounded overflow-hidden border bg-background flex items-center justify-center">
                      <img
                        src={selectedImage}
                        alt="Reference"
                        className="object-contain w-full h-full"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground truncate">
                          Reference image selected
                        </span>
                        {isProcessingImage && (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {selectedImageSize && (
                          <span className="text-[10px] text-muted-foreground">
                            Original: {(selectedImageSize / 1024).toFixed(1)} KB
                          </span>
                        )}
                        {compressedImageSize && compressedImageSize !== selectedImageSize && (
                          <span className="text-[10px] text-muted-foreground">
                            Compressed: {(compressedImageSize / 1024).toFixed(1)} KB
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSelectedImage();
                      }}
                      title="Remove image"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <Textarea
                  value={prompt}
                  onChange={handlePromptChange}
                  placeholder="Type or speak to describe the image you want to generate..."
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
                  disabled={!prompt.trim() || isLoading || isProcessingImage}
                  size="icon"
                  className="h-[44px] w-[44px] shrink-0"
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              </div>
              {selectedImage && (
                <div className="text-xs text-muted-foreground pl-1">
                  The reference image will be used for image-to-image generation.
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Model Selection and Examples Sidebar */}
      <div className="space-y-4">
        {/* Model Selector - Hidden but keeping structure for compatibility */}
        <div style={{ display: 'none' }}>
          <ModelSelector
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            category="image-generation"
            showDetails={false}
          />
        </div>

        {/* DALL-E 3 Model Card */}
        <Card className="border-primary/20 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <ImageIcon className="h-5 w-5 text-primary" />
              <span>DALL-E 3</span>
              <Badge variant="default" className="ml-auto">Active</Badge>
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              OpenAI's most advanced image generation model
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Quality</span>
              <span className="font-medium">1024x1024 HD</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Speed</span>
              <span className="font-medium">10-30 seconds</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Style Support</span>
              <span className="font-medium">All styles</span>
            </div>
            <Separator />
            <p className="text-xs text-muted-foreground">
              DALL-E 3 generates one high-quality image per request with advanced prompt understanding and artistic capabilities.
            </p>
          </CardContent>
        </Card>

        {/* Quick Prompt Examples */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Generation Examples</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              "Replicate this exact character and art style",
              "Convert to anime/manga art style",
              "Same character, different pose",
              "Same art style, new background",
              "Exact character replication in new scene",
              "Maintain character design, change expression",
              "Same anime style, different angle",
              "Keep character identical, change outfit",
              "A serene mountain landscape at sunset",
              "A futuristic city with flying cars"
            ].map((example, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="w-full text-left justify-start h-auto p-2"
                onClick={() => setPrompt(example)}
              >
                <span className="text-xs truncate">{example}</span>
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Generation Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">💡 Tips</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            <p>• <b>For character replication:</b> Use prompts like "Replicate this exact character"</p>
            <p>• <b>For style conversion:</b> "Convert to anime/manga art style"</p>
            <p>• <b>For pose changes:</b> "Same character, different pose/expression"</p>
            <p>• <b>Upload clear reference images</b> for best results</p>
            <p>• The system analyzes your image in detail for accurate replication</p>
            <p>• Generation typically takes 15-45 seconds</p>
          </CardContent>
        </Card>
      </div>

      {/* Custom styles for enhanced image card/overlay */}
      <style jsx global>{`
        .image-card {
          position: relative;
          overflow: hidden;
          border-radius: 0.5rem;
          border-width: 1px;
          border-color: var(--muted);
          background: var(--background);
        }
        .image-card img {
          display: block;
          width: 100%;
          height: auto;
          border-radius: 0.5rem;
        }
        .image-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          opacity: 0;
          background: rgba(0,0,0,0.4);
          transition: opacity 0.2s;
          border-radius: 0.5rem;
        }
        .image-card:hover .image-overlay,
        .image-card:focus-within .image-overlay,
        .image-card .image-overlay:focus-within {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}
