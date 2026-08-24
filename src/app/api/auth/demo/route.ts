import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const doctor = await db.user.findFirst({
      where: { role: 'doctor' },
    });

    if (!doctor) {
      return NextResponse.json({ error: 'No doctor user found. Please seed demo data first.' }, { status: 404 });
    }

    const { passwordHash: _, ...userWithoutPassword } = doctor;

    return NextResponse.json({
      user: userWithoutPassword,
      token: 'demo-token',
    });
  } catch (error) {
    console.error('Demo login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
