# Task 2-a: API Routes Builder

## Work Summary
Created all 10 API route groups for the AeroGuard AI application.

## Routes Created

### 1. Auth Routes
- `src/app/api/auth/login/route.ts` - POST login with email/password (demo auth, no real password check)
- `src/app/api/auth/demo/route.ts` - POST to login as Dr. Sarah Chen (doctor role)

### 2. Patients Route
- `src/app/api/patients/route.ts` - GET with ?search= and ?riskLevel= filters; POST to create patient with validation
- GET enriches each patient with: latestRiskScore, latestRiskLevel, lastObservationDate, activeAlertCount

### 3. Observations Route
- `src/app/api/observations/route.ts` - GET by patientId; POST creates observation + auto-calculates risk + creates RiskAssessment + creates Alert if ELEVATED/HIGH

### 4. Risk Routes
- `src/app/api/risk/route.ts` - GET all risk assessments for a patient
- `src/app/api/risk/latest/route.ts` - GET latest risk assessment only

### 5. Alerts Route
- `src/app/api/alerts/route.ts` - GET active alerts (with patient name), PATCH to update status (reviewed/dismissed)

### 6. Care Activities Routes
- `src/app/api/care-activities/route.ts` - GET filtered by patient/date, POST to create
- `src/app/api/care-activities/adherence/route.ts` - GET daily adherence % for last 7 days

### 7. Monitoring History Route
- `src/app/api/monitoring-history/route.ts` - GET combined observations + risk assessments

### 8. AI Assistant Route
- `src/app/api/ai-assistant/route.ts` - POST with LLM integration, safety guardrails (not diagnostic), context from patient data

### 9. Image Analysis Route
- `src/app/api/image-analysis/route.ts` - POST with FormData, VLM analysis with mock fallback, saves to public/uploads

## Key Design Decisions
- All routes are server-side only (no 'use client')
- passwordHash is never exposed in any response
- Proper HTTP status codes throughout
- try/catch error handling on every route
- VLM has try/catch with deterministic mock fallback
- LLM system prompt explicitly states this is NOT a diagnostic system
- Risk auto-calculation is integrated into observation creation