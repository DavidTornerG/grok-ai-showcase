import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const model = formData.get('model') as string;
    const prompt = formData.get('prompt') as string;
    const n = formData.get('n') as string;
    const responseFormat = formData.get('responseFormat') as string;
    const imageFile = formData.get('image') as File;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    if (!imageFile) {
      return NextResponse.json(
        { error: 'Reference image is required for image-to-image generation' },
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

    // Convert image file to base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');
    const imageDataUrl = `data:${imageFile.type};base64,${base64Image}`;

    // Use GPT-4 Vision to analyze the image and create detailed prompt
    const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: imageDataUrl,
                  detail: 'high'
                }
              },
              {
                type: 'text',
                text: `Analyze this image in extreme detail and create a comprehensive prompt for DALL-E 3 to replicate it. User wants: "${prompt}"

ANALYZE AND DESCRIBE PRECISELY:

SUBJECT DETAILS:
- Main subject(s) and their exact appearance
- Facial features, expressions, emotions
- Hair color, style, texture
- Clothing and accessories with exact colors and styles
- Body position, pose, and gestures

ART STYLE:
- Specific art style (photorealistic, anime, cartoon, etc.)
- Color palette and mood
- Lighting and shadows
- Background and environment

COMPOSITION:
- Camera angle and perspective
- Framing and focal points
- Depth of field effects

Create a detailed DALL-E 3 prompt that will generate a similar image while incorporating the user's request. Be extremely specific about every visual element.`
              }
            ]
          }
        ],
        max_tokens: 1000
      })
    });

    if (!visionResponse.ok) {
      const errorData = await visionResponse.json();
      console.error('GPT-4 Vision API Error:', errorData);
      return NextResponse.json(
        { error: errorData.error?.message || 'Failed to analyze image' },
        { status: visionResponse.status }
      );
    }

    const visionResult = await visionResponse.json();
    const detailedAnalysis = visionResult.choices?.[0]?.message?.content || prompt;

    // Combine analysis with user prompt
    const finalPrompt = `${detailedAnalysis}\n\nAdditional requirements: ${prompt}`;

    console.log('Final DALL-E 3 prompt:', finalPrompt);

    // Generate new image with DALL-E 3
    const dalleResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: finalPrompt,
        n: 1, // DALL-E 3 only supports n=1
        size: '1024x1024',
        quality: 'standard',
        response_format: responseFormat || 'url'
      })
    });

    if (!dalleResponse.ok) {
      const errorData = await dalleResponse.json();
      console.error('DALL-E 3 API Error:', errorData);
      return NextResponse.json(
        { error: errorData.error?.message || 'Failed to generate image' },
        { status: dalleResponse.status }
      );
    }

    const dalleResult = await dalleResponse.json();
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    return NextResponse.json({
      data: dalleResult.data,
      responseTime,
      timestamp: new Date().toISOString(),
      detailed_analysis: detailedAnalysis,
      final_prompt: finalPrompt,
      method: 'gpt4-vision-dalle3'
    });

  } catch (error) {
    console.error('Image-to-Image Generation API Error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
