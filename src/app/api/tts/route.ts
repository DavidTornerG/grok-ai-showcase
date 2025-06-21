import { type NextRequest, NextResponse } from 'next/server';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const elevenlabs = new ElevenLabsClient();

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const audio = await elevenlabs.generate({
      voice: "Rachel",
      text,
      model_id: "eleven_turbo_v2_5"
    });

    const chunks = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }

    const content = Buffer.concat(chunks);

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error) {
    console.error('TTS API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
