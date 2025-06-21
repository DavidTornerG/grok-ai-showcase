import type { GrokModel } from '@/types';

export const GROK_MODELS: GrokModel[] = [
  {
    id: 'grok-3-mini-fast-latest',
    name: 'Grok 3 Mini Fast',
    description: 'Fastest model for quick logic tasks with thinking traces',
    category: 'reasoning',
    speed: 'fastest',
    pricing: {
      input: '$0.60/M',
      output: '$4.00/M'
    },
    contextWindow: 131072,
    capabilities: ['Text Generation', 'Reasoning Traces', 'Function Calling', 'Structured Output']
  },
  {
    id: 'grok-3-fast-latest',
    name: 'Grok 3 Fast',
    description: 'Fastest enterprise-grade model with deep domain knowledge',
    category: 'text',
    speed: 'fast',
    pricing: {
      input: '$5.00/M',
      output: '$25.00/M'
    },
    contextWindow: 131072,
    capabilities: ['Enterprise Tasks', 'Data Extraction', 'Coding', 'Text Summarization', 'Function Calling']
  },
  {
    id: 'grok-3-mini-latest',
    name: 'Grok 3 Mini',
    description: 'Lightweight model that thinks before responding',
    category: 'reasoning',
    speed: 'standard',
    pricing: {
      input: '$0.30/M',
      output: '$0.50/M'
    },
    contextWindow: 131072,
    capabilities: ['Logic Tasks', 'Reasoning Traces', 'Cost-Effective', 'Function Calling']
  },
  {
    id: 'grok-3-latest',
    name: 'Grok 3',
    description: 'Flagship model with deep domain knowledge in finance, healthcare, law, and science',
    category: 'text',
    speed: 'standard',
    pricing: {
      input: '$3.00/M',
      output: '$15.00/M'
    },
    contextWindow: 131072,
    capabilities: ['Enterprise Use Cases', 'Deep Domain Knowledge', 'Complex Analysis', 'Function Calling']
  },
  {
    id: 'grok-2-vision-latest',
    name: 'Grok 2 Vision',
    description: 'Advanced image understanding and analysis model',
    category: 'vision',
    speed: 'slow',
    pricing: {
      input: '$2.00/M text + $2.00/M image',
      output: '$10.00/M'
    },
    contextWindow: 8192,
    capabilities: ['Image Analysis', 'OCR', 'Visual Understanding', 'Multi-modal Input']
  },
  {
    id: 'grok-2-image-latest',
    name: 'Grok 2 Image Generation',
    description: 'Generate high-quality images from text prompts',
    category: 'image-generation',
    speed: 'slow',
    pricing: {
      input: 'Text prompt',
      output: '$0.07 per image'
    },
    contextWindow: 131072,
    capabilities: ['Image Generation', 'Creative Art', 'Concept Visualization', 'Style Transfer']
  },
  {
    id: 'grok-2-latest',
    name: 'Grok 2',
    description: 'Previous generation model (legacy)',
    category: 'text',
    speed: 'slow',
    pricing: {
      input: '$2.00/M',
      output: '$10.00/M'
    },
    contextWindow: 131072,
    capabilities: ['General Purpose', 'Legacy Support', 'Text Generation']
  }
];

export const MODEL_CATEGORIES = {
  text: 'Text Generation',
  reasoning: 'Reasoning & Logic',
  vision: 'Image Understanding',
  'image-generation': 'Image Generation'
};

export const SPEED_ESTIMATES = {
  'grok-3-mini-fast-latest': { firstToken: 300, fullResponse: 800 },
  'grok-3-fast-latest': { firstToken: 450, fullResponse: 1200 },
  'grok-3-mini-latest': { firstToken: 650, fullResponse: 1500 },
  'grok-3-latest': { firstToken: 1000, fullResponse: 2500 },
  'grok-2-vision-latest': { firstToken: 2000, fullResponse: 4000 },
  'grok-2-image-latest': { firstToken: 20000, fullResponse: 30000 },
  'grok-2-latest': { firstToken: 1200, fullResponse: 3000 }
};
