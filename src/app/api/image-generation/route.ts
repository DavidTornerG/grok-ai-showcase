import { type NextRequest, NextResponse } from 'next/server';

interface VideoGenerationResult {
  videoUrl: string;
  model: string;
  revisedPrompt?: string;
  status?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model, prompt, type = 'image', duration = 5, quality = 'standard', aspectRatio = '16:9', size = '1024x1024', n = 1 } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    if (type === 'video') {
      // Video generation logic
      const openaiApiKey = process.env.OPENAI_API_KEY;
      const runwayApiKey = process.env.RUNWAY_API_KEY;
      const lumaApiKey = process.env.LUMA_API_KEY;

      if (!openaiApiKey && !runwayApiKey && !lumaApiKey) {
        return NextResponse.json(
          { error: 'Video generation API key not configured' },
          { status: 500 }
        );
      }

      let result: VideoGenerationResult;
      
      try {
        // Try Sora first (OpenAI - currently limited access)
        if (openaiApiKey && model === 'sora-1') {
          result = await generateWithSora(prompt, duration, quality, aspectRatio, openaiApiKey);
        }
        // Fallback to Runway Gen-3 Alpha (excellent quality)
        else if (runwayApiKey && (model === 'runway-gen3' || !model)) {
          result = await generateWithRunway(prompt, duration, quality, aspectRatio, runwayApiKey);
        }
        // Fallback to Luma Dream Machine (good alternative)
        else if (lumaApiKey) {
          result = await generateWithLuma(prompt, duration, quality, aspectRatio, lumaApiKey);
        }
        else {
          throw new Error('No video generation service available');
        }
      } catch (primaryError) {
        console.error('Primary video generation failed:', primaryError);
        
        // Try fallback services
        if (runwayApiKey && model !== 'runway-gen3') {
          try {
            result = await generateWithRunway(prompt, duration, quality, aspectRatio, runwayApiKey);
          } catch (fallbackError) {
            console.error('Runway fallback failed:', fallbackError);
            if (lumaApiKey) {
              result = await generateWithLuma(prompt, duration, quality, aspectRatio, lumaApiKey);
            } else {
              throw primaryError;
            }
          }
        } else if (lumaApiKey && model !== 'luma-dream') {
          result = await generateWithLuma(prompt, duration, quality, aspectRatio, lumaApiKey);
        } else {
          throw primaryError;
        }
      }
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Format response for video
      return NextResponse.json({
        data: [{
          url: result.videoUrl,
          revised_prompt: result.revisedPrompt || prompt,
          metadata: {
            duration: duration,
            quality: quality,
            aspectRatio: aspectRatio,
            model: result.model,
            status: result.status || 'completed'
          }
        }],
        responseTime,
        timestamp: new Date().toISOString()
      });

    } else {
      // Image generation logic (DALL-E)
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: 'OpenAI API key not configured' },
          { status: 500 }
        );
      }

      // Use DALL-E for image generation
      const openAIResponse = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model === 'dall-e-2' ? 'dall-e-2' : 'dall-e-3',
          prompt: prompt,
          n: model === 'dall-e-3' ? 1 : Math.min(n, 10), // DALL-E 3 only supports n=1
          size: model === 'dall-e-3' ? size : '1024x1024', // DALL-E 2 only supports 1024x1024
          quality: model === 'dall-e-3' ? quality : 'standard',
          response_format: 'url'
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

      // Format response for image
      return NextResponse.json({
        data: result.data,
        responseTime,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Generation API Error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: 'Generation service temporarily unavailable'
      },
      { status: 500 }
    );
  }
}

// Sora implementation (when API becomes available)
async function generateWithSora(prompt: string, duration: number, quality: string, aspectRatio: string, apiKey: string): Promise<VideoGenerationResult> {
  const response = await fetch('https://api.openai.com/v1/videos/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'sora-1',
      prompt: prompt,
      duration_seconds: Math.min(duration, 20), // Sora max 20 seconds
      quality: quality,
      size: aspectRatio === '16:9' ? '1920x1080' : aspectRatio === '9:16' ? '1080x1920' : '1024x1024'
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Sora generation failed');
  }

  const data = await response.json();
  return {
    videoUrl: data.data[0].url,
    revisedPrompt: data.data[0].revised_prompt,
    model: 'sora-1',
    status: 'completed'
  };
}

// Runway Gen-3 Alpha implementation
async function generateWithRunway(prompt: string, duration: number, quality: string, aspectRatio: string, apiKey: string): Promise<VideoGenerationResult> {
  // Create generation task
  const createResponse = await fetch('https://api.runwayml.com/v1/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gen3a_turbo',
      prompt: prompt,
      duration: Math.min(duration, 10), // Gen-3 max 10 seconds
      ratio: aspectRatio,
      watermark: false
    })
  });

  if (!createResponse.ok) {
    const errorData = await createResponse.json();
    throw new Error(errorData.error?.message || 'Runway generation failed');
  }

  const createData = await createResponse.json();
  const taskId = createData.id;

  // Poll for completion
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes max wait
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    
    const statusResponse = await fetch(`https://api.runwayml.com/v1/generations/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!statusResponse.ok) {
      throw new Error('Failed to check generation status');
    }

    const statusData = await statusResponse.json();
    
    if (statusData.status === 'COMPLETED') {
      return {
        videoUrl: statusData.output[0],
        model: 'runway-gen3',
        status: 'completed'
      };
    } else if (statusData.status === 'FAILED') {
      throw new Error('Video generation failed');
    }
    
    attempts++;
  }
  
  throw new Error('Video generation timeout');
}

// Luma Dream Machine implementation  
async function generateWithLuma(prompt: string, duration: number, quality: string, aspectRatio: string, apiKey: string): Promise<VideoGenerationResult> {
  const response = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      prompt: prompt,
      aspect_ratio: aspectRatio,
      loop: false
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Luma generation failed');
  }

  const data = await response.json();
  const generationId = data.id;

  // Poll for completion
  let attempts = 0;
  const maxAttempts = 60;
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const statusResponse = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${generationId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!statusResponse.ok) {
      throw new Error('Failed to check Luma generation status');
    }

    const statusData = await statusResponse.json();
    
    if (statusData.state === 'completed') {
      return {
        videoUrl: statusData.assets?.video,
        model: 'luma-dream',
        status: 'completed'
      };
    } else if (statusData.state === 'failed') {
      throw new Error('Luma video generation failed');
    }
    
    attempts++;
  }
  
  throw new Error('Luma generation timeout');
}
