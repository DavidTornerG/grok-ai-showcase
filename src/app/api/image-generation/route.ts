import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model, prompt, n, responseFormat } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Check for OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const startTime = Date.now();

    // Use DALL-E 3 for image generation
    const openAIResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1, // DALL-E 3 only supports n=1
        size: '1024x1024', // DALL-E 3 default size
        quality: 'standard', // or 'hd' for higher quality
        response_format: responseFormat || 'url'
      })
    });

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.json();
      console.error('OpenAI API Error:', errorData);
      return NextResponse.json(
        { error: errorData.error?.message || 'Failed to generate image' },
        { status: openAIResponse.status }
      );
    }

    const result = await openAIResponse.json();
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Format response to match existing structure
    return NextResponse.json({
      data: result.data,
      responseTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Image Generation API Error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
