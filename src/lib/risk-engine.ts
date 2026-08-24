import { RiskContributor, RiskReason, RiskLevel, ImageAnalysisResult, SecretionLevel } from '@/types';

interface RiskInput {
  pressure: number;
  redness: number;
  discharge: number;
  secretionLevel: SecretionLevel;
  careAdherence: number;
  swelling: number;
  baselinePressure: number;
  baselineRedness: number;
  baselineDischarge: number;
  baselineAdherence: number;
  imageAnalysis?: ImageAnalysisResult | null;
}

interface RiskOutput {
  score: number;
  level: RiskLevel;
  contributors: RiskContributor[];
  reasons: RiskReason[];
}

/**
 * Deterministic threshold-based risk engine for tracheostomy preventive care.
 * 
 * This is a PROTOTYPE risk indicator, NOT a clinically validated model.
 * Score range: 0-100
 * Risk levels: LOW (0-29), ELEVATED (30-59), HIGH (60-100)
 */
export function calculateRisk(input: RiskInput): RiskOutput {
  const contributors: RiskContributor[] = [];
  const reasons: RiskReason[] = [];
  let totalScore = 0;

  // Factor 1: Pressure variation from baseline (max +10)
  const pressureDelta = Math.abs(input.pressure - input.baselinePressure);
  const pressureThreshold = 0.3;
  if (pressureDelta > pressureThreshold) {
    const points = 10;
    contributors.push({
      factor: 'Pressure',
      points,
      status: 'increased',
    });
    reasons.push({
      factor: 'Pressure',
      description: `Pressure changed from baseline (${input.baselinePressure} → ${input.pressure})`,
    });
    totalScore += points;
  } else {
    contributors.push({
      factor: 'Pressure',
      points: 0,
      status: 'normal',
    });
  }

  // Factor 2: Redness (max +15)
  if (input.redness > 40) {
    const points = 15;
    contributors.push({
      factor: 'Redness',
      points,
      status: 'high',
    });
    reasons.push({
      factor: 'Redness',
      description: `Increased redness detected (score: ${input.redness}, baseline: ${input.baselineRedness})`,
    });
    totalScore += points;
  } else if (input.redness > 25) {
    contributors.push({
      factor: 'Redness',
      points: 0,
      status: 'increased',
    });
    reasons.push({
      factor: 'Redness',
      description: `Slight increase in redness (score: ${input.redness})`,
    });
  } else {
    contributors.push({
      factor: 'Redness',
      points: 0,
      status: 'normal',
    });
  }

  // Factor 3: Discharge (max +15)
  if (input.discharge > 40) {
    const points = 15;
    contributors.push({
      factor: 'Discharge',
      points,
      status: 'high',
    });
    reasons.push({
      factor: 'Discharge',
      description: `Increased discharge detected (score: ${input.discharge}, baseline: ${input.baselineDischarge})`,
    });
    totalScore += points;
  } else if (input.discharge > 25) {
    contributors.push({
      factor: 'Discharge',
      points: 0,
      status: 'increased',
    });
    reasons.push({
      factor: 'Discharge',
      description: `Slight increase in discharge (score: ${input.discharge})`,
    });
  } else {
    contributors.push({
      factor: 'Discharge',
      points: 0,
      status: 'normal',
    });
  }

  // Factor 4: Secretion level (max +15)
  if (input.secretionLevel === 'high') {
    const points = 15;
    contributors.push({
      factor: 'Secretions',
      points,
      status: 'high',
    });
    reasons.push({
      factor: 'Secretions',
      description: 'High secretion level detected',
    });
    totalScore += points;
  } else if (input.secretionLevel === 'moderate') {
    contributors.push({
      factor: 'Secretions',
      points: 0,
      status: 'moderate',
    });
  } else {
    contributors.push({
      factor: 'Secretions',
      points: 0,
      status: 'normal',
    });
  }

  // Factor 5: Care adherence (max +10)
  if (input.careAdherence < 50) {
    const points = 10;
    contributors.push({
      factor: 'Care Adherence',
      points,
      status: 'poor',
    });
    reasons.push({
      factor: 'Care Adherence',
      description: `Poor care adherence detected (${input.careAdherence}%)`,
    });
    totalScore += points;
  } else if (input.careAdherence < 75) {
    contributors.push({
      factor: 'Care Adherence',
      points: 0,
      status: 'moderate',
    });
    reasons.push({
      factor: 'Care Adherence',
      description: `Care adherence below optimal (${input.careAdherence}%)`,
    });
  } else {
    contributors.push({
      factor: 'Care Adherence',
      points: 0,
      status: 'normal',
    });
  }

  // Factor 6: Image analysis (max +20)
  if (input.imageAnalysis) {
    const img = input.imageAnalysis;
    let imagePoints = 0;
    const imageReasons: string[] = [];

    if (img.rednessIndicator === 'elevated' || img.rednessIndicator === 'high') {
      imagePoints += 7;
      imageReasons.push('AI-assisted analysis detected elevated redness');
    }
    if (img.dischargeIndicator === 'elevated' || img.dischargeIndicator === 'high') {
      imagePoints += 7;
      imageReasons.push('AI-assisted analysis detected elevated discharge');
    }
    if (img.visualChangeDetected) {
      imagePoints += 6;
      imageReasons.push('AI-assisted analysis detected visual changes from baseline');
    }

    imagePoints = Math.min(imagePoints, 20);
    if (imagePoints > 0) {
      contributors.push({
        factor: 'Image Analysis',
        points: imagePoints,
        status: 'increased',
      });
      imageReasons.forEach(r => reasons.push({ factor: 'Image Analysis', description: r }));
      totalScore += imagePoints;
    } else {
      contributors.push({
        factor: 'Image Analysis',
        points: 0,
        status: 'normal',
      });
    }
  } else {
    contributors.push({
      factor: 'Image Analysis',
      points: 0,
      status: 'normal',
    });
  }

  // Clamp score to 0-100
  totalScore = Math.max(0, Math.min(100, totalScore));

  // Determine risk level
  let level: RiskLevel = 'LOW';
  if (totalScore >= 60) {
    level = 'HIGH';
  } else if (totalScore >= 30) {
    level = 'ELEVATED';
  }

  return {
    score: totalScore,
    level,
    contributors,
    reasons,
  };
}

