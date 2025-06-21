export interface GrokModel {
  id: string;
  name: string;
  description: string;
  category: 'text' | 'vision' | 'image-generation' | 'reasoning';
  speed: 'fastest' | 'fast' | 'standard' | 'slow';
  pricing: {
    input: string;
    output: string;
  };
  contextWindow: number;
  capabilities: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string; // Changed to string
  model?: string;
  reasoning?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  images?: {
    url: string;
    name: string;
  }[];
}

export interface ImageMessage {
  id: string;
  role: 'user' | 'assistant';
  content: {
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
      url: string;
      detail?: 'low' | 'high';
    };
  }[];
  timestamp: string; // Changed to string
  model?: string;
}

export interface GeneratedImage {
  url: string;
  revised_prompt?: string;
}

export interface SpeedBenchmark {
  model: string;
  timeToFirstToken: number;
  totalTime: number;
  tokensPerSecond: number;
  timestamp: string; // Changed to string
}

export interface FunctionCall {
  name: string;
  arguments: string;
  result?: string;
}

export interface ModelComparison {
  models: string[];
  prompt: string;
  responses: {
    model: string;
    response: string;
    time: number;
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  }[];
}
