
import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardCheck, 
  BarChart3, 
  Target, 
  History,
  UserCog,
  Settings as SettingsIcon,
  Package,
  ClipboardList
} from 'lucide-react';

export const COLORS = {
  primary: '#0ea5e9',
  secondary: '#64748b',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  intervene: '#f43f5e'
};

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { id: 'students', label: 'Murid', icon: <Users size={20} /> },
  { id: 'assessments', label: 'Ujian/PBD', icon: <ClipboardCheck size={20} /> },
  { id: 'pbd_transit', label: 'Rekod Transit PBD', icon: <ClipboardList size={20} /> },
  { id: 'analytics', label: 'Analisis Item', icon: <BarChart3 size={20} /> },
  { id: 'intervention', label: 'Intervensi', icon: <Target size={20} /> },
  { id: 'focus', label: 'Markah Fokus', icon: <Target size={20} /> },
  { id: 'assets', label: 'Aset Panitia', icon: <Package size={20} /> },
  { id: 'staff', label: 'Pengurusan Staf', icon: <UserCog size={20} />, role: 'ADMIN' },
  { id: 'logs', label: 'Log Aktiviti', icon: <History size={20} />, role: 'ADMIN' },
  { id: 'settings', label: 'Tetapan Profil', icon: <SettingsIcon size={20} /> },
];

export const CLASSES = ['1 Bestari', '1 Pintar', '2 Bestari', '2 Pintar', '3 Bestari', '3 Pintar', '4 Bestari', '4 Pintar', '5 Bestari', '5 Pintar', '6 Bestari', '6 Pintar'];
export const YEARS = [1, 2, 3, 4, 5, 6];

export const getPerformanceColor = (marks: number, total: number = 100) => {
  const percentage = (marks / total) * 100;
  if (percentage >= 80) return 'text-green-600 bg-green-50 border-green-200';
  if (percentage >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  return 'text-red-600 bg-red-50 border-red-200';
};
