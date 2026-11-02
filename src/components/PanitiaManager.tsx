import React, { useState, useEffect, useMemo } from 'react';
import { 
  Student, 
  Exam, 
  Result, 
  Asset, 
  InterventionAction, 
  PBDRecord,
  Signatory
} from '../../types';
import { db, DB_KEYS } from '../../services/dbService';
import { exportAnnualReportToDocx } from '../../services/docxExportService';
import { PrintOptionsModal } from '../../components/PrintOptionsModal';
import { 
  FileText, 
  Download, 
  Printer, 
  Sparkles, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle, 
  TrendingUp, 
  Award, 
  Target, 
  Calendar, 
  ListChecks, 
  RefreshCw,
  BookOpen,
  FolderOpen,
  Shield,
  Users,
  DollarSign,
  Activity,
  CheckSquare
} from 'lucide-react';

interface PanitiaManagerProps {
  students: Student[];
  exams: Exam[];
  results: Result[];
  assets?: Asset[];
  interventions?: InterventionAction[];
  pbdRecords?: PBDRecord[];
}

export interface PanitiaFileState {
  year: number;
  schoolName: string;
  panitiaName: string;
  headTeacherName: string;
  preparedBy: string;
  approvedBy: string;
  datePrepared: string;
  
  // Pembahagi 01: Maklumat Panitia
  p01: {
    titlePage: string;
    contentList: string[];
    subjectInfo: string;
    orgChartNotes: string;
    teachers: { name: string; email: string; role: string }[];
    appointmentLetterRef: string;
    duties: string[];
    visionMission: string;
  };
  
  // Pembahagi 02: Pengurusan dan Takwim
  p02: {
    takwim: { id: string; activity: string; date: string; pic: string }[];
    workPlan: string[];
    meetingSchedule: { id: string; bil: string; date: string; venue: string }[];
    programSchedule: { id: string; name: string; date: string; target: string }[];
    materialNeeds: { id: string; item: string; qty: number; status: string }[];
  };

  // Pembahagi 03: Mesyuarat Panitia
  p03: {
    notis: string;
    agenda: string[];
    minutes: { id: string; bil: string; date: string; summary: string }[];
    attendanceCount: number;
    feedbackNotes: string;
    followUpActions: string[];
    decisionReports: string;
  };

  // Pembahagi 04: Perancangan Kurikulum
  p04: {
    curriculumDocs: string[];
    dskpNotes: string;
    rptNotes: string;
    implementationPlan: string;
    textbookUsage: string;
    coordinationMeetings: string[];
  };

  // Pembahagi 05: Pengajaran dan Pembelajaran
  p05: {
    bbmList: string[];
    learningSources: string[];
    pdpSharing: string[];
    sampleExercises: string;
    bestPractices: string[];
    pdpImprovements: string[];
  };

  // Pembahagi 06: Pentaksiran Bilik Darjah (PBD)
  p06: {
    assessmentPlan: string;
    instruments: string[];
    pbdExecutionNotes: string;
    tpAnalysisNotes: string;
    professionalDiscussions: string[];
    followUpPlans: string[];
  };

  // Pembahagi 07: Analisis Pencapaian Murid
  p07: {
    classAnalysis: string;
    skillMastery: string;
    strengthsWeaknesses: string;
    attentionSkills: string[];
    interventions: string[];
    effectiveness: string;
  };

  // Pembahagi 08: Program Peningkatan Akademik
  p08: {
    strategicPlan: string;
    tacticalPlan: string;
    operationalPlan: string;
    proposalNotes: string;
    schedule: string;
    modules: string[];
    reportNotes: string;
    effectivenessAnalysis: string;
  };

  // Pembahagi 09: Pemantauan dan Penambahbaikan
  p09: {
    monitoringRecords: string[];
    annualPlanReview: string;
    findings: string;
    discussionRecords: string[];
    followUpActions: string[];
    evaluationResults: string;
  };

  // Pembahagi 10: PLC dan Profesionalisme Guru
  p10: {
    plcPlan: string[];
    plcReports: string[];
    knowledgeSharing: string[];
    presentationMaterials: string[];
    teacherReflections: string[];
    pdpRecommendations: string[];
  };

  // Pembahagi 11: Kewangan dan Sumber
  p11: {
    financialPlan: string;
    budgetEstimate: string;
    purchaseRequests: { id: string; item: string; amount: number; status: string }[];
    supportingDocs: string[];
    inventoryList: { id: string; name: string; qty: number; location: string }[];
    allocationUsage: string;
  };

  // Pembahagi 12: Laporan dan Penilaian Tahunan
  p12: {
    activitiesReport: { id: string; title: string; date: string; status: string }[];
    academicProgramsReport: { id: string; name: string; outcome: string; percentage: number }[];
    studentAchievementSummary: {
      totalStudents: number;
      overallPassRate: number;
      averageMarks: number;
      summaryNotes: string;
    };
    objectivesEvaluation: { id: string; objective: string; targetKPI: string; actual: string; status: string }[];
    swot: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
    recommendations: string[];
    nextYearPlan: { goals: string[]; programs: string[]; budget: string; notes: string };
  };
}

