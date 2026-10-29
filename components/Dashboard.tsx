
import React, { useMemo } from 'react';
import { Student, Result, Exam, FocusPoint, User, Language, PBDRecord } from '../types';
import { Users, ClipboardCheck, Target, TrendingUp, Medal } from 'lucide-react';
import { COLORS } from '../constants';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from 'recharts';
import { translations } from '../src/translations';

interface DashboardProps {
  students: Student[];
  exams: Exam[];
  results: Result[];
  focusPoints: FocusPoint[];
  pbdRecords: PBDRecord[];
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ students, exams, results, focusPoints, pbdRecords, user }) => {
  const lang: Language = user.language || 'ms';
  const t = translations[lang];
  const isRTL = lang === 'ar';
  const totalStudents = students.length;
  
  const getStudentTotalPoints = (studentId: string) => {
    return focusPoints.filter(p => p.studentId === studentId).reduce((s, p) => s + p.points, 0);
  };

  const averageFocus = totalStudents > 0 
    ? Math.round(focusPoints.reduce((acc, curr) => acc + curr.points, 0) / totalStudents)
    : 0;

  // Kira prestasi purata sebenar daripada semua results
  const averagePerformance = useMemo(() => {
    if (results.length === 0) return 0;
    const validResults = results.filter(r => !r.isAbsent);
    if (validResults.length === 0) return 0;
    const total = validResults.reduce((acc, curr) => acc + curr.marks, 0);
    return Math.round(total / validResults.length);
  }, [results]);

  const pbdCompletion = useMemo(() => {
    if (students.length === 0) return 0;
    const studentsWithRecords = new Set(pbdRecords.map(r => r.studentId)).size;
    return Math.round((studentsWithRecords / students.length) * 100);
  }, [students, pbdRecords]);

  const classData = useMemo(() => {
    // Fix: Explicitly type the unique classes as string[] to ensure 'name' is string during sorting
    const uniqueClasses: string[] = Array.from(new Set(students.map(s => s.class)));
    return uniqueClasses.map(cls => ({
      name: cls,
      count: students.filter(s => s.class === cls).length
    })).sort((a,b) => a.name.localeCompare(b.name));
  }, [students]);

  const topStudentsYear1 = useMemo(() => {
    return students
      .filter(s => s.year === 1)
      .map(s => {
        const studentResults = results.filter(r => r.studentId === s.id && !r.isAbsent);
        const averageMark = studentResults.length > 0
          ? studentResults.reduce((acc, r) => acc + r.marks, 0) / studentResults.length
          : 0;
        return {
          ...s,
          averageMark,
          examCount: studentResults.length
        };
      })
      .filter(s => s.examCount > 0)
      .sort((a, b) => {
        if (b.averageMark !== a.averageMark) {
          return b.averageMark - a.averageMark;
        }
        return b.examCount - a.examCount;
      })
      .slice(0, 5);
  }, [students, results]);

  const topStudentsYear2 = useMemo(() => {
    return students
      .filter(s => s.year === 2)
      .map(s => {
        const studentResults = results.filter(r => r.studentId === s.id && !r.isAbsent);
        const averageMark = studentResults.length > 0
          ? studentResults.reduce((acc, r) => acc + r.marks, 0) / studentResults.length
          : 0;
        return {
          ...s,
          averageMark,
          examCount: studentResults.length
        };
      })
      .filter(s => s.examCount > 0)
      .sort((a, b) => {
        if (b.averageMark !== a.averageMark) {
          return b.averageMark - a.averageMark;
        }
        return b.examCount - a.examCount;
      })
      .slice(0, 5);
  }, [students, results]);

  return (
    <div className={`space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ${isRTL ? 'direction-rtl' : ''}`}>
      <div className={`flex justify-between items-end ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : ''}>
          <h1 className="text-2xl font-bold text-slate-900">{t.quick_stats}</h1>
          <p className="text-slate-500">{t.performance_overview}</p>
        </div>
        <div className="hidden md:block">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
            {t.year}: {new Date().getFullYear()}
          </span>
        </div>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${isRTL ? 'direction-rtl' : ''}`}>
        {[
          { label: t.total_students, val: totalStudents, icon: <Users size={20} />, color: 'bg-blue-500' },
          { label: t.pbd_transit, val: `${pbdCompletion}%`, icon: <Medal size={20} />, color: 'bg-emerald-500' },
          { label: t.focus, val: averageFocus, icon: <Target size={20} />, color: 'bg-orange-500' },
          { label: t.average_marks, val: `${averagePerformance}%`, icon: <TrendingUp size={20} />, color: 'bg-indigo-500' }
        ].map((stat, i) => (
          <div key={i} className={`bg-white p-6 rounded-2xl border shadow-sm hover:shadow-md transition-shadow ${isRTL ? 'text-right' : ''}`}>
            <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`${stat.color} text-white p-2.5 rounded-xl shadow-lg`}>
                {stat.icon}
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-slate-900">{stat.val}</span>
              <span className="text-sm font-medium text-slate-500">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border shadow-sm flex flex-col">
          <h3 className={`font-bold text-slate-900 mb-6 ${isRTL ? 'text-right' : ''}`}>{t.class_comparison}</h3>
          <div className="h-72 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} reversed={isRTL} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} orientation={isRTL ? 'right' : 'left'} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', textAlign: isRTL ? 'right' : 'left' }}
                />
                <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <h3 className={`font-bold text-slate-900 mb-6 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Medal className="text-yellow-500" size={20} />
            {t.top_student}
          </h3>
          <div className="space-y-6">
            {/* Tahun 1 Section */}
            <div>
              <div className="flex items-center justify-between border-b pb-1.5 mb-3">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  {lang === 'ms' ? 'Tahun 1' : lang === 'ar' ? 'السنة الأولى' : 'Year 1'}
                </span>
                <span className="text-[9px] font-bold bg-sky-50 text-sky-600 px-2 py-0.5 rounded-full uppercase">
                  {topStudentsYear1.length} {lang === 'ms' ? 'Murid' : lang === 'ar' ? 'طالب' : 'Students'}
                </span>
              </div>
              <div className="space-y-3">
                {topStudentsYear1.length > 0 ? (
                  topStudentsYear1.map((s, idx) => (
                    <div key={s.id} className={`flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-transparent hover:border-slate-100 transition-all ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                        idx === 0 ? 'bg-yellow-400 text-white' : 
                        idx === 1 ? 'bg-slate-300 text-white' : 
                        idx === 2 ? 'bg-orange-400 text-white' : 'bg-slate-200 text-slate-500'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : ''}`}>
                        <p className="text-xs font-bold text-slate-800 uppercase break-words leading-tight">{s.name}</p>
                        <p className="text-[9px] text-slate-400 font-bold mt-0.5">{s.class}</p>
                      </div>
                      <div className={isRTL ? 'text-left' : 'text-right'}>
                        <p className="text-sm font-black text-sky-600">{s.averageMark.toFixed(1)}%</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">
                          {lang === 'ms' ? `${s.examCount} Ujian` : lang === 'ar' ? `${s.examCount} اختبار` : `${s.examCount} ${s.examCount > 1 ? 'Exams' : 'Exam'}`}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-slate-400 italic text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-100">
                    {lang === 'ms' ? 'Tiada rekod Tahun 1.' : lang === 'ar' ? 'لا توجد بيانات للسنة الأولى.' : 'No Year 1 records.'}
                  </div>
                )}
              </div>
            </div>

            {/* Tahun 2 Section */}
            <div>
              <div className="flex items-center justify-between border-b pb-1.5 mb-3">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  {lang === 'ms' ? 'Tahun 2' : lang === 'ar' ? 'السنة الثانية' : 'Year 2'}
                </span>
                <span className="text-[9px] font-bold bg-sky-50 text-sky-600 px-2 py-0.5 rounded-full uppercase">
                  {topStudentsYear2.length} {lang === 'ms' ? 'Murid' : lang === 'ar' ? 'طالب' : 'Students'}
                </span>
              </div>
              <div className="space-y-3">
                {topStudentsYear2.length > 0 ? (
                  topStudentsYear2.map((s, idx) => (
                    <div key={s.id} className={`flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-transparent hover:border-slate-100 transition-all ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                        idx === 0 ? 'bg-yellow-400 text-white' : 
                        idx === 1 ? 'bg-slate-300 text-white' : 
                        idx === 2 ? 'bg-orange-400 text-white' : 'bg-slate-200 text-slate-500'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : ''}`}>
                        <p className="text-xs font-bold text-slate-800 uppercase break-words leading-tight">{s.name}</p>
                        <p className="text-[9px] text-slate-400 font-bold mt-0.5">{s.class}</p>
                      </div>
                      <div className={isRTL ? 'text-left' : 'text-right'}>
                        <p className="text-sm font-black text-sky-600">{s.averageMark.toFixed(1)}%</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">
                          {lang === 'ms' ? `${s.examCount} Ujian` : lang === 'ar' ? `${s.examCount} اختبار` : `${s.examCount} ${s.examCount > 1 ? 'Exams' : 'Exam'}`}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-slate-400 italic text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-100">
                    {lang === 'ms' ? 'Tiada rekod Tahun 2.' : lang === 'ar' ? 'لا توجد بيانات للسنة الثانية.' : 'No Year 2 records.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
