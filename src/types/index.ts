export type UserRole = 'doctor' | 'caregiver' | 'patient';

export type RiskLevel = 'LOW' | 'ELEVATED' | 'HIGH';

export type SecretionLevel = 'low' | 'moderate' | 'high';

export type AlertStatus = 'active' | 'reviewed' | 'dismissed';

export type CareActivityStatus = 'completed' | 'missed';

export type PageView =
  | 'login'
  | 'dashboard'
  | 'patients'
  | 'patient-detail'
  | 'new-observation'
  | 'risk-analysis'
  | 'alerts'
  | 'monitoring'
  | 'care-adherence'
  | 'settings'
  | 'add-patient';

export interface RiskContributor {
  factor: string;
  points: number;
  status: 'normal' | 'increased' | 'high' | 'moderate' | 'poor';
}

export interface RiskReason {
  factor: string;
  description: string;
}

export interface PatientWithLatest extends Patient {
  latestRiskScore?: number | null;
  latestRiskLevel?: string | null;
  riskTrend?: 'stable' | 'increasing' | 'decreasing';
  lastObservationDate?: string | null;
  activeAlertCount?: number;
}

export interface ObservationWithRisk extends Observation {
  riskAssessment?: RiskAssessment | null;
}

export interface ImageAnalysisResult {
  rednessIndicator: string;
  dischargeIndicator: string;
  swellingDetected: boolean;
  visualChangeDetected: boolean;
  confidence: number;
}

// Prisma-generated types are used directly for DB models
// These are extended types for the frontend
export interface Patient {
  id: string;
  patientId: string;
  name: string;
  age: number;
  tracheostomyInfo: string;
  baselinePressure: number;
  baselineRedness: number;
  baselineDischarge: number;
  baselineAdherence: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Observation {
  id: string;
  patientId: string;
  pressure: number;
  redness: number;
  discharge: number;
  secretionLevel: string;
  careAdherence: number;
  imageUrl: string | null;
  imageAnalysis: string | null;
  symptoms: string;
  swelling: number;
  createdAt: string;
}

export interface RiskAssessment {
  id: string;
  patientId: string;
  observationId: string | null;
  riskScore: number;
  riskLevel: string;
  reasons: string;
  contributors: string;
  createdAt: string;
}

export interface Alert {
  id: string;
  patientId: string;
  riskAssessmentId: string | null;
  alertLevel: string;
  message: string;
  previousScore: number | null;
  newScore: number | null;
  mainContributors: string;
  recommendedAction: string;
  status: string;
  createdAt: string;
}

export interface CareActivity {
  id: string;
  patientId: string;
  activityName: string;
  status: string;
  date: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}
