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

    // Generate last 7 days
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }

    // Fetch all care activities for the patient in the last 7 days
    const activities = await db.careActivity.findMany({
      where: {
        patientId,
        date: { in: days },
      },
    });

    // Calculate adherence per day
    const adherence = days.map((date) => {
      const dayActivities = activities.filter((a) => a.date === date);
      const total = dayActivities.length;
      const completed = dayActivities.filter((a) => a.status === 'completed').length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        date,
        total,
        completed,
        missed: total - completed,
        adherencePercentage: percentage,
      };
    });

    return NextResponse.json(adherence);
  } catch (error) {
    console.error('Get adherence error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
