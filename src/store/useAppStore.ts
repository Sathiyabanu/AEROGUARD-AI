import { create } from 'zustand';
import { PageView, User, Patient } from '@/types';

interface AppState {
  // Navigation
  currentPage: PageView;
  setCurrentPage: (page: PageView) => void;

  // Auth
  isAuthenticated: boolean;
  currentUser: User | null;
  login: (user: User) => void;
  logout: () => void;

  // Selected patient
  selectedPatientId: string | null;
  selectedPatient: Patient | null;
  selectPatient: (patient: Patient) => void;
  clearPatientSelection: () => void;

  // Mobile sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: 'login',
  setCurrentPage: (page) => set({ currentPage: page }),

  isAuthenticated: false,
  currentUser: null,
  login: (user) => set({ isAuthenticated: true, currentUser: user }),
  logout: () => set({ isAuthenticated: false, currentUser: null, currentPage: 'login', selectedPatientId: null, selectedPatient: null }),

  selectedPatientId: null,
  selectedPatient: null,
  selectPatient: (patient) => set({ selectedPatientId: patient.id, selectedPatient: patient }),
  clearPatientSelection: () => set({ selectedPatientId: null, selectedPatient: null }),

  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
