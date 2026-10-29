
import React, { useState, useMemo } from 'react';
import { Student, Exam, Result, ExamType, ExamItem, GradeConfig, User, Language } from '../types';
import { Plus, X, Trash2, Search, Edit3, Download, ListPlus, BookOpen, Calendar, CheckSquare, Square, Filter, Printer, CheckCircle, XCircle, Save, TrendingUp, TrendingDown, Minus, BrainCircuit, AlertCircle, Sparkles, Loader2, Trophy, ArrowLeft, ChevronRight, User as UserIcon, Layers, BarChart2, Check, Sliders, Copy, ClipboardPaste, FileSpreadsheet, Users } from 'lucide-react';
import * as XLSX from 'xlsx';
import { translations } from '../src/translations';
import { aiService } from '../services/aiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, LineChart, Line } from 'recharts';

// Helper function for local pedagogical recommendations
const getLocalPedagogicalRecommendation = (studentName: string, itemsPerformance: Array<{label: string, desc: string, pct: number}>) => {
  const weakItems = itemsPerformance.filter(item => item.pct < 60);
  const strongItems = itemsPerformance.filter(item => item.pct >= 80);
  
  let strengthsText = "";
  let weaknessesText = "";
  let recommendationText = "";

  if (strongItems.length > 0) {
    strengthsText = `${studentName} menunjukkan penguasaan yang sangat baik dalam kemahiran ` + 
      strongItems.map(i => `"${i.label} - ${i.desc || 'Kemahiran Umum'}"`).join(', ') + 
      `. Teruskan usaha memantapkan kemahiran ini.`;
  } else {
    strengthsText = `${studentName} sedang berusaha untuk membina keyakinan dalam semua bahagian ujian. Sokongan berterusan amat diperlukan.`;
  }

  if (weakItems.length > 0) {
    weaknessesText = `Terdapat beberapa bahagian yang memerlukan perhatian dan latihan tambahan, terutamanya bagi kemahiran ` + 
      weakItems.map(i => `"${i.label} - ${i.desc || 'Kemahiran Umum'}"`).join(', ') + `.`;
    
    const syorList: string[] = [];
    weakItems.forEach(i => {
      const desc = (i.desc || '').toLowerCase();
      if (desc.includes('tatabahasa') || desc.includes('qawaid') || desc.includes('nahu')) {
        syorList.push(`Latihan bina ayat mudah dan pengecaman kata nama/kerja (Isim & Fi'il).`);
      } else if (desc.includes('kosa kata') || desc.includes('mufrodat')) {
        syorList.push(`Penggunaan kad imbasan (flashcards) visual untuk menghafal mufrodat harian.`);
      } else if (desc.includes('bacaan') || desc.includes('fahaman') || desc.includes('qiraah')) {
        syorList.push(`Latihan membaca teks pendek Bahasa Arab dan menjawab soalan kefahaman berpandu.`);
      } else if (desc.includes('penulisan') || desc.includes('kitabah')) {
        syorList.push(`Latihan menyalin perkataan dan menyusun perkataan menjadi ayat lengkap.`);
      } else if (desc.includes('mendengar') || desc.includes('istima')) {
        syorList.push(`Latihan mendengar sebutan kalimah daripada audio guru atau perisian interaktif.`);
      } else {
        syorList.push(`Latihan tubi berfokus untuk topik "${i.label}" dengan bimbingan rakan sebaya (peer tutoring).`);
      }
    });

    recommendationText = `Syor Intervensi:\n` + Array.from(new Set(syorList)).map((s, idx) => `${idx + 1}. ${s}`).join('\n');
  } else {
    weaknessesText = `${studentName} telah menguasai keseluruhan bahagian ujian ini dengan cemerlang. Tiada kelemahan kritikal dikesan.`;
    recommendationText = `Syor Pengayaan:\n1. Berikan bahan bacaan Bahasa Arab yang lebih mencabar untuk meningkatkan kosa kata kelas tinggi.\n2. Lantik sebagai pembimbing rakan sebaya (mentor) untuk membantu rakan-rakan sekelas yang memerlukan bimbingan.`;
  }

  return {
    strengths: strengthsText,
    weaknesses: weaknessesText,
    recommendations: recommendationText
  };
};

