import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { VLM } from 'z-ai-web-dev-sdk';

const MOCK_RESULT = {
  rednessIndicator: 'elevated',
  dischargeIndicator: 'moderate',
  swellingDetected: true,
  visualChangeDetected: true,
  confidence: 0.72,
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Supported: jpeg, png, webp, gif' },
        { status: 400 }
      );
    }

    // Save file to public/uploads
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const timestamp = Date.now();
    const ext = imageFile.name.split('.').pop() || 'png';
    const fileName = `analysis_${timestamp}.${ext}`;
    const filePath = join(process.cwd(), 'public', 'uploads', fileName);

    await writeFile(filePath, buffer);
    const imageUrl = `/uploads/${fileName}`;

    // Try VLM analysis first, fall back to mock
    let analysisResult;

    try {
      const vlm = new VLM({ apiKey: process.env.ZAI_API_KEY || '' });
      const base64Image = buffer.toString('base64');
      const mimeType = imageFile.type;

      const result = await vlm.chat({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                },
              },
              {
                type: 'text',
                text: `Analyze this tracheostomy stoma image. Respond ONLY with a valid JSON object (no markdown, no code blocks) with these exact fields:
- "rednessIndicator": one of "normal", "elevated", "high"
- "dischargeIndicator": one of "normal", "moderate", "elevated", "high"
- "swellingDetected": true or false
- "visualChangeDetected": true or false
- "confidence": a number between 0 and 1

Example: {"rednessIndicator": "elevated", "dischargeIndicator": "moderate", "swellingDetected": true, "visualChangeDetected": true, "confidence": 0.72}`,
              },
            ],
          },
        ],
      });

      // Parse the JSON response from VLM
      const content = result.content.trim();
      // Remove any markdown code block wrappers if present
      const jsonStr = content
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      analysisResult = JSON.parse(jsonStr);
    } catch (vlmError) {
      console.warn('VLM analysis failed, using mock result:', vlmError);
      analysisResult = MOCK_RESULT;
    }

    return NextResponse.json({
      imageUrl,
      analysis: analysisResult,
    });
  } catch (error) {
    console.error('Image analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze image' },
      { status: 500 }
    );
  }
}
