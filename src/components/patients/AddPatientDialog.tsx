'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  UserPlus,
  Loader2,
  Heart,
  Settings2,
} from 'lucide-react';
import { toast } from 'sonner';

type Mode = 'page' | 'dialog';

interface AddPatientDialogProps {
  mode?: Mode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

export function AddPatientDialog({
  mode = 'page',
  open,
  onOpenChange,
  children,
}: AddPatientDialogProps) {
  const { setCurrentPage } = useAppStore();

  // Auto-generate patient ID
  const [nextPatientNum, setNextPatientNum] = useState(1);
  const [generatedId, setGeneratedId] = useState('P001');

  // Form state
  const [patientId, setPatientId] = useState('P001');
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [tracheostomyInfo, setTracheostomyInfo] = useState('');
  const [baselinePressure, setBaselinePressure] = useState(2.0);
  const [baselineRedness, setBaselineRedness] = useState(0);
  const [baselineDischarge, setBaselineDischarge] = useState(0);
  const [baselineAdherence, setBaselineAdherence] = useState(90);

  const [submitting, setSubmitting] = useState(false);

  // Fetch existing patients to determine next ID
  useEffect(() => {
    async function fetchPatients() {
      try {
        const res = await fetch('/api/patients');
        if (res.ok) {
          const data = await res.json();
          const nums = data
            .map((p: { patientId: string }) => {
              const match = p.patientId.match(/P(\d+)/);
              return match ? parseInt(match[1], 10) : 0;
            })
            .filter((n: number) => n > 0);
          const maxNum = nums.length > 0 ? Math.max(...nums) : 0;
          const nextNum = maxNum + 1;
          const id = `P${String(nextNum).padStart(3, '0')}`;
          setNextPatientNum(nextNum);
          setGeneratedId(id);
          setPatientId(id);
        }
      } catch {
        // Use default
      }
    }
    fetchPatients();
  }, []);

  const resetForm = useCallback(() => {
    setPatientId(generatedId);
    setName('');
    setAge('');
    setTracheostomyInfo('');
    setBaselinePressure(2.0);
    setBaselineRedness(0);
    setBaselineDischarge(0);
    setBaselineAdherence(90);
  }, [generatedId]);

  const handleSubmit = async () => {
    // Validation
    if (!patientId.trim()) {
      toast.error('Patient ID is required');
      return;
    }
    if (!name.trim()) {
      toast.error('Patient name is required');
      return;
    }
    if (age === '' || typeof age !== 'number' || age < 0 || age > 150) {
      toast.error('Please enter a valid age (0-150)');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patientId.trim(),
          name: name.trim(),
          age,
          tracheostomyInfo: tracheostomyInfo.trim(),
          baselinePressure,
          baselineRedness,
          baselineDischarge,
          baselineAdherence,
        }),
      });

      if (res.ok) {
        toast.success(`Patient "${name.trim()}" added successfully`);
        resetForm();
        if (mode === 'page') {
          setCurrentPage('patients');
        } else {
          onOpenChange?.(false);
        }
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to add patient');
      }
    } catch {
      toast.error('Failed to add patient');
    } finally {
      setSubmitting(false);
    }
  };

  // Dialog mode
  if (mode === 'dialog') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-5 text-teal-600" />
              Add New Patient
            </DialogTitle>
          </DialogHeader>
          <PatientForm
            patientId={patientId}
            setPatientId={setPatientId}
            name={name}
            setName={setName}
            age={age}
            setAge={setAge}
            tracheostomyInfo={tracheostomyInfo}
            setTracheostomyInfo={setTracheostomyInfo}
            baselinePressure={baselinePressure}
            setBaselinePressure={setBaselinePressure}
            baselineRedness={baselineRedness}
            setBaselineRedness={setBaselineRedness}
            baselineDischarge={baselineDischarge}
            setBaselineDischarge={setBaselineDischarge}
            baselineAdherence={baselineAdherence}
            setBaselineAdherence={setBaselineAdherence}
            submitting={submitting}
            onSubmit={handleSubmit}
          />
        </DialogContent>
      </Dialog>
    );
  }

  // Page mode
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentPage('patients')}
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Add New Patient</h1>
            <p className="text-sm text-slate-500 mt-1">
              Register a new patient and set their personalized baselines.
            </p>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {submitting && (
        <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
          <Loader2 className="size-12 text-teal-600 animate-spin" />
          <p className="text-lg font-medium text-slate-700">
            Creating patient record...
          </p>
        </div>
      )}

      <Card>
        <CardContent className="p-6 space-y-0">
          <PatientForm
            patientId={patientId}
            setPatientId={setPatientId}
            name={name}
            setName={setName}
            age={age}
            setAge={setAge}
            tracheostomyInfo={tracheostomyInfo}
            setTracheostomyInfo={setTracheostomyInfo}
            baselinePressure={baselinePressure}
            setBaselinePressure={setBaselinePressure}
            baselineRedness={baselineRedness}
            setBaselineRedness={setBaselineRedness}
            baselineDischarge={baselineDischarge}
            setBaselineDischarge={setBaselineDischarge}
            baselineAdherence={baselineAdherence}
            setBaselineAdherence={setBaselineAdherence}
            submitting={submitting}
            onSubmit={handleSubmit}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// Extracted form for reuse in both page and dialog modes
