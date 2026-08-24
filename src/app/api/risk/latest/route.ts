import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    if (!patientId) {
      return NextResponse.json(
        { error: 'patientId query parameter is required' },
        { status: 400 }
      );
    }

    const latestRisk = await db.riskAssessment.findFirst({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestRisk) {
      return NextResponse.json(
        { error: 'No risk assessment found for this patient' },
        { status: 404 }
      );
    }

    return NextResponse.json(latestRisk);
  } catch (error) {
    console.error('Get latest risk error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
