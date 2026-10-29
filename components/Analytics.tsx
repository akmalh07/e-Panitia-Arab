
import React, { useState, useEffect, useMemo } from 'react';
import { Student, Exam, Result, GradeConfig, Gender, User, Language, PBDSkill, PBDRecord } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, LineChart, Line, PieChart, Pie } from 'recharts';
import { Award, TrendingUp, BrainCircuit, Users as UsersIcon, AlertCircle, Sparkles, Loader2, X, Target, PieChart as PieIcon, Calculator, ChevronRight, Sliders, Save, Plus, Trash2, Trophy, Printer, BookOpen, Search } from 'lucide-react';
import { db, DB_KEYS } from '../services/dbService';
import { aiService } from '../services/aiService';
import { translations } from '../src/translations';

interface AnalyticsProps {
  students: Student[];
  exams: Exam[];
  results: Result[];
  focusPoints: any[];
  gradeConfigs: GradeConfig[];
  onUpdateGrades: (configs: GradeConfig[]) => void;
  user: User;
  pbdSkills?: PBDSkill[];
  pbdRecords?: PBDRecord[];
}

const Analytics: React.FC<AnalyticsProps> = ({ 
  students, 
  exams, 
  results, 
  gradeConfigs, 
  onUpdateGrades, 
  user,
  pbdSkills = [],
  pbdRecords = []
}) => {
  const lang: Language = user.language || 'ms';
  const t = translations[lang];
  const isRTL = lang === 'ar';
  const [selectedExamId, setSelectedExamId] = useState(exams[0]?.id || '');
  const [filterClass, setFilterClass] = useState<string[]>([]);
  const [filterYear, setFilterYear] = useState<string>('');
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<'overview' | 'ranking' | 'pbd_comparison'>('overview');
  
  const [selectedPbdYear, setSelectedPbdYear] = useState<number>(1);
  const [inspectedPbdClass, setInspectedPbdClass] = useState<string | null>(null);
  const [pbdSearchTerm, setPbdSearchTerm] = useState<string>('');
  
  const [aiLoading, setAiLoading] = useState<string | null>(null); // studentId or 'global'
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!selectedExamId && exams.length > 0) setSelectedExamId(exams[0].id);
  }, [exams]);

  const years = [1, 2, 3, 4, 5, 6];
  const classes = useMemo(() => Array.from(new Set(students.map(s => s.class))).sort(), [students]);
  const selectedExam = exams.find(e => e.id === selectedExamId);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchClass = filterClass.length > 0 ? filterClass.includes(s.class) : true;
      const matchYear = filterYear ? s.year === parseInt(filterYear) : true;
      return matchClass && matchYear;
    });
  }, [students, filterClass, filterYear]);

  const examResults = useMemo(() => {
    const studentIds = new Set(filteredStudents.map(s => s.id));
    return results.filter(r => r.examId === selectedExamId && !r.isAbsent && studentIds.has(r.studentId));
  }, [results, selectedExamId, filteredStudents]);

  // Statistik: Mean, Median, Mode
  const stats = useMemo(() => {
    if (examResults.length === 0) return { mean: 0, median: 0, mode: 0 };
    const scores = examResults.map(r => r.marks).sort((a, b) => a - b);
    const mean = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const mid = Math.floor(scores.length / 2);
    const median = scores.length % 2 !== 0 ? scores[mid] : Math.round((scores[mid - 1] + scores[mid]) / 2);
    const counts: Record<number, number> = {};
    let maxCount = 0; let mode = scores[0];
    scores.forEach(s => {
      counts[s] = (counts[s] || 0) + 1;
      if (counts[s] > maxCount) { maxCount = counts[s]; mode = s; }
    });
    return { mean, median, mode };
  }, [examResults]);

  // Active grade configs for selected exam
  const activeGradeConfigs = useMemo(() => {
    if (selectedExam?.gradeConfigs && selectedExam.gradeConfigs.length > 0) {
      return selectedExam.gradeConfigs;
    }
    return gradeConfigs;
  }, [selectedExam, gradeConfigs]);

  // Analisis Gred
  const gradeData = useMemo(() => {
    const dist: Record<string, number> = {};
    activeGradeConfigs.forEach(g => dist[g.label] = 0);
    examResults.forEach(r => {
      const g = activeGradeConfigs.find(c => r.marks >= c.min && r.marks <= c.max);
      if (g) dist[g.label]++;
    });
    return activeGradeConfigs.map(g => ({ name: g.label, value: dist[g.label], fill: g.color })).filter(d => d.value > 0);
  }, [examResults, activeGradeConfigs]);

  // Analisis Jantina
  const genderData = useMemo(() => {
    const maleRes = examResults.filter(r => students.find(s => s.id === r.studentId)?.gender === Gender.LELAKI);
    const femaleRes = examResults.filter(r => students.find(s => s.id === r.studentId)?.gender === Gender.PEREMPUAN);
    const maleAvg = maleRes.length > 0 ? Math.round(maleRes.reduce((s, r) => s + r.marks, 0) / maleRes.length) : 0;
    const femaleAvg = femaleRes.length > 0 ? Math.round(femaleRes.reduce((s, r) => s + r.marks, 0) / femaleRes.length) : 0;
    return [
      { name: 'Lelaki', avg: maleAvg, fill: '#0ea5e9' },
      { name: 'Perempuan', avg: femaleAvg, fill: '#ec4899' }
    ];
  }, [examResults, students]);

  // Analisis Item (Penguasaan Topik)
  const itemAnalysis = useMemo(() => {
    if (!selectedExam || !selectedExam.items) return [];
    return selectedExam.items.map(item => {
      const relevant = examResults.filter(r => r.itemMarks && r.itemMarks[item.id] !== undefined);
      const totalMarks = relevant.reduce((s, r) => s + (r.itemMarks![item.id] || 0), 0);
      const maxPossible = relevant.length * item.maxMarks;
      const pct = maxPossible > 0 ? Math.round((totalMarks / maxPossible) * 100) : 0;
      return { name: item.label, pct, topic: item.description };
    });
  }, [selectedExam, examResults]);

  const handleIndividualAI = async (student: Student) => {
    const res = examResults.find(r => r.studentId === student.id);
    if (!res || !selectedExam) return;
    setAiLoading(student.id);
    const analysis = await aiService.analyzeStudentPerformance(student, selectedExam, res);
    setAiAnalysis(prev => ({ ...prev, [student.id]: (analysis as string) }));
    setAiLoading(null);
  };

  const handleGlobalAI = async () => {
    if (!selectedExam || examResults.length === 0) return;
    setAiLoading('global');
    const classData = examResults.map(r => ({
      studentName: students.find(s => s.id === r.studentId)?.name || 'Murid',
      result: r
    }));
    const classLabel = filterClass.length > 0 ? filterClass.join(', ') : (filterYear ? `Darjah ${filterYear}` : 'Semua Kelas');
    const analysis = await aiService.analyzeClassPerformance(classLabel, selectedExam, classData);
    setAiAnalysis(prev => ({ ...prev, global: (analysis as string) }));
    setAiLoading(null);
  };

  const saveGrades = (newGrades: GradeConfig[]) => {
    onUpdateGrades(newGrades);
  };

  // Analisis Mengikut Kelas
  const classComparisonData = useMemo(() => {
    const classStats = classes.map(cls => {
      const classStudents = students.filter(s => s.class === cls);
      const classStudentIds = new Set(classStudents.map(s => s.id));
      const classResults = results.filter(r => r.examId === selectedExamId && !r.isAbsent && classStudentIds.has(r.studentId));
      
      const avg = classResults.length > 0 
        ? Math.round(classResults.reduce((s, r) => s + r.marks, 0) / classResults.length)
        : 0;
      
      return {
        name: cls,
        avg,
        count: classResults.length,
        totalStudents: classStudents.length
      };
    }).filter(c => c.count > 0);

    return classStats.sort((a, b) => b.avg - a.avg);
  }, [classes, students, results, selectedExamId]);

  const topClass = classComparisonData[0];
  const attentionClass = [...classComparisonData].sort((a, b) => a.avg - b.avg)[0];

  // Analisis Ranking
  const rankingData = useMemo(() => {
    // 1. Ranking untuk ujian terpilih
    const currentExamRanking = filteredStudents.map(s => {
      const res = results.find(r => r.studentId === s.id && r.examId === selectedExamId);
      return {
        student: s,
        marks: res?.isAbsent ? -1 : (res?.marks || 0),
        isAbsent: res?.isAbsent || !res
      };
    }).sort((a, b) => b.marks - a.marks);

    // 2. Ranking Keseluruhan (Purata semua ujian)
    const overallRanking = filteredStudents.map(s => {
      const studentResults = results.filter(r => r.studentId === s.id && !r.isAbsent);
      const avg = studentResults.length > 0 
        ? Math.round(studentResults.reduce((sum, r) => sum + r.marks, 0) / studentResults.length)
        : 0;
      return {
        student: s,
        avg,
        examCount: studentResults.length
      };
    }).sort((a, b) => b.avg - a.avg);

    return { current: currentExamRanking, overall: overallRanking };
  }, [filteredStudents, results, selectedExamId]);

  // PBD Class Comparison Data
  const pbdComparisonData = useMemo(() => {
    // Get all skills for the selected year
    const yearSkills = pbdSkills.filter(sk => sk.year === selectedPbdYear);
    const skillIds = new Set(yearSkills.map(sk => sk.id));

    // Get all classes that contain students for the selected year
    const yearStudents = students.filter(s => s.year === selectedPbdYear);
    const yearClasses = Array.from(new Set(yearStudents.map(s => s.class))).sort();

    const classMetrics = yearClasses.map(cls => {
      const classStudentsList = yearStudents.filter(s => s.class === cls);
      
      let totalTPForClass = 0;
      let assessedStudentsCount = 0;
      let tp12Count = 0;
      let tp34Count = 0;
      let tp56Count = 0;
      let tp0Count = 0;

      const studentDetails = classStudentsList.map(student => {
        const studentRecords = pbdRecords.filter(r => r.studentId === student.id && skillIds.has(r.skillId));
        const validRecords = studentRecords.filter(r => r.tpLevel > 0);
        
        if (validRecords.length === 0) {
          tp0Count++;
          return {
            student,
            averageTP: 0,
            roundedTP: 0,
            isAssessed: false,
            assessedCount: 0
          };
        } else {
          assessedStudentsCount++;
          const sum = validRecords.reduce((acc, r) => acc + r.tpLevel, 0);
          const avg = sum / validRecords.length;
          const rounded = Math.round(avg);
          totalTPForClass += avg;

          if (rounded === 1 || rounded === 2) {
            tp12Count++;
          } else if (rounded === 3 || rounded === 4) {
            tp34Count++;
          } else if (rounded === 5 || rounded === 6) {
            tp56Count++;
          }

          return {
            student,
            averageTP: Number(avg.toFixed(2)),
            roundedTP: rounded,
            isAssessed: true,
            assessedCount: validRecords.length
          };
        }
      });

      const averageTP = assessedStudentsCount > 0 ? Number((totalTPForClass / assessedStudentsCount).toFixed(2)) : 0;
      const totalCount = classStudentsList.length || 1;

      return {
        className: cls,
        totalStudents: classStudentsList.length,
        assessedStudents: assessedStudentsCount,
        averageTP,
        tp0: tp0Count,
        tp12: tp12Count,
        tp34: tp34Count,
        tp56: tp56Count,
        tp0Pct: Number(((tp0Count / totalCount) * 100).toFixed(1)),
        tp12Pct: Number(((tp12Count / totalCount) * 100).toFixed(1)),
        tp34Pct: Number(((tp34Count / totalCount) * 100).toFixed(1)),
        tp56Pct: Number(((tp56Count / totalCount) * 100).toFixed(1)),
        students: studentDetails
      };
    });

    // Sort by average TP descending
    return classMetrics.sort((a, b) => b.averageTP - a.averageTP);
  }, [pbdSkills, pbdRecords, students, selectedPbdYear]);

  // Overall statistics for PBD for selected academic year
  const pbdYearStats = useMemo(() => {
    let totalStudents = 0;
    let totalAssessed = 0;
    let totalTPAvgSum = 0;
    let totalTP36Count = 0;

    pbdComparisonData.forEach(c => {
      totalStudents += c.totalStudents;
      totalAssessed += c.assessedStudents;
      totalTPAvgSum += (c.averageTP * c.assessedStudents);
      totalTP36Count += (c.tp34 + c.tp56);
    });

    const overallAverageTP = totalAssessed > 0 ? Number((totalTPAvgSum / totalAssessed).toFixed(2)) : 0;
    const masteryRate = totalStudents > 0 ? Number(((totalTP36Count / totalStudents) * 100).toFixed(1)) : 0;

    const highestClass = pbdComparisonData.length > 0 ? pbdComparisonData[0] : null;
    const highestCemerlangClass = [...pbdComparisonData].sort((a, b) => b.tp56Pct - a.tp56Pct)[0] || null;

    return {
      totalStudents,
      totalAssessed,
      overallAverageTP,
      masteryRate,
      highestClass,
      highestCemerlangClass
    };
  }, [pbdComparisonData]);

  const activeClassData = useMemo(() => {
    return pbdComparisonData.find(c => c.className === inspectedPbdClass);
  }, [pbdComparisonData, inspectedPbdClass]);

  const filteredInspectedStudents = useMemo(() => {
    if (!activeClassData) return [];
    return activeClassData.students.filter(entry => 
      entry.student.name.toLowerCase().includes(pbdSearchTerm.toLowerCase()) ||
      entry.student.regNo.toLowerCase().includes(pbdSearchTerm.toLowerCase())
    );
  }, [activeClassData, pbdSearchTerm]);

  return (
    <div className={`space-y-8 animate-in fade-in duration-500 pb-24 ${isRTL ? 'direction-rtl' : ''}`}>
      {/* Tab Navigation */}
      <div className={`flex gap-2 no-print ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button 
          onClick={() => { setActiveAnalysisTab('overview'); setInspectedPbdClass(null); }}
          className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeAnalysisTab === 'overview' ? 'bg-sky-600 text-white shadow-lg' : 'bg-white text-slate-400 border hover:bg-slate-50'}`}
        >
          {t.holistic_summary}
        </button>
        <button 
          onClick={() => { setActiveAnalysisTab('ranking'); setInspectedPbdClass(null); }}
          className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeAnalysisTab === 'ranking' ? 'bg-sky-600 text-white shadow-lg' : 'bg-white text-slate-400 border hover:bg-slate-50'}`}
        >
          {t.ranking_position}
        </button>
        <button 
          onClick={() => { setActiveAnalysisTab('pbd_comparison'); setInspectedPbdClass(null); }}
          className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeAnalysisTab === 'pbd_comparison' ? 'bg-sky-600 text-white shadow-lg' : 'bg-white text-slate-400 border hover:bg-slate-50'}`}
        >
          {lang === 'ms' ? 'Perbandingan PBD Kelas' : lang === 'ar' ? 'مقارنة PBD للصفوف' : 'PBD Class Comparison'}
        </button>
      </div>

      {activeAnalysisTab === 'overview' && (
        <>
          {/* Header & Filter Holistik */}
      <div className="bg-white p-8 rounded-[40px] border shadow-sm no-print space-y-8">
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
          <div className={isRTL ? 'text-right' : ''}>
            <h2 className={`text-2xl font-black text-slate-900 flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Award className="text-sky-600" /> {t.holistic_summary} 360°
            </h2>
            <p className="text-slate-500 text-sm font-medium mt-1">{t.analytics_desc || 'Rumusan prestasi akademik Panitia Bahasa Arab.'}</p>
          </div>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button 
              onClick={() => setIsGradeModalOpen(true)}
              className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
            >
              <Sliders size={14} /> {t.manage_grades || 'Urus Gred'}
            </button>
            <div className={`flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border ${isRTL ? 'flex-row-reverse' : ''}`}>
              <UsersIcon size={16} className="text-sky-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Sample: {examResults.length} {t.students}</span>
            </div>
          </div>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-slate-50 rounded-[32px] border border-slate-100 ${isRTL ? 'direction-rtl' : ''}`}>
          <div className={`space-y-2 ${isRTL ? 'text-right' : ''}`}>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{t.select_exam || 'Pilih Pentaksiran'}</label>
            <select className={`w-full bg-white border-none rounded-2xl px-5 py-4 font-bold outline-none shadow-sm focus:ring-2 focus:ring-sky-500 transition-all text-sm ${isRTL ? 'text-right' : ''}`} value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)}>
              {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div className={`space-y-2 ${isRTL ? 'text-right' : ''}`}>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{t.filter_year}</label>
            <select className={`w-full bg-white border-none rounded-2xl px-5 py-4 font-bold outline-none shadow-sm focus:ring-2 focus:ring-sky-500 transition-all text-sm ${isRTL ? 'text-right' : ''}`} value={filterYear} onChange={e => { setFilterYear(e.target.value); setFilterClass([]); }}>
              <option value="">{t.all_years || 'Semua Darjah'}</option>
              {years.map(y => <option key={y} value={y}>{t.year} {y}</option>)}
            </select>
          </div>
          <div className={`space-y-2 ${isRTL ? 'text-right' : ''} relative`}>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{t.filter_class}</label>
            <button 
              type="button"
              onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
              className={`w-full bg-white border-none rounded-2xl px-5 py-4 font-bold outline-none shadow-sm focus:ring-2 focus:ring-sky-500 transition-all text-sm text-left flex justify-between items-center ${isRTL ? 'flex-row-reverse text-right' : ''}`}
            >
              <span className="truncate">
                {filterClass.length === 0 ? (t.all_classes || 'Semua Kelas') : `${filterClass.length} Kelas Dipilih`}
              </span>
              <ChevronRight size={16} className={`transform transition-transform ${isClassDropdownOpen ? 'rotate-90' : ''}`} />
            </button>
            
            {isClassDropdownOpen && (
              <div className={`absolute z-50 mt-2 w-full bg-white border rounded-[24px] shadow-2xl p-4 max-h-64 overflow-y-auto custom-scrollbar ${isRTL ? 'right-0' : 'left-0'}`}>
                <div className="space-y-2">
                  <button 
                    type="button"
                    onClick={() => setFilterClass([])}
                    className="w-full text-left px-3 py-2 text-[10px] font-black text-sky-600 uppercase hover:bg-sky-50 rounded-lg transition-all"
                  >
                    Kosongkan Pilihan
                  </button>
                  {classes.filter(c => !filterYear || c.startsWith(filterYear)).map(c => (
                    <label key={c} className={`flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-all ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        checked={filterClass.includes(c)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilterClass([...filterClass, c]);
                          } else {
                            setFilterClass(filterClass.filter(item => item !== c));
                          }
                        }}
                      />
                      <span className="text-sm font-bold text-slate-700">{c}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ringkasan Statistik Utama */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Min (Purata)', val: `${stats.mean}%`, icon: <Calculator />, color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-100' },
          { label: 'Median (Tengah)', val: `${stats.median}%`, icon: <TrendingUp />, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
          { label: 'Mod (Kekerapan)', val: `${stats.mode}%`, icon: <Award />, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' }
        ].map((s, i) => (
          <div key={i} className={`bg-white p-8 rounded-[40px] border shadow-sm flex items-center justify-between group hover:scale-[1.03] transition-all duration-300 ${s.border}`}>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{s.label}</p>
              <p className={`text-5xl font-black ${s.color} tracking-tighter`}>{s.val}</p>
            </div>
            <div className={`p-5 ${s.bg} ${s.color} rounded-[24px] shadow-sm`}>{s.icon}</div>
          </div>
        ))}
      </div>

      {/* Analisis Perbandingan Antara Kelas */}
      <div className="bg-white p-10 rounded-[50px] border shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-[0.2em] flex items-center gap-3">
              <UsersIcon className="text-indigo-600" size={24} /> Perbandingan Prestasi Antara Kelas
            </h3>
            <p className="text-slate-400 text-[10px] font-bold uppercase mt-1">Ranking & Purata Markah Mengikut Kelas</p>
          </div>
          <div className="flex gap-4">
            {topClass && (
              <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-2xl flex items-center gap-3">
                <Trophy className="text-emerald-600" size={18} />
                <div>
                  <p className="text-[8px] font-black text-emerald-600 uppercase">Terbaik</p>
                  <p className="text-xs font-bold text-slate-800">{topClass.name} ({topClass.avg}%)</p>
                </div>
              </div>
            )}
            {attentionClass && attentionClass.name !== topClass?.name && (
              <div className="bg-red-50 border border-red-100 px-4 py-2 rounded-2xl flex items-center gap-3">
                <AlertCircle className="text-red-600" size={18} />
                <div>
                  <p className="text-[8px] font-black text-red-600 uppercase">Perhatian</p>
                  <p className="text-xs font-bold text-slate-800">{attentionClass.name} ({attentionClass.avg}%)</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classComparisonData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} fontStyle="bold" dy={10} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} fontSize={10} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}} 
                  contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                />
                <Bar dataKey="avg" name="Purata Markah (%)" radius={[12, 12, 0, 0]}>
                  {classComparisonData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.avg >= 70 ? '#10b981' : entry.avg >= 50 ? '#f59e0b' : '#ef4444'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 border-b pb-4">Ranking Kelas</p>
            <div className="space-y-3 overflow-y-auto max-h-[340px] pr-4 custom-scrollbar">
              {classComparisonData.map((c, idx) => (
                <div key={c.name} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:scale-[1.02] transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${idx === 0 ? 'bg-yellow-400 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{c.name}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">{c.count} Murid Dinilai</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-black ${c.avg >= 70 ? 'text-emerald-600' : c.avg >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{c.avg}%</p>
                  </div>
                </div>
              ))}
              {classComparisonData.length === 0 && (
                <div className="py-20 text-center text-slate-300 italic text-xs">Tiada data perbandingan kelas sedia ada.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Baris Analisis Gred & Jantina */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Taburan Gred */}
        <div className="bg-white p-10 rounded-[50px] border shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-10">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-[0.2em] flex items-center gap-3">
              <PieIcon className="text-indigo-500" size={20} /> Taburan Gred Pencapaian
            </h3>
            <span className="text-[10px] font-black bg-slate-100 px-3 py-1 rounded-full uppercase">Visualisasi Pie</span>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={gradeData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} label>
                  {gradeData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} stroke="white" strokeWidth={2} />)}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Analisis Jantina */}
        <div className="bg-white p-10 rounded-[50px] border shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-10">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-[0.2em] flex items-center gap-3">
              <UsersIcon className="text-sky-500" size={20} /> Perbandingan Jantina
            </h3>
            <span className="text-[10px] font-black bg-slate-100 px-3 py-1 rounded-full uppercase">Purata Markah</span>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={genderData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontStyle="bold" fontSize={14} width={100} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="avg" name="Purata (%)" radius={[0, 15, 15, 0]} barSize={50}>
                  {genderData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-auto grid grid-cols-2 gap-4 border-t pt-8">
            {genderData.map(g => (
              <div key={g.name} className="text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{g.name}</p>
                <p className={`text-2xl font-black ${g.fill === '#0ea5e9' ? 'text-sky-600' : 'text-pink-600'}`}>{g.avg}%</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Analisis Item (Pecahan Soalan) */}
      <div className="bg-white p-12 rounded-[50px] border shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
          <h3 className="font-black text-slate-800 uppercase text-xs tracking-[0.2em] flex items-center gap-3">
            <Target className="text-indigo-600" size={24} /> Analisis Penguasaan Item & Topik
          </h3>
          <div className="flex gap-2">
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kuasai</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500 rounded-full" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sederhana</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lemah</span>
             </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          <div className="lg:col-span-3 h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={itemAnalysis}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} fontStyle="bold" dy={10} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} fontSize={10} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="pct" name="Penguasaan (%)" radius={[12, 12, 0, 0]}>
                  {itemAnalysis.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.pct >= 80 ? '#10b981' : entry.pct >= 50 ? '#f59e0b' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="lg:col-span-2 flex flex-col">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 border-b pb-4">Senarai Pencapaian Item</p>
            <div className="space-y-3 overflow-y-auto max-h-[340px] pr-4 custom-scrollbar">
              {itemAnalysis.map(item => (
                <div key={item.name} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:scale-[1.02] transition-all">
                  <div className="flex-1">
                    <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{item.name}</p>
                    <p className="text-[10px] text-slate-400 italic font-medium truncate">{item.topic || 'Tiada maklumat topik'}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-black ${item.pct >= 80 ? 'text-emerald-600' : item.pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{item.pct}%</p>
                    <div className="h-1 w-12 bg-slate-200 rounded-full mt-1 overflow-hidden">
                       <div className={`h-full ${item.pct >= 80 ? 'bg-emerald-500' : item.pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{width: `${item.pct}%`}} />
                    </div>
                  </div>
                </div>
              ))}
              {itemAnalysis.length === 0 && <div className="py-20 text-center text-slate-300 italic text-xs">Struktur item belum ditentukan bagi ujian ini.</div>}
            </div>
          </div>
        </div>
      </div>

      {/* AI Strategik & Global Analysis */}
      <div className="bg-slate-900 text-white p-14 rounded-[60px] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] group-hover:bg-indigo-500/20 transition-all duration-700" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-sky-500/10 rounded-full blur-[100px]" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10 mb-12">
          <div className="max-w-xl">
            <h3 className="text-4xl font-black italic tracking-tighter flex items-center gap-4">
              <BrainCircuit className="text-sky-400" size={40} /> Rumusan AI Strategik
            </h3>
            <p className="text-slate-400 text-lg mt-3 font-medium leading-relaxed">
              Jana analisis data pintar yang merumuskan trend pencapaian, item kritikal, dan strategi intervensi untuk seluruh kelas/darjah.
            </p>
          </div>
          <button 
            onClick={handleGlobalAI}
            disabled={aiLoading === 'global'}
            className="bg-white text-slate-900 px-12 py-6 rounded-[30px] font-black shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4 disabled:opacity-50 text-sm uppercase tracking-widest shrink-0"
          >
            {aiLoading === 'global' ? <Loader2 className="animate-spin" /> : <Sparkles className="text-sky-600" />}
            Jana Analisis Holistik
          </button>
        </div>

        {aiAnalysis.global && (
          <div className="bg-white/5 backdrop-blur-2xl p-12 rounded-[45px] border border-white/10 prose prose-invert max-w-none shadow-inner animate-in fade-in slide-in-from-bottom-6 duration-700">
             <div dangerouslySetInnerHTML={{ __html: aiAnalysis.global.replace(/\n/g, '<br/>') }} className="text-base leading-relaxed text-slate-300 font-medium" />
          </div>
        )}
      </div>

      {/* Kumpulan Sasaran (Intervensi) */}
      <div className="bg-red-50 p-12 rounded-[60px] border border-red-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-red-600 text-white rounded-[24px] shadow-xl shadow-red-200"><AlertCircle size={28} /></div>
            <div>
              <h3 className="text-2xl font-black text-red-900 uppercase italic tracking-tighter">Kumpulan Sasaran Intervensi</h3>
              <p className="text-red-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Status: Perlu Bimbingan Rapi (Markah &lt; 50%)</p>
            </div>
          </div>
          <div className="bg-white px-5 py-2 rounded-2xl border border-red-100 flex items-center gap-2">
            <span className="text-[10px] font-black text-red-800 uppercase">Bilangan Murid:</span>
            <span className="text-xl font-black text-red-600">{filteredStudents.filter(s => { const r = examResults.find(res => res.studentId === s.id); return r && r.marks < 50; }).length}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredStudents.filter(s => {
            const r = examResults.find(res => res.studentId === s.id);
            return r && r.marks < 50;
          }).map(s => {
            const r = examResults.find(res => res.studentId === s.id);
            return (
              <div key={s.id} className="bg-white p-6 rounded-[32px] border border-red-100 shadow-sm flex flex-col justify-between hover:scale-105 transition-all duration-300 group">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="font-black text-slate-900 text-sm uppercase leading-tight tracking-tight">{s.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{s.class}</p>
                  </div>
                  <div className="p-2 bg-red-50 text-red-600 rounded-xl font-black text-xs group-hover:bg-red-600 group-hover:text-white transition-colors">
                     {r?.marks}%
                  </div>
                </div>
                <button 
                  onClick={() => handleIndividualAI(s)}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-slate-50 text-slate-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest"
                >
                  {aiLoading === s.id ? <Loader2 size={16} className="animate-spin" /> : <><Sparkles size={16} /> Analisis Murid</>}
                </button>
              </div>
            );
          })}
          {examResults.filter(r => r.marks < 50).length === 0 && (
             <div className="col-span-full py-16 text-center bg-white/50 border-2 border-dashed border-red-200 rounded-[40px]">
                <UsersIcon className="mx-auto text-red-200 mb-3" size={32} />
                <p className="text-red-400 font-bold uppercase tracking-widest text-xs">Tahniah! Tiada murid dikesan di bawah tahap intervensi.</p>
             </div>
          )}
        </div>
      </div>
        </>
      )}

      {activeAnalysisTab === 'ranking' && (
        <div className="space-y-8">
          {/* Header Ranking */}
          <div className="bg-white p-8 rounded-[40px] border shadow-sm no-print flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <Trophy className="text-amber-500" /> Analisis Ranking & Kedudukan
              </h2>
              <p className="text-slate-500 text-sm font-medium mt-1">Kedudukan murid berdasarkan prestasi ujian semasa dan purata keseluruhan.</p>
            </div>
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-3xl border">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tapis Darjah</label>
                <select className="bg-white border-none rounded-xl px-4 py-2 text-xs font-bold outline-none shadow-sm" value={filterYear} onChange={e => { setFilterYear(e.target.value); setFilterClass([]); }}>
                  <option value="">Semua Darjah</option>
                  {years.map(y => <option key={y} value={y}>Darjah {y}</option>)}
                </select>
              </div>
              <div className="space-y-1 relative">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tapis Kelas</label>
                <button 
                  type="button"
                  onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
                  className="bg-white border-none rounded-xl px-4 py-2 text-xs font-bold outline-none shadow-sm flex items-center gap-2 min-w-[120px] justify-between"
                >
                  <span className="truncate">
                    {filterClass.length === 0 ? 'Semua Kelas' : `${filterClass.length} Kelas`}
                  </span>
                  <ChevronRight size={12} className={`transform transition-transform ${isClassDropdownOpen ? 'rotate-90' : ''}`} />
                </button>
                
                {isClassDropdownOpen && (
                  <div className="absolute z-50 mt-2 right-0 w-64 bg-white border rounded-2xl shadow-2xl p-4 max-h-64 overflow-y-auto custom-scrollbar">
                    <div className="space-y-1">
                      <button 
                        type="button"
                        onClick={() => setFilterClass([])}
                        className="w-full text-left px-2 py-1 text-[9px] font-black text-sky-600 uppercase hover:bg-sky-50 rounded"
                      >
                        Kosongkan
                      </button>
                      {classes.filter(c => !filterYear || c.startsWith(filterYear)).map(c => (
                        <label key={c} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-all">
                          <input 
                            type="checkbox" 
                            className="w-3 h-3 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                            checked={filterClass.includes(c)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFilterClass([...filterClass, c]);
                              } else {
                                setFilterClass(filterClass.filter(item => item !== c));
                              }
                            }}
                          />
                          <span className="text-[11px] font-bold text-slate-700">{c}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Ranking Ujian Semasa */}
            <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden">
              <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
                <div>
                  <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Ranking: {selectedExam?.name || 'Ujian Semasa'}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Berdasarkan markah peratusan ujian ini</p>
                </div>
                <button onClick={() => window.print()} className="p-2 bg-white border rounded-xl text-slate-400 hover:text-sky-600 shadow-sm transition-all"><Printer size={16}/></button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase border-b">
                    <tr>
                      <th className="px-6 py-4 text-center w-16">No</th>
                      <th className="px-6 py-4">Nama Murid</th>
                      <th className="px-6 py-4">Kelas</th>
                      <th className="px-6 py-4 text-center">Markah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rankingData.current.map((item, idx) => (
                      <tr key={item.student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-center">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs mx-auto ${idx === 0 ? 'bg-yellow-400 text-white' : idx === 1 ? 'bg-slate-300 text-white' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            {idx + 1}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900 uppercase text-xs">{item.student.name}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-[10px] font-bold text-slate-500 uppercase">{item.student.class}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-lg text-xs font-black ${item.isAbsent ? 'bg-red-50 text-red-400' : 'bg-sky-50 text-sky-600'}`}>
                            {item.isAbsent ? 'TH' : `${item.marks}%`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Ranking Keseluruhan (Purata) */}
            <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden">
              <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
                <div>
                  <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Ranking Keseluruhan (Purata)</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Purata markah dari semua ujian yang diduduki</p>
                </div>
                <button onClick={() => window.print()} className="p-2 bg-white border rounded-xl text-slate-400 hover:text-sky-600 shadow-sm transition-all"><Printer size={16}/></button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase border-b">
                    <tr>
                      <th className="px-6 py-4 text-center w-16">No</th>
                      <th className="px-6 py-4">Nama Murid</th>
                      <th className="px-6 py-4 text-center">Ujian</th>
                      <th className="px-6 py-4 text-center">Purata</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rankingData.overall.map((item, idx) => (
                      <tr key={item.student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-center">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs mx-auto ${idx === 0 ? 'bg-yellow-400 text-white' : idx === 1 ? 'bg-slate-300 text-white' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            {idx + 1}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900 uppercase text-xs">{item.student.name}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">{item.student.class}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-[10px] font-bold text-slate-500">{item.examCount}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-black">
                            {item.avg}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeAnalysisTab === 'pbd_comparison' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Header PBD */}
          <div className="bg-white p-8 rounded-[40px] border shadow-sm no-print flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <Award className="text-emerald-600" /> Perbandingan PBD Antara Kelas
              </h2>
              <p className="text-slate-500 text-sm font-medium mt-1">
                Bandingkan prestasi Tahap Penguasaan (TP) murid merentasi semua kelas bagi tahun akademik yang sama.
              </p>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-2xl border shrink-0">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Tahun / Darjah</span>
              {[1, 2, 3, 4, 5, 6].map(yr => (
                <button
                  key={yr}
                  onClick={() => { setSelectedPbdYear(yr); setInspectedPbdClass(null); }}
                  className={`w-10 h-10 rounded-xl font-black text-xs transition-all ${selectedPbdYear === yr ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>

          {/* KPI PBD Darjah */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex items-center justify-between group hover:scale-[1.03] transition-all duration-300">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Jumlah Dinilai</p>
                <p className="text-3xl font-black text-slate-900 tracking-tight">
                  {pbdYearStats.totalAssessed} <span className="text-sm text-slate-400 font-bold">/ {pbdYearStats.totalStudents}</span>
                </p>
                <p className="text-[10px] font-bold text-emerald-600 mt-1 uppercase">
                  {pbdYearStats.totalStudents > 0 ? ((pbdYearStats.totalAssessed / pbdYearStats.totalStudents) * 100).toFixed(1) : 0}% Lengkap
                </p>
              </div>
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><UsersIcon size={20} /></div>
            </div>

            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex items-center justify-between group hover:scale-[1.03] transition-all duration-300">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Purata TP Darjah</p>
                <p className="text-3xl font-black text-indigo-600 tracking-tight">TP {pbdYearStats.overallAverageTP}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Sasaran Kementerian: TP3</p>
              </div>
              <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl"><Award size={20} /></div>
            </div>

            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex items-center justify-between group hover:scale-[1.03] transition-all duration-300">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Kelas Terbaik</p>
                <p className="text-xl font-black text-slate-900 truncate max-w-[150px]">
                  {pbdYearStats.highestClass ? pbdYearStats.highestClass.className : 'Tiada Data'}
                </p>
                <p className="text-[10px] font-bold text-emerald-600 mt-1 uppercase">
                  {pbdYearStats.highestClass ? `Purata TP ${pbdYearStats.highestClass.averageTP}` : '-'}
                </p>
              </div>
              <div className="p-4 bg-yellow-50 text-yellow-600 rounded-2xl"><Trophy size={20} /></div>
            </div>

            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex items-center justify-between group hover:scale-[1.03] transition-all duration-300">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Kadar Penguasaan (Min TP3)</p>
                <p className="text-3xl font-black text-emerald-600 tracking-tight">{pbdYearStats.masteryRate}%</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Mencapai standard minimum</p>
              </div>
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><TrendingUp size={20} /></div>
            </div>
          </div>

          {/* Visualizations Side-by-Side */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Chart 1: Average TP per Class */}
            <div className="bg-white p-10 rounded-[40px] border shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2">
                    <Award className="text-emerald-500" size={18} /> Purata TP Mengikut Kelas
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Skala 1 hingga 6 (Target: Min TP3)</p>
                </div>
                <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full uppercase tracking-wider">Purata Skor</span>
              </div>
              
              <div className="h-[350px] w-full">
                {pbdComparisonData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pbdComparisonData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="className" axisLine={false} tickLine={false} fontSize={12} fontStyle="bold" dy={10} />
                      <YAxis domain={[0, 6]} tickCount={7} axisLine={false} tickLine={false} fontSize={10} />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }} 
                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                      />
                      <Bar dataKey="averageTP" name="Purata TP" radius={[12, 12, 0, 0]}>
                        {pbdComparisonData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.averageTP >= 4.5 ? '#10b981' : entry.averageTP >= 3.0 ? '#f59e0b' : '#ef4444'} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 italic text-xs">
                    Tiada data kelas untuk dipaparkan.
                  </div>
                )}
              </div>
            </div>

            {/* Chart 2: TP distribution stacked percentage */}
            <div className="bg-white p-10 rounded-[40px] border shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2">
                    <PieIcon className="text-indigo-500" size={18} /> Taburan Tahap Penguasaan (%)
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Pecahan mengikut kumpulan penguasaan kementerian</p>
                </div>
                <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full uppercase tracking-wider">Taburan Stacked</span>
              </div>
              
              <div className="h-[350px] w-full">
                {pbdComparisonData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pbdComparisonData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="className" axisLine={false} tickLine={false} fontSize={12} fontStyle="bold" dy={10} />
                      <YAxis domain={[0, 100]} unit="%" axisLine={false} tickLine={false} fontSize={10} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                      />
                      <Legend iconType="circle" />
                      <Bar dataKey="tp0Pct" stackId="a" fill="#cbd5e1" name="Belum Dinilai (%)" />
                      <Bar dataKey="tp12Pct" stackId="a" fill="#f43f5e" name="TP 1-2 (Intervensi) (%)" />
                      <Bar dataKey="tp34Pct" stackId="a" fill="#f59e0b" name="TP 3-4 (Menguasai) (%)" />
                      <Bar dataKey="tp56Pct" stackId="a" fill="#10b981" name="TP 5-6 (Cemerlang) (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 italic text-xs">
                    Tiada data kelas untuk dipaparkan.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Class comparison table */}
          <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden">
            <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Senarai Perbandingan PBD Kelas</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Metrik pencapaian lengkap mengikut kelas</p>
              </div>
              <button 
                onClick={() => window.print()} 
                className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow"
              >
                <Printer size={14} /> {t.print} Laporan
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase border-b">
                  <tr>
                    <th className="px-6 py-4 text-center w-16">No</th>
                    <th className="px-6 py-4">Nama Kelas</th>
                    <th className="px-6 py-4 text-center">Jumlah Murid</th>
                    <th className="px-6 py-4 text-center">Dinilai</th>
                    <th className="px-6 py-4 text-center">Purata TP</th>
                    <th className="px-6 py-4 text-center">TP 1-2</th>
                    <th className="px-6 py-4 text-center">TP 3-4</th>
                    <th className="px-6 py-4 text-center">TP 5-6</th>
                    <th className="px-6 py-4 text-center">Belum Dinilai</th>
                    <th className="px-6 py-4 text-center">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs font-bold text-slate-700">
                  {pbdComparisonData.map((c, idx) => (
                    <tr key={c.className} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 text-center">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[11px] mx-auto ${idx === 0 ? 'bg-amber-400 text-white' : idx === 1 ? 'bg-slate-300 text-white' : idx === 2 ? 'bg-orange-600/80 text-white' : 'bg-slate-100 text-slate-400'}`}>
                          {idx + 1}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-black text-slate-900 uppercase tracking-tight">{c.className}</p>
                      </td>
                      <td className="px-6 py-4 text-center">{c.totalStudents}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                          {c.assessedStudents} ({((c.assessedStudents / (c.totalStudents || 1)) * 100).toFixed(0)}%)
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-black ${c.averageTP >= 4.5 ? 'bg-emerald-50 text-emerald-600' : c.averageTP >= 3.0 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-500'}`}>
                          TP {c.averageTP}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded ${c.tp12 > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-300'}`}>
                          {c.tp12} ({c.tp12Pct}%)
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded ${c.tp34 > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-300'}`}>
                          {c.tp34} ({c.tp34Pct}%)
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded ${c.tp56 > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-300'}`}>
                          {c.tp56} ({c.tp56Pct}%)
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded ${c.tp0 > 0 ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 text-slate-300'}`}>
                          {c.tp0} ({c.tp0Pct}%)
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => { setInspectedPbdClass(c.className); setPbdSearchTerm(''); }}
                          className="px-3.5 py-1.5 bg-sky-50 text-sky-600 hover:bg-sky-600 hover:text-white rounded-xl transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 mx-auto shadow-sm"
                        >
                          <Search size={12} /> Teliti
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pbdComparisonData.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-16 text-center text-slate-300 italic text-xs">
                        Tiada data perbandingan kelas ditemui bagi tahun akademik ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PBD Class Inspector Modal */}
      {inspectedPbdClass && activeClassData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" 
            onClick={() => setInspectedPbdClass(null)} 
          />
          <div className="relative bg-white rounded-[50px] shadow-2xl w-full max-w-3xl p-12 animate-in zoom-in-95 duration-300 max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3.5 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-100">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">
                    Perincian Kelas: {inspectedPbdClass}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                    Purata TP Kelas: <span className="text-emerald-600 font-black">TP {activeClassData.averageTP}</span> • {activeClassData.assessedStudents} / {activeClassData.totalStudents} Dinilai
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setInspectedPbdClass(null)} 
                className="w-10 h-10 bg-slate-50 text-slate-300 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all flex items-center justify-center border border-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Bar inside Modal */}
            <div className="mb-6 relative shrink-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text"
                placeholder="Cari nama murid atau no. pendaftaran..."
                value={pbdSearchTerm}
                onChange={e => setPbdSearchTerm(e.target.value)}
                className="w-full pl-12 pr-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
              />
            </div>

            {/* Student List Grid */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
              {filteredInspectedStudents.map((entry, index) => (
                <div key={entry.student.id} className="p-5 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between hover:bg-slate-100/50 hover:scale-[1.01] transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-black shrink-0">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-black text-slate-900 uppercase text-xs leading-tight tracking-tight">
                        {entry.student.name}
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                        No. Daftar: {entry.student.regNo || '-'} • {entry.assessedCount} Standard Dinilai
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right flex items-center gap-4">
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Purata TP</p>
                      <p className={`text-sm font-black ${entry.averageTP >= 4.5 ? 'text-emerald-600' : entry.averageTP >= 3.0 ? 'text-amber-600' : entry.averageTP > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                        {entry.isAssessed ? `TP ${entry.averageTP}` : 'Belum Dinilai'}
                      </p>
                    </div>
                    {entry.isAssessed && (
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white ${entry.roundedTP >= 5 ? 'bg-emerald-500 shadow-emerald-100 shadow-md' : entry.roundedTP >= 3 ? 'bg-amber-500 shadow-amber-100 shadow-md' : 'bg-red-500 shadow-red-100 shadow-md'}`}>
                        {entry.roundedTP}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {filteredInspectedStudents.length === 0 && (
                <div className="py-16 text-center text-slate-300 italic text-xs">
                  Tiada murid sepadan ditemui dalam kelas ini.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end shrink-0">
              <button 
                onClick={() => setInspectedPbdClass(null)} 
                className="px-8 py-3.5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl"
              >
                Tutup Perincian
              </button>
            </div>
          </div>
        </div>
      )}
      {isGradeModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsGradeModalOpen(false)} />
          <div className="relative bg-white rounded-[50px] shadow-2xl w-full max-w-lg p-12 animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] overflow-hidden">
             <div className="flex justify-between items-center mb-8 shrink-0">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg"><Sliders size={20} /></div>
                   <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">Konfigurasi Gred</h3>
                </div>
                <button onClick={() => setIsGradeModalOpen(false)} className="text-slate-300 hover:text-slate-900"><X size={24}/></button>
             </div>

             <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-4">
                {gradeConfigs.map((g, idx) => (
                  <div key={g.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4 relative group">
                    <div className="flex items-center justify-between">
                       <input 
                         className="bg-transparent border-none text-xl font-black text-slate-900 uppercase p-0 focus:ring-0 w-24"
                         value={g.label}
                         onChange={(e) => {
                           const updated = [...gradeConfigs];
                           updated[idx].label = e.target.value.toUpperCase();
                           saveGrades(updated);
                         }}
                       />
                       <button 
                         onClick={() => {
                           const updated = gradeConfigs.filter((_, i) => i !== idx);
                           saveGrades(updated);
                         }}
                         className="text-slate-300 hover:text-red-500 transition-colors"
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
                              saveGrades(updated);
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
                              saveGrades(updated);
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
                              saveGrades(updated);
                            }}
                          />
                          <input 
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-mono uppercase"
                            value={g.color}
                            onChange={(e) => {
                              const updated = [...gradeConfigs];
                              updated[idx].color = e.target.value;
                              saveGrades(updated);
                            }}
                          />
                       </div>
                    </div>
                  </div>
                ))}
                
                <button 
                  onClick={() => {
                    const newGrade: GradeConfig = { id: Math.random().toString(36).substr(2, 5), label: 'BARU', min: 0, max: 0, color: '#94a3b8' };
                    saveGrades([...gradeConfigs, newGrade]);
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

      {/* AI Individual Analysis Popup */}
      {Object.entries(aiAnalysis).map(([sid, text]) => sid !== 'global' && (
        <div key={sid} className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setAiAnalysis(prev => { const n = {...prev}; delete n[sid]; return n; })} />
          <div className="relative bg-white rounded-[50px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] w-full max-w-2xl p-12 animate-in zoom-in-95 duration-300 max-h-[85vh] overflow-hidden flex flex-col">
             <div className="flex justify-between items-center mb-10 border-b border-slate-100 pb-8 shrink-0">
                <div className="flex items-center gap-5">
                   <div className="w-16 h-16 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center font-black text-2xl">
                     {students.find(st => st.id === sid)?.name.charAt(0)}
                   </div>
                   <div>
                     <h4 className="text-2xl font-black text-slate-900 italic tracking-tighter">Analisis Bimbingan AI</h4>
                     <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-1">{students.find(st => st.id === sid)?.name}</p>
                   </div>
                </div>
                <button onClick={() => setAiAnalysis(prev => { const n = {...prev}; delete n[sid]; return n; })} className="w-12 h-12 bg-slate-50 text-slate-300 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all flex items-center justify-center border border-slate-100 shadow-sm"><X size={24}/></button>
             </div>
             <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                <div className="text-sm text-slate-600 leading-relaxed space-y-4" dangerouslySetInnerHTML={{ __html: (text as string).replace(/\n/g, '<br/>') }} />
             </div>
             <div className="mt-8 pt-6 border-t border-slate-50 flex justify-end shrink-0">
                <button onClick={() => setAiAnalysis(prev => { const n = {...prev}; delete n[sid]; return n; })} className="px-8 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">Selesai Meneliti</button>
             </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Analytics;
