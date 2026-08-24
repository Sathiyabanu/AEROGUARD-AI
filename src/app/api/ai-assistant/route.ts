import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { LLM } from 'z-ai-web-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientId, question } = body;

    if (!patientId || !question) {
      return NextResponse.json(
        { error: 'patientId and question are required' },
        { status: 400 }
      );
    }

    // Fetch patient data
    const patient = await db.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Fetch latest observation
    const latestObservation = await db.observation.findFirst({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch latest risk assessment
    const latestRisk = await db.riskAssessment.findFirst({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });

    const systemPrompt = `You are a preventive care support assistant for AeroGuard, a tracheostomy care monitoring system.

CRITICAL SAFETY RULES:
1. You are a PREVENTIVE CARE SUPPORT TOOL, NOT a diagnostic system.
2. You must ONLY explain existing data that has been provided to you.
3. You must NEVER diagnose any medical condition, prescribe any treatment, or provide medical advice.
4. If the user asks for a diagnosis or treatment recommendation, politely decline and direct them to consult a qualified healthcare professional.
5. You can summarize trends, explain what the data shows, and describe risk indicators in plain language.
6. Always include a disclaimer that this is not medical advice.

You will be provided with patient context data including:
- Patient information (name, age, tracheostomy info, baselines)
- Latest observation readings (pressure, redness, discharge, secretion, care adherence, swelling, symptoms)
- Latest risk assessment (score, level, reasons, contributors)

Respond clearly and concisely. Use bullet points when listing multiple items. Always be factual and data-driven.`;

    const riskContributors = latestRisk
      ? JSON.parse(latestRisk.contributors || '[]')
      : [];
    const riskReasons = latestRisk
      ? JSON.parse(latestRisk.reasons || '[]')
      : [];

    const dataContext = `
Patient: ${patient.name} (ID: ${patient.patientId}), Age: ${patient.age}
Tracheostomy Info: ${patient.tracheostomyInfo}
Baseline Values: Pressure=${patient.baselinePressure}, Redness=${patient.baselineRedness}, Discharge=${patient.baselineDischarge}, Adherence=${patient.baselineAdherence}%

${latestObservation ? `Latest Observation (${new Date(latestObservation.createdAt).toLocaleDateString()}):
- Pressure: ${latestObservation.pressure}
- Redness: ${latestObservation.redness}
- Discharge: ${latestObservation.discharge}
- Secretion Level: ${latestObservation.secretionLevel}
- Care Adherence: ${latestObservation.careAdherence}%
- Swelling: ${latestObservation.swelling}
- Symptoms: ${latestObservation.symptoms || 'None reported'}`
      : 'No observations recorded yet.'}

${latestRisk ? `Latest Risk Assessment (${new Date(latestRisk.createdAt).toLocaleDateString()}):
- Risk Score: ${latestRisk.riskScore}/100
- Risk Level: ${latestRisk.riskLevel}
- Contributors: ${riskContributors.map((c: { factor: string; points: number; status: string }) => `${c.factor} (${c.status}, ${c.points}pts)`).join(', ') || 'None flagged'}
- Reasons: ${riskReasons.map((r: { factor: string; description: string }) => r.description).join('; ') || 'No specific reasons'}`
      : 'No risk assessments yet.'}
`;

    const userPrompt = `Context data:
${dataContext}

User question: ${question}`;

    const llm = new LLM({ apiKey: process.env.ZAI_API_KEY || '' });
    const result = await llm.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    return NextResponse.json({ response: result.content });
  } catch (error) {
    console.error('AI assistant error:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI response' },
      { status: 500 }
    );
  }
}
