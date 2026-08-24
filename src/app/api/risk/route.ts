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

    const riskAssessments = await db.riskAssessment.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(riskAssessments);
  } catch (error) {
    console.error('Get risk assessments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
