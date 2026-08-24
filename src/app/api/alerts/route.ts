import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    const where: Record<string, unknown> = { status: 'active' };
    if (patientId) {
      where.patientId = patientId;
    }

    const alerts = await db.alert.findMany({
      where,
      include: {
        patient: {
          select: { name: true, patientId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Flatten patient name into the response
    const flattened = alerts.map((alert) => ({
      ...alert,
      patientName: alert.patient.name,
      patientPatientId: alert.patient.patientId,
      patient: undefined,
    }));

    return NextResponse.json(flattened);
  } catch (error) {
    console.error('Get alerts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id query parameter is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status } = body;

    if (!status || !['reviewed', 'dismissed'].includes(status)) {
      return NextResponse.json(
        { error: "status must be 'reviewed' or 'dismissed'" },
        { status: 400 }
      );
    }

    const alert = await db.alert.findUnique({ where: { id } });

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    const updated = await db.alert.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update alert error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
