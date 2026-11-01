
export type Role = 'ADMIN' | 'GURU';
export type Language = 'ms' | 'ar' | 'en';

export enum ExamType {
  DIAGNOSTIK = 'Diagnostik',
  UPSA = 'UPSA',
  UASA = 'UASA',
  PBD = 'PBD',
  FORMATIF = 'Formatif',
  SUMATIF = 'Sumatif'
}

export enum Gender {
  LELAKI = 'Lelaki',
  PEREMPUAN = 'Perempuan'
}

export interface ExamItem {
  id: string;
  label: string;
  description: string;
  maxMarks: number;
}

export interface GradeConfig {
  id: string;
  label: string;
  min: number;
  max: number;
  color: string;
}

export interface Student {
  id: string;
  name: string;
  class: string;
  year: number;
  gender: Gender;
  regNo: string;
}

export interface Exam {
  id: string;
  name: string;
  date: string;
  type: ExamType;
  totalMarks: number;
  scaledTotal: number;
  items?: ExamItem[];
  targetYears?: number[]; // Contoh: [1] untuk Diagnostik Tahun 1 sahaja
  themeColor?: string;
  gradeConfigs?: GradeConfig[];
}

export interface Result {
  id: string;
  studentId: string;
  examId: string;
  marks: number;
  rawMarks?: number;
  isAbsent?: boolean;
  itemMarks?: Record<string, number>;
  tpLevel?: number;
  updatedAt: string;
  updatedBy: string;
}

export interface FocusAction {
  id: string;
  label: string;
  points: number;
  type: 'BAIK' | 'SALAH';
}

export interface FocusPoint {
  id: string;
  studentId: string;
  category: string;
  points: number;
  date: string;
  teacherId: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  passwordHash: string;
  permissions?: string[];
  language?: Language;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  timestamp: string;
}

export interface Asset {
  id: string;
  name: string;
  category: string;
  totalQuantity: number;
  currentQuantity: number;
  location: string;
  entryDate?: string;
}

export interface AssetLog {
  id: string;
  assetId: string;
  assetName: string;
  type: 'KELUAR' | 'MASUK';
  quantity: number;
  person: string;
  date: string;
  status: 'PINJAM' | 'PULANG' | 'PAKAI_TERUS';
  notes: string;
}

export interface InterventionAction {
  id: string;
  studentId: string;
  examId: string;
  action: string;
  date: string;
  teacherId: string;
  notes?: string;
}

export interface PBDSkill {
  id: string;
  code: string;
  description: string;
  year: number;
}

export interface PBDRecord {
  id: string;
  studentId: string;
  skillId: string;
  tpLevel: number;
  date: string;
  teacherId: string;
  notes?: string;
}

export interface AnnualReportActivity {
  id: string;
  title: string;
  date: string;
  category: string;
  status: 'SELESAI' | 'DALAM_PROSES' | 'TANGGUH';
  notes: string;
}

export interface AnnualReportProgram {
  id: string;
  name: string;
  targetGroup: string;
  implementationDate: string;
  outcome: string;
  achievementPercentage: number;
}

export interface AnnualReportObjective {
  id: string;
  objective: string;
  targetKPI: string;
  actualAchievement: string;
  status: 'TERCAPAI' | 'SEBAGIAN_TERCAPAI' | 'BELUM_TERCAPAI';
}

export interface AnnualReport {
  id: string;
  year: number;
  schoolName: string;
  panitiaName: string;
  headTeacherName: string;
  preparedBy: string;
  approvedBy: string;
  datePrepared: string;
  updatedAt: string;
  
  // 7 Core Sections
  activities: AnnualReportActivity[]; // 1. Laporan Aktiviti Panitia
  academicPrograms: AnnualReportProgram[]; // 2. Laporan Program Akademik
  studentAchievementSummary: { // 3. Rumusan Pencapaian Murid
    totalStudents: number;
    overallPassRate: number;
    averageMarks: number;
    gradeDistribution: Record<string, number>;
    summaryNotes: string;
  };
  objectives: AnnualReportObjective[]; // 4. Penilaian Pencapaian Objektif Panitia
  swotAnalysis: { // 5. Rumusan Kekuatan dan Kelemahan
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  recommendations: string[]; // 6. Cadangan Penambahbaikan
  nextYearPlan: { // 7. Perancangan Awal Bagi Tahun Berikutnya
    goals: string[];
    upcomingPrograms: string[];
    budgetEstimate: string;
    notes: string;
  };
}

