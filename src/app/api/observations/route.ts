import { db } from '@/lib/db';
import { calculateRisk } from '@/lib/risk-engine';
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

    const observations = await db.observation.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(observations);
  } catch (error) {
    console.error('Get observations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      patientId,
      pressure,
      redness,
      discharge,
      secretionLevel,
      careAdherence,
      symptoms,
      swelling,
      imageUrl,
      imageAnalysis,
    } = body;

    if (!patientId) {
      return NextResponse.json(
        { error: 'patientId is required' },
        { status: 400 }
      );
    }

    // Validate patient exists
    const patient = await db.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Create the observation
    const observation = await db.observation.create({
      data: {
        patientId,
        pressure: pressure ?? 0,
        redness: redness ?? 0,
        discharge: discharge ?? 0,
        secretionLevel: secretionLevel || 'low',
        careAdherence: careAdherence ?? 100,
        symptoms: symptoms || '',
        swelling: swelling ?? 0,
        imageUrl: imageUrl || null,
        imageAnalysis: imageAnalysis || null,
      },
    });

    // Auto-calculate risk
    const parsedImageAnalysis = imageAnalysis
      ? JSON.parse(imageAnalysis)
      : null;

    const risk = calculateRisk({
      pressure: observation.pressure,
      redness: observation.redness,
      discharge: observation.discharge,
      secretionLevel: observation.secretionLevel as 'low' | 'moderate' | 'high',
      careAdherence: observation.careAdherence,
      swelling: observation.swelling,
      baselinePressure: patient.baselinePressure,
      baselineRedness: patient.baselineRedness,
      baselineDischarge: patient.baselineDischarge,
      baselineAdherence: patient.baselineAdherence,
      imageAnalysis: parsedImageAnalysis,
    });

    // Create risk assessment
    const riskAssessment = await db.riskAssessment.create({
      data: {
        patientId,
        observationId: observation.id,
        riskScore: risk.score,
        riskLevel: risk.level,
        reasons: JSON.stringify(risk.reasons),
        contributors: JSON.stringify(risk.contributors),
      },
    });

    // Create alert if risk is ELEVATED or HIGH
    if (risk.level === 'ELEVATED' || risk.level === 'HIGH') {
      const prevRisk = await db.riskAssessment.findFirst({
        where: {
          patientId,
          createdAt: { lt: riskAssessment.createdAt },
        },
        orderBy: { createdAt: 'desc' },
      });

      const contributors = risk.contributors;
      const mainContribs = contributors
        .filter((c) => c.points > 0)
        .map((c) => c.factor);

      const recommendedAction =
        risk.level === 'HIGH'
          ? 'Increase monitoring frequency. Ensure all care activities are completed on schedule. Contact the healthcare professional overseeing this patient\'s care.'
          : 'Increase observation frequency. Verify care adherence. Document any additional symptoms. Consider scheduling a routine check-in with the healthcare team.';

      await db.alert.create({
        data: {
          patientId,
          riskAssessmentId: riskAssessment.id,
          alertLevel: risk.level,
          message: `Preventive risk ${risk.level.toLowerCase()} for patient ${patient.patientId}. Risk score: ${risk.score}/100.`,
          previousScore: prevRisk?.riskScore ?? null,
          newScore: risk.score,
          mainContributors: JSON.stringify(mainContribs),
          recommendedAction,
          status: 'active',
        },
      });
    }

    return NextResponse.json(
      {
        observation,
        riskAssessment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create observation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
