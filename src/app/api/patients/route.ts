import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const riskLevel = searchParams.get('riskLevel') || '';

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { patientId: { contains: search } },
      ];
    }

    const patients = await db.patient.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Enrich each patient with latest risk score, level, last observation, and active alerts
    const enrichedPatients = await Promise.all(
      patients.map(async (patient) => {
        const latestRisk = await db.riskAssessment.findFirst({
          where: { patientId: patient.id },
          orderBy: { createdAt: 'desc' },
        });

        const lastObservation = await db.observation.findFirst({
          where: { patientId: patient.id },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        });

        const activeAlertCount = await db.alert.count({
          where: { patientId: patient.id, status: 'active' },
        });

        return {
          ...patient,
          latestRiskScore: latestRisk?.riskScore ?? null,
          latestRiskLevel: latestRisk?.riskLevel ?? null,
          lastObservationDate: lastObservation?.createdAt?.toISOString() ?? null,
          activeAlertCount,
        };
      })
    );

    // Filter by risk level if specified (applied after enrichment)
    const filtered = riskLevel
      ? enrichedPatients.filter((p) => p.latestRiskLevel === riskLevel.toUpperCase())
      : enrichedPatients;

    return NextResponse.json(filtered);
  } catch (error) {
    console.error('Get patients error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      patientId,
      name,
      age,
      tracheostomyInfo,
      baselinePressure,
      baselineRedness,
      baselineDischarge,
      baselineAdherence,
    } = body;

    if (!patientId || !name || age === undefined) {
      return NextResponse.json(
        { error: 'patientId, name, and age are required' },
        { status: 400 }
      );
    }

    if (typeof age !== 'number' || age < 0 || age > 150) {
      return NextResponse.json(
        { error: 'Age must be a valid number between 0 and 150' },
        { status: 400 }
      );
    }

    // Check for duplicate patientId
    const existing = await db.patient.findUnique({
      where: { patientId },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Patient ID already exists' },
        { status: 409 }
      );
    }

    const patient = await db.patient.create({
      data: {
        patientId,
        name,
        age,
        tracheostomyInfo: tracheostomyInfo || '',
        baselinePressure: baselinePressure ?? 2.0,
        baselineRedness: baselineRedness ?? 0,
        baselineDischarge: baselineDischarge ?? 0,
        baselineAdherence: baselineAdherence ?? 90,
        status: 'active',
      },
    });

    return NextResponse.json(patient, { status: 201 });
  } catch (error) {
    console.error('Create patient error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