export function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case 'HIGH':
      return 'text-red-600';
    case 'ELEVATED':
      return 'text-amber-600';
    case 'LOW':
      return 'text-emerald-600';
  }
}

export function getRiskBgColor(level: RiskLevel): string {
  switch (level) {
    case 'HIGH':
      return 'bg-red-50 border-red-200 text-red-700';
    case 'ELEVATED':
      return 'bg-amber-50 border-amber-200 text-amber-700';
    case 'LOW':
      return 'bg-emerald-50 border-emerald-200 text-emerald-700';
  }
}

export function getRiskBadgeVariant(level: RiskLevel): 'destructive' | 'default' | 'secondary' | 'outline' {
  switch (level) {
    case 'HIGH':
      return 'destructive';
    case 'ELEVATED':
      return 'secondary';
    case 'LOW':
      return 'outline';
  }
}

export function getRiskTrend(scores: number[]): 'increasing' | 'decreasing' | 'stable' {
  if (scores.length < 2) return 'stable';
  const recent = scores.slice(-3);
  const first = recent[0];
  const last = recent[recent.length - 1];
  if (last > first + 5) return 'increasing';
  if (last < first - 5) return 'decreasing';
  return 'stable';
}

export function getRiskMessage(level: RiskLevel): string {
  switch (level) {
    case 'HIGH':
      return 'Significant warning indicators detected. Immediate review recommended.';
    case 'ELEVATED':
      return 'Some indicators above baseline. Closer monitoring is recommended.';
    case 'LOW':
      return 'Indicators are within expected range. Continue routine monitoring.';
  }
}

export function getPreventiveGuidance(level: RiskLevel): string {
  switch (level) {
    case 'HIGH':
      return 'Increase monitoring frequency. Ensure all care activities are completed on schedule. Contact the healthcare professional overseeing this patient\'s care.';
    case 'ELEVATED':
      return 'Increase observation frequency. Verify care adherence. Document any additional symptoms. Consider scheduling a routine check-in with the healthcare team.';
    case 'LOW':
      return 'Continue standard monitoring schedule. Maintain current care routine. Document observations regularly.';
  }
}
