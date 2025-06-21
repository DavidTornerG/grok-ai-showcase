import { type NextRequest, NextResponse } from 'next/server';
import { createFunctionCall, GrokAPIError } from '@/lib/grok-client';

// Type definitions for function arguments
interface WeatherArgs {
  location: string;
  unit?: 'celsius' | 'fahrenheit';
}

interface CalculateArgs {
  expression: string;
}

interface SearchArgs {
  query: string;
}

interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

// Safe calculator function
function safeCalculate(expression: string): number | null {
  // Only allow basic math operations and numbers
  const sanitized = expression.replace(/[^0-9+\-*/(). ]/g, '');
  
  // Basic validation
  if (!/^[0-9+\-*/(). ]+$/.test(sanitized)) {
    return null;
  }
  
  // Use Function constructor instead of eval for safer execution
  try {
    const func = new Function(`return ${sanitized}`);
    const result = func();
    return typeof result === 'number' && !Number.isNaN(result) ? result : null;
  } catch {
    return null;
  }
}

// Sample function definitions for demonstration
const SAMPLE_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'get_weather',
      description: 'Get current weather for a location',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'City and state, e.g. San Francisco, CA'
          },
          unit: {
            type: 'string',
            enum: ['celsius', 'fahrenheit'],
            default: 'fahrenheit'
          }
        },
        required: ['location']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'calculate',
      description: 'Perform mathematical calculations',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'Mathematical expression to evaluate'
          }
        },
        required: ['expression']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_web',
      description: 'Search the web for information',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query'
          }
        },
        required: ['query']
      }
    }
  }
];

// Mock function implementations
const mockFunctions = {
  get_weather: (args: WeatherArgs) => ({
    location: args.location,
    temperature: 72,
    unit: args.unit || 'fahrenheit',
    condition: 'Sunny',
    humidity: '45%'
  }),
  calculate: (args: CalculateArgs) => {
    const result = safeCalculate(args.expression);
    if (result !== null) {
      return { expression: args.expression, result };
    }
    return { expression: args.expression, error: 'Invalid expression' };
  },
  search_web: (args: SearchArgs) => ({
    query: args.query,
    results: [
      `Mock search result 1 for "${args.query}"`,
      `Mock search result 2 for "${args.query}"`,
      `Mock search result 3 for "${args.query}"`
    ]
  })
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model, messages, tools, toolChoice, customTools } = body;

    if (!model || !messages) {
      return NextResponse.json(
        { error: 'Model and messages are required' },
        { status: 400 }
      );
    }

    const toolsToUse = customTools || tools || SAMPLE_TOOLS;
    const startTime = Date.now();

    const response = await createFunctionCall({
      model,
      messages,
      tools: toolsToUse,
      toolChoice
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Handle tool calls if present
    let toolCallResults = null;
    if (response.choices[0]?.message?.tool_calls) {
      toolCallResults = response.choices[0].message.tool_calls.map((toolCall: ToolCall) => {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        // Execute mock function
        const result = mockFunctions[functionName as keyof typeof mockFunctions]?.(functionArgs) ||
          { error: `Function ${functionName} not implemented` };

        return {
          id: toolCall.id,
          function: {
            name: functionName,
            arguments: functionArgs,
            result
          }
        };
      });
    }

    return NextResponse.json({
      ...response,
      toolCallResults,
      responseTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Function Calling API Error:', error);

    if (error instanceof GrokAPIError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
