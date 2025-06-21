import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { grokClient } from '@/lib/grok-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, screenshot, context } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Prepare context from previous messages
    const contextString = context && context.length > 0
      ? `Previous conversation:\n${context.map((msg: any) => `${msg.type}: ${msg.content}`).join('\n')}\n\n`
      : '';

    // Prepare the messages array
    const messages: any[] = [
      {
        role: 'system',
        content: `You are an AI assistant helping with live screen analysis and voice interaction. You can see the user's screen and respond to their voice commands and questions. Provide helpful, contextual responses based on what you can see on the screen and what the user is asking.

Key instructions:
- Keep responses conversational and natural for voice interaction
- Be helpful and actionable in your suggestions
- Reference what you see on the screen when relevant
- Keep responses concise but informative (ideal for text-to-speech)

${contextString}Please respond to the user's message while considering the current screen content.`
      }
    ];

    // Add user message with optional screenshot
    if (screenshot) {
      // Remove data URL prefix if present
      const base64Image = screenshot.replace(/^data:image\/[a-z]+;base64,/, '');

      messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: message
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`
            }
          }
        ]
      });
    } else {
      messages.push({
        role: 'user',
        content: message
      });
    }

    const completion = await grokClient.chat.completions.create({
      model: screenshot ? 'grok-2-vision-latest' : 'grok-3-fast-latest',
      messages,
      max_tokens: 250, // Keep responses concise for voice interaction
      temperature: 0.7
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      throw new Error('No response received from Grok');
    }

    return NextResponse.json({
      response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting AI response:', error);
    return NextResponse.json(
      {
        error: 'Failed to get AI response',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
