import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const date = searchParams.get('date');

    if (!patientId) {
      return NextResponse.json(
        { error: 'patientId query parameter is required' },
        { status: 400 }
      );
    }

    const where: Record<string, unknown> = { patientId };
    if (date) {
      where.date = date;
    }

    const activities = await db.careActivity.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error('Get care activities error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientId, activityName, status, date } = body;

    if (!patientId || !activityName || !date) {
      return NextResponse.json(
        { error: 'patientId, activityName, and date are required' },
        { status: 400 }
      );
    }

    if (!['completed', 'missed'].includes(status)) {
      return NextResponse.json(
        { error: "status must be 'completed' or 'missed'" },
        { status: 400 }
      );
    }

    const activity = await db.careActivity.create({
      data: {
        patientId,
        activityName,
        status: status || 'completed',
        date,
      },
    });

    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    console.error('Create care activity error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
