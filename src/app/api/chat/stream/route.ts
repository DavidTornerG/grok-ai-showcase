import type { NextRequest } from 'next/server';
import { grokClient, GrokAPIError } from '@/lib/grok-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model, messages, maxTokens, temperature, reasoningEffort } = body;

    if (!model || !messages) {
      return new Response('Model and messages are required', { status: 400 });
    }

    const stream = await grokClient.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      stream: true,
      ...(reasoningEffort && { reasoning_effort: reasoningEffort })
    });

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          let firstChunkTime: number | null = null;
          const startTime = Date.now();

          for await (const chunk of stream) {
            if (firstChunkTime === null) {
              firstChunkTime = Date.now() - startTime;
            }

            const delta = chunk.choices[0]?.delta;

            if (delta?.content) {
              const data = {
                content: delta.content,
                firstChunkTime: firstChunkTime,
                timestamp: Date.now() - startTime
              };

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
              );
            }

            // Handle reasoning content if available
            if (delta?.reasoning_content) {
              const reasoningData = {
                reasoning: delta.reasoning_content,
                timestamp: Date.now() - startTime
              };

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(reasoningData)}\n\n`)
              );
            }

            // Handle finish reason
            if (chunk.choices[0]?.finish_reason) {
              const finishData = {
                finish_reason: chunk.choices[0].finish_reason,
                usage: chunk.usage,
                totalTime: Date.now() - startTime
              };

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(finishData)}\n\n`)
              );
            }
          }
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error) {
    console.error('Stream API Error:', error);

    if (error instanceof GrokAPIError) {
      return new Response(error.message, { status: error.statusCode || 500 });
    }

    return new Response('Internal server error', { status: 500 });
  }
}
