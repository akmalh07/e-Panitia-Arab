import React, { useState, useEffect } from 'react';
import { 
  AnnualReport, 
  AnnualReportActivity, 
  AnnualReportProgram, 
  AnnualReportObjective, 
  Student, 
  Exam, 
  Result, 
  Asset, 
  InterventionAction, 
  PBDRecord 
} from '../../types';
import { db, DB_KEYS } from '../../services/dbService';
import { exportAnnualReportToDocx } from '../../services/docxExportService';
import { 
  FileText, 
  Download, 
  Printer, 
  Sparkles, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  Award, 
  Target, 
  Calendar, 
  ListChecks, 
  RefreshCw,
  BookOpen,
  FileSpreadsheet,
  Check
} from 'lucide-react';

interface AnnualReportManagerProps {
  students: Student[];
  exams: Exam[];
  results: Result[];
  assets?: Asset[];
  interventions?: InterventionAction[];
  pbdRecords?: PBDRecord[];
}

const DEFAULT_SWOT_STRENGTHS = [
  'Barisan guru panitia yang komited dan berpengalaman.',
  'Bahan bantu mengajar (BBM) dan modul latihan terancang berkesan.',
  'Sokongan padu daripada Pihak Pentadbir Sekolah dan PIBG.'
];

const DEFAULT_SWOT_WEAKNESSES = [
  'Sebilangan murid masih belum menguasai kemahiran asas asas membaca dan menulis.',
  'Kekangan masa untuk bimbingan secara individu di luar waktu kelas.'
];

const DEFAULT_SWOT_OPPORTUNITIES = [
  'Kemudahan capaian bahan digital KPM dan aplikasi interaktif.',
  'Kerjasama erat dengan ibu bapa dalam memantau kerja rumah murid.'
];

const DEFAULT_SWOT_THREATS = [
  'Kehadiran sebilangan murid yang kurang memuaskan menjejaskan pendedahan berterusan.',
  'Sikap murid yang kurang bermotivasi menjalankan ulangkaji mandiri di rumah.'
];

const DEFAULT_RECOMMENDATIONS = [
  'Melaksanakan Program Bimbingan Rakan Sebaya (Peer Tutoring) bagi murid lemah.',
  'Memperluas penggunaan modul peranti digital dan lembaran kerja interaktif.',
  'Mengadakan Bengkel Teknik Menjawab Soalan bersama Penceramah Jemputan.',
  'Meningkatkan pemantauan buku latihan murid secara berkala oleh Ketua Panitia.'
];

