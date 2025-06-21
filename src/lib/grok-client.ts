import OpenAI from 'openai';

export const grokClient = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

// Error type interfaces
interface APIError {
  message?: string;
  status?: number;
  statusCode?: number;
  error?: {
    message?: string;
  };
}

function isAPIError(error: unknown): error is APIError {
  return (
    typeof error === 'object' &&
    error !== null &&
    (typeof (error as APIError).message === 'string' ||
     typeof (error as APIError).status === 'number' ||
     typeof (error as APIError).statusCode === 'number' ||
     typeof (error as APIError).error === 'object')
  );
}

export interface ChatCompletionOptions {
  model: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  reasoningEffort?: 'low' | 'medium' | 'high';
}

export interface ImageAnalysisOptions {
  model: string;
  imageUrl: string;
  prompt: string;
  detail?: 'low' | 'high';
}

export interface ImageGenerationOptions {
  model: string;
  prompt: string;
  n?: number;
  responseFormat?: 'url' | 'b64_json';
  image?: string; // Base64 encoded image for image-to-image generation
}

export interface FunctionCallOptions {
  model: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    tool_call_id?: string;
  }>;
  tools: Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: object;
    };
  }>;
  toolChoice?: 'auto' | 'none' | 'required';
}

export class GrokAPIError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'GrokAPIError';
  }
}

export async function createChatCompletion(options: ChatCompletionOptions) {
  try {
    const response = await grokClient.chat.completions.create({
      model: options.model,
      messages: options.messages,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      stream: options.stream,
      ...(options.reasoningEffort && { reasoning_effort: options.reasoningEffort })
    });

    return response;
  } catch (error: unknown) {
    if (isAPIError(error)) {
      throw new GrokAPIError(
        error.message || 'Failed to create chat completion',
        error.status || error.statusCode
      );
    }
    throw new GrokAPIError('Failed to create chat completion');
  }
}

export async function analyzeImage(options: ImageAnalysisOptions) {
  try {
    const response = await grokClient.chat.completions.create({
      model: options.model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: options.imageUrl,
                detail: options.detail || 'high'
              }
            },
            {
              type: 'text',
              text: options.prompt
            }
          ]
        }
      ],
      max_tokens: 1000
    });

    return response;
  } catch (error: unknown) {
    console.error('Image analysis error:', error);

    let errorMessage = 'Failed to analyze image';
    let statusCode: number | undefined;

    if (isAPIError(error)) {
      if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      statusCode = error.status || error.statusCode;
    }

    throw new GrokAPIError(errorMessage, statusCode);
  }
}

export async function generateImage(options: ImageGenerationOptions) {
  try {
    const params: any = {
      model: options.model,
      prompt: options.prompt,
      n: options.n || 1,
      response_format: options.responseFormat || 'url'
    };

    if (options.image) {
      // If an image is provided, include it for image-to-image generation
      params.image = options.image;
    }

    const response = await grokClient.images.generate(params);

    return response;
  } catch (error: unknown) {
    if (isAPIError(error)) {
      throw new GrokAPIError(
        error.message || 'Failed to generate image',
        error.status || error.statusCode
      );
    }
    throw new GrokAPIError('Failed to generate image');
  }
}

export async function createFunctionCall(options: FunctionCallOptions) {
  try {
    const response = await grokClient.chat.completions.create({
      model: options.model,
      messages: options.messages,
      tools: options.tools,
      tool_choice: options.toolChoice || 'auto'
    });

    return response;
  } catch (error: unknown) {
    if (isAPIError(error)) {
      throw new GrokAPIError(
        error.message || 'Failed to create function call',
        error.status || error.statusCode
      );
    }
    throw new GrokAPIError('Failed to create function call');
  }
}

export async function listModels() {
  try {
    const response = await grokClient.models.list();
    return response;
  } catch (error: unknown) {
    if (isAPIError(error)) {
      throw new GrokAPIError(
        error.message || 'Failed to list models',
        error.status || error.statusCode
      );
    }
    throw new GrokAPIError('Failed to list models');
  }
}

export async function benchmarkModel(model: string, prompt = "Hello, how are you?") {
  const startTime = Date.now();

  try {
    const response = await createChatCompletion({
      model,
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 100
    });

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    return {
      model,
      totalTime,
      tokensGenerated: response.usage?.completion_tokens || 0,
      tokensPerSecond: response.usage?.completion_tokens ?
        (response.usage.completion_tokens / totalTime) * 1000 : 0,
      usage: response.usage
    };
  } catch (error: unknown) {
    if (isAPIError(error)) {
      throw new GrokAPIError(
        error.message || 'Failed to benchmark model',
        error.status || error.statusCode
      );
    }
    throw new GrokAPIError('Failed to benchmark model');
  }
}
