import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { grokClient } from '@/lib/grok-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { screenshot, context } = body;

    if (!screenshot) {
      return NextResponse.json(
        { error: 'Screenshot is required' },
        { status: 400 }
      );
    }

    // Remove data URL prefix if present
    const base64Image = screenshot.replace(/^data:image\/[a-z]+;base64,/, '');

    // Prepare context from previous messages
    const contextString = context && context.length > 0
      ? `Previous conversation context:\n${context.map((msg: any) => `${msg.type}: ${msg.content}`).join('\n')}\n\n`
      : '';

    const completion = await grokClient.chat.completions.create({
      model: 'grok-2-vision-latest',
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant that analyzes screen content and provides helpful insights. Analyze what you see on the screen and provide a brief, relevant observation or suggestion. Keep responses concise and actionable.

${contextString}Please analyze the current screen and provide a helpful insight or observation.`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please analyze this screen capture and tell me what you observe. Provide helpful insights or suggestions based on what you see.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 300,
      temperature: 0.7
    });

    const analysis = completion.choices[0]?.message?.content;

    if (!analysis) {
      throw new Error('No analysis received from Grok');
    }

    return NextResponse.json({
      analysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error analyzing screenshot:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze screenshot',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
