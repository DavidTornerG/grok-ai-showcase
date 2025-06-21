import { type NextRequest, NextResponse } from 'next/server';
import { createChatCompletion, GrokAPIError } from '@/lib/grok-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model, messages, maxTokens, temperature, reasoningEffort } = body;

    if (!model || !messages) {
      return NextResponse.json(
        { error: 'Model and messages are required' },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    const response = await createChatCompletion({
      model,
      messages,
      maxTokens,
      temperature,
      reasoningEffort
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    return NextResponse.json({
      ...response,
      responseTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat API Error:', error);

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
