import { type NextRequest, NextResponse } from 'next/server';
import { grokClient } from '@/lib/grok-client';
import { Readable } from 'stream';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const model = formData.get('model') as string;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (!model) {
      return NextResponse.json({ error: 'Model is required' }, { status: 400 });
    }

    const transcription = await grokClient.audio.transcriptions.create({
      file,
      model,
    });

    return NextResponse.json(transcription);
  } catch (error) {
    console.error('Speech-to-text API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