export const AnnualReportManager: React.FC<AnnualReportManagerProps> = ({
  students,
  exams,
  results,
  assets = [],
  interventions = [],
  pbdRecords = []
}) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [reports, setReports] = useState<AnnualReport[]>([]);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [isSavedNotice, setIsSavedNotice] = useState<boolean>(false);
  const [smartDraftNotice, setSmartDraftNotice] = useState<boolean>(false);
  const [activeSectionView, setActiveSectionView] = useState<'edit' | 'preview'>('edit');

  // Form State
  const [reportData, setReportData] = useState<AnnualReport>({
    id: `report_${currentYear}`,
    year: currentYear,
    schoolName: 'SEKOLAH KEBANGSAAN SK PUSAT',
    panitiaName: 'BAHASA ARAB',
    headTeacherName: 'GURU BESAR',
    preparedBy: 'KETUA PANITIA',
    approvedBy: 'GURU BESAR / GPK PENTADBIRAN',
    datePrepared: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString(),
    activities: [],
    academicPrograms: [],
    studentAchievementSummary: {
      totalStudents: 0,
      overallPassRate: 0,
      averageMarks: 0,
      gradeDistribution: {},
      summaryNotes: ''
    },
    objectives: [
      {
        id: 'obj_1',
        objective: 'Mencapai peratus kelulusan mata pelajaran sekurang-kurangnya 90%',
        targetKPI: '90% Lulus',
        actualAchievement: '88% Lulus',
        status: 'SEBAGIAN_TERCAPAI'
      },
      {
        id: 'obj_2',
        objective: 'Peningkatan sekurang-kurangnya 10% murid mendapat Gred A (TP6/TP5)',
        targetKPI: '25% Cemerlang',
        actualAchievement: '28% Cemerlang',
        status: 'TERCAPAI'
      }
    ],
    swotAnalysis: {
      strengths: DEFAULT_SWOT_STRENGTHS,
      weaknesses: DEFAULT_SWOT_WEAKNESSES,
      opportunities: DEFAULT_SWOT_OPPORTUNITIES,
      threats: DEFAULT_SWOT_THREATS
    },
    recommendations: DEFAULT_RECOMMENDATIONS,
    nextYearPlan: {
      goals: ['Sasaran peratus kelulusan 95% bagi sesi berikutnya.', 'Penyediaan modul intervensi awal bermula Januari.'],
      upcomingPrograms: ['Klinik Asas Bahasa', 'Minggu Panitia Bahasa Arab & Agama', 'Karnival Bahasa & Kem Membaca'],
      budgetEstimate: 'RM 1,200.00',
      notes: 'Permohonan peruntukanPCG Panitia telah disemak.'
    }
  });

  // Load Reports from DB
  useEffect(() => {
    const loadReports = async () => {
      const stored = await db.get<AnnualReport[]>(DB_KEYS.ANNUAL_REPORTS, []);
      setReports(stored);
      const existing = stored.find(r => r.year === selectedYear);
      if (existing) {
        setReportData(existing);
      } else {
        // Reset or auto generate default for new year
        generateAutoPopulatedData(selectedYear);
      }
    };
    loadReports();
  }, [selectedYear]);

  // Auto-Populate Logic
  const generateAutoPopulatedData = (yearNum: number) => {
    // 1. Calculate Student Achievement Metrics
    const totalStudentsCount = students.length;
    let totalMarksSum = 0;
    let gradedCount = 0;
    let passedCount = 0;
    const gradeDist: Record<string, number> = { 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0 };

    results.forEach(res => {
      if (!res.isAbsent && res.marks !== undefined) {
        totalMarksSum += res.marks;
        gradedCount++;
        if (res.marks >= 40) passedCount++;

        if (res.marks >= 80) gradeDist['A']++;
        else if (res.marks >= 70) gradeDist['B']++;
        else if (res.marks >= 50) gradeDist['C']++;
        else if (res.marks >= 40) gradeDist['D']++;
        else gradeDist['E']++;
      }
    });

    const avgMarks = gradedCount > 0 ? Math.round((totalMarksSum / gradedCount) * 10) / 10 : 0;
    const passRate = gradedCount > 0 ? Math.round((passedCount / gradedCount) * 100) : 0;

    // 2. Extract Activities from Assets and System
    const autoActivities: AnnualReportActivity[] = [
      {
        id: 'act_1',
        title: 'Mesyuarat Panitia Bil 1/2026',
        date: `${yearNum}-03-10`,
        category: 'Mesyuarat',
        status: 'SELESAI',
        notes: 'Perancangan Takwim & Agihan Tugas'
      },
      {
        id: 'act_2',
        title: 'Mesyuarat Panitia Bil 2/2026',
        date: `${yearNum}-06-15`,
        category: 'Mesyuarat',
        status: 'SELESAI',
        notes: 'Post-Mortem Pentaksiran Pertengahan Tahun'
      },
      {
        id: 'act_3',
        title: 'Semakan & Penyenggaraan Bahan Aset Panitia',
        date: `${yearNum}-08-20`,
        category: 'Pengurusan Aset',
        status: 'SELESAI',
        notes: `Pemeriksaan ${assets.length} item peralatan panitia`
      },
      {
        id: 'act_4',
        title: 'Mesyuarat Panitia Bil 3/2026',
        date: `${yearNum}-10-12`,
        category: 'Mesyuarat',
        status: 'SELESAI',
        notes: 'Penilaian PBD & Persediaan Laporan Akhir'
      }
    ];

    // 3. Extract Academic Programs from Interventions
    const autoPrograms: AnnualReportProgram[] = interventions.length > 0
      ? interventions.map((inv, idx) => ({
          id: `prog_${inv.id || idx}`,
          name: inv.action || `Program Intervensi #${idx + 1}`,
          targetGroup: `Murid Sasaran (${inv.studentId || 'Kumpulan Bimbingan'})`,
          implementationDate: inv.date || `${yearNum}-05-01`,
          outcome: inv.notes || 'Penambahan penguasaan kemahiran murid',
          achievementPercentage: 85
        }))
      : [
          {
            id: 'prog_1',
            name: 'Program Pemantapan Asas & Mufradat',
            targetGroup: 'Murid Tahap 1 & Tahap 2',
            implementationDate: `${yearNum}-04-15`,
            outcome: '85% murid menguasai kosa kata asas',
            achievementPercentage: 85
          },
          {
            id: 'prog_2',
            name: 'Klinik Bimbingan Berfokus (Intervensi)',
            targetGroup: 'Murid Kumpulan Lemah (Gred D/E)',
            implementationDate: `${yearNum}-07-10`,
            outcome: 'Peningkatan peratus lulus kepada 88%',
            achievementPercentage: 88
          }
        ];

    const newReport: AnnualReport = {
      id: `report_${yearNum}`,
      year: yearNum,
      schoolName: 'SEKOLAH KEBANGSAAN SK PUSAT',
      panitiaName: 'BAHASA ARAB',
      headTeacherName: 'GURU BESAR',
      preparedBy: 'KETUA PANITIA',
      approvedBy: 'GURU BESAR / GPK PENTADBIRAN',
      datePrepared: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
      activities: autoActivities,
      academicPrograms: autoPrograms,
      studentAchievementSummary: {
        totalStudents: totalStudentsCount,
        overallPassRate: passRate,
        averageMarks: avgMarks,
        gradeDistribution: gradeDist,
        summaryNotes: `Pencapaian keseluruhan murid menunjukkan keputusan memuaskan dengan purata markah ${avgMarks}% dan peratus kelulusan ${passRate}%.`
      },
      objectives: [
        {
          id: 'obj_1',
          objective: 'Mencapai peratus kelulusan sekurang-kurangnya 90%',
          targetKPI: '90% Lulus',
          actualAchievement: `${passRate}% Lulus`,
          status: passRate >= 90 ? 'TERCAPAI' : 'SEBAGIAN_TERCAPAI'
        },
        {
          id: 'obj_2',
          objective: 'Peningkatan peratus murid mendapat Gred A/B',
          targetKPI: '40% Gred A/B',
          actualAchievement: `${Math.round(((gradeDist['A'] + gradeDist['B']) / (gradedCount || 1)) * 100)}% Gred A/B`,
          status: 'TERCAPAI'
        }
      ],
      swotAnalysis: {
        strengths: DEFAULT_SWOT_STRENGTHS,
        weaknesses: DEFAULT_SWOT_WEAKNESSES,
        opportunities: DEFAULT_SWOT_OPPORTUNITIES,
        threats: DEFAULT_SWOT_THREATS
      },
      recommendations: DEFAULT_RECOMMENDATIONS,
      nextYearPlan: {
        goals: [
          `Mencapai sasaran peratus kelulusan ${Math.min(passRate + 5, 100)}% pada tahun ${yearNum + 1}.`,
          'Memperkemas sistem penilaian PBD berterusan secara digital.'
        ],
        upcomingPrograms: [
          'Minggu Bahasa & Arabi Fun Day',
          'Modul Pintar Mufradat Interaktif',
          'Klinik Bimbingan Rakan Sebaya'
        ],
        budgetEstimate: 'RM 1,500.00',
        notes: 'Permohonan peruntukan PCG Panitia telah dikemaskini.'
      }
    };

    setReportData(newReport);
  };

  // Smart Draft Generation Logic
  const generateSmartDraft = () => {
    // 1. Calculate performance trends from results
    let totalMarksSum = 0;
    let gradedCount = 0;
    let passedCount = 0;
    let gradeAorBCount = 0;
    let gradeDorECount = 0;

    results.forEach(res => {
      if (!res.isAbsent && res.marks !== undefined) {
        totalMarksSum += res.marks;
        gradedCount++;
        if (res.marks >= 40) passedCount++;
        if (res.marks >= 70) gradeAorBCount++;
        if (res.marks < 50) gradeDorECount++;
      }
    });

    const avgMarks = gradedCount > 0 ? Math.round((totalMarksSum / gradedCount) * 10) / 10 : 0;
    const passRate = gradedCount > 0 ? Math.round((passedCount / gradedCount) * 100) : 0;
    const highGradePct = gradedCount > 0 ? Math.round((gradeAorBCount / gradedCount) * 100) : 0;
    const lowGradePct = gradedCount > 0 ? Math.round((gradeDorECount / gradedCount) * 100) : 0;

    // 2. Calculate PBD performance trends
    let totalPbdEvaluations = 0;
    let tp1To3Count = 0;
    let tp4To6Count = 0;

    if (pbdRecords && pbdRecords.length > 0) {
      pbdRecords.forEach(rec => {
        if (rec.tpLevel) {
          totalPbdEvaluations++;
          if (rec.tpLevel <= 3) tp1To3Count++;
          else tp4To6Count++;
        }
      });
    }

    const tpHighPct = totalPbdEvaluations > 0 ? Math.round((tp4To6Count / totalPbdEvaluations) * 100) : 0;

    // Dynamic Strengths
    const smartStrengths: string[] = [
      `Barisan guru panitia yang komited dan berpengalaman dalam Pengajaran dan Pembelajaran (PdP).`,
      passRate >= 85
        ? `Pencapaian akademik yang kukuh dengan peratus kelulusan ujian mencapai ${passRate}%.`
        : `Penglibatan murid yang aktif dalam aktiviti PdP dan modul latihan panitia.`,
      tpHighPct > 0
        ? `${tpHighPct}% daripada penilaian PBD murid mencapai Tahap Penguasaan TP4 hingga TP6.`
        : `Sokongan padu daripada pihak Pentadbir Sekolah dan Persatuan Ibu Bapa dan Guru (PIBG).`
    ];

    // Dynamic Weaknesses
    const smartWeaknesses: string[] = [
      gradeDorECount > 0
        ? `Sebilangan murid (${lowGradePct}%, ${gradeDorECount} orang) berada pada gred D/E dan memerlukan latihan asas berulang.`
        : `Sebilangan kecil murid masih belum konsisten dalam penguasaan perbendaharaan kata asas.`,
      tp1To3Count > 0
        ? `Terdapat ${tp1To3Count} rekod PBD murid pada Tahap Penguasaan TP1-TP3 yang memerlukan bimbingan intervensi khusus.`
        : `Kekangan masa untuk bimbingan individu secara mendalam semasa waktu kelas rasmi.`
    ];

    // Dynamic Opportunities
    const smartOpportunities: string[] = [
      `Penggunaan kemudahan bahan digital KPM, portal e-Pembelajaran, dan aplikasi sokongan interaktif.`,
      `Kerjasama rapat dengan ibu bapa menerusi Kumpulan Sokongan Ibu Bapa (KSIB) bagi pemantauan latihan kendiri.`
    ];

    // Dynamic Threats
    const smartThreats: string[] = [
      `Isu ketidakhadiran sebilangan murid secara tegar menjejaskan kesinambungan penguasaan topik PdP.`,
      `Kurangnya motivasi serta sokongan ulangkaji bersasar di rumah bagi murid kumpulan lemah.`
    ];

    // Dynamic Recommendations based on trend
    const smartRecommendations: string[] = [
      lowGradePct > 15 || tp1To3Count > 0
        ? `Melaksanakan Klinik Bimbingan Berfokus & Modul Pemulihan Asas bagi murid berprestasi sederhana/lemah (TP1-TP3 / Gred D/E).`
        : `Meneruskan Program Pengukuhan & Bimbingan Rakan Sebaya (Peer Tutoring) secara berkala.`,
      highGradePct >= 30
        ? `Menganjurkan Bengkel Teknik Menjawab Soalan KBAT dan Kem Kecemerlangan untuk memaksimumkan pencapaian Gred A (TP6).`
        : `Memperluas penggunaan BBM interaktif dan lembaran kerja beraras untuk menarik minat murid.`,
      `Mengadakan sesi semakan buku latihan murid dan pentaksiran formatif bulanan secara berstruktur.`,
      `Meningkatkan komunikasi bersama ibu bapa murid sasaran intervensi bagi memastikan kesinambungan ulangkaji di rumah.`
    ];

    // Summary Note
    const smartSummaryNotes = `Analisis Sesi ${selectedYear}: Seramai ${gradedCount} murid dinilai dengan purata markah ${avgMarks}% dan kelulusan ${passRate}%. ` +
      (passRate >= 80
        ? `Pencapaian panitia secara keseluruhannya adalah amat memuaskan dengan ${highGradePct}% murid mencapai gred Cemerlang (A/B).`
        : `Tindakan pembaikan berfokus sedang dilaksanakan bagi membantu ${lowGradePct}% murid yang memerlukan intervensi lanjutan.`);

    setReportData(prev => ({
      ...prev,
      studentAchievementSummary: {
        ...prev.studentAchievementSummary,
        summaryNotes: smartSummaryNotes
      },
      swotAnalysis: {
        strengths: smartStrengths,
        weaknesses: smartWeaknesses,
        opportunities: smartOpportunities,
        threats: smartThreats
      },
      recommendations: smartRecommendations,
      nextYearPlan: {
        ...prev.nextYearPlan,
        goals: [
          `Mencapai sasaran peratus kelulusan sekurang-kurangnya ${Math.min(passRate + 5, 100)}% pada sesi berikutnya.`,
          `Memastikan sekurang-kurangnya 85% murid mencapai TP4-TP6 dalam penilaian PBD.`
        ]
      }
    }));

    setSmartDraftNotice(true);
    setTimeout(() => setSmartDraftNotice(false), 4000);
  };

  // Save Function
  const handleSaveReport = async () => {
    const updated = { ...reportData, updatedAt: new Date().toISOString() };
    const filteredReports = reports.filter(r => r.year !== selectedYear);
    const newReportList = [...filteredReports, updated];
    await db.set(DB_KEYS.ANNUAL_REPORTS, newReportList);
    setReports(newReportList);
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 3000);
  };

  // Sections navigation tabs
  const sectionsNav = [
    { id: 0, title: '1. Aktiviti Panitia', icon: Calendar },
    { id: 1, title: '2. Program Akademik', icon: BookOpen },
    { id: 2, title: '3. Pencapaian Murid', icon: TrendingUp },
    { id: 3, title: '4. Objektif & KPI', icon: Target },
    { id: 4, title: '5. Analysis SWOT', icon: ListChecks },
    { id: 5, title: '6. Cadangan Penambahbaikan', icon: Award },
    { id: 6, title: '7. Perancangan Tahun Depan', icon: Sparkles }
  ];

  return (
    <div className="space-y-6">
      {/* Header Actions Bar (Hidden when printing) */}
      <div className="no-print bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <FileText className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-800">Laporan & Penilaian Tahunan Panitia</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Penjanaan laporan lengkap 7 bahagian, penilaian KPI, eksport Word (.docx) & cetakan PDF rasmi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Year selector */}
          <div className="flex items-center bg-slate-100 rounded-xl px-3 py-1.5 border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 mr-2">Tahun Sesi:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-sm font-bold text-indigo-900 focus:outline-none cursor-pointer"
            >
              {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Auto Populate Button */}
          <button
            onClick={() => generateAutoPopulatedData(selectedYear)}
            className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-semibold transition"
            title="Sintesis data dari modul Ujian, PBD & Intervensi secara automatik"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Jana Otomatik</span>
          </button>

          {/* Smart Draft Button */}
          <button
            onClick={generateSmartDraft}
            className="flex items-center space-x-1.5 px-3 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-xl text-xs font-semibold transition"
            title="Jana draf teks pintar SWOT, Cadangan & Rumusan berdasarkan trend markah & PBD murid"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Draf Pintar</span>
          </button>

          {/* Toggle View Mode */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveSectionView('edit')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeSectionView === 'edit' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Penyuntingan
            </button>
            <button
              onClick={() => setActiveSectionView('preview')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeSectionView === 'preview' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pratonton Cetak
            </button>
          </div>

          {/* Export Word */}
          <button
            onClick={() => exportAnnualReportToDocx(reportData)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Download className="w-4 h-4" />
            <span>Muat Turun Word (.docx)</span>
          </button>

          {/* Print PDF */}
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / PDF</span>
          </button>

          {/* Save */}
          <button
            onClick={handleSaveReport}
            className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Save className="w-4 h-4" />
            <span>Simpan</span>
          </button>
        </div>
      </div>

      {/* Saved Notification */}
      {isSavedNotice && (
        <div className="no-print bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center space-x-2 text-sm font-medium">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span>Laporan Tahunan berjaya disimpan ke dalam rekod panitia!</span>
        </div>
      )}

      {/* Smart Draft Notification */}
      {smartDraftNotice && (
        <div className="no-print bg-purple-50 border border-purple-200 text-purple-900 px-4 py-3 rounded-xl flex items-center space-x-2 text-sm font-medium animate-fade-in">
          <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0" />
          <span>Draf Pintar Berjaya Dijana! Kandungan SWOT, Cadangan & Perancangan telah disintesis mengikut trend analisis markah & PBD murid.</span>
        </div>
      )}

      {/* EDIT MODE CONTENT */}
      {activeSectionView === 'edit' && (
        <div className="no-print grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Section Navigation Tabs (Left sidebar) */}
          <div className="lg:col-span-1 space-y-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">
              7 Bahagian Laporan
            </h3>
            {sectionsNav.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeTab === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveTab(sec.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition text-left ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{sec.title}</span>
                  </div>
                  <button
                    type="button"
                    title="Eksport Bahagian ini sahaja ke Word (.docx)"
                    onClick={(e) => {
                      e.stopPropagation();
                      const sectionKeysMap = [
                        'activities',
                        'academicPrograms',
                        'studentAchievementSummary',
                        'objectives',
                        'swotAnalysis',
                        'recommendations',
                        'nextYearPlan'
                      ];
                      exportAnnualReportToDocx(reportData, sectionKeysMap[sec.id]);
                    }}
                    className={`p-1 rounded hover:bg-white/20 transition ${
                      isActive ? 'text-white' : 'text-slate-400 hover:text-indigo-600'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </button>
              );
            })}

            <div className="pt-4 border-t border-slate-100 mt-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase">Maklumat Pengesahan</h4>
              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-slate-500 text-[11px] font-medium">Nama Sekolah</label>
                  <input
                    type="text"
                    value={reportData.schoolName}
                    onChange={(e) => setReportData({ ...reportData, schoolName: e.target.value })}
                    className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 text-[11px] font-medium">Disediakan Oleh (Ketua Panitia)</label>
                  <input
                    type="text"
                    value={reportData.preparedBy}
                    onChange={(e) => setReportData({ ...reportData, preparedBy: e.target.value })}
                    className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 text-[11px] font-medium">Disahkan Oleh (Guru Besar/GPK)</label>
                  <input
                    type="text"
                    value={reportData.approvedBy}
                    onChange={(e) => setReportData({ ...reportData, approvedBy: e.target.value })}
                    className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section Main Editor Panel */}
          <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            
            {/* 1. Aktiviti Panitia */}
            {activeTab === 0 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">1. Laporan Aktiviti Panitia</h2>
                    <p className="text-xs text-slate-500">Rekod mesyuarat, penyenggaraan bahan/aset, dan aktiviti panitia.</p>
                  </div>
                  <button
                    onClick={() => {
                      const newAct: AnnualReportActivity = {
                        id: `act_${Date.now()}`,
                        title: '',
                        date: new Date().toISOString().split('T')[0],
                        category: 'Aktiviti',
                        status: 'SELESAI',
                        notes: ''
                      };
                      setReportData({ ...reportData, activities: [...reportData.activities, newAct] });
                    }}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Aktiviti</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {reportData.activities.map((act, index) => (
                    <div key={act.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                      <div className="md:col-span-1 text-xs font-bold text-slate-400">#{index + 1}</div>
                      <div className="md:col-span-4">
                        <input
                          type="text"
                          placeholder="Nama Aktiviti / Mesyuarat"
                          value={act.title}
                          onChange={(e) => {
                            const updated = [...reportData.activities];
                            updated[index].title = e.target.value;
                            setReportData({ ...reportData, activities: updated });
                          }}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <input
                          type="date"
                          value={act.date}
                          onChange={(e) => {
                            const updated = [...reportData.activities];
                            updated[index].date = e.target.value;
                            setReportData({ ...reportData, activities: updated });
                          }}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <select
                          value={act.status}
                          onChange={(e) => {
                            const updated = [...reportData.activities];
                            updated[index].status = e.target.value as any;
                            setReportData({ ...reportData, activities: updated });
                          }}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                        >
                          <option value="SELESAI">SELESAI</option>
                          <option value="DALAM_PROSES">DALAM PROSES</option>
                          <option value="TANGGUH">TANGGUH</option>
                        </select>
                      </div>
                      <div className="md:col-span-1 flex justify-end">
                        <button
                          onClick={() => {
                            const updated = reportData.activities.filter((_, i) => i !== index);
                            setReportData({ ...reportData, activities: updated });
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Program Akademik */}
            {activeTab === 1 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">2. Laporan Program Akademik & Intervensi</h2>
                    <p className="text-xs text-slate-500">Program peningkatan prestasi dan intervensi murid bersasar.</p>
                  </div>
                  <button
                    onClick={() => {
                      const newProg: AnnualReportProgram = {
                        id: `prog_${Date.now()}`,
                        name: '',
                        targetGroup: 'Semua Murid',
                        implementationDate: new Date().toISOString().split('T')[0],
                        outcome: 'Peningkatan prestasi',
                        achievementPercentage: 80
                      };
                      setReportData({ ...reportData, academicPrograms: [...reportData.academicPrograms, newProg] });
                    }}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Program</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {reportData.academicPrograms.map((prog, index) => (
                    <div key={prog.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">Program #{index + 1}</span>
                        <button
                          onClick={() => {
                            const updated = reportData.academicPrograms.filter((_, i) => i !== index);
                            setReportData({ ...reportData, academicPrograms: updated });
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">Nama Program</label>
                          <input
                            type="text"
                            value={prog.name}
                            onChange={(e) => {
                              const updated = [...reportData.academicPrograms];
                              updated[index].name = e.target.value;
                              setReportData({ ...reportData, academicPrograms: updated });
                            }}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">Kumpulan Sasaran</label>
                          <input
                            type="text"
                            value={prog.targetGroup}
                            onChange={(e) => {
                              const updated = [...reportData.academicPrograms];
                              updated[index].targetGroup = e.target.value;
                              setReportData({ ...reportData, academicPrograms: updated });
                            }}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">Hasil / Impak Program</label>
                          <input
                            type="text"
                            value={prog.outcome}
                            onChange={(e) => {
                              const updated = [...reportData.academicPrograms];
                              updated[index].outcome = e.target.value;
                              setReportData({ ...reportData, academicPrograms: updated });
                            }}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">Pencapaian (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={prog.achievementPercentage}
                            onChange={(e) => {
                              const updated = [...reportData.academicPrograms];
                              updated[index].achievementPercentage = Number(e.target.value);
                              setReportData({ ...reportData, academicPrograms: updated });
                            }}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Rumusan Pencapaian Murid */}
            {activeTab === 2 && (
              <div className="space-y-5">
                <div className="pb-3 border-b border-slate-200">
                  <h2 className="text-lg font-bold text-slate-800">3. Rumusan Pencapaian Murid</h2>
                  <p className="text-xs text-slate-500">Statistik ujian, PBD, dan analisis gred murid panitia.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-center">
                    <span className="text-xs text-indigo-600 font-semibold uppercase">Jumlah Murid Dinilai</span>
                    <div className="text-2xl font-black text-indigo-900 mt-1">
                      {reportData.studentAchievementSummary.totalStudents} orang
                    </div>
                  </div>
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                    <span className="text-xs text-emerald-600 font-semibold uppercase">Peratus Kelulusan</span>
                    <div className="text-2xl font-black text-emerald-900 mt-1">
                      {reportData.studentAchievementSummary.overallPassRate}%
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-center">
                    <span className="text-xs text-blue-600 font-semibold uppercase">Purata Markah</span>
                    <div className="text-2xl font-black text-blue-900 mt-1">
                      {reportData.studentAchievementSummary.averageMarks}%
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Ulasan / Post-Mortem Pencapaian Murid</label>
                  <textarea
                    rows={4}
                    value={reportData.studentAchievementSummary.summaryNotes}
                    onChange={(e) => setReportData({
                      ...reportData,
                      studentAchievementSummary: {
                        ...reportData.studentAchievementSummary,
                        summaryNotes: e.target.value
                      }
                    })}
                    className="w-full p-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* 4. Penilaian Objektif Panitia */}
            {activeTab === 3 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">4. Penilaian Pencapaian Objektif Panitia</h2>
                    <p className="text-xs text-slate-500">Perbandingan Sasaran Kerja Tahunan (KPI) dengan pencapaian sebenar.</p>
                  </div>
                  <button
                    onClick={() => {
                      const newObj: AnnualReportObjective = {
                        id: `obj_${Date.now()}`,
                        objective: '',
                        targetKPI: '',
                        actualAchievement: '',
                        status: 'SEBAGIAN_TERCAPAI'
                      };
                      setReportData({ ...reportData, objectives: [...reportData.objectives, newObj] });
                    }}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Objektif</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {reportData.objectives.map((obj, index) => (
                    <div key={obj.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">Objektif KPI #{index + 1}</span>
                        <button
                          onClick={() => {
                            const updated = reportData.objectives.filter((_, i) => i !== index);
                            setReportData({ ...reportData, objectives: updated });
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">Objektif Panitia</label>
                          <input
                            type="text"
                            value={obj.objective}
                            onChange={(e) => {
                              const updated = [...reportData.objectives];
                              updated[index].objective = e.target.value;
                              setReportData({ ...reportData, objectives: updated });
                            }}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">Sasaran KPI</label>
                          <input
                            type="text"
                            value={obj.targetKPI}
                            onChange={(e) => {
                              const updated = [...reportData.objectives];
                              updated[index].targetKPI = e.target.value;
                              setReportData({ ...reportData, objectives: updated });
                            }}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">Pencapaian Sebenar</label>
                          <input
                            type="text"
                            value={obj.actualAchievement}
                            onChange={(e) => {
                              const updated = [...reportData.objectives];
                              updated[index].actualAchievement = e.target.value;
                              setReportData({ ...reportData, objectives: updated });
                            }}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Analisis SWOT */}
            {activeTab === 4 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">5. Rumusan Kekuatan & Kelemahan (Analisis SWOT)</h2>
                    <p className="text-xs text-slate-500">Kenal pasti faktor dalaman dan luaran yang mempengaruhi pencapaian panitia.</p>
                  </div>
                  <button
                    onClick={generateSmartDraft}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg text-xs font-semibold transition"
                    title="Jana draf analisis SWOT automatik berdasarkan prestasi murid"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>Jana Draf Pintar</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Strengths */}
                  <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2">
                    <h3 className="text-xs font-bold text-emerald-800 uppercase">Kekuatan (Strengths)</h3>
                    {reportData.swotAnalysis.strengths.map((s, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={s}
                          onChange={(e) => {
                            const updated = [...reportData.swotAnalysis.strengths];
                            updated[idx] = e.target.value;
                            setReportData({
                              ...reportData,
                              swotAnalysis: { ...reportData.swotAnalysis, strengths: updated }
                            });
                          }}
                          className="w-full px-2.5 py-1 bg-white border border-emerald-200 rounded text-xs text-slate-800"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Weaknesses */}
                  <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-xl space-y-2">
                    <h3 className="text-xs font-bold text-rose-800 uppercase">Kelemahan (Weaknesses)</h3>
                    {reportData.swotAnalysis.weaknesses.map((w, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={w}
                          onChange={(e) => {
                            const updated = [...reportData.swotAnalysis.weaknesses];
                            updated[idx] = e.target.value;
                            setReportData({
                              ...reportData,
                              swotAnalysis: { ...reportData.swotAnalysis, weaknesses: updated }
                            });
                          }}
                          className="w-full px-2.5 py-1 bg-white border border-rose-200 rounded text-xs text-slate-800"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Opportunities */}
                  <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl space-y-2">
                    <h3 className="text-xs font-bold text-blue-800 uppercase">Peluang (Opportunities)</h3>
                    {reportData.swotAnalysis.opportunities.map((o, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={o}
                          onChange={(e) => {
                            const updated = [...reportData.swotAnalysis.opportunities];
                            updated[idx] = e.target.value;
                            setReportData({
                              ...reportData,
                              swotAnalysis: { ...reportData.swotAnalysis, opportunities: updated }
                            });
                          }}
                          className="w-full px-2.5 py-1 bg-white border border-blue-200 rounded text-xs text-slate-800"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Threats */}
                  <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl space-y-2">
                    <h3 className="text-xs font-bold text-amber-800 uppercase">Ancaman (Threats)</h3>
                    {reportData.swotAnalysis.threats.map((t, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={t}
                          onChange={(e) => {
                            const updated = [...reportData.swotAnalysis.threats];
                            updated[idx] = e.target.value;
                            setReportData({
                              ...reportData,
                              swotAnalysis: { ...reportData.swotAnalysis, threats: updated }
                            });
                          }}
                          className="w-full px-2.5 py-1 bg-white border border-amber-200 rounded text-xs text-slate-800"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 6. Cadangan Penambahbaikan */}
            {activeTab === 5 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">6. Cadangan Penambahbaikan</h2>
                    <p className="text-xs text-slate-500">Syor tindakan susulan dan strategi pembaikan berimpak tinggi.</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={generateSmartDraft}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg text-xs font-semibold transition"
                      title="Jana draf cadangan penambahbaikan bersasar automatik"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>Jana Draf Pintar</span>
                    </button>
                    <button
                      onClick={() => {
                        setReportData({
                          ...reportData,
                          recommendations: [...reportData.recommendations, 'Cadangan penambahbaikan baharu']
                        });
                      }}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Cadangan</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {reportData.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-400 w-6">{index + 1}.</span>
                      <input
                        type="text"
                        value={rec}
                        onChange={(e) => {
                          const updated = [...reportData.recommendations];
                          updated[index] = e.target.value;
                          setReportData({ ...reportData, recommendations: updated });
                        }}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                      />
                      <button
                        onClick={() => {
                          const updated = reportData.recommendations.filter((_, i) => i !== index);
                          setReportData({ ...reportData, recommendations: updated });
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7. Perancangan Tahun Berikutnya */}
            {activeTab === 6 && (
              <div className="space-y-5">
                <div className="pb-3 border-b border-slate-200">
                  <h2 className="text-lg font-bold text-slate-800">7. Perancangan Awal Bagi Tahun {reportData.year + 1}</h2>
                  <p className="text-xs text-slate-500">Takwim sasaran, cadangan program utama, dan anggaran peruntukan.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Anggaran Peruntukan Kewangan PCG</label>
                    <input
                      type="text"
                      value={reportData.nextYearPlan.budgetEstimate}
                      onChange={(e) => setReportData({
                        ...reportData,
                        nextYearPlan: { ...reportData.nextYearPlan, budgetEstimate: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nota / Harapan Tahun Berikutnya</label>
                    <textarea
                      rows={3}
                      value={reportData.nextYearPlan.notes}
                      onChange={(e) => setReportData({
                        ...reportData,
                        nextYearPlan: { ...reportData.nextYearPlan, notes: e.target.value }
                      })}
                      className="w-full p-3 border border-slate-200 rounded-xl text-xs text-slate-800"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PRATONTON CETAK / OFFICIAL PRINT VIEW (Visible in preview mode OR window.print()) */}
      {(activeSectionView === 'preview' || true) && (
        <div className={`printable-report bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-200 space-y-8 ${activeSectionView === 'edit' ? 'hidden print:block' : 'block'}`}>
          
          {/* Header Rasmi KPM / Panitia */}
          <div className="text-center border-b-2 border-slate-800 pb-6 space-y-1">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-wide uppercase">
              {reportData.schoolName}
            </h1>
            <h2 className="text-lg md:text-xl font-bold text-indigo-900 uppercase">
              LAPORAN DAN PENILAIAN TAHUNAN PANITIA {reportData.panitiaName}
            </h2>
            <p className="text-sm font-semibold text-slate-600">
              SESI AKADEMIK {reportData.year}
            </p>
          </div>

          {/* 1. Aktiviti Panitia */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-indigo-900 uppercase border-b border-indigo-200 pb-1">
              1. LAPORAN AKTIVITI PANITIA
            </h3>
            {reportData.activities.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Tiada aktiviti direkodkan.</p>
            ) : (
              <table className="w-full text-xs text-left border-collapse border border-slate-300">
                <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-2 border border-slate-300 w-10 text-center">Bil</th>
                    <th className="p-2 border border-slate-300">Aktiviti / Mesyuarat</th>
                    <th className="p-2 border border-slate-300 w-28">Tarikh</th>
                    <th className="p-2 border border-slate-300 w-28">Kategori</th>
                    <th className="p-2 border border-slate-300 w-24 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.activities.map((act, i) => (
                    <tr key={act.id} className="border-b border-slate-200">
                      <td className="p-2 border border-slate-300 text-center font-medium">{i + 1}</td>
                      <td className="p-2 border border-slate-300 font-semibold text-slate-800">{act.title}</td>
                      <td className="p-2 border border-slate-300 text-slate-600">{act.date}</td>
                      <td className="p-2 border border-slate-300 text-slate-600">{act.category}</td>
                      <td className="p-2 border border-slate-300 text-center font-bold text-emerald-700">{act.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* 2. Program Akademik */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-indigo-900 uppercase border-b border-indigo-200 pb-1">
              2. LAPORAN PROGRAM AKADEMIK & INTERVENSI
            </h3>
            {reportData.academicPrograms.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Tiada program direkodkan.</p>
            ) : (
              <table className="w-full text-xs text-left border-collapse border border-slate-300">
                <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-2 border border-slate-300 w-10 text-center">Bil</th>
                    <th className="p-2 border border-slate-300">Nama Program</th>
                    <th className="p-2 border border-slate-300">Kumpulan Sasaran</th>
                    <th className="p-2 border border-slate-300">Hasil / Impak</th>
                    <th className="p-2 border border-slate-300 w-24 text-center">Pencapaian</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.academicPrograms.map((prog, i) => (
                    <tr key={prog.id} className="border-b border-slate-200">
                      <td className="p-2 border border-slate-300 text-center font-medium">{i + 1}</td>
                      <td className="p-2 border border-slate-300 font-semibold text-slate-800">{prog.name}</td>
                      <td className="p-2 border border-slate-300 text-slate-600">{prog.targetGroup}</td>
                      <td className="p-2 border border-slate-300 text-slate-600">{prog.outcome}</td>
                      <td className="p-2 border border-slate-300 text-center font-bold text-indigo-700">{prog.achievementPercentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* 3. Pencapaian Murid */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-indigo-900 uppercase border-b border-indigo-200 pb-1">
              3. RUMUSAN PENCAPAIAN MURID
            </h3>
            <div className="grid grid-cols-3 gap-4 text-xs font-semibold p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div>Jumlah Murid: <span className="font-bold text-slate-900">{reportData.studentAchievementSummary.totalStudents} orang</span></div>
              <div>Peratus Kelulusan: <span className="font-bold text-emerald-700">{reportData.studentAchievementSummary.overallPassRate}%</span></div>
              <div>Purata Markah: <span className="font-bold text-indigo-700">{reportData.studentAchievementSummary.averageMarks}%</span></div>
            </div>
            {reportData.studentAchievementSummary.summaryNotes && (
              <p className="text-xs text-slate-700 italic bg-white p-2 border border-slate-200 rounded">
                "{reportData.studentAchievementSummary.summaryNotes}"
              </p>
            )}
          </div>

          {/* 4. Objektif & KPI */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-indigo-900 uppercase border-b border-indigo-200 pb-1">
              4. PENILAIAN PENCAPAIAN OBJEKTIF PANITIA
            </h3>
            <table className="w-full text-xs text-left border-collapse border border-slate-300">
              <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                <tr>
                  <th className="p-2 border border-slate-300 w-10 text-center">Bil</th>
                  <th className="p-2 border border-slate-300">Objektif Panitia</th>
                  <th className="p-2 border border-slate-300">Sasaran KPI</th>
                  <th className="p-2 border border-slate-300">Pencapaian Sebenar</th>
                </tr>
              </thead>
              <tbody>
                {reportData.objectives.map((obj, i) => (
                  <tr key={obj.id} className="border-b border-slate-200">
                    <td className="p-2 border border-slate-300 text-center font-medium">{i + 1}</td>
                    <td className="p-2 border border-slate-300 font-semibold text-slate-800">{obj.objective}</td>
                    <td className="p-2 border border-slate-300 text-slate-600">{obj.targetKPI}</td>
                    <td className="p-2 border border-slate-300 font-bold text-emerald-700">{obj.actualAchievement}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 5. SWOT Analysis */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-indigo-900 uppercase border-b border-indigo-200 pb-1">
              5. RUMUSAN KEKUATAN & KELEMAHAN (ANALISIS SWOT)
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="font-bold text-emerald-900 uppercase">Kekuatan:</span>
                <ul className="list-disc pl-4 mt-1 space-y-1 text-slate-700">
                  {reportData.swotAnalysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <span className="font-bold text-rose-900 uppercase">Kelemahan:</span>
                <ul className="list-disc pl-4 mt-1 space-y-1 text-slate-700">
                  {reportData.swotAnalysis.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="font-bold text-blue-900 uppercase">Peluang:</span>
                <ul className="list-disc pl-4 mt-1 space-y-1 text-slate-700">
                  {reportData.swotAnalysis.opportunities.map((o, i) => <li key={i}>{o}</li>)}
                </ul>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <span className="font-bold text-amber-900 uppercase">Ancaman:</span>
                <ul className="list-disc pl-4 mt-1 space-y-1 text-slate-700">
                  {reportData.swotAnalysis.threats.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
            </div>
          </div>

          {/* 6. Cadangan Penambahbaikan */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-indigo-900 uppercase border-b border-indigo-200 pb-1">
              6. CADANGAN PENAMBAHBAIKAN
            </h3>
            <ol className="list-decimal pl-5 text-xs text-slate-800 space-y-1">
              {reportData.recommendations.map((rec, i) => (
                <li key={i} className="font-medium">{rec}</li>
              ))}
            </ol>
          </div>

          {/* 7. Perancangan Tahun Depan */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-indigo-900 uppercase border-b border-indigo-200 pb-1">
              7. PERANCANGAN AWAL BAGI TAHUN {reportData.year + 1}
            </h3>
            <div className="text-xs space-y-2 text-slate-800">
              <p><span className="font-bold">Anggaran Peruntukan:</span> {reportData.nextYearPlan.budgetEstimate}</p>
              <p><span className="font-bold">Catatan Perancangan:</span> {reportData.nextYearPlan.notes}</p>
            </div>
          </div>

          {/* Tandatangan & Pengesahan */}
          <div className="pt-12 grid grid-cols-2 gap-8 text-xs text-slate-800">
            <div className="space-y-12">
              <div>Disediakan oleh:</div>
              <div>
                <div className="font-bold underline uppercase">{reportData.preparedBy}</div>
                <div>Ketua Panitia {reportData.panitiaName}</div>
                <div className="text-slate-500 mt-1">Tarikh: {reportData.datePrepared}</div>
              </div>
            </div>
            <div className="space-y-12">
              <div>Disahkan oleh:</div>
              <div>
                <div className="font-bold underline uppercase">{reportData.approvedBy || 'GURU BESAR'}</div>
                <div>Guru Besar / GPK Pentadbiran</div>
                <div className="text-slate-500 mt-1">Tarikh: .......................................</div>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