export const PanitiaManager: React.FC<PanitiaManagerProps> = ({
  students,
  exams,
  results,
  assets = [],
  interventions = [],
  pbdRecords = []
}) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [activePembahagi, setActivePembahagi] = useState<number>(1);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [smartDraftNotice, setSmartDraftNotice] = useState<boolean>(false);
  
  // Print Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [printFontSize, setPrintFontSize] = useState<'text-xs' | 'text-sm' | 'text-base' | 'text-lg'>('text-sm');
  const [forcePageBreak, setForcePageBreak] = useState<boolean>(true);
  const [selectedPrintCols, setSelectedPrintCols] = useState<string[]>(['all']);
  const [signatories, setSignatories] = useState<Signatory[]>([]);

  useEffect(() => {
    db.get<Signatory[]>(DB_KEYS.SIGNATORIES, [
      { id: '1', name: 'MOHAMAD AKMAL HAKIM BIN HIPNI', title: 'Ketua Panitia Bahasa Arab', roleType: 'PREPARED_BY', signatureImageUrl: '' },
      { id: '2', name: 'Dr. Hj. Ibrahim bin Ismail', title: 'Guru Besar SRA Datuk Haji Mohamad Mortadza Haji Daud', roleType: 'APPROVED_BY', signatureImageUrl: '' }
    ]).then(setSignatories);

    const handleSync = () => {
      db.get<Signatory[]>(DB_KEYS.SIGNATORIES, []).then(setSignatories);
    };
    window.addEventListener('storage_sync', handleSync);
    return () => window.removeEventListener('storage_sync', handleSync);
  }, []);

  // Initial State Data
  const [fileData, setFileData] = useState<PanitiaFileState>({
    year: currentYear,
    schoolName: 'SEKOLAH RENDAH AGAMA DATUK HAJI MOHAMAD MORTADZA HAJI DAUD',
    panitiaName: 'BAHASA ARAB',
    headTeacherName: 'GURU BESAR SRA DATUK HAJI MOHAMAD MORTADZA HAJI DAUD',
    preparedBy: 'MOHAMAD AKMAL HAKIM BIN HIPNI',
    approvedBy: 'GURU BESAR / GPK PENTADBIRAN',
    datePrepared: new Date().toISOString().split('T')[0],

    p01: {
      titlePage: 'FAIL PENGURUSAN PANITIA BAHASA ARAB',
      contentList: ['Pembahagi 01: Maklumat Panitia', 'Pembahagi 02: Pengurusan & Takwim', 'Pembahagi 03: Mesyuarat', 'Pembahagi 04: Kurikulum', 'Pembahagi 05: PdP', 'Pembahagi 06: PBD', 'Pembahagi 07: Analisis Murid', 'Pembahagi 08: Program Akademik', 'Pembahagi 09: Pemantauan', 'Pembahagi 10: PLC', 'Pembahagi 11: Kewangan', 'Pembahagi 12: Laporan Tahunan'],
      subjectInfo: 'Mata Pelajaran Bahasa Arab Kurikulum Standard Sekolah Rendah (KSSR)',
      orgChartNotes: 'Carta Organisasi Jawatankuasa Induk Kurikulum & Panitia Bahasa Arab Sekolah',
      teachers: [
        { name: 'MOHAMAD AKMAL HAKIM BIN HIPNI', email: 'akmal@moe.gov.my', role: 'Ketua Panitia' },
        { name: 'Ustazah Fatimah binti Omar', email: 'fatimah@moe.gov.my', role: 'Setiausaha' }
      ],
      appointmentLetterRef: 'KPM.600-4/1/2 Jld.3 (45)',
      duties: ['Menyelaras Rancangan Pengajaran Tahunan (RPT) dan DSKP', 'Menyemak buku latihan murid secara berkala', 'Merancang program peningkatan akademik dan intervensi'],
      visionMission: 'Visi: Pendidikan Berkualiti Insan Terdidik. Misi: Melestarikan Sistem Pendidikan Yang Berkualiti Untuk Membangunkan Potensi Individu.'
    },

    p02: {
      takwim: [
        { id: 't1', activity: 'Mesyuarat Panitia Bil 1', date: '2026-03-10', pic: 'Ketua Panitia' },
        { id: 't2', activity: 'Klinik Asas Bahasa Arab', date: '2026-05-15', pic: 'Semua Guru' },
        { id: 't3', activity: 'Semakan Buku Latihan Bil 2', date: '2026-08-20', pic: 'Pentadbir / KP' }
      ],
      workPlan: ['Penyediaan Rancangan Pengajaran Tahunan', 'Pelaksanaan Ujian Diagnostik & Sumatif', 'Program Pemantapan Mufradat'],
      meetingSchedule: [
        { id: 'm1', bil: 'Bil 1/2026', date: '2026-03-10', venue: 'Bilik Mesyuarat Utama' },
        { id: 'm2', bil: 'Bil 2/2026', date: '2026-06-15', venue: 'Bilik Mesyuarat Utama' }
      ],
      programSchedule: [
        { id: 'p1', name: 'Minggu Bahasa Arab', date: '2026-07-01', target: 'Semua Murid Tahun 1-6' },
        { id: 'p2', name: 'Kelas Intervensi Berfokus', date: '2026-09-10', target: 'Murid Lemah' }
      ],
      materialNeeds: [
        { id: 'mat1', item: 'Kad Imbasan Mufradat Interaktif', qty: 50, status: 'Lulus Pembelian' },
        { id: 'mat2', item: 'Modul Latihan Asas Tahun 1', qty: 120, status: 'Dalam Stok' }
      ]
    },

    p03: {
      notis: 'Notis Panggilan Mesyuarat Panitia Bahasa Arab Bil 1/2026 diedarkan kepada semua ahli.',
      agenda: ['Perutusan Pengerusi', 'Mengesahkan Minit Mesyuarat Lalu', 'Perkara Berbangkit', 'Analisis Pencapaian Ujian & PBD', 'Hal-hal Lain'],
      minutes: [
        { id: 'min1', bil: 'Bil 1/2026', date: '2026-03-10', summary: 'Mesyuarat membincangkan agihan tugas guru serta sasaran KPI kelulusan 90%.' }
      ],
      attendanceCount: 3,
      feedbackNotes: 'Maklum balas minit mesyuarat lalu telah diambil tindakan oleh setiausaha.',
      followUpActions: ['Menyediakan jadual semakan buku latihan', 'Mengedarkan modul intervensi kepada murid sasaran'],
      decisionReports: 'Semua keputusan mesyuarat sebulat suara diterima untuk dilaksanakan.'
    },

    p04: {
      curriculumDocs: ['Dokumen Standard Kurikulum dan Pentaksiran (DSKP) KSSR Semakan', 'Panduan Pelaksanaan Kurikulum Bahasa Arab KPM'],
      dskpNotes: 'Semua guru telah merangka RPT berdasarkan DSKP terkini yang berkuat kuasa.',
      rptNotes: 'Rancangan Pengajaran Tahunan disemak dan diluluskan oleh Guru Besar.',
      implementationPlan: 'Pelaksanaan PdP merangkumi elemen KBAT, PAK-21, dan literasi digital.',
      textbookUsage: 'Buku Teks Digital KPM dan Buku Aktiviti digunakan secara optimum di dalam kelas.',
      coordinationMeetings: ['Mesyuarat Penyelarasan Kurikulum Tahap 1', 'Mesyuarat Penyelarasan PBD Tahun 4-6']
    },

    p05: {
      bbmList: ['Projektor LCD / Smart Board', 'Kad Imbasan Perkataan (Flashcards)', 'Modul Latihan Bertulis'],
      learningSources: ['Portal DELIMa KPM', 'Aplikasi Interaktif Mufradat Arab'],
      pdpSharing: ['Teknik Didik Hibur in Pengajaran Huruf Hijaiyah', 'Penggunaan Kad Bergambar Interaktif'],
      sampleExercises: 'Contoh lembaran kerja pengukuhan suku kata dan ayat pendek bahasa Arab.',
      bestPractices: ['Amalan pembukaan kelas dengan set induksi bahasa Arab lisan (Hiwar).'],
      pdpImprovements: ['Memperbanyak aktiviti komunikasi lisan (Muhadasah) di dalam kelas.']
    },

    p06: {
      assessmentPlan: 'Perancangan pentaksiran formatif dan sumatif dijalankan sepanjang sesi persekolahan.',
      instruments: ['Lembaran Pemerhatian', 'Kuiz Lisan', 'Penilaian Bertulis UASA / UPSA'],
      pbdExecutionNotes: 'Rekod transit PBD dikemas kini secara berkala dalam sistem digital.',
      tpAnalysisNotes: 'Majoriti murid menguasai TP3 hingga TP5 dalam kemahiran membaca dan menulis.',
      professionalDiscussions: ['Mesyuarat Moderasi Tahap Penguasaan PBD bersama PK Pentadbiran'],
      followUpPlans: ['Sesi bimbingan khas untuk murid TP1 dan TP2']
    },

    p07: {
      classAnalysis: 'Analisis mengikut kelas menunjukkan kelas Bestari mencatat prestasi cemerlang.',
      skillMastery: 'Penguasaan kemahiran membaca ayat pendek adalah kukuh, manakala kemahiran menulis imlak perlu perhatian.',
      strengthsWeaknesses: 'Kekuatan: Minat murid tinggi. Kelemahan: Perbendaharaan kata terhad.',
      attentionSkills: ['Kemahiran menyusun ayat mudah', 'Perbendaharaan kata (Mufradat)'],
      interventions: ['Program Klinik Bahasa Arab & Bimbingan Rakan Sebaya'],
      effectiveness: 'Peningkatan sebanyak 12% peratus penguasaan selepas intervensi dijalankan.'
    },

    p08: {
      strategicPlan: 'Pelan Strategik Panitia Bahasa Arab 3 Tahun (2024-2026)',
      tacticalPlan: 'Pelan Taktikal Peningkatan Gred A UASA',
      operationalPlan: 'Pelan Operasi Program Intervensi Mufradat Pintar',
      proposalNotes: 'Kertas kerja program telah diluluskan oleh pihak pentadbir.',
      schedule: 'Pelaksanaan bermula April hingga Oktober setiap tahun.',
      modules: ['Modul Latihan Intensif Asas Bahasa Arab'],
      reportNotes: 'Laporan bergambar dan analisis impak disediakan selepas program selesai.',
      effectivenessAnalysis: 'Program berkesan meningkatkan keyakinan murid bertutur bahasa Arab.'
    },

    p09: {
      monitoringRecords: ['Rekod Naziran Buku Latihan Murid oleh Ketua Panitia', 'Pemantauan PdP Pencerapan Guru'],
      annualPlanReview: 'Semakan pertengahan tahun perancangan panitia berjalan lancar.',
      findings: 'Secara keseluruhan pengurusan fail dan buku latihan adalah kemas dan teratur.',
      discussionRecords: ['Sesi perkongsian profesional selepas pencerapan kelas.'],
      followUpActions: ['Penambahbaikan nota kaki dalam semakan buku latihan murid.'],
      evaluationResults: 'Prestasi pengajaran guru mencapai tahap cemerlang.'
    },

    p10: {
      plcPlan: ['Sesi PLC Pembelajaran Rakan Sekerja (Peer Coaching)'],
      plcReports: ['Laporan Program PLC Lesson Study Panitia Bahasa Arab'],
      knowledgeSharing: ['Perkongsian Teknik Pembelajaran Abad Ke-21 (PAK-21)'],
      presentationMaterials: ['Slaid Pembentangan Inovasi PdP Bahasa Arab'],
      teacherReflections: ['Refleksi guru menunjukkan keperluan bahan bantu mengajar visual yang lebih menarik.'],
      pdpRecommendations: ['Mengintegrasikan permainan interaktif digital dalam set induksi.']
    },

    p11: {
      financialPlan: 'Anggaran Peruntukan PCG Mata Pelajaran Bahasa Arab',
      budgetEstimate: 'RM 1,500.00',
      purchaseRequests: [
        { id: 'pr1', item: 'Pembelian Buku Rujukan Tambahan', amount: 350, status: 'Diluluskan' },
        { id: 'pr2', item: 'Alatulis & Bahan BBM', amount: 250, status: 'Dalam Proses' }
      ],
      supportingDocs: ['Inot Sebut Harga dan Nota Minta Pembelian'],
      inventoryList: [
        { id: 'inv1', name: 'Kamus Dewan & Arab', qty: 15, location: 'Bilik Gerakan Panitia' },
        { id: 'inv2', name: 'Carta Dinding Huruf Hijaiyah', qty: 10, location: 'Kelas Tahun 1' }
      ],
      allocationUsage: 'Peruntukan digunakan secara berhemah dan mematuhi Prosedur Kewangan KPM.'
    },

    p12: {
      activitiesReport: [
        { id: 'r1', title: 'Mesyuarat Panitia Bil 1-3', date: '2026-10-12', status: 'SELESAI' },
        { id: 'r2', title: 'Minggu Panitia Bahasa Arab', date: '2026-07-15', status: 'SELESAI' }
      ],
      academicProgramsReport: [
        { id: 'rp1', name: 'Program Pemantapan Mufradat', outcome: 'Peningkatan 85% penguasaan', percentage: 88 }
      ],
      studentAchievementSummary: {
        totalStudents: 120,
        overallPassRate: 88,
        averageMarks: 74.5,
        summaryNotes: 'Pencapaian keseluruhan murid amat memuaskan dengan peningkatan peratus kelulusan.'
      },
      objectivesEvaluation: [
        { id: 'oe1', objective: 'Mencapai peratus kelulusan 90%', targetKPI: '90%', actual: '88%', status: 'SEBAGIAN_TERCAPAI' }
      ],
      swot: {
        strengths: ['Guru komited', 'Sokongan pentadbir'],
        weaknesses: ['Sebilangan murid lemah asas membaca'],
        opportunities: ['Kemudahan digital KPM'],
        threats: ['Kehadiran murid tidak konsisten']
      },
      recommendations: ['Melaksanakan klinik bimbingan berfokus', 'Memperluas penggunaan BBM interaktif'],
      nextYearPlan: {
        goals: ['Sasaran kelulusan 93% tahun hadapan', '100% penguasaan asas tahun 1'],
        programs: ['Kem Cilik Arabi', 'Klinik Skor A'],
        budget: 'RM 1,500.00',
        notes: 'Permohonan belanjawan telah dihantar.'
      }
    }
  });

  // Load from DB
  useEffect(() => {
    const loadData = async () => {
      const stored = await db.get<PanitiaFileState[]>(DB_KEYS.ANNUAL_REPORTS, []);
      const found = stored.find(s => s.year === selectedYear);
      if (found) {
        setFileData(found);
      } else {
        // Generate auto synthesized data from app props
        generateAutoSynthesis(selectedYear);
      }
    };
    loadData();
  }, [selectedYear, students, exams, results, assets, interventions, pbdRecords]);

  // Auto Synthesis from props
  const generateAutoSynthesis = (yearNum: number) => {
    const totalStudentsCount = students.length;
    let totalMarks = 0;
    let validResultsCount = 0;
    let passCount = 0;

    results.forEach(r => {
      if (!r.isAbsent && r.marks !== undefined) {
        totalMarks += r.marks;
        validResultsCount++;
        if (r.marks >= 40) passCount++;
      }
    });

    const avgMarks = validResultsCount > 0 ? Math.round((totalMarks / validResultsCount) * 10) / 10 : 75;
    const passRate = validResultsCount > 0 ? Math.round((passCount / validResultsCount) * 100) : 88;

    setFileData(prev => ({
      ...prev,
      year: yearNum,
      p12: {
        ...prev.p12,
        studentAchievementSummary: {
          totalStudents: totalStudentsCount || 120,
          overallPassRate: passRate,
          averageMarks: avgMarks,
          summaryNotes: `Analisis Sesi ${yearNum}: Seramai ${totalStudentsCount || 120} murid dinilai dengan purata markah ${avgMarks}% dan peratus kelulusan ${passRate}%.`
        },
        activitiesReport: [
          { id: 'ar1', title: 'Mesyuarat Panitia Bahasa Arab Bil 1/2026', date: `${yearNum}-03-10`, status: 'SELESAI' },
          { id: 'ar2', title: 'Mesyuarat Panitia Bahasa Arab Bil 2/2026', date: `${yearNum}-06-15`, status: 'SELESAI' },
          { id: 'ar3', title: 'Pemeriksaan Aset & Inventori Panitia', date: `${yearNum}-08-20`, status: 'SELESAI' },
          { id: 'ar4', title: 'Mesyuarat Post-Mortem Peperiksaan Akhir Tahun', date: `${yearNum}-11-10`, status: 'SELESAI' }
        ],
        academicProgramsReport: interventions.length > 0 ? interventions.map((inv, idx) => ({
          id: `pr_${idx}`,
          name: inv.action || 'Program Intervensi Bahasa',
          outcome: inv.notes || 'Peningkatan prestasi',
          percentage: 85
        })) : [
          { id: 'pr1', name: 'Program Pemantapan Mufradat Asas', outcome: '85% murid menguasai kosa kata', percentage: 88 },
          { id: 'pr2', name: 'Klinik Bimbingan Berfokus (Intervensi)', outcome: 'Peningkatan murid lulus UASA', percentage: 85 }
        ]
      }
    }));
  };

  // Smart Draft Generator (AI style synthesis)
  const handleSmartDraft = () => {
    let totalMarks = 0;
    let validCount = 0;
    let passes = 0;
    let lowGrades = 0;

    results.forEach(r => {
      if (!r.isAbsent && r.marks !== undefined) {
        totalMarks += r.marks;
        validCount++;
        if (r.marks >= 40) passes++;
        if (r.marks < 50) lowGrades++;
      }
    });

    const avg = validCount > 0 ? Math.round((totalMarks / validCount) * 10) / 10 : 74.5;
    const rate = validCount > 0 ? Math.round((passes / validCount) * 100) : 88;

    const smartStrengths = [
      `Barisan guru panitia yang komited, berpengalaman serta berdedikasi tinggi.`,
      `Pencapaian keseluruhan murid menunjukkan keputusan baik dengan peratus kelulusan mencapai ${rate}% dan purata markah ${avg}%.`,
      `Sokongan padu daripada Pihak Pentadbir Sekolah dan PIBG dalam pelaksanaan program kurikulum.`
    ];

    const smartWeaknesses = [
      `Sebilangan kecil murid (${lowGrades} orang) masih memerlukan bimbingan intensif bagi penguasaan asas membaca dan menulis tulisan Jawi/Arab.`,
      `Kekangan masa untuk bimbingan individu secara mendalam di luar waktu jadual waktu rasmi.`
    ];

    const smartRecommendations = [
      `Melaksanakan Klinik Bimbingan Berfokus dan Modul Pemulihan Asas secara bersiri.`,
      `Memperluas penggunaan Bahan Bantu Mengajar (BBM) digital dan interaktif di dalam kelas.`,
      `Meningkatkan kerjasama bersama ibu bapa untuk pemantauan tugasan murid di rumah.`
    ];

    setFileData(prev => ({
      ...prev,
      p12: {
        ...prev.p12,
        studentAchievementSummary: {
          ...prev.p12.studentAchievementSummary,
          averageMarks: avg,
          overallPassRate: rate,
          summaryNotes: `Draf Pintar Sesi ${selectedYear}: Prestasi keseluruhan murid berada pada tahap cemerlang dengan purata markah ${avg}% dan kelulusan ${rate}%.`
        },
        swot: {
          ...prev.p12.swot,
          strengths: smartStrengths,
          weaknesses: smartWeaknesses
        },
        recommendations: smartRecommendations
      }
    }));

    setSmartDraftNotice(true);
    setTimeout(() => setSmartDraftNotice(false), 4000);
  };

  const handleSave = async () => {
    const updated = { ...fileData, year: selectedYear };
    const stored = await db.get<PanitiaFileState[]>(DB_KEYS.ANNUAL_REPORTS, []);
    const filtered = stored.filter(s => s.year !== selectedYear);
    const newList = [...filtered, updated];
    await db.set(DB_KEYS.ANNUAL_REPORTS, newList);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handlePrintTrigger = () => {
    setIsPrintModalOpen(true);
  };

  const pembahagiList = [
    { id: 1, code: 'PB 01', title: 'Maklumat Panitia', icon: FolderOpen },
    { id: 2, code: 'PB 02', title: 'Pengurusan & Takwim', icon: Calendar },
    { id: 3, code: 'PB 03', title: 'Mesyuarat Panitia', icon: Users },
    { id: 4, code: 'PB 04', title: 'Perancangan Kurikulum', icon: BookOpen },
    { id: 5, code: 'PB 05', title: 'Pengajaran & Pembelajaran', icon: Activity },
    { id: 6, code: 'PB 06', title: 'Pentaksiran Bilik Darjah (PBD)', icon: CheckSquare },
    { id: 7, code: 'PB 07', title: 'Analisis Pencapaian Murid', icon: TrendingUp },
    { id: 8, code: 'PB 08', title: 'Program Peningkatan Akademik', icon: Target },
    { id: 9, code: 'PB 09', title: 'Pemantauan & Penambahbaikan', icon: Shield },
    { id: 10, code: 'PB 10', title: 'PLC & Profesionalisme Guru', icon: Award },
    { id: 11, code: 'PB 11', title: 'Kewangan dan Sumber', icon: DollarSign },
    { id: 12, code: 'PB 12', title: 'Laporan & Penilaian Tahunan', icon: FileText }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Action Bar (No Print) */}
      <div className="no-print bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-500/20">
              <FolderOpen className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Fail Meja & Pengurusan Panitia (01 - 12)</h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Sistem Fail Panitia Bahasa Arab Rasmi KPM</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Year Selector */}
          <div className="flex items-center bg-slate-100 rounded-2xl px-3.5 py-2 border border-slate-200">
            <span className="text-xs font-bold text-slate-500 mr-2 uppercase">Tahun:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-xs font-black text-indigo-900 focus:outline-none cursor-pointer"
            >
              {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Auto Populate */}
          <button
            onClick={() => generateAutoSynthesis(selectedYear)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-2xl text-xs font-black uppercase tracking-wider transition"
            title="Sintesis data daripada ujian, PBD dan modul sistem secara automatik"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Jana Automatik</span>
          </button>

          {/* Smart Draft */}
          <button
            onClick={handleSmartDraft}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-2xl text-xs font-black uppercase tracking-wider transition"
            title="Jana rumusan analisis dan draf pintar SWOT berdasarkan prestasi murid"
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Draf Pintar</span>
          </button>

          {/* Export Word */}
          <button
            onClick={() => {
              // Convert panitia state to AnnualReport format for docx export service
              const reportFormat = {
                id: `report_${selectedYear}`,
                year: selectedYear,
                schoolName: fileData.schoolName,
                panitiaName: fileData.panitiaName,
                headTeacherName: fileData.headTeacherName,
                preparedBy: fileData.preparedBy,
                approvedBy: fileData.approvedBy,
                datePrepared: fileData.datePrepared,
                updatedAt: new Date().toISOString(),
                activities: fileData.p12.activitiesReport.map(a => ({ id: a.id, title: a.title, date: a.date, category: 'Aktiviti', status: a.status as any, notes: '' })),
                academicPrograms: fileData.p12.academicProgramsReport.map(p => ({ id: p.id, name: p.name, targetGroup: 'Murid Sasaran', implementationDate: '2026-05-01', outcome: p.outcome, achievementPercentage: p.percentage })),
                studentAchievementSummary: { ...fileData.p12.studentAchievementSummary, gradeDistribution: {} },
                objectives: fileData.p12.objectivesEvaluation.map(o => ({ id: o.id, objective: o.objective, targetKPI: o.targetKPI, actualAchievement: o.actual, status: o.status as any })),
                swotAnalysis: fileData.p12.swot,
                recommendations: fileData.p12.recommendations,
                nextYearPlan: { goals: fileData.p12.nextYearPlan.goals, upcomingPrograms: fileData.p12.nextYearPlan.programs, budgetEstimate: fileData.p12.nextYearPlan.budget, notes: fileData.p12.nextYearPlan.notes }
              };
              exportAnnualReportToDocx(reportFormat);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-blue-500/20 transition"
          >
            <Download className="w-4 h-4" />
            <span>Word (.docx)</span>
          </button>

          {/* Print Options Modal Trigger */}
          <button
            onClick={handlePrintTrigger}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white hover:bg-slate-900 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md transition"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / PDF</span>
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-500/35 transition"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Rekod</span>
          </button>
        </div>
      </div>

      {/* Saved Notification */}
      {isSaved && (
        <div className="no-print bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-4 rounded-2xl flex items-center gap-3 text-xs font-bold animate-in fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span>Semua maklumat fail pengurusan 12 Pembahagi berjaya disimpan!</span>
        </div>
      )}

      {/* Smart Draft Notification */}
      {smartDraftNotice && (
        <div className="no-print bg-purple-50 border border-purple-200 text-purple-900 px-5 py-4 rounded-2xl flex items-center gap-3 text-xs font-bold animate-in fade-in">
          <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0" />
          <span>Draf Pintar Berjaya Dijana! Analisis pencapaian murid telah disintesis ke dalam Laporan Tahunan (Pembahagi 12).</span>
        </div>
      )}

      {/* Main Layout: Tabs + Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation for Pembahagi 01 - 12 (No Print) */}
        <div className="no-print lg:col-span-1 space-y-1.5 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm max-h-[75vh] overflow-y-auto">
          <div className="px-3 py-2 mb-2">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Senarai Pembahagi Fail</span>
          </div>
          {pembahagiList.map(item => {
            const Icon = item.icon;
            const isActive = activePembahagi === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePembahagi(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 scale-[1.02]' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.code} — {item.title}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Content Area (Supports Printable View) */}
        <div className={`lg:col-span-3 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8 ${printFontSize} ${forcePageBreak ? 'print-page-break' : ''}`}>
          
          {/* Header Cover for Document */}
          <div className="text-center border-b pb-6 space-y-2">
            <h2 className="text-xl font-black text-slate-900 uppercase">{fileData.schoolName}</h2>
            <h3 className="text-base font-black text-indigo-600 uppercase">FAIL PENGURUSAN PANITIA {fileData.panitiaName}</h3>
            <p className="text-xs font-bold text-slate-400">SESI PERSEKOLAHAN {selectedYear}</p>
          </div>

          {/* PEMBAHAGI 01 */}
          {activePembahagi === 1 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b pb-3">
                <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">Pembahagi 01</span>
                <h3 className="text-xl font-black text-slate-900 mt-2">Maklumat Panitia</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Muka Hadapan Fail</label>
                  <input
                    type="text"
                    value={fileData.p01.titlePage}
                    onChange={(e) => setFileData({...fileData, p01: {...fileData.p01, titlePage: e.target.value}})}
                    className="w-full p-3 border rounded-2xl text-xs font-bold bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Maklumat Mata Pelajaran & Sesi</label>
                  <input
                    type="text"
                    value={fileData.p01.subjectInfo}
                    onChange={(e) => setFileData({...fileData, p01: {...fileData.p01, subjectInfo: e.target.value}})}
                    className="w-full p-3 border rounded-2xl text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Visi, Misi & Objektif Panitia</label>
                  <textarea
                    rows={3}
                    value={fileData.p01.visionMission}
                    onChange={(e) => setFileData({...fileData, p01: {...fileData.p01, visionMission: e.target.value}})}
                    className="w-full p-3 border rounded-2xl text-xs font-medium"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-slate-700">Senarai Nama Guru Mengajar & Peranan</label>
                    <button
                      type="button"
                      onClick={() => {
                        const newTeachers = [...fileData.p01.teachers, { name: '', email: '', role: 'Ahli Jawatankuasa' }];
                        setFileData({...fileData, p01: {...fileData.p01, teachers: newTeachers}});
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-black transition"
                    >
                      <Plus size={14} />
                      <span>Tambah Guru</span>
                    </button>
                  </div>
                  <div className="space-y-2">
                    {fileData.p01.teachers.map((t, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={t.name}
                          onChange={(e) => {
                            const updated = [...fileData.p01.teachers];
                            updated[idx].name = e.target.value;
                            setFileData({...fileData, p01: {...fileData.p01, teachers: updated}});
                          }}
                          className="flex-1 p-2.5 border rounded-xl text-xs font-bold"
                          placeholder="Nama Penuh Guru"
                        />
                        <input
                          type="text"
                          value={t.role}
                          onChange={(e) => {
                            const updated = [...fileData.p01.teachers];
                            updated[idx].role = e.target.value;
                            setFileData({...fileData, p01: {...fileData.p01, teachers: updated}});
                          }}
                          className="w-48 p-2.5 border rounded-xl text-xs font-bold"
                          placeholder="Peranan (Cth: Ketua Panitia)"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = fileData.p01.teachers.filter((_, i) => i !== idx);
                            setFileData({...fileData, p01: {...fileData.p01, teachers: updated}});
                          }}
                          className="p-2.5 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition"
                          title="Padam guru"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rujukan Surat Pelantikan Ketua Panitia</label>
                  <input
                    type="text"
                    value={fileData.p01.appointmentLetterRef}
                    onChange={(e) => setFileData({...fileData, p01: {...fileData.p01, appointmentLetterRef: e.target.value}})}
                    className="w-full p-3 border rounded-2xl text-xs font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* PEMBAHAGI 02 */}
          {activePembahagi === 2 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b pb-3">
                <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">Pembahagi 02</span>
                <h3 className="text-xl font-black text-slate-900 mt-2">Pengurusan dan Takwim</h3>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Takwim Aktiviti Panitia</h4>
                  <button
                    onClick={() => {
                      const newTak = [...fileData.p02.takwim, { id: Math.random().toString(), activity: 'Aktiviti Baru', date: new Date().toISOString().split('T')[0], pic: 'KP' }];
                      setFileData({...fileData, p02: {...fileData.p02, takwim: newTak}});
                    }}
                    className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    <Plus size={14} /> Tambah Takwim
                  </button>
                </div>
                <div className="space-y-2">
                  {fileData.p02.takwim.map((tk, idx) => (
                    <div key={tk.id} className="flex gap-2 p-3 bg-slate-50 rounded-2xl border">
                      <input
                        type="text"
                        value={tk.activity}
                        onChange={(e) => {
                          const updated = [...fileData.p02.takwim];
                          updated[idx].activity = e.target.value;
                          setFileData({...fileData, p02: {...fileData.p02, takwim: updated}});
                        }}
                        className="flex-1 p-2 bg-white border rounded-xl text-xs font-bold"
                      />
                      <input
                        type="date"
                        value={tk.date}
                        onChange={(e) => {
                          const updated = [...fileData.p02.takwim];
                          updated[idx].date = e.target.value;
                          setFileData({...fileData, p02: {...fileData.p02, takwim: updated}});
                        }}
                        className="w-36 p-2 bg-white border rounded-xl text-xs"
                      />
                      <input
                        type="text"
                        value={tk.pic}
                        onChange={(e) => {
                          const updated = [...fileData.p02.takwim];
                          updated[idx].pic = e.target.value;
                          setFileData({...fileData, p02: {...fileData.p02, takwim: updated}});
                        }}
                        className="w-32 p-2 bg-white border rounded-xl text-xs"
                        placeholder="PIC"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PEMBAHAGI 03 */}
          {activePembahagi === 3 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b pb-3">
                <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">Pembahagi 03</span>
                <h3 className="text-xl font-black text-slate-900 mt-2">Mesyuarat Panitia</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Notis Panggilan Mesyuarat</label>
                  <textarea
                    rows={2}
                    value={fileData.p03.notis}
                    onChange={(e) => setFileData({...fileData, p03: {...fileData.p03, notis: e.target.value}})}
                    className="w-full p-3 border rounded-2xl text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rumusan Minit & Tindakan Susulan</label>
                  <textarea
                    rows={4}
                    value={fileData.p03.decisionReports}
                    onChange={(e) => setFileData({...fileData, p03: {...fileData.p03, decisionReports: e.target.value}})}
                    className="w-full p-3 border rounded-2xl text-xs font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* PEMBAHAGI 04 */}
          {activePembahagi === 4 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b pb-3">
                <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">Pembahagi 04</span>
                <h3 className="text-xl font-black text-slate-900 mt-2">Perancangan Kurikulum</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Dokumen Kurikulum & DSKP</label>
                  <textarea
                    rows={3}
                    value={fileData.p04.dskpNotes}
                    onChange={(e) => setFileData({...fileData, p04: {...fileData.p04, dskpNotes: e.target.value}})}
                    className="w-full p-3 border rounded-2xl text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rancangan Pengajaran Tahunan (RPT)</label>
                  <textarea
                    rows={3}
                    value={fileData.p04.rptNotes}
                    onChange={(e) => setFileData({...fileData, p04: {...fileData.p04, rptNotes: e.target.value}})}
                    className="w-full p-3 border rounded-2xl text-xs font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* PEMBAHAGI 05 */}
          {activePembahagi === 5 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b pb-3">
                <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">Pembahagi 05</span>
                <h3 className="text-xl font-black text-slate-900 mt-2">Pengajaran dan Pembelajaran (PdP)</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Senarai Bahan Bantu Mengajar (BBM)</label>
                  <textarea
                    rows={3}
                    value={fileData.p05.bbmList.join('\n')}
                    onChange={(e) => setFileData({...fileData, p05: {...fileData.p05, bbmList: e.target.value.split('\n')}})}
                    className="w-full p-3 border rounded-2xl text-xs font-medium"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Setiap baris mewakili satu item BBM.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cadangan Penambahbaikan PdP</label>
                  <textarea
                    rows={3}
                    value={fileData.p05.pdpImprovements.join('\n')}
                    onChange={(e) => setFileData({...fileData, p05: {...fileData.p05, pdpImprovements: e.target.value.split('\n')}})}
                    className="w-full p-3 border rounded-2xl text-xs font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* PEMBAHAGI 06 */}
          {activePembahagi === 6 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b pb-3">
                <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">Pembahagi 06</span>
                <h3 className="text-xl font-black text-slate-900 mt-2">Pentaksiran Bilik Darjah (PBD)</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Perancangan Pentaksiran Mata Pelajaran</label>
                  <textarea
                    rows={3}
                    value={fileData.p06.assessmentPlan}
                    onChange={(e) => setFileData({...fileData, p06: {...fileData.p06, assessmentPlan: e.target.value}})}
                    className="w-full p-3 border rounded-2xl text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Analisis Tahap Penguasaan & Tindakan Susulan</label>
                  <textarea
                    rows={3}
                    value={fileData.p06.tpAnalysisNotes}
                    onChange={(e) => setFileData({...fileData, p06: {...fileData.p06, tpAnalysisNotes: e.target.value}})}
                    className="w-full p-3 border rounded-2xl text-xs font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* PEMBAHAGI 07 */}
          {activePembahagi === 7 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b pb-3">
                <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">Pembahagi 07</span>
                <h3 className="text-xl font-black text-slate-900 mt-2">Analisis Pencapaian Murid</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Analisis Pencapaian Mengikut Kelas</label>
                  <textarea
                    rows={3}
                    value={fileData.p07.classAnalysis}
                    onChange={(e) => setFileData({...fileData, p07: {...fileData.p07, classAnalysis: e.target.value}})}
                    className="w-full p-3 border rounded-2xl text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kekuatan & Kelemahan Murid</label>
                  <textarea
                    rows={3}
                    value={fileData.p07.strengthsWeaknesses}
                    onChange={(e) => setFileData({...fileData, p07: {...fileData.p07, strengthsWeaknesses: e.target.value}})}
                    className="w-full p-3 border rounded-2xl text-xs font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* PEMBAHAGI 08 */}
          {activePembahagi === 8 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b pb-3">
                <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">Pembahagi 08</span>
                <h3 className="text-xl font-black text-slate-900 mt-2">Program Peningkatan Akademik</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pelan Strategik & Taktikal Panitia</label>
                  <textarea
                    rows={3}
                    value={fileData.p08.strategicPlan}
                    onChange={(e) => setFileData({...fileData, p08: {...fileData.p08, strategicPlan: e.target.value}})}
                    className="w-full p-3 border rounded-2xl text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Analisis Keberkesanan Program</label>
                  <textarea
                    rows={3}
                    value={fileData.p08.effectivenessAnalysis}
                    onChange={(e) => setFileData({...fileData, p08: {...fileData.p08, effectivenessAnalysis: e.target.value}})}
                    className="w-full p-3 border rounded-2xl text-xs font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* PEMBAHAGI 09 */}
          {activePembahagi === 9 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b pb-3">
                <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">Pembahagi 09</span>
                <h3 className="text-xl font-black text-slate-900 mt-2">Pemantauan dan Penambahbaikan</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rekod Pemantauan Kurikulum & Pencerapan</label>
                  <textarea
                    rows={3}
                    value={fileData.p09.monitoringRecords.join('\n')}
                    onChange={(e) => setFileData({...fileData, p09: {...fileData.p09, monitoringRecords: e.target.value.split('\n')}})}
                    className="w-full p-3 border rounded-2xl text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Dapatan Pemantauan & Tindakan Susulan</label>
                  <textarea
                    rows={3}
                    value={fileData.p09.evaluationResults}
                    onChange={(e) => setFileData({...fileData, p09: {...fileData.p09, evaluationResults: e.target.value}})}
                    className="w-full p-3 border rounded-2xl text-xs font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* PEMBAHAGI 10 */}
          {activePembahagi === 10 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b pb-3">
                <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">Pembahagi 10</span>
                <h3 className="text-xl font-black text-slate-900 mt-2">PLC dan Profesionalisme Guru</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Perancangan PLC & Perkongsian Ilmu</label>
                  <textarea
                    rows={3}
                    value={fileData.p10.plcPlan.join('\n')}
                    onChange={(e) => setFileData({...fileData, p10: {...fileData.p10, plcPlan: e.target.value.split('\n')}})}
                    className="w-full p-3 border rounded-2xl text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Refleksi Guru & Cadangan Penambahbaikan</label>
                  <textarea
                    rows={3}
                    value={fileData.p10.teacherReflections.join('\n')}
                    onChange={(e) => setFileData({...fileData, p10: {...fileData.p10, teacherReflections: e.target.value.split('\n')}})}
                    className="w-full p-3 border rounded-2xl text-xs font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* PEMBAHAGI 11 */}
          {activePembahagi === 11 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b pb-3">
                <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">Pembahagi 11</span>
                <h3 className="text-xl font-black text-slate-900 mt-2">Kewangan dan Sumber</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Perancangan Anggaran Perbelanjaan PCG</label>
                  <input
                    type="text"
                    value={fileData.p11.budgetEstimate}
                    onChange={(e) => setFileData({...fileData, p11: {...fileData.p11, budgetEstimate: e.target.value}})}
                    className="w-full p-3 border rounded-2xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rekod Penggunaan & Inventori Bahan</label>
                  <textarea
                    rows={3}
                    value={fileData.p11.allocationUsage}
                    onChange={(e) => setFileData({...fileData, p11: {...fileData.p11, allocationUsage: e.target.value}})}
                    className="w-full p-3 border rounded-2xl text-xs font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* PEMBAHAGI 12 */}
          {activePembahagi === 12 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b pb-3">
                <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">Pembahagi 12</span>
                <h3 className="text-xl font-black text-slate-900 mt-2">Laporan dan Penilaian Tahunan</h3>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-indigo-50 rounded-2xl border text-center">
                    <span className="text-xs font-bold text-indigo-600">Jumlah Murid</span>
                    <p className="text-2xl font-black text-indigo-900 mt-1">{fileData.p12.studentAchievementSummary.totalStudents}</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-2xl border text-center">
                    <span className="text-xs font-bold text-emerald-600">Peratus Kelulusan</span>
                    <p className="text-2xl font-black text-emerald-900 mt-1">{fileData.p12.studentAchievementSummary.overallPassRate}%</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-2xl border text-center">
                    <span className="text-xs font-bold text-blue-600">Purata Markah</span>
                    <p className="text-2xl font-black text-blue-900 mt-1">{fileData.p12.studentAchievementSummary.averageMarks}%</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rumusan Pencapaian Murid</label>
                  <textarea
                    rows={3}
                    value={fileData.p12.studentAchievementSummary.summaryNotes}
                    onChange={(e) => setFileData({
                      ...fileData,
                      p12: {
                        ...fileData.p12,
                        studentAchievementSummary: { ...fileData.p12.studentAchievementSummary, summaryNotes: e.target.value }
                      }
                    })}
                    className="w-full p-3 border rounded-2xl text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rumusan Kekuatan (Strengths)</label>
                  <textarea
                    rows={3}
                    value={fileData.p12.swot.strengths.join('\n')}
                    onChange={(e) => setFileData({
                      ...fileData,
                      p12: { ...fileData.p12, swot: { ...fileData.p12.swot, strengths: e.target.value.split('\n') } }
                    })}
                    className="w-full p-3 border rounded-2xl text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rumusan Kelemahan (Weaknesses)</label>
                  <textarea
                    rows={3}
                    value={fileData.p12.swot.weaknesses.join('\n')}
                    onChange={(e) => setFileData({
                      ...fileData,
                      p12: { ...fileData.p12, swot: { ...fileData.p12.swot, weaknesses: e.target.value.split('\n') } }
                    })}
                    className="w-full p-3 border rounded-2xl text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cadangan Penambahbaikan</label>
                  <textarea
                    rows={3}
                    value={fileData.p12.recommendations.join('\n')}
                    onChange={(e) => setFileData({
                      ...fileData,
                      p12: { ...fileData.p12, recommendations: e.target.value.split('\n') }
                    })}
                    className="w-full p-3 border rounded-2xl text-xs font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Signatures */}
          {(() => {
            const preparedSig = signatories.find(s => s.roleType === 'PREPARED_BY') || { name: fileData.preparedBy, title: `Ketua Panitia ${fileData.panitiaName}`, signatureImageUrl: '' };
            const approvedSig = signatories.find(s => s.roleType === 'APPROVED_BY') || { name: fileData.approvedBy, title: 'Guru Besar / GPK Pentadbiran', signatureImageUrl: '' };
            return (
              <div className="pt-10 border-t grid grid-cols-2 gap-8 text-xs font-bold text-slate-700">
                <div>
                  <p>Disediakan oleh:</p>
                  <div className="h-20 border-b border-dashed my-2 relative flex items-center justify-center">
                    {preparedSig.signatureImageUrl && (
                      <img src={preparedSig.signatureImageUrl} alt="Tandatangan" className="max-h-16 object-contain absolute" />
                    )}
                  </div>
                  <p className="font-black text-slate-900">({preparedSig.name})</p>
                  <p className="text-[10px] text-slate-500 font-semibold">{preparedSig.title}</p>
                </div>
                <div>
                  <p>Disahkan oleh:</p>
                  <div className="h-20 border-b border-dashed my-2 relative flex items-center justify-center">
                    {approvedSig.signatureImageUrl && (
                      <img src={approvedSig.signatureImageUrl} alt="Tandatangan" className="max-h-16 object-contain absolute" />
                    )}
                  </div>
                  <p className="font-black text-slate-900">({approvedSig.name})</p>
                  <p className="text-[10px] text-slate-500 font-semibold">{approvedSig.title}</p>
                </div>
              </div>
            );
          })()}

        </div>
      </div>

      {/* Print Options Modal */}
      <PrintOptionsModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Pilihan Cetakan Fail Pengurusan Panitia"
        columns={[
          { key: 'all', label: 'Semua 12 Pembahagi Lengkap' },
          { key: 'p01_03', label: 'Pembahagi 01 - 03 (Pentadbiran)' },
          { key: 'p04_06', label: 'Pembahagi 04 - 06 (Kurikulum & PBD)' },
          { key: 'p07_09', label: 'Pembahagi 07 - 09 (Analisis & Program)' },
          { key: 'p10_12', label: 'Pembahagi 10 - 12 (PLC, Kewangan & Laporan)' }
        ]}
        selectedColumns={selectedPrintCols}
        onToggleColumn={(key) => {
          if (selectedPrintCols.includes(key)) {
            setSelectedPrintCols(selectedPrintCols.filter(k => k !== key));
          } else {
            setSelectedPrintCols([...selectedPrintCols, key]);
          }
        }}
        onSelectAll={(sel) => setSelectedPrintCols(sel ? ['all', 'p01_03', 'p04_06', 'p07_09', 'p10_12'] : [])}
        fontSize={printFontSize}
        onChangeFontSize={setPrintFontSize}
        forcePageBreak={forcePageBreak}
        onChangeForcePageBreak={setForcePageBreak}
        onPrint={() => window.print()}
      />
    </div>
  );
};

export default PanitiaManager;