const CustomComparisonTooltip = ({ active, payload, label, activeComparisonExams }: any) => {
  if (active && payload && payload.length) {
    const studentInfo = payload[0]?.payload;
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-xl border border-slate-800 text-xs space-y-2.5 z-50 min-w-[220px]">
        <div className="border-b border-slate-800 pb-1.5 flex justify-between items-start gap-2">
          <div>
            <p className="font-extrabold uppercase text-amber-400 leading-snug">{studentInfo?.fullName || label}</p>
            {studentInfo?.class && (
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">Kelas: {studentInfo.class} {studentInfo?.regNo ? `• ID: ${studentInfo.regNo}` : ''}</p>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => {
            const examId = entry.dataKey;
            const exam = activeComparisonExams?.find((e: any) => e.id === examId) || { name: entry.name };
            const isAbsent = studentInfo?.[`${examId}_isAbsent`];
            const gradeLabel = studentInfo?.[`${examId}_grade`];
            return (
              <div key={index} className="flex items-center justify-between gap-3 text-xs bg-slate-800/60 p-2 rounded-xl">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                  <span className="font-bold text-slate-200 text-[11px] uppercase">{exam.name || entry.name}:</span>
                </div>
                <span className="font-black text-white text-xs">
                  {isAbsent ? (
                    <span className="text-rose-400 font-extrabold">TH (Tidak Hadir)</span>
                  ) : (
                    <>
                      {entry.value !== null && entry.value !== undefined ? `${entry.value}%` : '-'}
                      {gradeLabel && (
                        <span className="ml-1 text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300">
                          {gradeLabel}
                        </span>
                      )}
                    </>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

interface AssessmentProps {
  students: Student[];
  exams: Exam[];
  results: Result[];
  gradeConfigs: GradeConfig[];
  onAddExam: (exam: Omit<Exam, 'id'>) => void;
  onUpdateExam: (exam: Exam) => void;
  onDeleteExam: (id: string) => void;
  onUpdateResult: (result: Omit<Result, 'id'>) => void;
  onUndo: () => void;
  currentUser: User;
  onUpdateGrades: (configs: GradeConfig[]) => void;
}

const Assessment: React.FC<AssessmentProps> = ({ students, exams, results, gradeConfigs, onAddExam, onUpdateExam, onDeleteExam, onUpdateResult, onUndo, currentUser, onUpdateGrades }) => {
  const lang: Language = currentUser.language || 'ms';
  const t = translations[lang];
  const isRTL = lang === 'ar';
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [isBulkMarksModalOpen, setIsBulkMarksModalOpen] = useState(false);
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [filterClass, setFilterClass] = useState<string>('');
  const [filterYear, setFilterYear] = useState<string>('');
  const [searchStudentTerm, setSearchStudentTerm] = useState<string>('');
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  
  const [activeSubTab, setActiveSubTab] = useState<'marks' | 'analysis'>('marks');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [compareExamId, setCompareExamId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, string>>({});

  const [mainView, setMainView] = useState<'LIST' | 'COMPARISON'>('LIST');

  // State untuk Sub Tajuk Baru: Analisis Pentaksiran
  const [comparisonClass, setComparisonClass] = useState<string>('');
  const [comparisonSubClass, setComparisonSubClass] = useState<string>('');
  const [comparisonYear, setComparisonYear] = useState<string>('');
  const [comparisonPerformanceGroup, setComparisonPerformanceGroup] = useState<'ALL' | 'CEMERLANG' | 'SEDERHANA' | 'LEMAH'>('ALL');
  const [selectedComparisonExamIds, setSelectedComparisonExamIds] = useState<string[] | null>(null);
  const [comparisonSearchTerm, setComparisonSearchTerm] = useState<string>('');
  const [comparisonChartType, setComparisonChartType] = useState<'BAR' | 'LINE'>('BAR');
  const [comparisonChartScope, setComparisonChartScope] = useState<'STUDENT' | 'AVERAGE'>('STUDENT');
  const [comparisonStudentLimit, setComparisonStudentLimit] = useState<number>(15);

  // State untuk Tapisan Jadual Markah
  const [filterSubClass, setFilterSubClass] = useState<string>('');
  const [filterPerformanceGroup, setFilterPerformanceGroup] = useState<'ALL' | 'CEMERLANG' | 'SEDERHANA' | 'LEMAH'>('ALL');

  const getGradeHelper = (marks: number | null, isAbsent?: boolean, exam?: Exam | null) => {
    if (isAbsent || marks === null) return { label: 'TH', color: '#ef4444', textClass: 'text-red-600 bg-red-50 border-red-200' };
    const configsToUse = (exam && exam.gradeConfigs && exam.gradeConfigs.length > 0) ? exam.gradeConfigs : gradeConfigs;
    const found = configsToUse.find(g => marks >= g.min && marks <= g.max);
    if (found) return { label: found.label, color: found.color, textClass: '' };
    if (marks >= 80) return { label: 'A', color: '#16a34a', textClass: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (marks >= 70) return { label: 'B', color: '#22c55e', textClass: 'text-green-700 bg-green-50 border-green-200' };
    if (marks >= 50) return { label: 'C', color: '#eab308', textClass: 'text-amber-700 bg-amber-50 border-amber-200' };
    if (marks >= 40) return { label: 'D', color: '#f97316', textClass: 'text-orange-700 bg-orange-50 border-orange-200' };
    return { label: 'E', color: '#ef4444', textClass: 'text-red-700 bg-red-50 border-red-200' };
  };

  const subClasses = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      const trimmed = s.class.trim();
      const spaceIdx = trimmed.indexOf(' ');
      if (spaceIdx !== -1) {
        const sub = trimmed.substring(spaceIdx + 1).trim();
        if (sub) set.add(sub);
      } else if (trimmed) {
        set.add(trimmed);
      }
    });
    return Array.from(set).sort();
  }, [students]);

  const sortedExams = useMemo(() => {
    return [...exams].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      if (isNaN(dateA)) return -1;
      if (isNaN(dateB)) return 1;
      return dateA - dateB;
    });
  }, [exams]);

  const activeComparisonExams = useMemo(() => {
    if (selectedComparisonExamIds === null) return sortedExams;
    return sortedExams.filter(e => selectedComparisonExamIds.includes(e.id));
  }, [sortedExams, selectedComparisonExamIds]);

  const toggleComparisonExam = (examId: string) => {
    if (selectedComparisonExamIds === null) {
      const allIds = sortedExams.map(e => e.id);
      setSelectedComparisonExamIds(allIds.filter(id => id !== examId));
    } else {
      if (selectedComparisonExamIds.includes(examId)) {
        setSelectedComparisonExamIds(selectedComparisonExamIds.filter(id => id !== examId));
      } else {
        setSelectedComparisonExamIds([...selectedComparisonExamIds, examId]);
      }
    }
  };

  const comparisonStudents = useMemo(() => {
    return students
      .filter(s => {
        const matchClass = comparisonClass ? s.class === comparisonClass : true;
        const matchYear = comparisonYear ? s.year === parseInt(comparisonYear) : true;
        const matchSearch = comparisonSearchTerm ? s.name.toLowerCase().includes(comparisonSearchTerm.toLowerCase()) : true;
        const matchSubClass = comparisonSubClass ? s.class.toLowerCase().includes(comparisonSubClass.toLowerCase()) : true;
        return matchClass && matchYear && matchSearch && matchSubClass;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, comparisonClass, comparisonYear, comparisonSearchTerm, comparisonSubClass]);

  const rawComparisonData = useMemo(() => {
    return comparisonStudents.map(student => {
      const examResults = activeComparisonExams.map(exam => {
        const res = results.find(r => r.studentId === student.id && r.examId === exam.id);
        const isAbsent = res?.isAbsent || false;
        const marks = res && !isAbsent ? res.marks : null;
        const grade = getGradeHelper(marks, isAbsent, exam);
        return {
          examId: exam.id,
          examName: exam.name,
          res,
          isAbsent,
          marks,
          grade
        };
      });

      const validScores = examResults.filter(er => er.marks !== null && !er.isAbsent);
      const avgScore = validScores.length > 0
        ? Math.round(validScores.reduce((acc, er) => acc + (er.marks || 0), 0) / validScores.length)
        : null;

      let performanceGroup: 'CEMERLANG' | 'SEDERHANA' | 'LEMAH' = 'LEMAH';
      if (avgScore !== null) {
        if (avgScore >= 80) performanceGroup = 'CEMERLANG';
        else if (avgScore >= 40) performanceGroup = 'SEDERHANA';
        else performanceGroup = 'LEMAH';
      }

      let delta = 0;
      let trend: 'UP' | 'DOWN' | 'SAME' | 'NONE' = 'NONE';
      let firstScore: number | null = null;
      let latestScore: number | null = null;

      if (validScores.length >= 2) {
        firstScore = validScores[0].marks!;
        latestScore = validScores[validScores.length - 1].marks!;
        delta = latestScore - firstScore;
        if (delta > 0) trend = 'UP';
        else if (delta < 0) trend = 'DOWN';
        else trend = 'SAME';
      } else if (validScores.length === 1) {
        firstScore = validScores[0].marks!;
        latestScore = validScores[0].marks!;
      }

      return {
        student,
        examResults,
        validScores,
        avgScore,
        performanceGroup,
        firstScore,
        latestScore,
        delta,
        trend
      };
    });
  }, [comparisonStudents, activeComparisonExams, results, gradeConfigs]);

  const performanceCounts = useMemo(() => {
    let cemerlang = 0;
    let sederhana = 0;
    let lemah = 0;
    rawComparisonData.forEach(d => {
      if (d.performanceGroup === 'CEMERLANG') cemerlang++;
      else if (d.performanceGroup === 'SEDERHANA') sederhana++;
      else if (d.performanceGroup === 'LEMAH') lemah++;
    });
    return { cemerlang, sederhana, lemah, total: rawComparisonData.length };
  }, [rawComparisonData]);

  const studentComparisonData = useMemo(() => {
    if (comparisonPerformanceGroup === 'ALL') return rawComparisonData;
    return rawComparisonData.filter(d => d.performanceGroup === comparisonPerformanceGroup);
  }, [rawComparisonData, comparisonPerformanceGroup]);

  const comparisonSummary = useMemo(() => {
    const totalStudents = studentComparisonData.length;
    let upCount = 0;
    let downCount = 0;
    let sameCount = 0;

    studentComparisonData.forEach(d => {
      if (d.trend === 'UP') upCount++;
      else if (d.trend === 'DOWN') downCount++;
      else if (d.trend === 'SAME') sameCount++;
    });

    const examAverages = activeComparisonExams.map(exam => {
      const classRes = results.filter(r => r.examId === exam.id && studentComparisonData.some(s => s.student.id === r.studentId) && !r.isAbsent);
      const avg = classRes.length > 0 ? Math.round(classRes.reduce((a, b) => a + b.marks, 0) / classRes.length) : 0;
      return {
        exam,
        avg,
        count: classRes.length
      };
    });

    return {
      totalStudents,
      upCount,
      downCount,
      sameCount,
      examAverages
    };
  }, [studentComparisonData, activeComparisonExams, results]);

  const EXAM_PALETTE = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1', '#f97316'];

  const studentChartData = useMemo(() => {
    const rawData = studentComparisonData.map(d => {
      const item: any = {
        id: d.student.id,
        name: d.student.name.length > 18 ? d.student.name.substring(0, 18) + '...' : d.student.name,
        fullName: d.student.name,
        class: d.student.class,
        regNo: d.student.regNo,
      };
      d.examResults.forEach(er => {
        item[er.examId] = er.isAbsent ? 0 : (er.marks !== null ? er.marks : null);
        item[`${er.examId}_isAbsent`] = er.isAbsent;
        item[`${er.examId}_grade`] = er.grade.label;
      });
      return item;
    });

    if (comparisonStudentLimit > 0 && rawData.length > comparisonStudentLimit) {
      return rawData.slice(0, comparisonStudentLimit);
    }
    return rawData;
  }, [studentComparisonData, comparisonStudentLimit]);

  const averageChartData = useMemo(() => {
    return activeComparisonExams.map(exam => {
      const classRes = results.filter(r => r.examId === exam.id && comparisonStudents.some(s => s.id === r.studentId) && !r.isAbsent);
      const marksArr = classRes.map(r => r.marks);
      const avg = marksArr.length > 0 ? Math.round(marksArr.reduce((a, b) => a + b, 0) / marksArr.length) : 0;
      const maxMarks = marksArr.length > 0 ? Math.max(...marksArr) : 0;
      const minMarks = marksArr.length > 0 ? Math.min(...marksArr) : 0;
      return {
        name: exam.name,
        'Purata Markah (%)': avg,
        'Markah Tertinggi (%)': maxMarks,
        'Markah Terendah (%)': minMarks,
        count: classRes.length
      };
    });
  }, [activeComparisonExams, results, comparisonStudents]);

  const exportComparisonToExcel = () => {
    const data = studentComparisonData.map((d, index) => {
      const row: any = {
        'Bil': index + 1,
        'Nama Murid': d.student.name,
        'No. ID': d.student.regNo,
        'Kelas': d.student.class,
        'Purata Markah (%)': d.avgScore !== null ? `${d.avgScore}%` : '-',
        'Kumpulan Prestasi': d.performanceGroup === 'CEMERLANG' ? 'Cemerlang (≥80%)' : d.performanceGroup === 'SEDERHANA' ? 'Sederhana (40-79%)' : 'Lemah (<40%)'
      };
      d.examResults.forEach(er => {
        row[`${er.examName} (Markah %)`] = er.isAbsent ? 'TH' : (er.marks !== null ? er.marks : '-');
        row[`${er.examName} (Gred)`] = er.grade.label;
      });
      row['Perbezaan Markah (%)'] = d.validScores.length >= 2 ? (d.delta > 0 ? `+${d.delta}%` : `${d.delta}%`) : '-';
      row['Status Trend'] = d.trend === 'UP' ? 'Peningkatan' : d.trend === 'DOWN' ? 'Penurunan' : d.trend === 'SAME' ? 'Kekal' : 'Tiada Data';
      return row;
    });
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Analisis Pentaksiran");
    XLSX.writeFile(workbook, `Analisis_Pentaksiran_${comparisonClass || 'Keseluruhan'}.xlsx`);
  };
  
  const [examForm, setExamForm] = useState<Omit<Exam, 'id'>>({
    name: '',
    date: new Date().toISOString().split('T')[0],
    type: ExamType.PBD,
    totalMarks: 50,
    scaledTotal: 100,
    items: [{ id: '1', label: 'Item 1', description: 'Tatabahasa', maxMarks: 50 }],
    targetYears: [],
    themeColor: '#0ea5e9'
  });

  const THEME_COLORS = [
    { name: 'Sky', value: '#0ea5e9' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Violet', value: '#8b5cf6' },
    { name: 'Slate', value: '#475569' }
  ];

  const [bulkMarksText, setBulkMarksText] = useState('');
  const [bulkMode, setBulkMode] = useState<'PASTE' | 'GRID'>('PASTE');
  const [copiedNames, setCopiedNames] = useState(false);
  const [bulkGridState, setBulkGridState] = useState<Record<string, { rawMarks: string; isAbsent: boolean; itemMarks: Record<string, string> }>>({});

  const classes = useMemo(() => Array.from(new Set(students.map(s => s.class))).sort(), [students]);
  const years = [1, 2, 3, 4, 5, 6];
  const selectedExam = exams.find(e => e.id === selectedExamId);

  const filteredStudents = useMemo(() => {
    return students
      .filter(s => {
        const matchClass = filterClass ? s.class === filterClass : true;
        const matchSubClass = filterSubClass ? s.class.toLowerCase().includes(filterSubClass.toLowerCase()) : true;
        const matchYear = filterYear ? s.year === parseInt(filterYear) : true;
        const matchSearch = searchStudentTerm ? s.name.toLowerCase().includes(searchStudentTerm.toLowerCase()) : true;
        
        // Tapisan Darjah: Jika exam ada targetYears, pastikan murid dalam darjah tersebut
        const matchTargetYear = selectedExam?.targetYears && selectedExam.targetYears.length > 0 
          ? selectedExam.targetYears.includes(s.year) 
          : true;

        if (!matchClass || !matchSubClass || !matchYear || !matchSearch || !matchTargetYear) return false;

        if (filterPerformanceGroup !== 'ALL' && selectedExamId) {
          const res = results.find(r => r.studentId === s.id && r.examId === selectedExamId);
          const marks = (res && !res.isAbsent) ? res.marks : null;
          let group: 'CEMERLANG' | 'SEDERHANA' | 'LEMAH' = 'LEMAH';
          if (marks !== null) {
            if (marks >= 80) group = 'CEMERLANG';
            else if (marks >= 40) group = 'SEDERHANA';
            else group = 'LEMAH';
          }
          if (group !== filterPerformanceGroup) return false;
        }

        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, filterClass, filterSubClass, filterPerformanceGroup, filterYear, searchStudentTerm, selectedExam, selectedExamId, results]);

  React.useEffect(() => {
    if (isBulkMarksModalOpen && selectedExamId) {
      const initialState: Record<string, { rawMarks: string; isAbsent: boolean; itemMarks: Record<string, string> }> = {};
      const textLines: string[] = [];
      filteredStudents.forEach(s => {
        const res = results.find(r => r.studentId === s.id && r.examId === selectedExamId);
        if (res) {
          if (res.isAbsent) {
            textLines.push('TH');
            initialState[s.id] = { rawMarks: '0', isAbsent: true, itemMarks: {} };
          } else {
            const rawVal = res.rawMarks !== undefined && res.rawMarks !== null ? String(res.rawMarks) : (res.marks !== null ? String(res.marks) : '');
            textLines.push(rawVal);
            const itemM: Record<string, string> = {};
            if (res.itemMarks) {
              Object.entries(res.itemMarks).forEach(([k, v]) => { itemM[k] = String(v); });
            }
            initialState[s.id] = {
              rawMarks: rawVal,
              isAbsent: false,
              itemMarks: itemM
            };
          }
        } else {
          textLines.push('');
          initialState[s.id] = { rawMarks: '', isAbsent: false, itemMarks: {} };
        }
      });
      setBulkGridState(initialState);
      if (!bulkMarksText) {
        setBulkMarksText(textLines.join('\n'));
      }
    }
  }, [isBulkMarksModalOpen, selectedExamId]);

  const handleCopyStudentNames = () => {
    const names = filteredStudents.map(s => s.name).join('\n');
    navigator.clipboard.writeText(names);
    setCopiedNames(true);
    setTimeout(() => setCopiedNames(false), 2500);
  };

  const stats = useMemo(() => {
    if (!selectedExamId) return null;
    const currentResults = filteredStudents.map(s => results.find(r => r.studentId === s.id && r.examId === selectedExamId));
    const present = currentResults.filter(r => r && !r.isAbsent);
    const absent = currentResults.filter(r => r && r.isAbsent);
    const avg = present.length > 0 
      ? present.reduce((acc, curr) => acc + (curr?.marks || 0), 0) / present.length 
      : 0;
    
    // Lulus adalah markah > 50% (atau mengikut gred C ke atas)
    // Untuk kesederhanaan, kita guna 50 sebagai penanda lulus
    const passed = present.filter(r => (r?.marks || 0) >= 50).length;
    const failed = present.length - passed;
    
    return {
      total: filteredStudents.length,
      present: present.length,
      absent: absent.length,
      average: avg.toFixed(1),
      passed,
      failed
    };
  }, [selectedExamId, results, filteredStudents]);

  const classOptionsForFilter = useMemo(() => {
    if (!filterYear) return classes;
    return classes.filter(c => c.startsWith(filterYear));
  }, [classes, filterYear]);

  const handleItemMarkChange = (studentId: string, itemId: string, mark: number) => {
    if (!selectedExamId || !selectedExam) return;
    const currentResult = results.find(r => r.studentId === studentId && r.examId === selectedExamId);
    const newItemMarks = { ...(currentResult?.itemMarks || {}), [itemId]: mark };
    const rawTotal = Object.values(newItemMarks).reduce((a, b) => (a as number) + (b as number), 0) as number;
    const scaledMark = Math.round((rawTotal / (selectedExam.totalMarks || 1)) * (selectedExam.scaledTotal || 100));

    onUpdateResult({
      studentId,
      examId: selectedExamId,
      marks: scaledMark,
      rawMarks: rawTotal,
      isAbsent: false,
      itemMarks: newItemMarks,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.name
    });
  };

  const toggleAbsent = (studentId: string) => {
    if (!selectedExamId) return;
    const current = results.find(r => r.studentId === studentId && r.examId === selectedExamId);
    onUpdateResult({
      studentId,
      examId: selectedExamId,
      marks: 0,
      rawMarks: 0,
      isAbsent: !current?.isAbsent,
      itemMarks: {},
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.name
    });
  };

  const handleBulkMarksSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId || !selectedExam) return;
    const lines = bulkMarksText.split('\n').map(l => l.trim());
    lines.forEach((markStr, index) => {
      if (index < filteredStudents.length) {
        const student = filteredStudents[index];
        if (markStr === '') return;
        const isAbsent = markStr.toUpperCase() === 'TH';
        const rawMark = isAbsent ? 0 : (parseInt(markStr) || 0);
        const scaledMark = isAbsent ? 0 : Math.round((rawMark / (selectedExam.totalMarks || 1)) * (selectedExam.scaledTotal || 100));
        onUpdateResult({
          studentId: student.id,
          examId: selectedExamId,
          marks: scaledMark,
          rawMarks: rawMark,
          isAbsent: isAbsent,
          itemMarks: {}, 
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.name
        });
      }
    });
    setBulkMarksText('');
    setIsBulkMarksModalOpen(false);
  };

  const handleBulkGridSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId || !selectedExam) return;
    filteredStudents.forEach(student => {
      const entry = bulkGridState[student.id];
      if (!entry) return;
      const isAbsent = entry.isAbsent;
      const rawTotal = isAbsent ? 0 : (parseInt(entry.rawMarks || '0') || 0);
      const scaledMark = isAbsent ? 0 : Math.round((rawTotal / (selectedExam.totalMarks || 1)) * (selectedExam.scaledTotal || 100));

      onUpdateResult({
        studentId: student.id,
        examId: selectedExamId,
        marks: scaledMark,
        rawMarks: rawTotal,
        isAbsent,
        itemMarks: isAbsent ? {} : (entry.itemMarks ? Object.fromEntries(Object.entries(entry.itemMarks).map(([k, v]) => [k, parseInt(v) || 0])) : {}),
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser.name
      });
    });
    setIsBulkMarksModalOpen(false);
  };

  const exportToExcel = () => {
    if (!selectedExam) return;
    const data = filteredStudents.map((s, index) => {
      const res = results.find(r => r.studentId === s.id && r.examId === selectedExamId);
      const row: any = { 'Bil': index + 1, 'Nama Murid': s.name, 'No. ID': s.regNo, 'Kelas': s.class, 'Kehadiran': res?.isAbsent ? 'TH' : 'Hadir' };
      selectedExam.items?.forEach(item => { row[item.label] = res?.isAbsent ? '-' : (res?.itemMarks?.[item.id] || 0); });
      row[`Mentah / ${selectedExam.totalMarks}`] = res?.isAbsent ? 'TH' : (res?.rawMarks || 0);
      row[`Peratus / ${selectedExam.scaledTotal}%`] = res?.isAbsent ? 'TH' : (res?.marks || 0);
      return row;
    });
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Markah Ujian");
    XLSX.writeFile(workbook, `Laporan_${selectedExam.name}.xlsx`);
  };

  const handleCreateExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examForm.name) return;
    const calculatedTotal = examForm.items?.reduce((sum, item) => sum + item.maxMarks, 0) || examForm.totalMarks;
    if (editingExamId) {
      onUpdateExam({ ...examForm, id: editingExamId, totalMarks: calculatedTotal } as Exam);
    } else {
      onAddExam({ ...examForm, totalMarks: calculatedTotal, themeColor: examForm.themeColor || '#0ea5e9' });
    }
    setIsExamModalOpen(false);
    setEditingExamId(null);
  };

  const openEditExam = (exam: Exam) => {
    setEditingExamId(exam.id);
    setExamForm({ 
      name: exam.name, 
      date: exam.date, 
      type: exam.type, 
      totalMarks: exam.totalMarks, 
      scaledTotal: exam.scaledTotal || 100, 
      items: exam.items || [],
      targetYears: exam.targetYears || [],
      themeColor: exam.themeColor || '#0ea5e9',
      gradeConfigs: exam.gradeConfigs ? JSON.parse(JSON.stringify(exam.gradeConfigs)) : undefined
    });
    setIsExamModalOpen(true);
  };

  const toggleTargetYear = (year: number) => {
    const current = examForm.targetYears || [];
    if (current.includes(year)) {
      setExamForm({ ...examForm, targetYears: current.filter(y => y !== year) });
    } else {
      setExamForm({ ...examForm, targetYears: [...current, year] });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 no-print ${isRTL ? 'md:flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : ''}>
          <h2 className={`text-2xl font-bold text-slate-900 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}><BookOpen className="text-sky-600" /> {t.assessment_management}</h2>
          <p className="text-slate-500 text-sm">{t.assessment_desc}</p>
        </div>
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button 
            onClick={() => setIsGradeModalOpen(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
          >
            <Edit3 size={14} /> {t.manage_grades || 'Urus Gred'}
          </button>
          {!selectedExamId && (
            <button onClick={() => { 
              setEditingExamId(null); 
              setExamForm({ name: '', date: new Date().toISOString().split('T')[0], type: ExamType.PBD, totalMarks: 50, scaledTotal: 100, items: [{ id: '1', label: 'Item 1', description: 'Tatabahasa', maxMarks: 50 }], targetYears: [], themeColor: '#0ea5e9', gradeConfigs: undefined });
              setIsExamModalOpen(true); 
            }} className="bg-sky-600 text-white px-5 py-2.5 rounded-xl shadow-lg font-bold flex items-center gap-2 hover:bg-sky-700">
              <Plus size={20} /> {t.create_exam}
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tab Bar for Assessment */}
      <div className="flex border-b border-slate-200 no-print gap-2">
        <button
          onClick={() => setMainView('LIST')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider rounded-t-2xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            mainView === 'LIST'
              ? 'border-sky-600 bg-white text-sky-600 shadow-sm'
              : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
          }`}
        >
          <BookOpen size={16} />
          {lang === 'ms' ? 'Senarai & Kemasukan Ujian' : lang === 'ar' ? 'قائمة وادخال التقييمات' : 'Exams List & Entry'}
        </button>

        <button
          onClick={() => setMainView('COMPARISON')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider rounded-t-2xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            mainView === 'COMPARISON'
              ? 'border-emerald-600 bg-white text-emerald-600 shadow-sm'
              : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
          }`}
        >
          <TrendingUp size={16} />
          {lang === 'ms' ? 'Analisis Pentaksiran (Perbandingan)' : lang === 'ar' ? 'تحليل التقييم والمقارنة' : 'Assessment Analysis (Comparison)'}
        </button>
      </div>

      {mainView === 'LIST' && (
        <div className="space-y-6">
          {!selectedExamId && (
            <div className="space-y-3 no-print">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200/80">
                <span className="flex items-center gap-2 text-slate-700">
                  <Calendar size={15} className="text-sky-600" />
                  Disusun Mengikut Tarikh Pentaksiran (Tarikh Terawal / Lama di Atas)
                </span>
                <span className="text-[10px] uppercase bg-white border px-2.5 py-1 rounded-lg text-slate-600 font-black shadow-xs">
                  {sortedExams.length} Pentaksiran
                </span>
              </div>

              <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${isRTL ? 'direction-rtl' : ''}`}>
                {sortedExams.map(exam => (
                  <div key={exam.id} className="bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group" style={{ borderTop: `4px solid ${exam.themeColor || '#0ea5e9'}` }}>
                    <div className={`flex justify-between items-start mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex gap-1.5 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase">{exam.type}</span>
                        {exam.date && (
                          <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-black flex items-center gap-1 border border-slate-200" title="Tarikh Ujian">
                            <Calendar size={11} className="text-slate-500" /> {exam.date}
                          </span>
                        )}
                        {exam.targetYears && exam.targetYears.length > 0 && (
                          <span className="px-2 py-1 bg-sky-50 text-sky-600 rounded-lg text-[10px] font-black uppercase">{t.year} {exam.targetYears.join(',')}</span>
                        )}
                        {exam.gradeConfigs && exam.gradeConfigs.length > 0 ? (
                          <span className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-black uppercase flex items-center gap-1" title="Ujian ini mempunyai julat gred khusus">
                            <Sliders size={10} /> Gred Khusus ({exam.gradeConfigs.length})
                          </span>
                        ) : null}
                      </div>
                      <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <button onClick={() => openEditExam(exam)} className="text-slate-300 hover:text-sky-600"><Edit3 size={16} /></button>
                        <button onClick={() => { if(confirm(t.delete + '?')) onDeleteExam(exam.id); }} className="text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                      </div>
                    </div>
                    <h3 className={`font-bold text-slate-800 uppercase text-sm mb-1 ${isRTL ? 'text-right' : ''}`}>{exam.name}</h3>
                    <p className={`text-[10px] text-slate-400 font-bold mb-4 ${isRTL ? 'text-right' : ''}`}>SKALA: {exam.totalMarks} {t.marks} → {exam.scaledTotal}% {t.percentage}</p>
                    <button onClick={() => setSelectedExamId(exam.id)} className="w-full py-2 bg-slate-50 text-sky-600 rounded-xl text-xs font-bold hover:bg-sky-50 border cursor-pointer">Buka Jadual</button>
                  </div>
                ))}
              </div>
            </div>
          )}

      {selectedExamId && selectedExam && (
        <div className="space-y-4">
          <div className={`bg-white p-5 rounded-2xl border shadow-sm flex flex-wrap items-center justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`} style={{ borderLeft: isRTL ? 'none' : `6px solid ${selectedExam.themeColor || '#0ea5e9'}`, borderRight: isRTL ? `6px solid ${selectedExam.themeColor || '#0ea5e9'}` : 'none' }}>
            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="p-2 rounded-xl no-print" style={{ backgroundColor: `${selectedExam.themeColor || '#0ea5e9'}15` }}>
                <BookOpen style={{ color: selectedExam.themeColor || '#0ea5e9' }} size={24} />
              </div>
              <div className={isRTL ? 'text-right' : ''}>
                <h3 className="font-bold text-slate-900 uppercase">{selectedExam.name}</h3>
                <p className="text-xs text-slate-400 font-bold">
                  {t.marks}: {selectedExam.totalMarks} = {selectedExam.scaledTotal}% 
                  {selectedExam.targetYears && selectedExam.targetYears.length > 0 && ` • ${t.year.toUpperCase()} ${selectedExam.targetYears.join(', ')}`}
                </p>
              </div>
            </div>
            <div className={`flex flex-wrap items-center gap-2 no-print ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-center gap-1.5 bg-slate-50 border rounded-xl px-3 py-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Search size={16} className="text-slate-400" />
                <input type="text" placeholder={t.search} className={`bg-transparent border-none outline-none text-xs font-bold w-40 ${isRTL ? 'text-right' : ''}`} value={searchStudentTerm} onChange={e => setSearchStudentTerm(e.target.value)} />
              </div>

              {/* Tapisan Tambahan: Darjah, Kelas, Sub-Kelas & Kumpulan Prestasi */}
              <div className={`flex flex-wrap items-center gap-2 border rounded-xl px-3 py-2 bg-slate-50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Filter size={16} className="text-slate-400" />
                <select 
                  className={`bg-transparent border-none text-[11px] font-bold outline-none cursor-pointer ${isRTL ? 'text-right' : ''}`}
                  value={filterYear}
                  onChange={e => { setFilterYear(e.target.value); setFilterClass(''); }}
                >
                  <option value="">{t.filter_year}</option>
                  {years.map(y => <option key={y} value={y}>{t.year} {y}</option>)}
                </select>
                <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                <select 
                  className={`bg-transparent border-none text-[11px] font-bold outline-none cursor-pointer ${isRTL ? 'text-right' : ''}`}
                  value={filterClass}
                  onChange={e => setFilterClass(e.target.value)}
                >
                  <option value="">{t.filter_class}</option>
                  {classOptionsForFilter.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                <select 
                  className={`bg-transparent border-none text-[11px] font-bold outline-none cursor-pointer ${isRTL ? 'text-right' : ''}`}
                  value={filterSubClass}
                  onChange={e => setFilterSubClass(e.target.value)}
                >
                  <option value="">Semua Sub-Kelas</option>
                  {subClasses.map(sc => <option key={sc} value={sc}>{sc}</option>)}
                </select>
                <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                <select 
                  className={`bg-transparent border-none text-[11px] font-bold outline-none cursor-pointer ${isRTL ? 'text-right' : ''}`}
                  value={filterPerformanceGroup}
                  onChange={e => setFilterPerformanceGroup(e.target.value as any)}
                >
                  <option value="ALL">Semua Kumpulan Prestasi</option>
                  <option value="CEMERLANG">🟢 Cemerlang (≥80%)</option>
                  <option value="SEDERHANA">🟡 Sederhana (40-79%)</option>
                  <option value="LEMAH">🔴 Lemah (&lt;40%)</option>
                </select>
              </div>

              <button onClick={() => openEditExam(selectedExam)} title="Tetapan Julat Gred Ujian Ini" className="bg-amber-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-amber-700 transition-all shadow-md flex items-center gap-1.5 cursor-pointer">
                <Sliders size={16} />
                <span className="hidden sm:inline">Gred Ujian</span>
              </button>
              <button onClick={() => setIsBulkMarksModalOpen(true)} title={t.bulk_register} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md"><ListPlus size={18} /></button>
              <button onClick={exportToExcel} title="Excel" className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-md"><Download size={18} /></button>
              <button onClick={() => window.print()} title={t.print} className="bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-900 transition-all shadow-md"><Printer size={18} /></button>
              <button onClick={() => { setSelectedExamId(null); setActiveSubTab('marks'); setSelectedStudentId(null); }} className="p-2 text-slate-400 hover:text-slate-900 transition-all"><X size={20} /></button>
            </div>
          </div>

          {/* Sub-tab Navigation */}
          <div className="flex gap-2 no-print border-b pb-1">
            <button
              onClick={() => setActiveSubTab('marks')}
              className={`pb-3 px-4 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${
                activeSubTab === 'marks'
                  ? 'border-sky-600 text-sky-600 font-extrabold'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {lang === 'ms' ? 'Jadual Markah' : lang === 'ar' ? 'جدول الدرجات' : 'Marks Schedule'}
            </button>
            <button
              onClick={() => {
                setActiveSubTab('analysis');
                if (!selectedStudentId && filteredStudents.length > 0) {
                  setSelectedStudentId(filteredStudents[0].id);
                }
              }}
              className={`pb-3 px-4 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${
                activeSubTab === 'analysis'
                  ? 'border-sky-600 text-sky-600 font-extrabold'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {lang === 'ms' ? 'Analisis Prestasi Murid' : lang === 'ar' ? 'تحليل أداء الطالب' : 'Student Performance Analysis'}
            </button>
          </div>

          {activeSubTab === 'marks' && (
            <>
              {stats && (
                <div className={`grid grid-cols-2 md:grid-cols-6 gap-4 ${isRTL ? 'direction-rtl' : ''}`}>
                  <div className={`bg-white p-4 rounded-2xl border shadow-sm ${isRTL ? 'text-right' : ''}`}>
                    <p className="text-[10px] font-black text-slate-400 uppercase">{t.total_students}</p>
                    <p className="text-xl font-bold text-slate-800">{stats.total}</p>
                  </div>
                  <div className={`bg-white p-4 rounded-2xl border shadow-sm ${isRTL ? 'text-right' : ''}`}>
                    <p className="text-[10px] font-black text-emerald-400 uppercase">Hadir</p>
                    <p className="text-xl font-bold text-emerald-600">{stats.present}</p>
                  </div>
                  <div className={`bg-white p-4 rounded-2xl border shadow-sm ${isRTL ? 'text-right' : ''}`}>
                    <p className="text-[10px] font-black text-red-400 uppercase">{t.absent}</p>
                    <p className="text-xl font-bold text-red-600">{stats.absent}</p>
                  </div>
                  <div className={`bg-white p-4 rounded-2xl border shadow-sm ${isRTL ? 'text-right' : ''}`}>
                    <p className="text-[10px] font-black text-sky-400 uppercase">{t.average_marks}</p>
                    <p className="text-xl font-bold text-sky-600">{stats.average}%</p>
                  </div>
                  <div className={`bg-white p-4 rounded-2xl border shadow-sm ${isRTL ? 'text-right' : ''}`}>
                    <p className="text-[10px] font-black text-emerald-500 uppercase flex items-center gap-1"><CheckCircle size={10}/> {t.pass}</p>
                    <p className="text-xl font-bold text-emerald-600">{stats.passed}</p>
                  </div>
                  <div className={`bg-white p-4 rounded-2xl border shadow-sm ${isRTL ? 'text-right' : ''}`}>
                    <p className="text-[10px] font-black text-rose-500 uppercase flex items-center gap-1"><XCircle size={10}/> {t.fail}</p>
                    <p className="text-xl font-bold text-rose-600">{stats.failed}</p>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase border-b">
                      <tr className={isRTL ? 'flex-row-reverse' : ''}>
                        <th className={`px-6 py-4 ${isRTL ? 'text-right' : ''}`}>{t.student_profile}</th>
                        <th className="px-4 py-4 text-center">{t.absent}</th>
                        {selectedExam.items?.map(item => (
                          <th key={item.id} className="px-4 py-4 text-center border-l min-w-[80px]">
                            {item.label} <span className="text-[8px] opacity-60">({item.maxMarks}m)</span>
                          </th>
                        ))}
                        <th className="px-6 py-4 text-center border-l bg-sky-50">{t.marks} ({selectedExam.totalMarks})</th>
                        <th className="px-6 py-4 text-center border-l bg-emerald-50">{t.percentage} ({selectedExam.scaledTotal}%)</th>
                        <th className="px-6 py-4 text-center border-l bg-indigo-50 no-print">{lang === 'ms' ? 'Analisis' : 'Analysis'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredStudents.map(student => {
                        const res = results.find(r => r.studentId === student.id && r.examId === selectedExamId);
                        return (
                          <tr key={student.id} className={`${res?.isAbsent ? 'bg-red-50/50' : ''} ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <td className={`px-6 py-4 ${isRTL ? 'text-right' : ''}`}>
                              <p className="font-bold text-slate-700 uppercase text-[11px]">{student.name}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase">{t.year} {student.year} • {student.class}</p>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <button onClick={() => toggleAbsent(student.id)} className={`w-10 py-1 rounded-lg text-[10px] font-black border ${res?.isAbsent ? 'bg-red-600 text-white border-red-600' : 'text-slate-300 border-slate-200'}`}>{t.absent}</button>
                            </td>
                            {selectedExam.items?.map(q => (
                              <td key={q.id} className="px-4 py-4 text-center border-l">
                                <input type="number" disabled={res?.isAbsent} max={q.maxMarks} className="w-14 border rounded-lg p-1.5 text-center text-xs font-bold bg-slate-50 focus:bg-white transition-colors" value={res?.itemMarks?.[q.id] || 0} onChange={(e) => handleItemMarkChange(student.id, q.id, parseInt(e.target.value) || 0)} />
                              </td>
                            ))}
                            <td className="px-6 py-4 text-center font-bold border-l">{res?.isAbsent ? t.absent : (res?.rawMarks || 0)}</td>
                            <td className="px-6 py-4 text-center font-black border-l">
                              {res?.isAbsent ? (
                                <span className="text-red-500 font-bold">{t.absent}</span>
                              ) : (
                                <div className="flex flex-col items-center justify-center gap-0.5">
                                  <span className="text-sm font-extrabold" style={{ color: getGradeHelper(res?.marks || 0, res?.isAbsent, selectedExam).color || '#059669' }}>
                                    {res?.marks || 0}%
                                  </span>
                                  <span 
                                    className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase"
                                    style={{ 
                                      backgroundColor: `${getGradeHelper(res?.marks || 0, res?.isAbsent, selectedExam).color}18`, 
                                      color: getGradeHelper(res?.marks || 0, res?.isAbsent, selectedExam).color 
                                    }}
                                  >
                                    Gred {getGradeHelper(res?.marks || 0, res?.isAbsent, selectedExam).label}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4 text-center border-l no-print">
                              <button
                                onClick={() => {
                                  setSelectedStudentId(student.id);
                                  setActiveSubTab('analysis');
                                }}
                                className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 mx-auto shadow-sm"
                              >
                                <TrendingUp size={12} /> {lang === 'ms' ? 'Analitika' : 'Analyze'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredStudents.length === 0 && (
                    <div className="py-20 text-center text-slate-400 italic text-sm">
                      {t.fail}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeSubTab === 'analysis' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Student Selector Card */}
              <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    {lang === 'ms' ? 'PILIH MURID UNTUK ANALISIS' : lang === 'ar' ? 'اختر الطالب للتحليل' : 'SELECT STUDENT FOR ANALYSIS'}
                  </label>
                  <select
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-sky-500 min-w-[280px]"
                    value={selectedStudentId || ''}
                    onChange={e => setSelectedStudentId(e.target.value || null)}
                  >
                    <option value="">-- {lang === 'ms' ? 'Pilih Murid' : lang === 'ar' ? 'اختر الطالب' : 'Select Student'} --</option>
                    {filteredStudents.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.class})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveSubTab('marks')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <ArrowLeft size={16} /> {lang === 'ms' ? 'Kembali ke Jadual' : lang === 'ar' ? 'الرجوع إلى الجدول' : 'Back to Schedule'}
                  </button>
                </div>
              </div>

              {selectedStudentId && (() => {
                const student = students.find(s => s.id === selectedStudentId);
                if (!student) return null;

                const result = results.find(r => r.studentId === student.id && r.examId === selectedExamId);
                const isAbsent = result?.isAbsent || false;

                // Class rank & Class stats
                const examResultsForRank = results.filter(r => r.examId === selectedExamId && !r.isAbsent);
                const classStudentsList = students.filter(s => s.class === student.class);
                const classStudentIds = new Set(classStudentsList.map(s => s.id));
                const classResults = examResultsForRank.filter(r => classStudentIds.has(r.studentId));
                const sortedClassResults = [...classResults].sort((a, b) => b.marks - a.marks);
                const rankInClass = result && !isAbsent ? sortedClassResults.findIndex(r => r.studentId === student.id) + 1 : null;
                const classAvgMarks = classResults.length > 0 
                  ? Math.round(classResults.reduce((acc, r) => acc + r.marks, 0) / classResults.length)
                  : 0;

                // Grade display
                const studentMarkPercent = result && !isAbsent ? result.marks : 0;
                const studentGrade = result && !isAbsent 
                  ? getGradeHelper(studentMarkPercent, isAbsent, selectedExam)
                  : null;

                // Item performance breakdown
                const itemsPerformance = selectedExam.items?.map(item => {
                  const maxMarks = item.maxMarks;
                  const obtainedMarks = result?.itemMarks?.[item.id] || 0;
                  const pct = maxMarks > 0 ? Math.round((obtainedMarks / maxMarks) * 100) : 0;
                  return {
                    label: item.label,
                    desc: item.description,
                    max: maxMarks,
                    obtained: obtainedMarks,
                    pct
                  };
                }) || [];

                // Local smart feedback
                const localFeedback = getLocalPedagogicalRecommendation(student.name, itemsPerformance);

                const handleGetAiFeedback = async () => {
                  if (!result || isAbsent) return;
                  setAiLoading(true);
                  try {
                    const feedback = await aiService.analyzeStudentPerformance(student, selectedExam, result);
                    const feedbackStr = feedback || 'Maaf, gagal menjana ulasan.';
                    setAiAnalysis(prev => ({ ...prev, [student.id]: feedbackStr }));
                  } catch (err) {
                    console.error("Failed to generate AI feedback", err);
                  } finally {
                    setAiLoading(false);
                  }
                };

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {/* Left Column: Student scorecard and rank details */}
                    <div className="space-y-6 lg:col-span-1">
                      {/* Score Card */}
                      <div className="bg-white p-8 rounded-3xl border shadow-sm relative overflow-hidden flex flex-col items-center text-center">
                        <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-full bg-slate-50 -z-0" />
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 mb-4 shadow-sm">
                          <UserIcon size={32} />
                        </div>
                        <h4 className="font-black text-slate-800 text-base uppercase leading-tight tracking-tight">{student.name}</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                          {student.class} • No. Daftar: {student.regNo || '-'}
                        </p>

                        <div className="w-full h-[1px] bg-slate-100 my-6" />

                        {isAbsent ? (
                          <div className="py-8">
                            <span className="px-4 py-2 bg-red-50 text-red-600 rounded-2xl font-black text-sm uppercase">TIDAK HADIR</span>
                          </div>
                        ) : (
                          <div className="space-y-4 w-full">
                            {/* Score circle */}
                            <div className="relative w-32 h-32 mx-auto flex items-center justify-center rounded-full bg-slate-50 border-4 border-slate-100 shadow-inner">
                              <div className="text-center">
                                <span className="text-4xl font-black text-slate-800 tracking-tighter">{studentMarkPercent}%</span>
                                <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Markah Pokok</p>
                              </div>
                              {studentGrade && (
                                <div 
                                  className="absolute -bottom-2 -right-2 w-12 h-12 rounded-xl text-white font-black text-lg flex items-center justify-center shadow-lg transform rotate-6 hover:rotate-0 transition-transform"
                                  style={{ backgroundColor: studentGrade.color || '#10b981' }}
                                >
                                  {studentGrade.label}
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-6">
                              <div className="bg-slate-50 p-4 rounded-2xl border text-center">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Skor Mentah</p>
                                <p className="text-lg font-black text-slate-800 mt-1">
                                  {result?.rawMarks || 0} <span className="text-xs text-slate-400 font-medium">/ {selectedExam.totalMarks}</span>
                                </p>
                              </div>
                              <div className="bg-slate-50 p-4 rounded-2xl border text-center">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Gred Penilaian</p>
                                <p className="text-lg font-black mt-1" style={{ color: studentGrade?.color || '#334155' }}>
                                  {studentGrade ? studentGrade.label : 'Tiada Gred'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Rank & Placement Card */}
                      <div className="bg-white p-6 rounded-3xl border shadow-sm">
                        <h4 className="font-black text-slate-800 text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Trophy className="text-amber-500" size={16} /> Kedudukan & Prestasi Kelas
                        </h4>
                        
                        <div className="space-y-4">
                          {rankInClass !== null ? (
                            <div className="flex items-center justify-between p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                              <div>
                                <p className="text-[9px] font-black text-amber-800 uppercase tracking-wider">Kedudukan dalam Kelas</p>
                                <p className="text-xl font-black text-amber-900 mt-1">No. {rankInClass} <span className="text-xs text-amber-700/60 font-medium">daripada {classResults.length} murid</span></p>
                              </div>
                              <div className="p-3 bg-amber-100 text-amber-800 rounded-xl font-black text-sm">
                                #{rankInClass}
                              </div>
                            </div>
                          ) : (
                            <div className="py-2 text-slate-400 italic text-xs text-center">Tiada rekod kedudukan (TH/Tiada markah).</div>
                          )}

                          {!isAbsent && result && (
                            <div className="space-y-3">
                              <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                                <span>Markah Murid ({studentMarkPercent}%)</span>
                                <span>Purata Kelas ({classAvgMarks}%)</span>
                              </div>
                              
                              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative">
                                <div 
                                  className="h-full bg-slate-300 absolute" 
                                  style={{ width: `${classAvgMarks}%` }} 
                                />
                                <div 
                                  className="h-full bg-sky-500 absolute" 
                                  style={{ width: `${studentMarkPercent}%` }} 
                                />
                              </div>

                              <div className="flex justify-between items-center mt-2">
                                <span className="text-[9px] font-black text-slate-400 uppercase">Perbandingan Purata</span>
                                {studentMarkPercent >= classAvgMarks ? (
                                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-black uppercase flex items-center gap-1">
                                    <TrendingUp size={10} /> Di Atas Purata
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[9px] font-black uppercase">
                                    Di Bawah Purata
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Columns: Detailed item analysis and recommendations */}
                    <div className="space-y-6 lg:col-span-2">
                      {/* Comparison section */}
                      {(() => {
                        const studentOtherExams = exams.filter(e => {
                          if (e.id === selectedExamId) return false;
                          const studentRes = results.find(r => r.studentId === student.id && r.examId === e.id);
                          return !!studentRes;
                        });

                        const defaultCompareExam = studentOtherExams[0];
                        const activeCompareExamId = compareExamId && studentOtherExams.some(e => e.id === compareExamId)
                          ? compareExamId
                          : (defaultCompareExam?.id || null);

                        const compareResult = activeCompareExamId
                          ? results.find(r => r.studentId === student.id && r.examId === activeCompareExamId)
                          : null;

                        const compareExamObj = activeCompareExamId
                          ? exams.find(e => e.id === activeCompareExamId)
                          : null;

                        return (
                          <div className="bg-white p-8 rounded-3xl border shadow-sm space-y-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
                              <div>
                                <h4 className="font-black text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2">
                                  <TrendingUp className="text-emerald-600" size={16} />
                                  {lang === 'ms' ? 'Analisis Perbandingan Pentaksiran' : lang === 'ar' ? 'تحليل مقارنة التقييم' : 'Assessment Comparison Analysis'}
                                </h4>
                                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                                  {lang === 'ms' ? 'Perbandingan prestasi antara pentaksiran yang dipilih' : lang === 'ar' ? 'مقارنة الأداء بين التقييمات المختارة' : 'Performance comparison between selected assessments'}
                                </p>
                              </div>
                              {studentOtherExams.length > 0 && (
                                <div className="space-y-1 min-w-[200px]">
                                  <select
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-sky-500"
                                    value={activeCompareExamId || ''}
                                    onChange={e => setCompareExamId(e.target.value || null)}
                                  >
                                    {studentOtherExams.map(e => (
                                      <option key={e.id} value={e.id}>
                                        {e.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>

                            {studentOtherExams.length > 0 && compareResult && compareExamObj ? (() => {
                              const currentMark = isAbsent ? 0 : studentMarkPercent;
                              const prevMark = compareResult.isAbsent ? 0 : compareResult.marks;
                              const diff = currentMark - prevMark;

                              const chartData = [
                                {
                                  name: compareExamObj.name,
                                  markah: prevMark,
                                  color: compareExamObj.themeColor || '#6366f1'
                                },
                                {
                                  name: selectedExam.name,
                                  markah: currentMark,
                                  color: selectedExam.themeColor || '#0ea5e9'
                                }
                              ];

                              return (
                                <div className="space-y-6">
                                  {/* Stats comparison blocks */}
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">
                                        {compareExamObj.name}
                                      </p>
                                      <div className="flex items-baseline gap-1.5 mt-1">
                                        <span className="text-xl font-black text-slate-700">
                                          {compareResult.isAbsent ? (lang === 'ms' ? 'TH' : 'Absent') : `${prevMark}%`}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">
                                        {selectedExam.name} ({lang === 'ms' ? 'Terkini' : 'Current'})
                                      </p>
                                      <div className="flex items-baseline gap-1.5 mt-1">
                                        <span className="text-xl font-black text-slate-700">
                                          {isAbsent ? (lang === 'ms' ? 'TH' : 'Absent') : `${currentMark}%`}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-center">
                                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">
                                        {lang === 'ms' ? 'Perubahan' : lang === 'ar' ? 'التغيير' : 'Change'}
                                      </p>
                                      <div className="mt-1">
                                        {diff > 0 ? (
                                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-xl text-[10px] font-black uppercase inline-flex items-center gap-1">
                                            ▲ +{diff.toFixed(1)}%
                                          </span>
                                        ) : diff < 0 ? (
                                          <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-xl text-[10px] font-black uppercase inline-flex items-center gap-1">
                                            ▼ {diff.toFixed(1)}%
                                          </span>
                                        ) : (
                                          <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-xl text-[10px] font-black uppercase inline-flex items-center gap-1">
                                            ▬ {lang === 'ms' ? 'TIADA' : 'NONE'}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Bar Chart compare */}
                                  <div className="h-64 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <BarChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} reversed={isRTL} />
                                        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} orientation={isRTL ? 'right' : 'left'} />
                                        <Tooltip 
                                          cursor={{ fill: '#f8fafc' }}
                                          contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', textAlign: isRTL ? 'right' : 'left' }}
                                          labelStyle={{ fontWeight: 'black', fontSize: '11px', textTransform: 'uppercase', color: '#1e293b' }}
                                          itemStyle={{ fontWeight: 'bold', fontSize: '11px', color: '#0284c7' }}
                                        />
                                        <Bar dataKey="markah" radius={[8, 8, 0, 0]} barSize={40}>
                                          {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                          ))}
                                        </Bar>
                                      </BarChart>
                                    </ResponsiveContainer>
                                  </div>

                                  {/* Summary Analysis Text */}
                                  <div className="p-4 bg-sky-50/50 border border-sky-100 rounded-2xl text-xs font-bold text-slate-700 leading-relaxed">
                                    <p>
                                      {lang === 'ms' ? (
                                        <>
                                          Berdasarkan perbandingan prestasi, markah murid didapati{' '}
                                          {diff > 0 ? (
                                            <span className="text-emerald-600 font-black">meningkat sebanyak {diff.toFixed(1)}%</span>
                                          ) : diff < 0 ? (
                                            <span className="text-rose-600 font-black">menurun sebanyak {Math.abs(diff).toFixed(1)}%</span>
                                          ) : (
                                            <span className="text-slate-600 font-black">kekal stabil tanpa perubahan</span>
                                          )}{' '}
                                          berbanding <strong>{compareExamObj.name}</strong>. Hal ini menunjukkan dinamik perkembangan penguasaan kemahiran Bahasa Arab murid yang berterusan.
                                        </>
                                      ) : lang === 'ar' ? (
                                        <>
                                          بناءً على مقارنة الأداء، تبين أن درجات الطالب قد{' '}
                                          {diff > 0 ? (
                                            <span className="text-emerald-600 font-black">ارتفعت بمقدار {diff.toFixed(1)}%</span>
                                          ) : diff < 0 ? (
                                            <span className="text-rose-600 font-black">انخفضت بمقدار {Math.abs(diff).toFixed(1)}%</span>
                                          ) : (
                                            <span className="text-slate-600 font-black">ظلت مستقرة دون تغيير</span>
                                          )}{' '}
                                          مقارنة بـ <strong>{compareExamObj.name}</strong>. يوضح هذا وتيرة تقدم الطالب في مهارات اللغة العربية.
                                        </>
                                      ) : (
                                        <>
                                          Based on performance comparison, the student's mark has{' '}
                                          {diff > 0 ? (
                                            <span className="text-emerald-600 font-black">increased by {diff.toFixed(1)}%</span>
                                          ) : diff < 0 ? (
                                            <span className="text-rose-600 font-black">decreased by {Math.abs(diff).toFixed(1)}%</span>
                                          ) : (
                                            <span className="text-slate-600 font-black">remained stable with no change</span>
                                          )}{' '}
                                          compared to <strong>{compareExamObj.name}</strong>. This highlights the developmental dynamics of the student's Arabic language proficiency.
                                        </>
                                      )}
                                    </p>
                                  </div>
                                </div>
                              );
                            })() : (
                              <div className="py-8 text-center text-slate-400 italic text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                {lang === 'ms' ? 'Daftar lebih daripada satu rekod pentaksiran bagi murid ini untuk melihat trend perbandingan prestasi.' : lang === 'ar' ? 'سجل أكثر من تقييم واحد لهذا الطالب لرؤية اتجاه مقارنة الأداء.' : 'Register more than one assessment record for this student to see the performance comparison trend.'}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Question/Item Breakdown */}
                      <div className="bg-white p-8 rounded-3xl border shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                          <div>
                            <h4 className="font-black text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2">
                              <TrendingUp className="text-sky-600" size={16} /> Analisis Penguasaan Setiap Soalan / Item
                            </h4>
                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Prestasi terperinci mengikut kemahiran diuji</p>
                          </div>
                        </div>

                        {itemsPerformance.length > 0 ? (
                          <div className="space-y-5">
                            {itemsPerformance.map(item => (
                              <div key={item.label} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-black text-slate-800 uppercase text-xs leading-tight">{item.label}</p>
                                    <p className="text-[10px] text-slate-400 italic font-medium mt-0.5">{item.desc || 'Kemahiran Umum'}</p>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-xs font-black text-slate-800">
                                      {item.obtained} <span className="text-[10px] text-slate-400 font-medium">/ {item.max}</span>
                                    </span>
                                    <span className={`ml-2 text-xs font-black ${item.pct >= 80 ? 'text-emerald-600' : item.pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                                      ({item.pct}%)
                                    </span>
                                  </div>
                                </div>
                                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${item.pct >= 80 ? 'bg-emerald-500' : item.pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} 
                                    style={{ width: `${item.pct}%` }} 
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-12 text-center text-slate-300 italic text-xs">
                            Struktur item/pecahan soalan tidak ditakrifkan untuk ujian ini.
                          </div>
                        )}
                      </div>

                      {/* Intelligent Feedback & Recommendations (Rule-based & AI-based) */}
                      <div className="bg-white p-8 rounded-3xl border shadow-sm space-y-6">
                        <div>
                          <h4 className="font-black text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2">
                            <BrainCircuit className="text-indigo-600" size={16} /> Maklum Balas Pedagogi & Intervensi
                          </h4>
                          <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Syor tindakan susulan dan bimbingan guru</p>
                        </div>

                        {/* Local Analysis Checklist */}
                        <div className="space-y-4">
                          <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3">
                            <div>
                              <span className="text-[9px] font-black text-indigo-700 uppercase tracking-wider bg-indigo-100 px-2.5 py-1 rounded-full">Kekuatan Murid</span>
                              <p className="text-xs font-bold text-slate-700 mt-2 leading-relaxed">{localFeedback.strengths}</p>
                            </div>
                            <div className="w-full h-[1px] bg-indigo-100/50 my-2" />
                            <div>
                              <span className="text-[9px] font-black text-indigo-700 uppercase tracking-wider bg-indigo-100 px-2.5 py-1 rounded-full">Kelemahan & Aspek Pembaikan</span>
                              <p className="text-xs font-bold text-slate-700 mt-2 leading-relaxed">{localFeedback.weaknesses}</p>
                            </div>
                            <div className="w-full h-[1px] bg-indigo-100/50 my-2" />
                            <div>
                              <span className="text-[9px] font-black text-indigo-700 uppercase tracking-wider bg-indigo-100 px-2.5 py-1 rounded-full">Cadangan Pelan Bimbingan</span>
                              <p className="text-xs font-bold text-slate-700 mt-2 whitespace-pre-line leading-relaxed">{localFeedback.recommendations}</p>
                            </div>
                          </div>

                          {/* AI Generation Box */}
                          <div className="pt-4 border-t border-slate-100">
                            <div className="flex items-center justify-between gap-4 mb-4">
                              <div>
                                <h5 className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
                                  <Sparkles className="text-sky-500" size={14} /> Analisis Pintar Generatif (Gemini)
                                </h5>
                                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Jana ulasan pedagogi Bahasa Arab dengan kuasa AI</p>
                              </div>
                              <button
                                onClick={handleGetAiFeedback}
                                disabled={aiLoading}
                                className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all shadow disabled:opacity-50"
                              >
                                {aiLoading ? (
                                  <>
                                    <Loader2 size={12} className="animate-spin" /> {lang === 'ms' ? 'Menjana...' : 'Generating...'}
                                  </>
                                ) : (
                                  <>
                                    <Sparkles size={12} /> {lang === 'ms' ? 'Jana Analisis AI' : 'Generate AI Analysis'}
                                  </>
                                )}
                              </button>
                            </div>

                            {aiAnalysis[student.id] ? (
                              <div className="p-6 bg-slate-900 text-slate-200 rounded-2xl border text-xs leading-relaxed whitespace-pre-wrap font-medium animate-in fade-in duration-300">
                                {aiAnalysis[student.id]}
                              </div>
                            ) : (
                              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center text-slate-400 italic text-xs">
                                Klik butang di atas untuk menjana analisis mendalam berasaskan AI bagi menyokong perancangan intervensi anda.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
        </div>
      )}

      {mainView === 'COMPARISON' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Header Panel & Utama */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-xs space-y-5 no-print">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-5 border-slate-100">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[11px] font-black uppercase tracking-wider mb-1">
                  <TrendingUp size={13} className="text-emerald-600" />
                  Modul Analisis & Impak
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2.5">
                  Analisis Pentaksiran & Perbandingan Prestasi Murid
                </h3>
                <p className="text-xs text-slate-500 font-medium max-w-3xl leading-relaxed">
                  Pantau perkembangan pencapaian Bahasa Arab secara komprehensif. Bandingkan peningkatan, penurunan, serta gred murid mengikut kumpulan prestasi dan sub-kelas merentas pelbagai ujian.
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={exportComparisonToExcel}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <Download size={15} /> Export Excel
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <Printer size={15} /> Cetak Laporan
                </button>
              </div>
            </div>

            {/* Grid Tapisan Murid & Sub-Kelas */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-wider">
                <Filter size={14} className="text-emerald-600" />
                <span>1. Tapisan Sasaran Murid & Sub-Kelas</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                    Pilih Tahun / Darjah
                  </label>
                  <select
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs cursor-pointer"
                    value={comparisonYear}
                    onChange={e => {
                      setComparisonYear(e.target.value);
                      setComparisonClass('');
                    }}
                  >
                    <option value="">Semua Tahun (1 - 6)</option>
                    {years.map(y => (
                      <option key={y} value={y}>Tahun {y}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                    Pilih Kelas Murid
                  </label>
                  <select
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs cursor-pointer"
                    value={comparisonClass}
                    onChange={e => setComparisonClass(e.target.value)}
                  >
                    <option value="">Semua Kelas ({classes.length} Kelas)</option>
                    {(comparisonYear ? classes.filter(c => c.startsWith(comparisonYear)) : classes).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                    Sub-Kelas / Kumpulan
                  </label>
                  <select
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs cursor-pointer"
                    value={comparisonSubClass}
                    onChange={e => setComparisonSubClass(e.target.value)}
                  >
                    <option value="">Semua Sub-Kelas</option>
                    {subClasses.map(sc => (
                      <option key={sc} value={sc}>{sc}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                    Cari Nama Murid
                  </label>
                  <div className="relative">
                    <Search size={15} className="absolute left-3.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari nama murid..."
                      className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                      value={comparisonSearchTerm}
                      onChange={e => setComparisonSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tapisan Kumpulan Prestasi Murid (Berdasarkan Purata Markah Automatik) */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Sliders size={14} className="text-emerald-600" />
                  <span>2. Penapis Kumpulan Murid (Purata Markah Automatik):</span>
                </label>

                <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setComparisonPerformanceGroup('ALL')}
                    className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                      comparisonPerformanceGroup === 'ALL'
                        ? 'bg-slate-900 text-white font-black shadow-xs'
                        : 'text-slate-600 hover:bg-white'
                    }`}
                  >
                    <span>Semua Kumpulan</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                      comparisonPerformanceGroup === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {performanceCounts.total}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setComparisonPerformanceGroup('CEMERLANG')}
                    className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                      comparisonPerformanceGroup === 'CEMERLANG'
                        ? 'bg-emerald-600 text-white font-black shadow-xs'
                        : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    <span>🟢 Cemerlang (≥80%)</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                      comparisonPerformanceGroup === 'CEMERLANG' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {performanceCounts.cemerlang}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setComparisonPerformanceGroup('SEDERHANA')}
                    className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                      comparisonPerformanceGroup === 'SEDERHANA'
                        ? 'bg-amber-600 text-white font-black shadow-xs'
                        : 'text-amber-700 hover:bg-amber-50'
                    }`}
                  >
                    <span>🟡 Sederhana (40-79%)</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                      comparisonPerformanceGroup === 'SEDERHANA' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {performanceCounts.sederhana}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setComparisonPerformanceGroup('LEMAH')}
                    className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                      comparisonPerformanceGroup === 'LEMAH'
                        ? 'bg-rose-600 text-white font-black shadow-xs'
                        : 'text-rose-700 hover:bg-rose-50'
                    }`}
                  >
                    <span>🔴 Lemah / Galus (&lt;40%)</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                      comparisonPerformanceGroup === 'LEMAH' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {performanceCounts.lemah}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Selector Pentaksiran yang Mahu Dianalisis */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <BookOpen size={14} className="text-emerald-600" />
                  <span>3. Pilih Pentaksiran Untuk Perbandingan ({activeComparisonExams.length} / {sortedExams.length} Dipilih)</span>
                </label>
                <div className="flex items-center gap-2 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setSelectedComparisonExamIds(null)}
                    className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg transition-all cursor-pointer font-black"
                  >
                    Pilih Semua ({sortedExams.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedComparisonExamIds([])}
                    className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg transition-all cursor-pointer font-black"
                  >
                    Nyahpilih Semua
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 p-3 bg-slate-50/80 rounded-2xl border border-slate-200/70">
                {sortedExams.map(exam => {
                  const isSelected = activeComparisonExams.some(e => e.id === exam.id);
                  return (
                    <button
                      key={exam.id}
                      type="button"
                      onClick={() => toggleComparisonExam(exam.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer shadow-2xs ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-800'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] font-black ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {isSelected ? '✓' : ''}
                      </span>
                      <span>{exam.name}</span>
                      {exam.date && (
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          {exam.date}
                        </span>
                      )}
                      <span className="text-[9px] opacity-90 bg-black/10 px-1.5 py-0.5 rounded-md uppercase">
                        {exam.type}
                      </span>
                    </button>
                  );
                })}
                {sortedExams.length === 0 && (
                  <p className="text-xs text-slate-400 italic p-2">Tiada rekod pentaksiran/ujian lagi. Sila cipta ujian baharu di tab "Senarai & Kemasukan Ujian".</p>
                )}
              </div>
            </div>
          </div>

          {/* Ringkasan Statistik KPI Perbandingan */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jumlah Murid Dianalisis</p>
              <p className="text-3xl font-black text-slate-900 tracking-tight">{comparisonSummary.totalStudents}</p>
              <p className="text-[10px] text-slate-500 font-bold">Mengikut tapisan aktif</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-2xs bg-gradient-to-b from-emerald-50/50 to-white space-y-1">
              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-1.5">
                <TrendingUp size={13} className="text-emerald-600" />
                Murid Meningkat
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-700 tracking-tight">{comparisonSummary.upCount}</span>
                <span className="text-xs font-black text-emerald-600 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                  {comparisonSummary.totalStudents > 0 ? Math.round((comparisonSummary.upCount / comparisonSummary.totalStudents) * 100) : 0}%
                </span>
              </div>
              <p className="text-[10px] text-emerald-600 font-bold">Peningkatan markah keseluruhan</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-2xs bg-gradient-to-b from-rose-50/50 to-white space-y-1">
              <p className="text-[10px] font-black text-rose-700 uppercase tracking-widest flex items-center gap-1.5">
                <TrendingDown size={13} className="text-rose-600" />
                Murid Menurun
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-rose-700 tracking-tight">{comparisonSummary.downCount}</span>
                <span className="text-xs font-black text-rose-600 bg-rose-100/80 px-2 py-0.5 rounded-md">
                  {comparisonSummary.totalStudents > 0 ? Math.round((comparisonSummary.downCount / comparisonSummary.totalStudents) * 100) : 0}%
                </span>
              </div>
              <p className="text-[10px] text-rose-600 font-bold">Penurunan markah keseluruhan</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Minus size={13} className="text-slate-400" />
                Markah Kekal
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-800 tracking-tight">{comparisonSummary.sameCount}</span>
                <span className="text-xs font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  {comparisonSummary.totalStudents > 0 ? Math.round((comparisonSummary.sameCount / comparisonSummary.totalStudents) * 100) : 0}%
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold">Sama / tiada perbezaan</p>
            </div>
          </div>

          {/* Kad Purata Markah Kelas Bagi Ujian Dipilih */}
          {comparisonSummary.examAverages.length > 0 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <BarChart2 size={16} className="text-emerald-600" />
                  Purata Markah Kelas Bagi Setiap Pentaksiran Terpilih
                </h4>
                <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-2.5 py-1 rounded-lg">
                  {comparisonSummary.examAverages.length} Pentaksiran
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {comparisonSummary.examAverages.map(ea => (
                  <div key={ea.exam.id} className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200/70 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-slate-900 uppercase">{ea.exam.name}</span>
                      <span className="font-black text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full text-xs">
                        {ea.avg}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, ea.avg))}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                      <span>{ea.count} murid dinilai</span>
                      {ea.exam.date && <span>Tarikh: {ea.exam.date}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Visualisasi Carta Perbandingan Markah */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-2xs space-y-5 no-print">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-4 border-slate-100">
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <BarChart2 className="text-emerald-600" size={18} />
                  Visualisasi Graf Perbandingan Markah
                </h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Paparan grafik dinamik untuk membandingkan trend peningkatan markah individu dan purata kelas.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Mod Perbandingan: Mengikut Murid vs Purata */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => setComparisonChartScope('STUDENT')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      comparisonChartScope === 'STUDENT'
                        ? 'bg-white text-emerald-800 shadow-2xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Perbandingan Murid
                  </button>
                  <button
                    type="button"
                    onClick={() => setComparisonChartScope('AVERAGE')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      comparisonChartScope === 'AVERAGE'
                        ? 'bg-white text-emerald-800 shadow-2xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Purata Kelas
                  </button>
                </div>

                {/* Jenis Carta: Bar vs Garisan */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => setComparisonChartType('BAR')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      comparisonChartType === 'BAR'
                        ? 'bg-emerald-600 text-white shadow-2xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <BarChart2 size={13} /> Carta Bar
                  </button>
                  <button
                    type="button"
                    onClick={() => setComparisonChartType('LINE')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      comparisonChartType === 'LINE'
                        ? 'bg-emerald-600 text-white shadow-2xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <TrendingUp size={13} /> Carta Garisan
                  </button>
                </div>

                {/* Filter bilangan murid dalam carta */}
                {comparisonChartScope === 'STUDENT' && (
                  <div className="flex items-center gap-1.5 text-xs font-bold bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Had:</span>
                    <select
                      value={comparisonStudentLimit}
                      onChange={e => setComparisonStudentLimit(Number(e.target.value))}
                      className="bg-transparent text-slate-800 font-bold outline-none cursor-pointer"
                    >
                      <option value={10}>10 Murid Pertama</option>
                      <option value={15}>15 Murid Pertama</option>
                      <option value={25}>25 Murid Pertama</option>
                      <option value={0}>Semua ({studentComparisonData.length})</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Container Carta */}
            {activeComparisonExams.length === 0 ? (
              <div className="p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold">
                Sila pilih sekurang-kurangnya satu pentaksiran di bahagian atas untuk memaparkan graf perbandingan.
              </div>
            ) : studentComparisonData.length === 0 ? (
              <div className="p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold">
                Tiada rekod murid dijumpai bagi tapisan kelas / carian / kumpulan prestasi ini.
              </div>
            ) : (
              <div className="w-full overflow-x-auto pt-2">
                <div style={{ minWidth: comparisonChartScope === 'STUDENT' && studentChartData.length > 10 ? `${studentChartData.length * 60}px` : '100%' }}>
                  <ResponsiveContainer width="100%" height={380}>
                    {comparisonChartScope === 'STUDENT' ? (
                      comparisonChartType === 'BAR' ? (
                        <BarChart data={studentChartData} margin={{ top: 20, right: 30, left: 0, bottom: 65 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis
                            dataKey="name"
                            angle={-35}
                            textAnchor="end"
                            interval={0}
                            tick={{ fontSize: 10, fill: '#475569', fontWeight: 700 }}
                            height={70}
                          />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} unit="%" />
                          <Tooltip content={<CustomComparisonTooltip activeComparisonExams={activeComparisonExams} />} />
                          <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                          {activeComparisonExams.map((exam, idx) => (
                            <Bar
                              key={exam.id}
                              dataKey={exam.id}
                              name={exam.name}
                              fill={exam.themeColor || EXAM_PALETTE[idx % EXAM_PALETTE.length]}
                              radius={[6, 6, 0, 0]}
                            />
                          ))}
                        </BarChart>
                      ) : (
                        <LineChart data={studentChartData} margin={{ top: 20, right: 30, left: 0, bottom: 65 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis
                            dataKey="name"
                            angle={-35}
                            textAnchor="end"
                            interval={0}
                            tick={{ fontSize: 10, fill: '#475569', fontWeight: 700 }}
                            height={70}
                          />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} unit="%" />
                          <Tooltip content={<CustomComparisonTooltip activeComparisonExams={activeComparisonExams} />} />
                          <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                          {activeComparisonExams.map((exam, idx) => (
                            <Line
                              key={exam.id}
                              type="monotone"
                              dataKey={exam.id}
                              name={exam.name}
                              stroke={exam.themeColor || EXAM_PALETTE[idx % EXAM_PALETTE.length]}
                              strokeWidth={3}
                              dot={{ r: 4, strokeWidth: 2 }}
                              activeDot={{ r: 7 }}
                            />
                          ))}
                        </LineChart>
                      )
                    ) : (
                      /* Mode: AVERAGE */
                      comparisonChartType === 'BAR' ? (
                        <BarChart data={averageChartData} margin={{ top: 20, right: 30, left: 0, bottom: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#334155', fontWeight: 700 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} unit="%" />
                          <Tooltip content={<CustomComparisonTooltip activeComparisonExams={activeComparisonExams} />} />
                          <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                          <Bar dataKey="Purata Markah (%)" fill="#10b981" radius={[6, 6, 0, 0]} />
                          <Bar dataKey="Markah Tertinggi (%)" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                          <Bar dataKey="Markah Terendah (%)" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      ) : (
                        <LineChart data={averageChartData} margin={{ top: 20, right: 30, left: 0, bottom: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#334155', fontWeight: 700 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} unit="%" />
                          <Tooltip content={<CustomComparisonTooltip activeComparisonExams={activeComparisonExams} />} />
                          <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                          <Line type="monotone" dataKey="Purata Markah (%)" stroke="#10b981" strokeWidth={3} dot={{ r: 5 }} />
                          <Line type="monotone" dataKey="Markah Tertinggi (%)" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 5 }} />
                          <Line type="monotone" dataKey="Markah Terendah (%)" stroke="#f43f5e" strokeWidth={3} dot={{ r: 5 }} />
                        </LineChart>
                      )
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Jadual Utama Analisis Pentaksiran */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/70">
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Users size={15} className="text-emerald-600" />
                  Jadual Perbandingan Prestasi Murid ({studentComparisonData.length} Murid)
                  {comparisonClass && <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md text-[10px] font-black">Kelas {comparisonClass}</span>}
                  {comparisonSubClass && <span className="text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md text-[10px] font-black">Sub-Kelas: {comparisonSubClass}</span>}
                </h4>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                  Menunjukkan perbandingan markah, gred, purata automatik, dan analisis kecenderungan peningkatan murid.
                </p>
              </div>
              <span className="text-[10px] font-black text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shrink-0 shadow-2xs">
                {activeComparisonExams.length} Pentaksiran Dianalisis
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 text-[10px] font-black uppercase tracking-wider border-b border-slate-200/80">
                    <th className="py-3.5 px-4 text-center w-12">Bil</th>
                    <th className="py-3.5 px-4 min-w-[220px]">Nama Murid & Kumpulan</th>
                    <th className="py-3.5 px-4 text-center">Kelas</th>
                    {activeComparisonExams.map(exam => (
                      <th key={exam.id} className="py-3.5 px-4 text-center border-l border-slate-200/80 bg-slate-50/90 min-w-[140px]">
                        <div className="text-slate-900 font-black">{exam.name}</div>
                        {exam.date && <div className="text-[8px] font-mono font-bold text-slate-500">{exam.date}</div>}
                      </th>
                    ))}
                    <th className="py-3.5 px-4 text-center border-l border-slate-200/80 bg-emerald-50/80 text-emerald-950 min-w-[160px]">
                      Impak / Kecenderungan
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium">
                  {studentComparisonData.map((d, index) => (
                    <tr key={d.student.id} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400">{index + 1}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-slate-900 uppercase">{d.student.name}</span>
                          {d.performanceGroup === 'CEMERLANG' && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300/80">
                              🟢 Cemerlang ({d.avgScore !== null ? `${d.avgScore}%` : '-'})
                            </span>
                          )}
                          {d.performanceGroup === 'SEDERHANA' && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300/80">
                              🟡 Sederhana ({d.avgScore !== null ? `${d.avgScore}%` : '-'})
                            </span>
                          )}
                          {d.performanceGroup === 'LEMAH' && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-800 border border-rose-300/80">
                              🔴 Lemah ({d.avgScore !== null ? `${d.avgScore}%` : '-'})
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] text-slate-400 font-mono font-bold uppercase mt-0.5">{d.student.regNo}</p>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-700">{d.student.class}</td>
                      {d.examResults.map(er => (
                        <td key={er.examId} className="py-3.5 px-4 text-center border-l border-slate-100">
                          {er.isAbsent ? (
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-rose-50 text-rose-600 border border-rose-200">
                              TH
                            </span>
                          ) : er.marks !== null ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="font-extrabold text-slate-900 text-sm">{er.marks}%</span>
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${er.grade.textClass}`}
                                style={er.grade.textClass ? {} : { backgroundColor: `${er.grade.color}15`, color: er.grade.color, borderColor: `${er.grade.color}40` }}
                              >
                                {er.grade.label}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300 italic text-[11px]">-</span>
                          )}
                        </td>
                      ))}
                      <td className="py-3.5 px-4 text-center border-l border-slate-100 bg-slate-50/30 font-bold">
                        {d.trend === 'UP' && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100/90 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-black shadow-2xs">
                            <TrendingUp size={14} className="text-emerald-700" />
                            <span>+{d.delta}%</span>
                            <span className="text-[9px] font-extrabold uppercase tracking-wide bg-emerald-700 text-white px-1.5 py-0.5 rounded-md">Meningkat</span>
                          </div>
                        )}
                        {d.trend === 'DOWN' && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-100/90 text-rose-800 border border-rose-300 rounded-xl text-xs font-black shadow-2xs">
                            <TrendingDown size={14} className="text-rose-700" />
                            <span>{d.delta}%</span>
                            <span className="text-[9px] font-extrabold uppercase tracking-wide bg-rose-700 text-white px-1.5 py-0.5 rounded-md">Menurun</span>
                          </div>
                        )}
                        {d.trend === 'SAME' && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-black">
                            <Minus size={14} className="text-slate-500" />
                            <span>0%</span>
                            <span className="text-[9px] font-extrabold uppercase tracking-wide bg-slate-500 text-white px-1.5 py-0.5 rounded-md">Kekal</span>
                          </div>
                        )}
                        {d.trend === 'NONE' && (
                          <span className="text-[10px] text-slate-400 italic">Perlu min. 2 ujian</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {studentComparisonData.length === 0 && (
                    <tr>
                      <td colSpan={4 + activeComparisonExams.length} className="py-12 text-center text-slate-400 italic">
                        Tiada rekod murid dijumpai untuk kriteria tapisan ini. Sila pilih kelas atau tahun yang lain.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {isExamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsExamModalOpen(false)} />
          <div className="relative bg-white rounded-3xl w-full max-w-2xl p-8 animate-in zoom-in-95 shadow-2xl max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold uppercase italic">Urus Struktur Ujian</h3>
               <button onClick={() => setIsExamModalOpen(false)}><X /></button>
             </div>
             <form onSubmit={handleCreateExam} className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="space-y-1">
                   <label className="text-xs font-bold text-slate-500 uppercase">Nama Ujian</label>
                   <input required className="w-full border rounded-xl px-4 py-2.5 text-sm font-bold uppercase" value={examForm.name} onChange={e => setExamForm({...examForm, name: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                   <label className="text-xs font-bold text-slate-500 uppercase">Kategori</label>
                   <select 
                     className="w-full border rounded-xl px-4 py-2.5 text-sm font-bold uppercase outline-none focus:ring-2 focus:ring-sky-500"
                     value={examForm.type}
                     onChange={e => setExamForm({...examForm, type: e.target.value as ExamType})}
                   >
                     {Object.values(ExamType).map(type => (
                       <option key={type} value={type}>{type}</option>
                     ))}
                   </select>
                 </div>
                 <div className="space-y-1">
                   <label className="text-xs font-bold text-slate-500 uppercase">Tarikh</label>
                   <input type="date" required className="w-full border rounded-xl px-4 py-2.5 text-sm font-bold" value={examForm.date} onChange={e => setExamForm({...examForm, date: e.target.value})} />
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-500 uppercase">Warna Tema Ujian</label>
                 <div className="flex flex-wrap gap-3">
                   {THEME_COLORS.map(color => (
                     <button
                       key={color.value}
                       type="button"
                       onClick={() => setExamForm({ ...examForm, themeColor: color.value })}
                       className={`w-10 h-10 rounded-full border-4 transition-all ${examForm.themeColor === color.value ? 'border-slate-900 scale-110' : 'border-transparent'}`}
                       style={{ backgroundColor: color.value }}
                       title={color.name}
                     />
                   ))}
                 </div>
               </div>

               {/* Penambahan Pemilihan Darjah Sasaran */}
               <div className="space-y-3 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Darjah Sasaran (Hanya tanda darjah terlibat)</label>
                    <button type="button" onClick={() => setExamForm({...examForm, targetYears: []})} className="text-[9px] font-bold text-sky-600 uppercase">Kosongkan (Pilih Semua)</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {years.map(year => (
                      <button
                        key={year}
                        type="button"
                        onClick={() => toggleTargetYear(year)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${
                          examForm.targetYears?.includes(year) 
                            ? 'bg-sky-600 border-sky-600 text-white shadow-md' 
                            : 'bg-white border-slate-100 text-slate-400'
                        }`}
                      >
                        {examForm.targetYears?.includes(year) ? <CheckSquare size={14} /> : <Square size={14} />}
                        <span className="text-xs font-black">Darjah {year}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-slate-400 italic">* Jika tiada darjah dipilih, ujian akan terbuka kepada SEMUA darjah.</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-xs font-bold text-slate-500 uppercase">JUMLAH MENTAH (Dalam Kertas)</label>
                   <input type="number" className="w-full border rounded-xl px-4 py-2.5 text-sm font-bold bg-slate-50" value={examForm.items?.reduce((s,i) => s + i.maxMarks, 0) || examForm.totalMarks} readOnly />
                 </div>
                 <div className="space-y-1">
                   <label className="text-xs font-bold text-slate-500 uppercase">JUMLAH PERATUS (Untuk Analisis)</label>
                   <input type="number" required className="w-full border rounded-xl px-4 py-2.5 text-sm font-bold" value={examForm.scaledTotal} onChange={e => setExamForm({...examForm, scaledTotal: parseInt(e.target.value) || 100})} />
                 </div>
               </div>

               <div className="space-y-3">
                 <div className="flex justify-between items-center">
                   <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Item / Pecahan Soalan</h4>
                   <button type="button" onClick={() => setExamForm({...examForm, items: [...(examForm.items || []), { id: Math.random().toString(36).substr(2, 5), label: `Q${(examForm.items?.length || 0)+1}`, description: '', maxMarks: 10 }]})} className="text-xs font-bold text-sky-600 flex items-center gap-1"><Plus size={14} /> Tambah Item</button>
                 </div>
                 <div className="space-y-2">
                   {examForm.items?.map((item, index) => (
                     <div key={item.id} className="flex gap-2 items-center bg-slate-50 p-3 rounded-xl border">
                       <input className="w-16 border rounded-lg px-2 py-1.5 text-xs font-bold" value={item.label} onChange={e => {
                         const next = [...(examForm.items || [])];
                         next[index].label = e.target.value;
                         setExamForm({...examForm, items: next});
                       }} />
                       <input className="flex-1 border rounded-lg px-2 py-1.5 text-xs" value={item.description} onChange={e => {
                         const next = [...(examForm.items || [])];
                         next[index].description = e.target.value;
                         setExamForm({...examForm, items: next});
                       }} placeholder="Topik/Kemahiran" />
                       <input type="number" className="w-16 border rounded-lg px-2 py-1.5 text-xs font-bold text-center" value={item.maxMarks} onChange={e => {
                         const next = [...(examForm.items || [])];
                         next[index].maxMarks = parseInt(e.target.value) || 0;
                         setExamForm({...examForm, items: next});
                       }} />
                       <button type="button" onClick={() => setExamForm({...examForm, items: examForm.items?.filter((_, i) => i !== index)})} className="text-red-400"><Trash2 size={16} /></button>
                     </div>
                   ))}
                 </div>
               </div>

               {/* Tetapan Julat Gred Khusus Pentaksiran Ini */}
               <div className="space-y-3 bg-amber-50/60 p-6 rounded-3xl border border-amber-200/80">
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                   <div>
                     <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                       <Sliders className="text-amber-600" size={16} />
                       Tetapan Julat Gred Ujian Ini
                     </h4>
                     <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                       Tetapkan julat gred khas bagi ujian ini jika berbeza daripada gred asal sistem.
                     </p>
                   </div>

                   {examForm.gradeConfigs && examForm.gradeConfigs.length > 0 ? (
                     <button
                       type="button"
                       onClick={() => setExamForm({ ...examForm, gradeConfigs: undefined })}
                       className="px-3 py-1.5 bg-white text-slate-600 hover:text-red-600 border border-slate-200 rounded-xl text-[10px] font-bold uppercase shadow-sm transition-all cursor-pointer"
                     >
                       Guna Gred Asal Sistem
                     </button>
                   ) : (
                     <button
                       type="button"
                       onClick={() => setExamForm({ ...examForm, gradeConfigs: JSON.parse(JSON.stringify(gradeConfigs)) })}
                       className="px-3 py-1.5 bg-amber-600 text-white hover:bg-amber-700 rounded-xl text-[10px] font-bold uppercase shadow-sm transition-all cursor-pointer"
                     >
                       Set Julat Gred Khusus
                     </button>
                   )}
                 </div>

                 {!examForm.gradeConfigs || examForm.gradeConfigs.length === 0 ? (
                   <div className="p-3 bg-white/80 rounded-2xl border border-amber-200/60 text-xs font-bold text-slate-600 flex flex-wrap items-center justify-between gap-2">
                     <span>Status: Menggunakan Gred Asal Sistem</span>
                     <div className="flex flex-wrap gap-1">
                       {gradeConfigs.map(g => (
                         <span key={g.id} className="px-2 py-0.5 rounded text-[9px] font-black" style={{ backgroundColor: `${g.color}20`, color: g.color }}>
                           {g.label}: {g.min}-{g.max}%
                         </span>
                       ))}
                     </div>
                   </div>
                 ) : (
                   <div className="space-y-3 pt-2">
                     <div className="grid grid-cols-1 gap-2">
                       {examForm.gradeConfigs.sort((a,b) => b.min - a.min).map((g, idx) => (
                         <div key={g.id || idx} className="flex flex-wrap items-center gap-3 p-3 bg-white rounded-2xl border border-amber-200/60 shadow-sm">
                           <input
                             type="text"
                             className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-xs font-black uppercase text-center"
                             value={g.label}
                             onChange={e => {
                               const nextGrades = [...(examForm.gradeConfigs || [])];
                               nextGrades[idx].label = e.target.value.toUpperCase();
                               setExamForm({ ...examForm, gradeConfigs: nextGrades });
                             }}
                           />
                           <div className="flex items-center gap-1 text-xs font-bold text-slate-600">
                             <span className="text-[10px] text-slate-400 font-bold uppercase">Min %:</span>
                             <input
                               type="number"
                               min={0}
                               max={100}
                               className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-center"
                               value={g.min}
                               onChange={e => {
                                 const nextGrades = [...(examForm.gradeConfigs || [])];
                                 nextGrades[idx].min = parseInt(e.target.value) || 0;
                                 setExamForm({ ...examForm, gradeConfigs: nextGrades });
                               }}
                             />
                           </div>
                           <div className="flex items-center gap-1 text-xs font-bold text-slate-600">
                             <span className="text-[10px] text-slate-400 font-bold uppercase">Max %:</span>
                             <input
                               type="number"
                               min={0}
                               max={100}
                               className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-center"
                               value={g.max}
                               onChange={e => {
                                 const nextGrades = [...(examForm.gradeConfigs || [])];
                                 nextGrades[idx].max = parseInt(e.target.value) || 0;
                                 setExamForm({ ...examForm, gradeConfigs: nextGrades });
                               }}
                             />
                           </div>
                           <div className="flex items-center gap-1.5 ml-auto">
                             <input
                               type="color"
                               className="w-8 h-8 rounded-lg border-none cursor-pointer"
                               value={g.color}
                               onChange={e => {
                                 const nextGrades = [...(examForm.gradeConfigs || [])];
                                 nextGrades[idx].color = e.target.value;
                                 setExamForm({ ...examForm, gradeConfigs: nextGrades });
                               }}
                             />
                             <button
                               type="button"
                               onClick={() => {
                                 const nextGrades = (examForm.gradeConfigs || []).filter((_, i) => i !== idx);
                                 setExamForm({ ...examForm, gradeConfigs: nextGrades });
                               }}
                               className="p-1 text-slate-300 hover:text-red-500 cursor-pointer"
                             >
                               <Trash2 size={16} />
                             </button>
                           </div>
                         </div>
                       ))}
                     </div>
                     <button
                       type="button"
                       onClick={() => {
                         const newGrade: GradeConfig = { id: Math.random().toString(36).substr(2, 5), label: 'GRED', min: 0, max: 0, color: '#6366f1' };
                         setExamForm({ ...examForm, gradeConfigs: [...(examForm.gradeConfigs || []), newGrade] });
                       }}
                       className="w-full py-2 bg-white border border-dashed border-amber-300 rounded-xl text-amber-700 text-xs font-bold hover:bg-amber-50 flex items-center justify-center gap-1 cursor-pointer"
                     >
                       <Plus size={14} /> Tambah Gred Khusus Ujian
                     </button>
                   </div>
                 )}
               </div>
               <button type="submit" className="w-full py-4 text-white rounded-xl font-bold shadow-lg transition-all" style={{ backgroundColor: examForm.themeColor || '#0ea5e9' }}>Simpan Perubahan</button>
             </form>
          </div>
        </div>
      )}

      {/* Grade Configuration Modal */}
      {isGradeModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsGradeModalOpen(false)} />
          <div className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-xl p-10 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-hidden flex flex-col">
             <div className="flex justify-between items-center mb-8 shrink-0">
                <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-3">
                  <Edit3 className="text-sky-600" /> {t.manage_grades || 'Konfigurasi Gred & Warna'}
                </h3>
                <button onClick={() => setIsGradeModalOpen(false)} className="w-10 h-10 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl transition-all flex items-center justify-center"><X size={20}/></button>
             </div>

             <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                {gradeConfigs.sort((a,b) => b.min - a.min).map((g, idx) => (
                  <div key={g.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                    <div className="flex justify-between items-center">
                       <input 
                         className="bg-transparent border-none text-lg font-black text-slate-900 uppercase w-24 focus:ring-0"
                         value={g.label}
                         onChange={(e) => {
                           const updated = [...gradeConfigs];
                           updated[idx].label = e.target.value.toUpperCase();
                           onUpdateGrades(updated);
                         }}
                       />
                       <button 
                         onClick={() => onUpdateGrades(gradeConfigs.filter(item => item.id !== g.id))}
                         className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                       >
                         <Trash2 size={16} />
                       </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Min Markah</label>
                          <input 
                            type="number" 
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold"
                            value={g.min}
                            onChange={(e) => {
                              const updated = [...gradeConfigs];
                              updated[idx].min = parseInt(e.target.value) || 0;
                              onUpdateGrades(updated);
                            }}
                          />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Max Markah</label>
                          <input 
                            type="number" 
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold"
                            value={g.max}
                            onChange={(e) => {
                              const updated = [...gradeConfigs];
                              updated[idx].max = parseInt(e.target.value) || 0;
                              onUpdateGrades(updated);
                            }}
                          />
                       </div>
                    </div>

                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Warna Tema (HEX)</label>
                       <div className="flex gap-2 items-center">
                          <input 
                            type="color" 
                            className="w-10 h-10 border-none bg-transparent cursor-pointer"
                            value={g.color}
                            onChange={(e) => {
                              const updated = [...gradeConfigs];
                              updated[idx].color = e.target.value;
                              onUpdateGrades(updated);
                            }}
                          />
                          <input 
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-mono uppercase"
                            value={g.color}
                            onChange={(e) => {
                              const updated = [...gradeConfigs];
                              updated[idx].color = e.target.value;
                              onUpdateGrades(updated);
                            }}
                          />
                       </div>
                    </div>
                  </div>
                ))}
                
                <button 
                  onClick={() => {
                    const newGrade: GradeConfig = { id: Math.random().toString(36).substr(2, 5), label: 'BARU', min: 0, max: 0, color: '#94a3b8' };
                    onUpdateGrades([...gradeConfigs, newGrade]);
                  }}
                  className="w-full py-4 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> Tambah Gred Baru
                </button>
             </div>

             <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end shrink-0">
                <button 
                  onClick={() => setIsGradeModalOpen(false)}
                  className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2"
                >
                  <Save size={16} /> Selesai Konfigurasi
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Bulk Marks Registration Modal */}
      {isBulkMarksModalOpen && selectedExam && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsBulkMarksModalOpen(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl p-6 sm:p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-hidden flex flex-col z-10">
            {/* Header */}
            <div className="flex justify-between items-start mb-4 border-b pb-4 shrink-0">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <ListPlus className="text-indigo-600" size={22} />
                  Pendaftaran & Kemas Kini Markah Pukal
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Daftar markah secara serentak bagi pentaksiran <span className="font-extrabold text-indigo-700">{selectedExam.name}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkMarksModalOpen(false)}
                className="w-9 h-9 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 rounded-xl flex items-center justify-center transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Info bar & mode switcher */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 mb-4 shrink-0">
              <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-700">
                <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-lg text-[11px] font-black uppercase">
                  {filteredStudents.length} Murid
                </span>
                {filterClass && (
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-black uppercase">
                    Kelas {filterClass}
                  </span>
                )}
                {filterYear && !filterClass && (
                  <span className="px-2.5 py-1 bg-sky-100 text-sky-800 rounded-lg text-[11px] font-black uppercase">
                    Darjah {filterYear}
                  </span>
                )}
                <span className="text-[11px] text-slate-500">
                  Skala: <strong className="text-slate-800">{selectedExam.totalMarks}</strong> (Mentah) → <strong className="text-slate-800">{selectedExam.scaledTotal}%</strong>
                </span>
              </div>

              <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold shadow-sm">
                <button
                  type="button"
                  onClick={() => setBulkMode('PASTE')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    bulkMode === 'PASTE'
                      ? 'bg-indigo-600 text-white font-black shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <ClipboardPaste size={14} /> Tampal Pukal
                </button>
                <button
                  type="button"
                  onClick={() => setBulkMode('GRID')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    bulkMode === 'GRID'
                      ? 'bg-indigo-600 text-white font-black shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <FileSpreadsheet size={14} /> Borang Jadual
                </button>
              </div>
            </div>

            {/* Tab 1: Tampal Pukal (Paste) */}
            {bulkMode === 'PASTE' && (
              <form onSubmit={handleBulkMarksSubmit} className="flex-1 overflow-hidden flex flex-col space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500 font-medium">
                    Masukkan atau tampal markah (1 markah per baris mengikut susunan senarai murid). Taip <strong className="text-rose-600 font-black">TH</strong> untuk Tidak Hadir.
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyStudentNames}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center gap-1.5 transition-all text-[11px] cursor-pointer"
                      title="Salin senarai nama murid untuk disesuaikan dalam Excel"
                    >
                      {copiedNames ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      <span>{copiedNames ? 'Nama Disalin!' : 'Salin Senarai Nama'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const sample = filteredStudents.map((_, i) => (i % 5 === 4 ? 'TH' : Math.floor(Math.random() * (selectedExam.totalMarks || 100)))).join('\n');
                        setBulkMarksText(sample);
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all text-[11px] cursor-pointer"
                    >
                      Isi Contoh
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkMarksText('')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl font-bold transition-all text-[11px] cursor-pointer"
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 overflow-hidden min-h-0">
                  {/* Left: Textarea */}
                  <div className="md:col-span-5 flex flex-col h-full">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                      Teks Input Markah (Baris demi Baris)
                    </label>
                    <textarea
                      className="w-full flex-1 p-3.5 bg-slate-900 text-emerald-400 font-mono text-xs rounded-2xl border border-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none resize-none leading-relaxed"
                      rows={12}
                      placeholder={`Contoh:\n85\n92\nTH\n78\n65`}
                      value={bulkMarksText}
                      onChange={e => setBulkMarksText(e.target.value)}
                    />
                  </div>

                  {/* Right: Live Preview Mapping Table */}
                  <div className="md:col-span-7 flex flex-col h-full overflow-hidden border border-slate-200 rounded-2xl bg-slate-50/50">
                    <div className="p-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center text-xs font-black text-slate-700 uppercase">
                      <span>Pratonton Padanan Murid</span>
                      <span className="text-[10px] font-bold text-slate-500">
                        {bulkMarksText.split('\n').filter(l => l.trim().length > 0).length} / {filteredStudents.length} Diisi
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100 custom-scrollbar">
                      {filteredStudents.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-400 italic">Tiada murid dalam kelas/tapisan ini.</div>
                      ) : (
                        (() => {
                          const lines = bulkMarksText.split('\n').map(l => l.trim());
                          return filteredStudents.map((student, idx) => {
                            const inputLine = lines[idx] !== undefined ? lines[idx] : '';
                            const isAbsent = inputLine.toUpperCase() === 'TH';
                            const hasValue = inputLine.length > 0;
                            const rawNum = parseInt(inputLine);
                            const isValidNum = !isNaN(rawNum) && !isAbsent;
                            const scaled = isValidNum ? Math.round((rawNum / (selectedExam.totalMarks || 1)) * (selectedExam.scaledTotal || 100)) : 0;
                            const grade = isValidNum ? getGradeHelper(scaled, false, selectedExam) : null;

                            return (
                              <div key={student.id} className="py-2 px-3 flex items-center justify-between text-xs hover:bg-white rounded-xl transition-colors">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-5 text-[10px] font-bold text-slate-400 shrink-0 text-center">{idx + 1}</span>
                                  <div className="truncate">
                                    <p className="font-bold text-slate-800 text-[11px] uppercase truncate">{student.name}</p>
                                    <p className="text-[9px] text-slate-400 font-bold">{student.class} • {student.regNo}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                  {isAbsent ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                                      TH (Tidak Hadir)
                                    </span>
                                  ) : isValidNum ? (
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono text-xs font-bold text-slate-700">{rawNum} / {selectedExam.totalMarks}</span>
                                      <span className="font-extrabold text-indigo-600 text-xs font-mono">({scaled}%)</span>
                                      {grade && (
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${grade.textClass}`} style={grade.textClass ? {} : { backgroundColor: `${grade.color}20`, color: grade.color }}>
                                          {grade.label}
                                        </span>
                                      )}
                                    </div>
                                  ) : hasValue ? (
                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                                      Format Tidak Sah
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-300 italic">- Belum Diisi -</span>
                                  )}
                                </div>
                              </div>
                            );
                          });
                        })()
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsBulkMarksModalOpen(false)}
                    className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wide shadow-lg shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Save size={16} />
                    Simpan Semua Markah ({bulkMarksText.split('\n').filter(l => l.trim().length > 0).length} Murid)
                  </button>
                </div>
              </form>
            )}

            {/* Tab 2: Borang Jadual (Grid) */}
            {bulkMode === 'GRID' && (
              <form onSubmit={handleBulkGridSubmit} className="flex-1 overflow-hidden flex flex-col space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">
                    Isi atau kemas kini markah murid secara terus dalam borang jadual di bawah.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next: typeof bulkGridState = {};
                      filteredStudents.forEach(s => {
                        next[s.id] = { rawMarks: '0', isAbsent: true, itemMarks: {} };
                      });
                      setBulkGridState(next);
                    }}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold transition-all text-[11px] cursor-pointer"
                  >
                    Tanda Semua TH
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto border border-slate-200 rounded-2xl bg-white custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider border-b border-slate-200 z-10">
                      <tr>
                        <th className="py-3 px-3 text-center w-10">Bil</th>
                        <th className="py-3 px-3">Nama Murid</th>
                        <th className="py-3 px-3 text-center w-24">Kehadiran</th>
                        <th className="py-3 px-3 text-center min-w-[140px]">Markah Mentah</th>
                        <th className="py-3 px-3 text-center w-28">Peratus (%) & Gred</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400 italic">
                            Tiada murid dijumpai.
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((student, idx) => {
                          const entry = bulkGridState[student.id] || { rawMarks: '', isAbsent: false, itemMarks: {} };
                          const isAbsent = entry.isAbsent;
                          const rawVal = parseInt(entry.rawMarks || '0') || 0;
                          const scaled = isAbsent ? 0 : Math.round((rawVal / (selectedExam.totalMarks || 1)) * (selectedExam.scaledTotal || 100));
                          const grade = !isAbsent && entry.rawMarks !== '' ? getGradeHelper(scaled, false, selectedExam) : null;

                          return (
                            <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                              <td className="py-2.5 px-3">
                                <p className="font-bold text-slate-800 uppercase">{student.name}</p>
                                <p className="text-[9px] text-slate-400 font-bold">{student.class} • {student.regNo}</p>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBulkGridState({
                                      ...bulkGridState,
                                      [student.id]: {
                                        ...entry,
                                        isAbsent: !isAbsent
                                      }
                                    });
                                  }}
                                  className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer ${
                                    isAbsent
                                      ? 'bg-rose-600 text-white shadow-sm'
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  }`}
                                >
                                  {isAbsent ? 'TH' : 'Hadir'}
                                </button>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {isAbsent ? (
                                  <span className="text-rose-500 font-extrabold text-xs">Tidak Hadir</span>
                                ) : (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <input
                                      type="number"
                                      min={0}
                                      max={selectedExam.totalMarks}
                                      className="w-20 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-center focus:ring-2 focus:ring-indigo-500 outline-none"
                                      value={entry.rawMarks}
                                      onChange={e => {
                                        setBulkGridState({
                                          ...bulkGridState,
                                          [student.id]: {
                                            ...entry,
                                            rawMarks: e.target.value,
                                            isAbsent: false
                                          }
                                        });
                                      }}
                                      placeholder="0"
                                    />
                                    <span className="text-[10px] font-bold text-slate-400">/ {selectedExam.totalMarks}</span>
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold">
                                {isAbsent ? (
                                  <span className="text-slate-300">-</span>
                                ) : entry.rawMarks !== '' ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <span className="font-mono font-black text-slate-800 text-xs">{scaled}%</span>
                                    {grade && (
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-black ${grade.textClass}`} style={grade.textClass ? {} : { backgroundColor: `${grade.color}20`, color: grade.color }}>
                                        {grade.label}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-300 italic text-[10px]">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsBulkMarksModalOpen(false)}
                    className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wide shadow-lg shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Save size={16} />
                    Simpan Markah Grid
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Assessment;
