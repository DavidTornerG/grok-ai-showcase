import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[Transcribe API] Received transcription request');

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      console.error('[Transcribe API] No audio file provided');
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    console.log('[Transcribe API] Audio file received:', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type
    });

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.error('[Transcribe API] ElevenLabs API key not configured');
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    // Prepare form data for ElevenLabs Scribe with latest model
    const elevenlabsFormData = new FormData();
    elevenlabsFormData.append('audio', audioFile);
    elevenlabsFormData.append('model', 'scribe-v1'); // Latest model with 96.7% accuracy
    elevenlabsFormData.append('language', 'en');
    elevenlabsFormData.append('response_format', 'json');

    console.log('[Transcribe API] Calling ElevenLabs Scribe API...');

    // Call ElevenLabs Scribe API
    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
      },
      body: elevenlabsFormData
    });

    console.log('[Transcribe API] ElevenLabs response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Transcribe API] ElevenLabs Scribe error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });

      return NextResponse.json(
        {
          error: 'Transcription failed',
          details: `ElevenLabs API error: ${response.status} ${response.statusText}`,
          errorText: errorText
        },
        { status: 500 }
      );
    }

    const result = await response.json();
    console.log('[Transcribe API] Transcription result:', result);

    const transcriptionText = result.text || '';
    console.log('[Transcribe API] Extracted text:', transcriptionText);

    return NextResponse.json({
      text: transcriptionText,
      language: result.language || 'en',
      confidence: result.confidence || 1.0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Transcribe API] Error transcribing audio:', error);
    return NextResponse.json(
      {
        error: 'Failed to transcribe audio',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
