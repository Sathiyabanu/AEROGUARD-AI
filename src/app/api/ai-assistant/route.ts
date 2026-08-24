import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

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

    const patient = await db.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const latestObservation = await db.observation.findFirst({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });

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

Respond clearly and concisely. Use bullet points when listing multiple items.`;

    const riskContributors = latestRisk ? JSON.parse(latestRisk.contributors || '[]') : [];
    const riskReasons = latestRisk ? JSON.parse(latestRisk.reasons || '[]') : [];

    const dataContext = `
Patient: ${patient.name} (ID: ${patient.patientId}), Age: ${patient.age}
Baseline Values: Pressure=${patient.baselinePressure}, Redness=${patient.baselineRedness}, Discharge=${patient.baselineDischarge}, Adherence=${patient.baselineAdherence}%

${latestObservation ? `Latest Observation:
- Pressure: ${latestObservation.pressure}
- Redness: ${latestObservation.redness}
- Discharge: ${latestObservation.discharge}
- Secretion: ${latestObservation.secretionLevel}
- Adherence: ${latestObservation.careAdherence}%
- Swelling: ${latestObservation.swelling}
- Symptoms: ${latestObservation.symptoms || 'None'}` : 'No observations yet.'}

${latestRisk ? `Risk Assessment: Score ${latestRisk.riskScore}/100 (${latestRisk.riskLevel})
Contributors: ${riskContributors.map((c: { factor: string; points: number }) => `${c.factor} +${c.points}`).join(', ')}` : 'No risk assessments yet.'}`;

    const userPrompt = `Context:\n${dataContext}\n\nQuestion: ${question}`;

    try {
      const client = new ZAI({ apiKey: process.env.ZAI_API_KEY || '' });
      const result = await client.createChatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });
      return NextResponse.json({ response: result?.content || result?.choices?.[0]?.message?.content || 'No response generated.' });
    } catch {
      // Fallback: generate a data-based response without AI
      const fallbackResponse = generateFallbackResponse(patient, latestObservation, latestRisk, question);
      return NextResponse.json({ response: fallbackResponse });
    }
  } catch (error) {
    console.error('AI assistant error:', error);
    return NextResponse.json({ error: 'Failed to generate AI response' }, { status: 500 });
  }
}

function generateFallbackResponse(patient: any, obs: any, risk: any, question: string): string {
  const q = question.toLowerCase();
  let response = '';

  if (q.includes('risk') && (q.includes('why') || q.includes('elevated') || q.includes('high'))) {
    const reasons = risk ? JSON.parse(risk.reasons || '[]') : [];
    response = `Based on the available data for ${patient.name}:\n\n`;
    if (reasons.length > 0) {
      response += `The current risk assessment (${risk.riskScore}/100, ${risk.riskLevel}) is influenced by:\n`;
      reasons.forEach((r: { description: string }) => { response += `- ${r.description}\n`; });
    } else {
      response += 'No specific risk factors have been flagged in the latest assessment. The patient appears to be within normal parameters.';
    }
    response += '\n\n*This is data-based preventive guidance, not a medical diagnosis.*';
  } else if (q.includes('monitor') || q.includes('watch')) {
    response = `For ${patient.name}, the key indicators to monitor are:\n`;
    response += `- Pressure (baseline: ${patient.baselinePressure})\n`;
    response += `- Redness (baseline: ${patient.baselineRedness})\n`;
    response += `- Discharge (baseline: ${patient.baselineDischarge})\n`;
    response += `- Care adherence (baseline: ${patient.baselineAdherence}%)\n`;
    if (obs) response += `\nLatest readings show pressure at ${obs.pressure}, redness at ${obs.redness}, discharge at ${obs.discharge}.`;
    response += '\n\n*This is informational support and should not replace professional clinical judgment.*';
  } else {
    response = `Here is a summary of ${patient.name}'s current status:\n`;
    response += `- Patient ID: ${patient.patientId}, Age: ${patient.age}\n`;
    response += `- Latest risk score: ${risk ? `${risk.riskScore}/100 (${risk.riskLevel})` : 'No assessment yet'}\n`;
    if (obs) {
      response += `- Latest observation: Pressure ${obs.pressure}, Redness ${obs.redness}, Discharge ${obs.discharge}\n`;
      response += `- Secretion level: ${obs.secretionLevel}, Care adherence: ${obs.careAdherence}%\n`;
    }
    response += '\n\n*This is preventive care guidance, not medical advice. Please consult a healthcare professional for clinical decisions.*';
  }

  return response;
}
