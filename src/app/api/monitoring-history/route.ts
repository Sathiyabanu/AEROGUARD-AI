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

    // Get observations with their risk assessments
    const observations = await db.observation.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: {
        riskAssessment: true,
      },
    });

    const history = observations.map((obs) => ({
      ...obs,
      riskAssessment: obs.riskAssessment
        ? {
            id: obs.riskAssessment.id,
            riskScore: obs.riskAssessment.riskScore,
            riskLevel: obs.riskAssessment.riskLevel,
            reasons: obs.riskAssessment.reasons,
            contributors: obs.riskAssessment.contributors,
            createdAt: obs.riskAssessment.createdAt,
          }
        : null,
    }));

    return NextResponse.json(history);
  } catch (error) {
    console.error('Get monitoring history error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
