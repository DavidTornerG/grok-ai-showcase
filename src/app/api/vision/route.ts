import { type NextRequest, NextResponse } from 'next/server';
import { analyzeImage, GrokAPIError } from '@/lib/grok-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model, imageUrl, prompt, detail } = body;

    // Validate required fields
    if (!model || !imageUrl || !prompt) {
      return NextResponse.json(
        { error: 'Model, imageUrl, and prompt are required' },
        { status: 400 }
      );
    }

    // Validate model is vision capable
    if (!model.includes('vision')) {
      return NextResponse.json(
        { error: 'Selected model does not support image analysis' },
        { status: 400 }
      );
    }

    // Validate image URL format
    if (!imageUrl.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Invalid image format. Please upload a valid image.' },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    const response = await analyzeImage({
      model,
      imageUrl,
      prompt,
      detail: detail || 'high'
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Validate response structure
    if (!response?.choices?.[0]?.message?.content) {
      return NextResponse.json(
        { error: 'Invalid response from vision model' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...response,
      responseTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Vision API Error:', error);

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
