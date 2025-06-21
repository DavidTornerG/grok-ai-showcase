'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GROK_MODELS, MODEL_CATEGORIES, SPEED_ESTIMATES } from '@/config/models';
import type { GrokModel } from '@/types';
import { Zap, Clock, DollarSign, Eye, Brain, Image } from 'lucide-react';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  category?: 'text' | 'vision' | 'image-generation' | 'reasoning';
  showDetails?: boolean;
}

export default function ModelSelector({
  selectedModel,
  onModelChange,
  category,
  showDetails = true
}: ModelSelectorProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const filteredModels = category
    ? GROK_MODELS.filter(model => model.category === category)
    : GROK_MODELS;

  const selectedModelData = GROK_MODELS.find(model => model.id === selectedModel);

  // Helper to format numbers with commas, only on client
  const formatNumber = (num: number) => {
    if (!isClient) return num.toString();
    return num.toLocaleString('en-US');
  };

  const getSpeedIcon = (speed: string) => {
    switch (speed) {
      case 'fastest':
        return <Zap className="h-4 w-4 text-green-500" />;
      case 'fast':
        return <Zap className="h-4 w-4 text-yellow-500" />;
      case 'standard':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'slow':
        return <Clock className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'text':
        return <Brain className="h-4 w-4" />;
      case 'reasoning':
        return <Brain className="h-4 w-4 text-purple-500" />;
      case 'vision':
        return <Eye className="h-4 w-4" />;
      case 'image-generation':
        return <Image className="h-4 w-4" />;
      default:
        return <Brain className="h-4 w-4" />;
    }
  };

  const getEstimatedSpeed = (modelId: string) => {
    const estimate = SPEED_ESTIMATES[modelId as keyof typeof SPEED_ESTIMATES];
    if (!estimate) return null;

    return estimate.firstToken < 1000
      ? `~${estimate.firstToken}ms`
      : `~${Math.round(estimate.firstToken / 1000)}s`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Select Model</label>
        {selectedModelData && (
          <div className="flex items-center space-x-2">
            {getSpeedIcon(selectedModelData.speed)}
            <span className="text-sm text-muted-foreground">
              {getEstimatedSpeed(selectedModel)}
            </span>
          </div>
        )}
      </div>

      <Select value={selectedModel} onValueChange={onModelChange}>
        <SelectTrigger className="w-full bg-background border-input">
          <SelectValue placeholder="Choose a model..." />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(
            filteredModels.reduce((acc, model) => {
              const cat = model.category;
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(model);
              return acc;
            }, {} as Record<string, GrokModel[]>)
          ).map(([cat, models]) => (
            <div key={cat}>
              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground flex items-center space-x-2 border-b border-border/50 mb-1">
                {getCategoryIcon(cat)}
                <span>{MODEL_CATEGORIES[cat as keyof typeof MODEL_CATEGORIES]}</span>
              </div>
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id} className="pl-6">
                  <div className="flex items-center justify-between w-full">
                    <span>{model.name}</span>
                    <div className="flex items-center space-x-2 ml-2">
                      {getSpeedIcon(model.speed)}
                      <Badge variant="outline" className="text-xs">
                        {model.pricing.input}
                      </Badge>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </div>
          ))}
        </SelectContent>
      </Select>

      {showDetails && selectedModelData && (
        <Card className="model-card border-primary/10 shadow-sm dark:shadow-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              {getCategoryIcon(selectedModelData.category)}
              <span>{selectedModelData.name}</span>
              <Badge variant={selectedModelData.speed === 'fastest' ? 'default' : 'secondary'}
                    className={`ml-auto ${selectedModelData.speed === 'fastest' ? 'speed-badge-fastest' :
                      selectedModelData.speed === 'fast' ? 'speed-badge-fast' :
                      selectedModelData.speed === 'standard' ? 'speed-badge-average' : 'speed-badge-slow'}`}>
                {selectedModelData.speed}
              </Badge>
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              {selectedModelData.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start space-x-2">
                <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Input: {selectedModelData.pricing.input}</p>
                  <p className="text-sm font-medium">Output: {selectedModelData.pricing.output}</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Context: {formatNumber(selectedModelData.contextWindow)}</p>
                  <p className="text-sm text-muted-foreground">tokens</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Capabilities:</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedModelData.capabilities.map((capability, index) => (
                  <Badge key={index} variant="outline" className="text-xs bg-muted/50 hover:bg-muted transition-colors">
                    {capability}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
