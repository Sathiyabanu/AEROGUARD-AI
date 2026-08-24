'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { RiskBadge } from '@/components/shared/RiskBadge';
import { getRiskMessage, getPreventiveGuidance } from '@/lib/risk-engine';
import {
  ArrowLeft,
  Stethoscope,
  Upload,
  X,
  Loader2,
  Camera,
  Activity,
  Shield,
  Eye,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Patient, RiskAssessment, RiskContributor, SecretionLevel, ImageAnalysisResult } from '@/types';

type SubmissionResult = {
  observation: Record<string, unknown>;
  riskAssessment: RiskAssessment;
};

export function NewObservationPage() {
  const { selectedPatient, selectPatient, setCurrentPage, currentPage } = useAppStore();

  // Data
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);

  // Form state
  const [pressure, setPressure] = useState<number>(2.0);
  const [redness, setRedness] = useState<number>(0);
  const [discharge, setDischarge] = useState<number>(0);
  const [swelling, setSwelling] = useState<number>(0);
  const [secretionLevel, setSecretionLevel] = useState<SecretionLevel>('low');
  const [symptoms, setSymptoms] = useState('');

  // Care adherence checkboxes
  const [stomaCare, setStomaCare] = useState(true);
  const [tubeCare, setTubeCare] = useState(true);
  const [cleaning, setCleaning] = useState(true);
  const [observationCheck, setObservationCheck] = useState(true);

  // Image analysis
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [imageAnalysis, setImageAnalysis] = useState<ImageAnalysisResult | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);

  // Computed
  const careAdherence = [stomaCare, tubeCare, cleaning, observationCheck].filter(Boolean).length * 25;

  const selectedPatientId = selectedPatient?.id ?? null;

  // Fetch patients
  useEffect(() => {
    async function fetchPatients() {
      try {
        const res = await fetch('/api/patients');
        if (res.ok) {
          const data = await res.json();
          setPatients(data);
        }
      } catch {
        toast.error('Failed to load patients');
      } finally {
        setLoadingPatients(false);
      }
    }
    fetchPatients();
  }, []);

  // Handle patient selection change
  const handlePatientChange = useCallback(
    (patientId: string) => {
      const patient = patients.find((p) => p.id === patientId);
      if (patient) {
        selectPatient(patient);
        // Set pressure to baseline
        setPressure(patient.baselinePressure);
      }
    },
    [patients, selectPatient]
  );

  // Image handling
  const handleImageSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }
    setImageFile(file);
    setImageAnalysis(null);
    setImageUrl(null);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleImageSelect(file);
    },
    [handleImageSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleImageSelect(file);
    },
    [handleImageSelect]
  );

  const removeImage = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    setImageAnalysis(null);
    setImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // Analyze image
  const analyzeImage = useCallback(async () => {
    if (!imageFile) return;
    setAnalyzingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      const res = await fetch('/api/image-analysis', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setImageAnalysis({
          rednessIndicator: data.rednessIndicator,
          dischargeIndicator: data.dischargeIndicator,
          swellingDetected: data.swellingDetected,
          visualChangeDetected: data.visualChangeDetected,
          confidence: data.confidence,
        });
        setImageUrl(data.imageUrl);
        toast.success('Image analysis complete');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Image analysis failed');
      }
    } catch {
      toast.error('Failed to analyze image');
    } finally {
      setAnalyzingImage(false);
    }
  }, [imageFile]);

  // Submit observation
  const handleSubmit = async () => {
    if (!selectedPatientId) {
      toast.error('Please select a patient');
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        patientId: selectedPatientId,
        pressure,
        redness,
        discharge,
        secretionLevel,
        careAdherence,
        swelling,
        symptoms,
      };

      if (imageAnalysis && imageUrl) {
        body.imageAnalysis = JSON.stringify(imageAnalysis);
        body.imageUrl = imageUrl;
      }

      const res = await fetch('/api/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data: SubmissionResult = await res.json();
        setResult(data);
        toast.success('Observation recorded successfully');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to record observation');
      }
    } catch {
      toast.error('Failed to record observation');
    } finally {
      setSubmitting(false);
    }
  };

  // Parse risk assessment
  const riskLevel = result?.riskAssessment?.riskLevel as 'LOW' | 'ELEVATED' | 'HIGH' | undefined;
  const riskScore = result?.riskAssessment?.riskScore ?? 0;
  let contributors: RiskContributor[] = [];
  try {
    if (result?.riskAssessment?.contributors) {
      contributors = JSON.parse(result.riskAssessment.contributors as string);
    }
  } catch {
    // ignore
  }

  // Reset form
  const resetForm = () => {
    setResult(null);
    setPressure(selectedPatient?.baselinePressure ?? 2.0);
    setRedness(0);
    setDischarge(0);
    setSwelling(0);
    setSecretionLevel('low');
    setSymptoms('');
    setStomaCare(true);
    setTubeCare(true);
    setCleaning(true);
    setObservationCheck(true);
    removeImage();
  };

  // Show result
  if (result && riskLevel) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <Card className="border-2">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg text-slate-500 font-medium">
              Observation Analysis Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Risk Score */}
            <div className="text-center space-y-3">
              <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">
                Prevention Risk Score
              </p>
              <div className="flex items-center justify-center gap-4">
                <span
                  className={`text-6xl font-bold ${
                    riskLevel === 'HIGH'
                      ? 'text-red-600'
                      : riskLevel === 'ELEVATED'
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                  }`}
                >
                  {riskScore}
                </span>
                <span className="text-2xl text-slate-400">/100</span>
                <RiskBadge level={riskLevel} size="lg" />
              </div>
            </div>

            <Separator />

            {/* Risk Message */}
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm font-medium text-slate-600">
                {getRiskMessage(riskLevel)}
              </p>
            </div>

            {/* Contributors */}
            {contributors.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700">Risk Contributors</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {contributors.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                    >
                      <span className="text-slate-600">{c.factor}</span>
                      <span className="flex items-center gap-2">
                        {c.points > 0 ? (
                          <span className="text-red-600 font-semibold">+{c.points}</span>
                        ) : (
                          <span className="text-emerald-600 font-medium flex items-center gap-1">
                            <CheckCircle2 className="size-3.5" /> Normal
                          </span>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            c.status === 'normal'
                              ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                              : c.status === 'high' || c.status === 'poor'
                                ? 'border-red-200 text-red-700 bg-red-50'
                                : 'border-amber-200 text-amber-700 bg-amber-50'
                          }`}
                        >
                          {c.status}
                        </Badge>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Preventive Guidance */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="size-4 text-teal-600" />
                <h3 className="text-sm font-semibold text-slate-700">
                  Preventive Guidance
                </h3>
              </div>
              <p className="text-sm text-slate-600 bg-teal-50 border border-teal-100 rounded-lg p-4">
                {getPreventiveGuidance(riskLevel)}
              </p>
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                className="flex-1 bg-teal-600 hover:bg-teal-700"
                onClick={() => {
                  setCurrentPage('patient-detail');
                }}
              >
                <Eye className="size-4 mr-2" />
                View Patient Details
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={resetForm}
              >
                <RotateCcw className="size-4 mr-2" />
                Record Another Observation
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Form view
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Loading Overlay */}
      {submitting && (
        <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
          <Loader2 className="size-12 text-teal-600 animate-spin" />
          <p className="text-lg font-medium text-slate-700">
            Analyzing patient observation...
          </p>
          <p className="text-sm text-slate-500">
            Calculating risk indicators and generating assessment
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentPage('patients')}
          className="mt-1"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Observation</h1>
          <p className="text-sm text-slate-500 mt-1">
            Record a new observation for the selected patient.
          </p>
        </div>
      </div>

      {/* Patient Selector (if no patient selected) */}
      {!selectedPatient && (
        <Card>
          <CardContent className="p-4">
            <Label className="text-sm font-medium text-slate-700 mb-2 block">
              Select Patient
            </Label>
            {loadingPatients ? (
              <div className="h-9 bg-slate-100 rounded-md animate-pulse" />
            ) : patients.length === 0 ? (
              <p className="text-sm text-slate-400">No patients found. Add a patient first.</p>
            ) : (
              <Select onValueChange={handlePatientChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a patient..." />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="font-mono text-xs text-slate-400 mr-2">
                        {p.patientId}
                      </span>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>
      )}

      {selectedPatient && (
        <>
          {/* Selected patient banner */}
          <div className="flex items-center gap-3 bg-slate-50 border rounded-lg px-4 py-3">
            <Stethoscope className="size-5 text-teal-600" />
            <div>
              <p className="font-semibold text-slate-800">{selectedPatient.name}</p>
              <p className="text-xs text-slate-500 font-mono">
                {selectedPatient.patientId}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-slate-500"
              onClick={() => useAppStore.getState().clearPatientSelection()}
            >
              Change
            </Button>
          </div>

          {/* Section 1: Airway / Pressure */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Activity className="size-4 text-teal-600" />
                Airway / Pressure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pressure" className="text-sm font-medium">
                  Cuff Pressure (cmH₂O)
                </Label>
                <Input
                  id="pressure"
                  type="number"
                  step={0.1}
                  min={0}
                  max={10}
                  value={pressure}
                  onChange={(e) => setPressure(parseFloat(e.target.value) || 0)}
                  placeholder="e.g., 2.0"
                  className="max-w-xs"
                />
                <p className="text-xs text-slate-400">
                  Baseline:{' '}
                  <span className="font-mono font-medium text-slate-600">
                    {selectedPatient.baselinePressure} cmH₂O
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Section 2: Stoma Condition */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Eye className="size-4 text-teal-600" />
                Stoma Condition
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Redness Severity</Label>
                  <span
                    className={`text-sm font-semibold font-mono ${
                      redness > 40
                        ? 'text-red-600'
                        : redness > 25
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                    }`}
                  >
                    {redness}
                  </span>
                </div>
                <Slider
                  value={[redness]}
                  onValueChange={(v) => setRedness(v[0])}
                  min={0}
                  max={100}
                  step={1}
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>0 — None</span>
                  <span>50 — Moderate</span>
                  <span>100 — Severe</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Discharge Severity
                  </Label>
                  <span
                    className={`text-sm font-semibold font-mono ${
                      discharge > 40
                        ? 'text-red-600'
                        : discharge > 25
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                    }`}
                  >
                    {discharge}
                  </span>
                </div>
                <Slider
                  value={[discharge]}
                  onValueChange={(v) => setDischarge(v[0])}
                  min={0}
                  max={100}
                  step={1}
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>0 — None</span>
                  <span>50 — Moderate</span>
                  <span>100 — Severe</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Swelling</Label>
                  <span
                    className={`text-sm font-semibold font-mono ${
                      swelling > 40
                        ? 'text-red-600'
                        : swelling > 25
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                    }`}
                  >
                    {swelling}
                  </span>
                </div>
                <Slider
                  value={[swelling]}
                  onValueChange={(v) => setSwelling(v[0])}
                  min={0}
                  max={100}
                  step={1}
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>0 — None</span>
                  <span>50 — Moderate</span>
                  <span>100 — Severe</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Section 3: Secretions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-800">
                Secretions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={secretionLevel}
                onValueChange={(v) => setSecretionLevel(v as SecretionLevel)}
                className="flex flex-wrap gap-4"
              >
                {(['low', 'moderate', 'high'] as SecretionLevel[]).map((level) => (
                  <div key={level} className="flex items-center gap-2">
                    <RadioGroupItem value={level} id={`secretion-${level}`} />
                    <Label
                      htmlFor={`secretion-${level}`}
                      className="text-sm font-normal capitalize cursor-pointer"
                    >
                      {level}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          <Separator />

          {/* Section 4: Care Adherence */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-800">
                  Care Adherence Since Last Observation
                </CardTitle>
                <Badge
                  variant="outline"
                  className={`font-semibold ${
                    careAdherence === 100
                      ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                      : careAdherence >= 75
                        ? 'border-amber-200 text-amber-700 bg-amber-50'
                        : 'border-red-200 text-red-700 bg-red-50'
                  }`}
                >
                  {careAdherence}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  label: 'Stoma Care',
                  checked: stomaCare,
                  onChange: setStomaCare,
                },
                {
                  label: 'Tube Care',
                  checked: tubeCare,
                  onChange: setTubeCare,
                },
                {
                  label: 'Cleaning',
                  checked: cleaning,
                  onChange: setCleaning,
                },
                {
                  label: 'Observation',
                  checked: observationCheck,
                  onChange: setObservationCheck,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-lg border px-4 py-3"
                >
                  <Label className="text-sm font-medium cursor-pointer" htmlFor={`care-${item.label}`}>{item.label}</Label>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-medium ${
                        item.checked ? 'text-emerald-600' : 'text-red-500'
                      }`}
                    >
                      {item.checked ? 'Completed' : 'Missed'}
                    </span>
                    <Checkbox
                      id={`care-${item.label}`}
                      checked={item.checked}
                      onCheckedChange={() => item.onChange(!item.checked)}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Separator />

          {/* Section 5: Symptoms / Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-800">
                Symptoms / Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="Record any additional symptoms, observations, or notes about the patient's condition..."
                rows={4}
                className="resize-none"
              />
            </CardContent>
          </Card>

          <Separator />

          {/* Section 6: Stoma Image */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Camera className="size-4 text-teal-600" />
                Stoma Image{' '}
                <span className="text-slate-400 font-normal">(Optional)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload area */}
              {!imagePreview ? (
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? 'border-teal-400 bg-teal-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="size-8 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-600">
                    Drag & drop an image here, or click to browse
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports JPG, PNG, GIF, WebP
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Stoma preview"
                      className="max-h-48 rounded-lg border object-contain"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 size-6"
                      onClick={removeImage}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>

                  {!imageAnalysis && (
                    <Button
                      onClick={analyzeImage}
                      disabled={analyzingImage}
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      {analyzingImage ? (
                        <>
                          <Loader2 className="size-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Eye className="size-4 mr-2" />
                          Analyze Image
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}

              {/* Image Analysis Results */}
              {imageAnalysis && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="size-4 text-amber-600" />
                    <p className="text-sm font-semibold text-slate-700">
                      AI-Assisted Visual Risk Indicator
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-md border px-3 py-2">
                      <p className="text-xs text-slate-500">Redness Indicator</p>
                      <p
                        className={`text-sm font-semibold capitalize ${
                          imageAnalysis.rednessIndicator === 'high' ||
                          imageAnalysis.rednessIndicator === 'elevated'
                            ? 'text-red-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {imageAnalysis.rednessIndicator}
                      </p>
                    </div>
                    <div className="bg-white rounded-md border px-3 py-2">
                      <p className="text-xs text-slate-500">
                        Discharge Indicator
                      </p>
                      <p
                        className={`text-sm font-semibold capitalize ${
                          imageAnalysis.dischargeIndicator === 'high' ||
                          imageAnalysis.dischargeIndicator === 'elevated'
                            ? 'text-red-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {imageAnalysis.dischargeIndicator}
                      </p>
                    </div>
                    <div className="bg-white rounded-md border px-3 py-2">
                      <p className="text-xs text-slate-500">Swelling</p>
                      <p
                        className={`text-sm font-semibold ${
                          imageAnalysis.swellingDetected
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {imageAnalysis.swellingDetected
                          ? 'Detected'
                          : 'Not detected'}
                      </p>
                    </div>
                    <div className="bg-white rounded-md border px-3 py-2">
                      <p className="text-xs text-slate-500">Visual Change</p>
                      <p
                        className={`text-sm font-semibold ${
                          imageAnalysis.visualChangeDetected
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {imageAnalysis.visualChangeDetected
                          ? 'Detected'
                          : 'Not detected'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-xs text-slate-400 bg-amber-50 border border-amber-100 rounded-md p-2.5">
                    <Info className="size-3.5 mt-0.5 shrink-0 text-amber-500" />
                    <p>
                      This analysis is a supporting risk indicator and is not a
                      medical diagnosis.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="pt-2">
            <Button
              size="lg"
              className="w-full bg-teal-600 hover:bg-teal-700 text-base h-12"
              onClick={handleSubmit}
              disabled={submitting}
            >
              <Stethoscope className="size-5 mr-2" />
              Analyze Observation
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
