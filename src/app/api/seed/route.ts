import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { calculateRisk } from '@/lib/risk-engine';

export async function POST() {
  try {
    // Clean existing data
    await db.careActivity.deleteMany();
    await db.alert.deleteMany();
    await db.riskAssessment.deleteMany();
    await db.observation.deleteMany();
    await db.patient.deleteMany();
    await db.user.deleteMany();

    // Create demo users
    await db.user.create({
      data: {
        name: 'Dr. Sarah Chen',
        email: 'doctor@demo.com',
        passwordHash: 'demo_hash',
        role: 'doctor',
      },
    });

    await db.user.create({
      data: {
        name: 'James Wilson',
        email: 'caregiver@demo.com',
        passwordHash: 'demo_hash',
        role: 'caregiver',
      },
    });

    // Create demo patients
    const patients = await Promise.all([
      db.patient.create({
        data: {
          patientId: 'P001',
          name: 'Robert Martinez',
          age: 67,
          tracheostomyInfo: 'Tracheostomy performed 2024-03-15. Size 6 cuffed tube. Standard suction schedule.',
          baselinePressure: 2.0,
          baselineRedness: 20,
          baselineDischarge: 15,
          baselineAdherence: 90,
          status: 'active',
        },
      }),
      db.patient.create({
        data: {
          patientId: 'P002',
          name: 'Helen Thompson',
          age: 72,
          tracheostomyInfo: 'Tracheostomy performed 2024-01-20. Size 8 cuffed tube. Nocturnal ventilation support.',
          baselinePressure: 2.2,
          baselineRedness: 25,
          baselineDischarge: 20,
          baselineAdherence: 85,
          status: 'active',
        },
      }),
      db.patient.create({
        data: {
          patientId: 'P003',
          name: 'David Kim',
          age: 58,
          tracheostomyInfo: 'Tracheostomy performed 2024-06-01. Size 6 uncuffed tube. Standard care.',
          baselinePressure: 1.8,
          baselineRedness: 15,
          baselineDischarge: 10,
          baselineAdherence: 95,
          status: 'active',
        },
      }),
      db.patient.create({
        data: {
          patientId: 'P004',
          name: 'Margaret Davis',
          age: 81,
          tracheostomyInfo: 'Tracheostomy performed 2023-11-10. Size 7 cuffed tube. Complex care needs.',
          baselinePressure: 2.5,
          baselineRedness: 30,
          baselineDischarge: 25,
          baselineAdherence: 70,
          status: 'active',
        },
      }),
      db.patient.create({
        data: {
          patientId: 'P005',
          name: 'James Anderson',
          age: 63,
          tracheostomyInfo: 'Tracheostomy performed 2024-05-12. Size 6 cuffed tube. Routine follow-up.',
          baselinePressure: 1.9,
          baselineRedness: 12,
          baselineDischarge: 8,
          baselineAdherence: 98,
          status: 'active',
        },
      }),
    ]);

    const daysAgo = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      return d;
    };

    // P001 observations - HIGH risk trajectory
    const p001Obs = [
      { days: 7, pressure: 2.0, redness: 18, discharge: 12, secretion: 'low' as const, adherence: 95, swelling: 5, symptoms: '' },
      { days: 6, pressure: 2.1, redness: 20, discharge: 15, secretion: 'low' as const, adherence: 90, swelling: 8, symptoms: '' },
      { days: 5, pressure: 2.1, redness: 25, discharge: 18, secretion: 'low' as const, adherence: 90, swelling: 10, symptoms: 'Slight irritation noted' },
      { days: 4, pressure: 2.2, redness: 30, discharge: 22, secretion: 'moderate' as const, adherence: 85, swelling: 15, symptoms: 'Mild discomfort reported' },
      { days: 3, pressure: 2.3, redness: 40, discharge: 30, secretion: 'moderate' as const, adherence: 80, swelling: 20, symptoms: 'Redness area expanding' },
      { days: 2, pressure: 2.4, redness: 48, discharge: 38, secretion: 'moderate' as const, adherence: 75, swelling: 25, symptoms: 'Patient reports tenderness' },
      { days: 1, pressure: 2.5, redness: 55, discharge: 50, secretion: 'high' as const, adherence: 70, swelling: 30, symptoms: 'Increased tenderness and warmth around stoma' },
    ];

    for (const obs of p001Obs) {
      const observation = await db.observation.create({
        data: {
          patientId: patients[0].id,
          pressure: obs.pressure,
          redness: obs.redness,
          discharge: obs.discharge,
          secretionLevel: obs.secretion,
          careAdherence: obs.adherence,
          symptoms: obs.symptoms,
          swelling: obs.swelling,
          createdAt: daysAgo(obs.days),
        },
      });

      const risk = calculateRisk({
        pressure: obs.pressure,
        redness: obs.redness,
        discharge: obs.discharge,
        secretionLevel: obs.secretion,
        careAdherence: obs.adherence,
        swelling: obs.swelling,
        baselinePressure: patients[0].baselinePressure,
        baselineRedness: patients[0].baselineRedness,
        baselineDischarge: patients[0].baselineDischarge,
        baselineAdherence: patients[0].baselineAdherence,
      });

      await db.riskAssessment.create({
        data: {
          patientId: patients[0].id,
          observationId: observation.id,
          riskScore: risk.score,
          riskLevel: risk.level,
          reasons: JSON.stringify(risk.reasons),
          contributors: JSON.stringify(risk.contributors),
          createdAt: daysAgo(obs.days),
        },
      });
    }

    // P002 observations - ELEVATED
    const p002Obs = [
      { days: 6, pressure: 2.2, redness: 22, discharge: 18, secretion: 'low' as const, adherence: 85, swelling: 10, symptoms: '' },
      { days: 5, pressure: 2.2, redness: 25, discharge: 20, secretion: 'low' as const, adherence: 80, swelling: 12, symptoms: '' },
      { days: 4, pressure: 2.3, redness: 30, discharge: 25, secretion: 'moderate' as const, adherence: 80, swelling: 15, symptoms: 'Slight swelling noted' },
      { days: 3, pressure: 2.3, redness: 35, discharge: 28, secretion: 'moderate' as const, adherence: 75, swelling: 18, symptoms: '' },
      { days: 2, pressure: 2.4, redness: 38, discharge: 32, secretion: 'moderate' as const, adherence: 70, swelling: 20, symptoms: 'Mild discomfort' },
      { days: 1, pressure: 2.5, redness: 42, discharge: 35, secretion: 'moderate' as const, adherence: 70, swelling: 22, symptoms: 'Swelling persisting' },
    ];

    for (const obs of p002Obs) {
      const observation = await db.observation.create({
        data: {
          patientId: patients[1].id,
          pressure: obs.pressure,
          redness: obs.redness,
          discharge: obs.discharge,
          secretionLevel: obs.secretion,
          careAdherence: obs.adherence,
          symptoms: obs.symptoms,
          swelling: obs.swelling,
          createdAt: daysAgo(obs.days),
        },
      });

      const risk = calculateRisk({
        pressure: obs.pressure,
        redness: obs.redness,
        discharge: obs.discharge,
        secretionLevel: obs.secretion,
        careAdherence: obs.adherence,
        swelling: obs.swelling,
        baselinePressure: patients[1].baselinePressure,
        baselineRedness: patients[1].baselineRedness,
        baselineDischarge: patients[1].baselineDischarge,
        baselineAdherence: patients[1].baselineAdherence,
      });

      await db.riskAssessment.create({
        data: {
          patientId: patients[1].id,
          observationId: observation.id,
          riskScore: risk.score,
          riskLevel: risk.level,
          reasons: JSON.stringify(risk.reasons),
          contributors: JSON.stringify(risk.contributors),
          createdAt: daysAgo(obs.days),
        },
      });
    }

    // P003 observations - LOW
    const p003Obs = [
      { days: 5, pressure: 1.8, redness: 12, discharge: 8, secretion: 'low' as const, adherence: 100, swelling: 3, symptoms: '' },
      { days: 4, pressure: 1.8, redness: 13, discharge: 9, secretion: 'low' as const, adherence: 100, swelling: 3, symptoms: '' },
      { days: 3, pressure: 1.9, redness: 14, discharge: 9, secretion: 'low' as const, adherence: 95, swelling: 4, symptoms: '' },
      { days: 2, pressure: 1.8, redness: 12, discharge: 8, secretion: 'low' as const, adherence: 100, swelling: 3, symptoms: '' },
      { days: 1, pressure: 1.9, redness: 13, discharge: 10, secretion: 'low' as const, adherence: 95, swelling: 4, symptoms: '' },
    ];

    for (const obs of p003Obs) {
      const observation = await db.observation.create({
        data: {
          patientId: patients[2].id,
          pressure: obs.pressure,
          redness: obs.redness,
          discharge: obs.discharge,
          secretionLevel: obs.secretion,
          careAdherence: obs.adherence,
          symptoms: obs.symptoms,
          swelling: obs.swelling,
          createdAt: daysAgo(obs.days),
        },
      });

      const risk = calculateRisk({
        pressure: obs.pressure,
        redness: obs.redness,
        discharge: obs.discharge,
        secretionLevel: obs.secretion,
        careAdherence: obs.adherence,
        swelling: obs.swelling,
        baselinePressure: patients[2].baselinePressure,
        baselineRedness: patients[2].baselineRedness,
        baselineDischarge: patients[2].baselineDischarge,
        baselineAdherence: patients[2].baselineAdherence,
      });

      await db.riskAssessment.create({
        data: {
          patientId: patients[2].id,
          observationId: observation.id,
          riskScore: risk.score,
          riskLevel: risk.level,
          reasons: JSON.stringify(risk.reasons),
          contributors: JSON.stringify(risk.contributors),
          createdAt: daysAgo(obs.days),
        },
      });
    }

    // P004 observations - ELEVATED (poor adherence)
    const p004Obs = [
      { days: 5, pressure: 2.5, redness: 28, discharge: 22, secretion: 'low' as const, adherence: 60, swelling: 15, symptoms: '' },
      { days: 4, pressure: 2.5, redness: 30, discharge: 25, secretion: 'moderate' as const, adherence: 55, swelling: 18, symptoms: 'Missed tube care yesterday' },
      { days: 3, pressure: 2.6, redness: 32, discharge: 28, secretion: 'moderate' as const, adherence: 50, swelling: 20, symptoms: 'Care routine partially completed' },
      { days: 2, pressure: 2.6, redness: 35, discharge: 30, secretion: 'moderate' as const, adherence: 45, swelling: 22, symptoms: '' },
      { days: 1, pressure: 2.7, redness: 38, discharge: 32, secretion: 'moderate' as const, adherence: 40, swelling: 25, symptoms: 'Multiple care activities missed' },
    ];

    for (const obs of p004Obs) {
      const observation = await db.observation.create({
        data: {
          patientId: patients[3].id,
          pressure: obs.pressure,
          redness: obs.redness,
          discharge: obs.discharge,
          secretionLevel: obs.secretion,
          careAdherence: obs.adherence,
          symptoms: obs.symptoms,
          swelling: obs.swelling,
          createdAt: daysAgo(obs.days),
        },
      });

      const risk = calculateRisk({
        pressure: obs.pressure,
        redness: obs.redness,
        discharge: obs.discharge,
        secretionLevel: obs.secretion,
        careAdherence: obs.adherence,
        swelling: obs.swelling,
        baselinePressure: patients[3].baselinePressure,
        baselineRedness: patients[3].baselineRedness,
        baselineDischarge: patients[3].baselineDischarge,
        baselineAdherence: patients[3].baselineAdherence,
      });

      await db.riskAssessment.create({
        data: {
          patientId: patients[3].id,
          observationId: observation.id,
          riskScore: risk.score,
          riskLevel: risk.level,
          reasons: JSON.stringify(risk.reasons),
          contributors: JSON.stringify(risk.contributors),
          createdAt: daysAgo(obs.days),
        },
      });
    }

    // P005 observations - LOW
    const p005Obs = [
      { days: 5, pressure: 1.9, redness: 10, discharge: 6, secretion: 'low' as const, adherence: 100, swelling: 2, symptoms: '' },
      { days: 4, pressure: 1.9, redness: 11, discharge: 7, secretion: 'low' as const, adherence: 100, swelling: 2, symptoms: '' },
      { days: 3, pressure: 1.9, redness: 10, discharge: 6, secretion: 'low' as const, adherence: 100, swelling: 2, symptoms: '' },
      { days: 2, pressure: 1.9, redness: 11, discharge: 7, secretion: 'low' as const, adherence: 98, swelling: 3, symptoms: '' },
      { days: 1, pressure: 1.9, redness: 10, discharge: 6, secretion: 'low' as const, adherence: 100, swelling: 2, symptoms: '' },
    ];

    for (const obs of p005Obs) {
      const observation = await db.observation.create({
        data: {
          patientId: patients[4].id,
          pressure: obs.pressure,
          redness: obs.redness,
          discharge: obs.discharge,
          secretionLevel: obs.secretion,
          careAdherence: obs.adherence,
          symptoms: obs.symptoms,
          swelling: obs.swelling,
          createdAt: daysAgo(obs.days),
        },
      });

      const risk = calculateRisk({
        pressure: obs.pressure,
        redness: obs.redness,
        discharge: obs.discharge,
        secretionLevel: obs.secretion,
        careAdherence: obs.adherence,
        swelling: obs.swelling,
        baselinePressure: patients[4].baselinePressure,
        baselineRedness: patients[4].baselineRedness,
        baselineDischarge: patients[4].baselineDischarge,
        baselineAdherence: patients[4].baselineAdherence,
      });

      await db.riskAssessment.create({
        data: {
          patientId: patients[4].id,
          observationId: observation.id,
          riskScore: risk.score,
          riskLevel: risk.level,
          reasons: JSON.stringify(risk.reasons),
          contributors: JSON.stringify(risk.contributors),
          createdAt: daysAgo(obs.days),
        },
      });
    }

    // Generate alerts for HIGH and ELEVATED patients
    for (const p of patients) {
      const latestRisk = await db.riskAssessment.findFirst({
        where: { patientId: p.id },
        orderBy: { createdAt: 'desc' },
      });
      if (!latestRisk) continue;

      if (latestRisk.riskLevel === 'HIGH' || latestRisk.riskLevel === 'ELEVATED') {
        const prevRisk = await db.riskAssessment.findFirst({
          where: { patientId: p.id, createdAt: { lt: latestRisk.createdAt } },
          orderBy: { createdAt: 'desc' },
        });

        const contributors = JSON.parse(latestRisk.contributors || '[]');
        const mainContribs = contributors
          .filter((c: { points: number }) => c.points > 0)
          .map((c: { factor: string }) => c.factor);

        const recommendedAction =
          latestRisk.riskLevel === 'HIGH'
            ? 'Increase monitoring frequency. Ensure all care activities are completed on schedule. Contact the healthcare professional overseeing this patient\'s care.'
            : 'Increase observation frequency. Verify care adherence. Document any additional symptoms. Consider scheduling a routine check-in with the healthcare team.';

        await db.alert.create({
          data: {
            patientId: p.id,
            riskAssessmentId: latestRisk.id,
            alertLevel: latestRisk.riskLevel,
            message: `Preventive risk ${latestRisk.riskLevel.toLowerCase()} for patient ${p.patientId}. Risk score: ${latestRisk.riskScore}/100.`,
            previousScore: prevRisk?.riskScore ?? null,
            newScore: latestRisk.riskScore,
            mainContributors: JSON.stringify(mainContribs),
            recommendedAction,
            status: 'active',
          },
        });
      }
    }

    // Create care activities for all patients for the last 7 days
    const activityNames = ['stoma_care', 'tube_care', 'cleaning', 'observation'];
    const activityLabels: Record<string, string> = {
      stoma_care: 'Stoma care',
      tube_care: 'Tube care',
      cleaning: 'Cleaning',
      observation: 'Observation',
    };

    for (let i = 0; i < patients.length; i++) {
      for (let day = 0; day < 7; day++) {
        for (const activity of activityNames) {
          const missProb = i === 3 ? 0.35 : i === 0 ? 0.15 : 0.08;
          const isMissed = Math.random() < missProb;
          const date = daysAgo(day);
          await db.careActivity.create({
            data: {
              patientId: patients[i].id,
              activityName: activityLabels[activity],
              status: isMissed ? 'missed' : 'completed',
              date: date.toISOString().split('T')[0],
              createdAt: date,
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Demo data seeded successfully' });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Failed to seed data' }, { status: 500 });
  }
}
