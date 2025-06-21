import { type NextRequest, NextResponse } from 'next/server';
import { benchmarkModel, GrokAPIError } from '@/lib/grok-client';
import { GROK_MODELS } from '@/config/models';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { models, prompt, includeAll } = body;

    const modelsToTest = includeAll ?
      GROK_MODELS.filter(m => m.category !== 'image-generation').map(m => m.id) :
      models;

    if (!modelsToTest || modelsToTest.length === 0) {
      return NextResponse.json(
        { error: 'At least one model is required' },
        { status: 400 }
      );
    }

    const testPrompt = prompt || "Hello, how are you? Please respond briefly.";
    const results = [];

    for (const model of modelsToTest) {
      try {
        const benchmark = await benchmarkModel(model, testPrompt);
        results.push({
          ...benchmark,
          status: 'success',
          timestamp: new Date().toISOString()
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          model,
          status: 'error',
          error: errorMessage,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Sort by speed (fastest first)
    results.sort((a, b) => {
      if (a.status === 'error') return 1;
      if (b.status === 'error') return -1;
      return (a as any).totalTime - (b as any).totalTime;
    });

    return NextResponse.json({
      results,
      prompt: testPrompt,
      totalTested: modelsToTest.length,
      successful: results.filter(r => r.status === 'success').length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Benchmark API Error:', error);

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

export async function GET() {
  return NextResponse.json({
    availableModels: GROK_MODELS.map(model => ({
      id: model.id,
      name: model.name,
      category: model.category,
      speed: model.speed
    }))
  });
}
