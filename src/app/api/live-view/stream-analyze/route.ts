import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { grokClient } from '@/lib/grok-client';

// Simple in-memory store for frame analysis (in production, use Redis or similar)
const lastAnalysisTime: Record<string, number> = {};
const recentFrames: Record<string, string[]> = {};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { frame, context } = body;

    if (!frame) {
      return NextResponse.json(
        { error: 'Video frame is required' },
        { status: 400 }
      );
    }

    // Generate a simple session ID based on client IP or use a header
    const sessionId = request.headers.get('x-forwarded-for') || 'anonymous';
    const now = Date.now();

    // Smart throttling - only analyze if:
    // 1. It's been at least 5 seconds since last analysis, OR
    // 2. User just interacted (has recent context messages)
    const lastAnalysis = lastAnalysisTime[sessionId] || 0;
    const timeSinceLastAnalysis = now - lastAnalysis;
    const hasRecentUserInput = context && context.length > 0 &&
      context.some((msg: any) => msg.type === 'user' && (now - new Date(msg.timestamp).getTime()) < 30000);

    // Skip analysis if too frequent and no recent user interaction
    if (timeSinceLastAnalysis < 5000 && !hasRecentUserInput) {
      return NextResponse.json({
        shouldRespond: false,
        reason: 'throttled'
      });
    }

    // Store recent frames to detect significant changes
    if (!recentFrames[sessionId]) {
      recentFrames[sessionId] = [];
    }

    // Simple frame difference detection (in production, use proper image comparison)
    const recentFramesList = recentFrames[sessionId];
    if (recentFramesList.length > 0) {
      const lastFrame = recentFramesList[recentFramesList.length - 1];

      // Simple size-based change detection (rough approximation)
      if (Math.abs(frame.length - lastFrame.length) < frame.length * 0.05) {
        // Less than 5% size difference, likely similar frame
        return NextResponse.json({
          shouldRespond: false,
          reason: 'no_significant_change'
        });
      }
    }

    // Store current frame
    recentFramesList.push(frame);
    if (recentFramesList.length > 3) {
      recentFramesList.shift(); // Keep only last 3 frames
    }

    // Remove data URL prefix if present
    const base64Image = frame.replace(/^data:image\/[a-z]+;base64,/, '');

    // Prepare context from previous messages
    const contextString = context && context.length > 0
      ? `Recent conversation:\n${context.map((msg: any) => `${msg.type}: ${msg.content}`).join('\n')}\n\n`
      : '';

    const completion = await grokClient.chat.completions.create({
      model: 'grok-2-vision-latest',
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant that analyzes live screen content in real-time. You are watching the user's screen continuously and should provide helpful, contextual observations when appropriate.

Guidelines:
- Only respond when you notice something significant, interesting, or actionable
- Keep responses very brief and conversational (1-2 sentences max)
- Focus on helpful insights, errors you spot, or interesting changes
- Don't repeat obvious information or constantly narrate what you see
- Be proactive in helping with coding, debugging, or task completion
- If nothing significant is happening, don't respond

${contextString}Analyze the current screen and provide a brief helpful observation if warranted.`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please analyze this live screen frame and provide a helpful observation if you notice something significant or actionable.'
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
      max_tokens: 150,
      temperature: 0.7
    });

    const analysis = completion.choices[0]?.message?.content;

    if (!analysis) {
      return NextResponse.json({
        shouldRespond: false,
        reason: 'no_analysis'
      });
    }

    // Update last analysis time
    lastAnalysisTime[sessionId] = now;

    // Determine priority based on content
    const priority = analysis.toLowerCase().includes('error') ||
                    analysis.toLowerCase().includes('warning') ||
                    analysis.toLowerCase().includes('issue') ? 'high' : 'normal';

    return NextResponse.json({
      shouldRespond: true,
      analysis,
      priority,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error analyzing video frame:', error);
    return NextResponse.json(
      {
        shouldRespond: false,
        error: 'Failed to analyze frame',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
