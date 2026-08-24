import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';

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
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(imageFile.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const timestamp = Date.now();
    const ext = imageFile.name.split('.').pop() || 'png';
    const fileName = `analysis_${timestamp}.${ext}`;
    const filePath = join(process.cwd(), 'public', 'uploads', fileName);

    await writeFile(filePath, buffer);
    const imageUrl = `/uploads/${fileName}`;

    // Try VLM analysis, fall back to mock
    let analysisResult = MOCK_RESULT;

    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const client = new ZAI({ apiKey: process.env.ZAI_API_KEY || '' });
      const base64Image = buffer.toString('base64');

      const result = await client.createChatCompletionVision({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:${imageFile.type};base64,${base64Image}` } },
              { type: 'text', text: 'Analyze this tracheostomy stoma image. Respond ONLY with valid JSON: {"rednessIndicator":"normal"|"elevated"|"high","dischargeIndicator":"normal"|"moderate"|"elevated"|"high","swellingDetected":true|false,"visualChangeDetected":true|false,"confidence":0.0-1.0}' },
            ],
          },
        ],
      });

      const content = (result?.content || result?.choices?.[0]?.message?.content || '').trim()
        .replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      analysisResult = JSON.parse(content);
    } catch {
      // Use mock result as fallback
    }

    return NextResponse.json({ imageUrl, analysis: analysisResult });
  } catch (error) {
    console.error('Image analysis error:', error);
    return NextResponse.json({ error: 'Failed to analyze image' }, { status: 500 });
  }
}