interface PatientFormProps {
  patientId: string;
  setPatientId: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  age: number | '';
  setAge: (v: number | '') => void;
  tracheostomyInfo: string;
  setTracheostomyInfo: (v: string) => void;
  baselinePressure: number;
  setBaselinePressure: (v: number) => void;
  baselineRedness: number;
  setBaselineRedness: (v: number) => void;
  baselineDischarge: number;
  setBaselineDischarge: (v: number) => void;
  baselineAdherence: number;
  setBaselineAdherence: (v: number) => void;
  submitting: boolean;
  onSubmit: () => void;
}

function PatientForm({
  patientId,
  setPatientId,
  name,
  setName,
  age,
  setAge,
  tracheostomyInfo,
  setTracheostomyInfo,
  baselinePressure,
  setBaselinePressure,
  baselineRedness,
  setBaselineRedness,
  baselineDischarge,
  setBaselineDischarge,
  baselineAdherence,
  setBaselineAdherence,
  submitting,
  onSubmit,
}: PatientFormProps) {
  return (
    <div className="space-y-6">
      {/* Section 1: Patient Information */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Heart className="size-4 text-teal-600" />
          <h3 className="text-base font-semibold text-slate-800">
            Patient Information
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="patient-id" className="text-sm font-medium">
              Patient ID
            </Label>
            <Input
              id="patient-id"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="e.g., P001"
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="patient-name" className="text-sm font-medium">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="patient-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., John Smith"
            />
          </div>
        </div>

        <div className="space-y-2 max-w-xs">
          <Label htmlFor="patient-age" className="text-sm font-medium">
            Age <span className="text-red-500">*</span>
          </Label>
          <Input
            id="patient-age"
            type="number"
            min={0}
            max={150}
            value={age}
            onChange={(e) => {
              const val = e.target.value;
              setAge(val === '' ? '' : parseInt(val, 10));
            }}
            placeholder="e.g., 65"
          />
        </div>
      </div>

      <Separator />

      {/* Section 2: Tracheostomy Information */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Settings2 className="size-4 text-teal-600" />
          <h3 className="text-base font-semibold text-slate-800">
            Tracheostomy Information
          </h3>
        </div>

        <div className="space-y-2">
          <Label htmlFor="trach-info" className="text-sm font-medium">
            Procedure Details / Notes
          </Label>
          <Textarea
            id="trach-info"
            value={tracheostomyInfo}
            onChange={(e) => setTracheostomyInfo(e.target.value)}
            placeholder="e.g., Size 6 cuffed tracheostomy tube, placed on 2024-01-15. Indication: prolonged mechanical ventilation post-CVA."
            rows={3}
            className="resize-none"
          />
        </div>
      </div>

      <Separator />

      {/* Section 3: Personalized Baseline */}
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <Settings2 className="size-4 text-teal-600" />
          <h3 className="text-base font-semibold text-slate-800">
            Personalized Baseline
          </h3>
        </div>
        <p className="text-xs text-slate-400">
          Set baseline values for this patient. Future observations will be
          compared against these values for risk assessment.
        </p>

        {/* Baseline Pressure */}
        <div className="space-y-2 max-w-sm">
          <Label htmlFor="baseline-pressure" className="text-sm font-medium">
            Baseline Pressure (cmH₂O)
          </Label>
          <Input
            id="baseline-pressure"
            type="number"
            step={0.1}
            min={0}
            max={10}
            value={baselinePressure}
            onChange={(e) =>
              setBaselinePressure(parseFloat(e.target.value) || 0)
            }
            placeholder="e.g., 2.0"
          />
          <p className="text-xs text-slate-400">
            Typical range: 1.5 – 3.5 cmH₂O
          </p>
        </div>

        {/* Baseline Redness */}
        <div className="space-y-3">
          <div className="flex items-center justify-between max-w-sm">
            <Label className="text-sm font-medium">Baseline Redness</Label>
            <span className="text-sm font-semibold font-mono text-slate-600">
              {baselineRedness}
            </span>
          </div>
          <Slider
            value={[baselineRedness]}
            onValueChange={(v) => setBaselineRedness(v[0])}
            min={0}
            max={100}
            step={1}
            className="max-w-sm"
          />
          <div className="flex justify-between text-xs text-slate-400 max-w-sm">
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>

        {/* Baseline Discharge */}
        <div className="space-y-3">
          <div className="flex items-center justify-between max-w-sm">
            <Label className="text-sm font-medium">Baseline Discharge</Label>
            <span className="text-sm font-semibold font-mono text-slate-600">
              {baselineDischarge}
            </span>
          </div>
          <Slider
            value={[baselineDischarge]}
            onValueChange={(v) => setBaselineDischarge(v[0])}
            min={0}
            max={100}
            step={1}
            className="max-w-sm"
          />
          <div className="flex justify-between text-xs text-slate-400 max-w-sm">
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>

        {/* Baseline Care Adherence */}
        <div className="space-y-3">
          <div className="flex items-center justify-between max-w-sm">
            <Label className="text-sm font-medium">
              Baseline Care Adherence (%)
            </Label>
            <span className="text-sm font-semibold font-mono text-slate-600">
              {baselineAdherence}%
            </span>
          </div>
          <Slider
            value={[baselineAdherence]}
            onValueChange={(v) => setBaselineAdherence(v[0])}
            min={0}
            max={100}
            step={1}
            className="max-w-sm"
          />
          <div className="flex justify-between text-xs text-slate-400 max-w-sm">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Submit */}
      <div className="pt-2">
        <Button
          size="lg"
          className="w-full bg-teal-600 hover:bg-teal-700 text-base h-12"
          onClick={onSubmit}
          disabled={submitting}
        >
          <UserPlus className="size-5 mr-2" />
          Add Patient
        </Button>
      </div>
    </div>
  );
}
