
import React, { useState, useMemo } from 'react';
import { Student, PBDSkill, PBDRecord, User, Language } from '../types';
import { 
  Plus, Search, ClipboardList, Filter, 
  CheckCircle, Trash2, X, AlertCircle, Tag, Printer,
  ChevronRight, ChevronDown, Edit3, Save,
  Award, TrendingUp, Users, BookOpen, Sparkles,
  Download, ArrowLeft, Check, FileSpreadsheet,
  UserCheck, FileText, ChevronLeft
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { translations } from '../src/translations';

interface PBDTransitProps {
  students: Student[];
  skills: PBDSkill[];
  records: PBDRecord[];
  classes: string[];
  years: number[];
  onAddSkill: (skill: Omit<PBDSkill, 'id'>) => void;
  onUpdateSkill: (skill: PBDSkill) => void;
  onDeleteSkill: (id: string) => void;
  onUpdateRecord: (record: Omit<PBDRecord, 'id'>) => void;
  user: User;
}

const PBDTransit: React.FC<PBDTransitProps> = ({ 
  students, skills, records, classes, years,
  onAddSkill, onUpdateSkill, onDeleteSkill, onUpdateRecord, user 
}) => {
  const lang: Language = user.language || 'ms';
  const t = translations[lang];
  const isRTL = lang === 'ar';

  const [activeView, setActiveView] = useState<'ENTRY' | 'SUMMARY' | 'ANALYSIS' | 'INDIVIDUAL' | 'REPORT'>('ENTRY');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [individualTeacherNotes, setIndividualTeacherNotes] = useState<Record<string, string>>({});
  const [selectedYear, setSelectedYear] = useState<number>(years[0] || 1);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const toggleClassSelection = (className: string) => {
    if (selectedClasses.includes(className)) {
      setSelectedClasses(selectedClasses.filter(c => c !== className));
    } else {
      setSelectedClasses([...selectedClasses, className]);
    }
  };

  const [selectedSkillId, setSelectedSkillId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<PBDSkill | null>(null);
  const [expandedTp, setExpandedTp] = useState<number | null>(null);

  const [skillForm, setSkillForm] = useState<Omit<PBDSkill, 'id'>>({
    code: '',
    description: '',
    year: selectedYear
  });

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      s.year === selectedYear && 
      (selectedClasses.length === 0 ? true : selectedClasses.includes(s.class)) &&
      s.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [students, selectedYear, selectedClasses, searchTerm]);

  const filteredSkills = useMemo(() => {
    // Susun standard pembelajaran mengikut kod secara numerik (cth: 1.1, 1.2, 1.10, 2.1)
    return skills
      .filter(s => s.year === selectedYear)
      .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));
  }, [skills, selectedYear]);

  const analysisData = useMemo(() => {
    const list = students.filter(s => 
      s.year === selectedYear && 
      (selectedClasses.length === 0 ? true : selectedClasses.includes(s.class))
    );

    const tpCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const studentsByTp: Record<number, Array<{ props: Student; average: number; count: number }>> = {
      0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
    };

    list.forEach(student => {
      const studentRecords = records.filter(r => r.studentId === student.id && filteredSkills.some(sk => sk.id === r.skillId));
      const validRecords = studentRecords.filter(r => r.tpLevel > 0);
      
      if (validRecords.length === 0) {
        tpCounts[0]++;
        studentsByTp[0].push({ props: student, average: 0, count: 0 });
      } else {
        const sum = validRecords.reduce((acc, r) => acc + r.tpLevel, 0);
        const avg = sum / validRecords.length;
        const rounded = Math.round(avg);
        
        if (rounded >= 1 && rounded <= 6) {
          tpCounts[rounded as 1|2|3|4|5|6]++;
          studentsByTp[rounded].push({ props: student, average: avg, count: validRecords.length });
        } else {
          tpCounts[0]++;
          studentsByTp[0].push({ props: student, average: 0, count: 0 });
        }
      }
    });

    return {
      totalStudents: list.length,
      tpCounts,
      studentsByTp
    };
  }, [students, records, selectedYear, selectedClasses, filteredSkills]);

  const selectedSkill = useMemo(() => {
    return skills.find(s => s.id === selectedSkillId);
  }, [skills, selectedSkillId]);

  const [selectedSkillIdsForReport, setSelectedSkillIdsForReport] = useState<string[] | null>(null);

  const reportSkills = useMemo(() => {
    if (selectedSkillIdsForReport === null) {
      return filteredSkills;
    }
    return filteredSkills.filter(s => selectedSkillIdsForReport.includes(s.id));
  }, [filteredSkills, selectedSkillIdsForReport]);

  const toggleSkillForReport = (skillId: string) => {
    if (selectedSkillIdsForReport === null) {
      const allIds = filteredSkills.map(s => s.id);
      setSelectedSkillIdsForReport(allIds.filter(id => id !== skillId));
    } else {
      if (selectedSkillIdsForReport.includes(skillId)) {
        setSelectedSkillIdsForReport(selectedSkillIdsForReport.filter(id => id !== skillId));
      } else {
        setSelectedSkillIdsForReport([...selectedSkillIdsForReport, skillId]);
      }
    }
  };

  const currentIndividualStudent = useMemo(() => {
    if (selectedStudentId) {
      const found = filteredStudents.find(s => s.id === selectedStudentId);
      if (found) return found;
    }
    return filteredStudents[0] || null;
  }, [filteredStudents, selectedStudentId]);

  const currentStudentPbdAnalysis = useMemo(() => {
    if (!currentIndividualStudent) return null;

    const studentRecords = records.filter(
      r => r.studentId === currentIndividualStudent.id && reportSkills.some(sk => sk.id === r.skillId)
    );

    const tpDistribution: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    let totalTpSum = 0;
    let validCount = 0;

    reportSkills.forEach(skill => {
      const rec = studentRecords.find(r => r.skillId === skill.id);
      const tp = rec ? rec.tpLevel : 0;
      if (tp >= 1 && tp <= 6) {
        tpDistribution[tp]++;
        totalTpSum += tp;
        validCount++;
      } else {
        tpDistribution[0]++;
      }
    });

    const averageTp = validCount > 0 ? totalTpSum / validCount : 0;
    const roundedTp = Math.round(averageTp);

    // Class average calculation
    const classStudentIds = filteredStudents.map(s => s.id);
    const classRecords = records.filter(
      r => classStudentIds.includes(r.studentId) && reportSkills.some(sk => sk.id === r.skillId) && r.tpLevel > 0
    );
    const classAverageTp = classRecords.length > 0
      ? classRecords.reduce((sum, r) => sum + r.tpLevel, 0) / classRecords.length
      : 0;

    return {
      studentRecords,
      tpDistribution,
      validCount,
      totalSkills: reportSkills.length,
      averageTp,
      roundedTp,
      classAverageTp
    };
  }, [currentIndividualStudent, records, reportSkills, filteredStudents]);

  const getAutoComment = (roundedTp: number) => {
    if (roundedTp === 6) {
      return 'Tahniah! Murid menunjukkan pencapaian cemerlang dalam menguasai semua standard kandungan Bahasa Arab. Disyorkan sebagai pembimbing rakan sebaya (buddy system).';
    } else if (roundedTp === 5) {
      return 'Pencapaian sangat baik. Murid menguasai kemahiran Bahasa Arab dengan yakin dan konsisten. Teruskan usaha untuk mengekalkan kecemerlangan.';
    } else if (roundedTp === 4) {
      return 'Pencapaian baik. Murid telah menguasai kebanyakan standard kandungan secara berkesan. Galakan berterusan diberikan untuk meningkatkan penguasaan kosa kata.';
    } else if (roundedTp === 3) {
      return 'Pencapaian memuaskan. Murid mencapai tahap penguasaan minimum. Digalakkan memperbanyakkan latihan bertulis dan ulangan kosa kata Bahasa Arab.';
    } else if (roundedTp === 2) {
      return 'Pencapaian tahap sederhana. Murid memerlukan bimbingan guru dan latihan tambahan berkala untuk mengukuhkan kemahiran asas Bahasa Arab.';
    } else if (roundedTp === 1) {
      return 'Memerlukan intervensi berfokus. Murid memerlukan modul bimbingan khas secara berterusan serta perhatian khusus guru.';
    }
    return 'Pentaksiran belum lengkap. Sila rekodkan tahap penguasaan bagi standard kandungan murid ini.';
  };

  const handleSkillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSkill) {
      onUpdateSkill({ ...editingSkill, ...skillForm });
    } else {
      onAddSkill({ ...skillForm, year: selectedYear });
    }
    setIsSkillModalOpen(false);
    setEditingSkill(null);
    setSkillForm({ code: '', description: '', year: selectedYear });
  };

  const getTP = (studentId: string, skillId: string) => {
    const record = records.find(r => r.studentId === studentId && r.skillId === skillId);
    return record ? record.tpLevel : 0;
  };

  const exportToExcel = () => {
    const data = filteredStudents.map((student, index) => {
      const row: any = {
        'Bil': index + 1,
        'Nama Murid': student.name,
        'No. Pendaftaran': student.regNo,
        'Kelas': student.class,
        'Tahun': student.year
      };
      
      // Add a column for each skill code
      filteredSkills.forEach(skill => {
        const tp = getTP(student.id, skill.id);
        row[skill.code] = tp === 0 ? '-' : tp;
      });

      // Calculate average & rounded TP
      const studentRecords = records.filter(r => r.studentId === student.id && filteredSkills.some(sk => sk.id === r.skillId));
      const validRecords = studentRecords.filter(r => r.tpLevel > 0);
      if (validRecords.length === 0) {
        row['Purata TP'] = 0;
        row['TP Keseluruhan'] = 'Belum Dinilai';
      } else {
        const sum = validRecords.reduce((acc, r) => acc + r.tpLevel, 0);
        const avg = sum / validRecords.length;
        row['Purata TP'] = Number(avg.toFixed(2));
        row['TP Keseluruhan'] = Math.round(avg);
      }
      
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transit PBD");
    
    // Sheet 2: Content Standard Definitions
    const skillData = filteredSkills.map((skill, index) => ({
      'Bil': index + 1,
      'Kod Standard Kandungan': skill.code,
      'Penerangan': skill.description,
      'Tahun': skill.year
    }));
    const skillWorksheet = XLSX.utils.json_to_sheet(skillData);
    XLSX.utils.book_append_sheet(workbook, skillWorksheet, "Senarai Standard Kandungan");

    const classNameText = selectedClasses.length > 0 ? `_${selectedClasses.join('_')}` : '_Semua_Kelas';
    XLSX.writeFile(workbook, `Rekod_PBD_Tahun_${selectedYear}${classNameText}.xlsx`);
  };

  const handleTPChange = (studentId: string, skillId: string, tp: number) => {
    onUpdateRecord({
      studentId,
      skillId,
      tpLevel: tp,
      date: new Date().toISOString(),
      teacherId: user.id
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : ''}>
          <h2 className={`text-2xl font-bold text-slate-900 flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <ClipboardList className="text-emerald-600" /> {t.pbd_transit}
          </h2>
          <p className="text-slate-500">{t.pbd_desc}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 no-print">
          <div className="flex bg-white p-1 rounded-2xl border shadow-sm">
            <button 
              onClick={() => setActiveView('ENTRY')} 
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'ENTRY' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Kemasukan
            </button>
            <button 
              onClick={() => setActiveView('SUMMARY')} 
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'SUMMARY' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Rumusan
            </button>
            <button 
              onClick={() => {
                setActiveView('ANALYSIS');
                setExpandedTp(null); // Reset when navigating
              }} 
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'ANALYSIS' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Analisis Purata
            </button>
            <button 
              onClick={() => setActiveView('INDIVIDUAL')} 
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'INDIVIDUAL' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Laporan Individu
            </button>
            <button 
              onClick={() => setActiveView('REPORT')} 
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'REPORT' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Laporan Panitia
            </button>
          </div>

          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-white border px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm text-emerald-600"
            title="Muat turun data PBD dalam format Excel"
          >
            <FileSpreadsheet size={16} /> Excel
          </button>

          <button 
            onClick={() => {
              setActiveView('REPORT');
              setTimeout(() => {
                window.print();
              }, 150);
            }}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
          >
            <Printer size={16} /> Cetak Laporan
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={`bg-white p-6 rounded-[32px] border shadow-sm no-print grid grid-cols-1 md:grid-cols-4 gap-4 ${isRTL ? 'direction-rtl' : ''}`}>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.filter_year}</label>
          <select 
            className="w-full border rounded-xl px-4 py-2.5 text-sm font-bold bg-slate-50"
            value={selectedYear}
            onChange={e => {
              const y = parseInt(e.target.value);
              setSelectedYear(y);
              setSkillForm(prev => ({ ...prev, year: y }));
              setSelectedSkillId('');
            }}
          >
            {years.map(y => <option key={y} value={y}>Tahun {y}</option>)}
          </select>
        </div>
        <div className="space-y-1 relative">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.filter_class}</label>
          <button 
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full border rounded-xl px-4 py-2.5 text-sm font-bold bg-slate-50 text-left flex justify-between items-center hover:bg-slate-100 transition-colors"
          >
            <span className="truncate">
              {selectedClasses.length === 0 
                ? 'Semua Kelas' 
                : selectedClasses.length === 1 
                  ? selectedClasses[0] 
                  : `${selectedClasses.length} Kelas`}
            </span>
            <ChevronDown size={16} className={`text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
              <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto p-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClasses([]);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-black uppercase flex items-center justify-between transition-colors ${selectedClasses.length === 0 ? 'bg-emerald-50 text-emerald-600' : 'hover:bg-slate-50 text-slate-700'}`}
                >
                  <span>Semua Kelas</span>
                  {selectedClasses.length === 0 && <Check size={14} />}
                </button>
                <div className="h-[1px] bg-slate-100 my-1" />
                {classes.map(c => {
                  const isSelected = selectedClasses.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        toggleClassSelection(c);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between transition-colors ${isSelected ? 'bg-emerald-50 text-emerald-600' : 'hover:bg-slate-50 text-slate-700'}`}
                    >
                      <span className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          readOnly
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 border-slate-300 pointer-events-none"
                        />
                        {c}
                      </span>
                      {isSelected && <Check size={14} />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.learning_standard}</label>
          <div className="flex gap-2">
            <select 
              className="flex-1 border rounded-xl px-4 py-2.5 text-sm font-bold bg-slate-50"
              disabled={activeView !== 'ENTRY'}
              value={selectedSkillId}
              onChange={e => setSelectedSkillId(e.target.value)}
            >
              <option value="">{activeView !== 'ENTRY' ? 'Paparan Rumusan/Analisis' : 'Pilih Standard Kandungan'}</option>
              {filteredSkills.map(s => (
                <option key={s.id} value={s.id}>{s.code} - {s.description.substring(0, 40)}...</option>
              ))}
            </select>
            <button 
              onClick={() => setIsSkillModalOpen(true)}
              className="p-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-all"
              title="Tambah Standard Kandungan"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {activeView === 'ENTRY' ? (
        <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden">
          <div className="p-6 border-b bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                <ClipboardList size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 uppercase text-xs tracking-widest">
                  {selectedClasses.length > 0 ? `Rekod Transit: ${selectedClasses.join(', ')}` : 'Rekod Transit: Semua Kelas'}
                </h3>
                {selectedSkill && (
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                    {selectedSkill.code}: {selectedSkill.description}
                  </p>
                )}
              </div>
            </div>
            <div className="relative no-print">
              <Search size={16} className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400`} />
              <input 
                type="text" 
                placeholder={t.search_name_id}
                className={`border rounded-xl ${isRTL ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4'} py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 w-64`}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b">
                <tr>
                  <th className="px-8 py-4 w-16 text-center">#</th>
                  <th className="px-8 py-4">Nama Murid</th>
                  <th className="px-8 py-4 text-center">Tahap Penguasaan (TP)</th>
                  <th className="px-8 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredStudents.map((student, idx) => {
                  const tp = selectedSkillId ? getTP(student.id, selectedSkillId) : 0;
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition-all group">
                      <td className="px-8 py-4 text-center text-xs font-bold text-slate-400">{idx + 1}</td>
                      <td className="px-8 py-4">
                        <p className="font-bold text-slate-900 uppercase text-xs">{student.name}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">{student.regNo}</p>
                      </td>
                      <td className="px-8 py-4">
                        <div className="flex justify-center gap-1">
                          {[1, 2, 3, 4, 5, 6].map(level => (
                            <button
                              key={level}
                              disabled={!selectedSkillId}
                              onClick={() => handleTPChange(student.id, selectedSkillId, level)}
                              className={`w-10 h-10 rounded-xl font-black text-xs transition-all border-2 ${
                                tp === level 
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg scale-110' 
                                  : 'bg-white text-slate-400 border-slate-100 hover:border-emerald-200 hover:text-emerald-600'
                              } disabled:opacity-30 disabled:cursor-not-allowed`}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-8 py-4 text-center">
                        {tp > 0 ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase">
                            <CheckCircle size={12} /> Selesai
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-400 rounded-full text-[10px] font-black uppercase">
                            Belum Dinilai
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-20 text-center text-slate-400 italic text-sm">
                      {selectedClasses.length > 0 ? 'Tiada murid ditemui dalam kelas terpilih.' : 'Tiada murid ditemui untuk Semua Kelas.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeView === 'SUMMARY' ? (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Jumlah Standard</p>
              <p className="text-3xl font-black text-slate-900">{filteredSkills.length}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Purata Penguasaan (TP)</p>
              <p className="text-3xl font-black text-emerald-600">
                {(() => {
                  const classRecords = records.filter(r => filteredStudents.some(s => s.id === r.studentId) && filteredSkills.some(sk => sk.id === r.skillId));
                  if (classRecords.length === 0) return '0.0';
                  const avg = classRecords.reduce((acc, curr) => acc + curr.tpLevel, 0) / classRecords.length;
                  return avg.toFixed(1);
                })()}
              </p>
            </div>
            <div className="bg-white p-6 rounded-3xl border shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kadar Selesai</p>
              <p className="text-3xl font-black text-sky-600">
                {(() => {
                  const totalPossible = filteredStudents.length * filteredSkills.length;
                  if (totalPossible === 0) return '0%';
                  const actualRecords = records.filter(r => filteredStudents.some(s => s.id === r.studentId) && filteredSkills.some(sk => sk.id === r.skillId)).length;
                  return `${Math.round((actualRecords / totalPossible) * 100)}%`;
                })()}
              </p>
            </div>
          </div>

          {/* Detailed Matrix */}
          <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden">
            <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Matriks Penguasaan Keseluruhan</h3>
              <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full uppercase tracking-widest">Tahun {selectedYear} {selectedClasses.length > 0 ? `- ${selectedClasses.join(', ')}` : '- Semua Kelas'}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 text-[9px] font-black uppercase tracking-widest border-b">
                  <tr>
                    <th className="px-6 py-4 border-r sticky left-0 bg-slate-50 z-10">Nama Murid</th>
                    {filteredSkills.map(skill => (
                      <th key={skill.id} className="px-4 py-4 text-center border-r min-w-[80px]" title={skill.description}>
                        {skill.code}
                      </th>
                    ))}
                    <th className="px-6 py-4 text-center bg-slate-100">Purata TP</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredStudents.map(student => {
                    let totalTP = 0;
                    let count = 0;
                    return (
                      <tr key={student.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="px-6 py-4 border-r font-bold text-slate-900 uppercase text-[10px] sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                          <div>{student.name}</div>
                          {selectedClasses.length !== 1 && <div className="text-[8px] text-slate-400 font-bold mt-0.5">{student.class}</div>}
                        </td>
                        {filteredSkills.map(skill => {
                          const tp = getTP(student.id, skill.id);
                          if (tp > 0) {
                            totalTP += tp;
                            count++;
                          }
                          return (
                            <td key={skill.id} className="px-4 py-4 text-center border-r">
                              <span className={`inline-block w-8 h-8 leading-8 rounded-lg font-black text-xs ${
                                tp === 6 ? 'bg-emerald-600 text-white' :
                                tp === 5 ? 'bg-emerald-500 text-white' :
                                tp === 4 ? 'bg-emerald-400 text-white' :
                                tp === 3 ? 'bg-amber-400 text-white' :
                                tp === 2 ? 'bg-orange-400 text-white' :
                                tp === 1 ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-300'
                              }`}>
                                {tp || '-'}
                              </span>
                            </td>
                          );
                        })}
                        <td className="px-6 py-4 text-center bg-slate-50/50 font-black text-slate-900 text-xs">
                          {count > 0 ? (totalTP / count).toFixed(1) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={filteredSkills.length + 2} className="py-20 text-center text-slate-400 italic text-sm">
                        Tiada data untuk dipaparkan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* TP Distribution Summary */}
          <div className="bg-white p-8 rounded-[40px] border shadow-sm">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-8 border-b pb-4">Taburan Tahap Penguasaan (TP) Mengikut Kemahiran</h3>
            <div className="space-y-8">
              {filteredSkills.map(skill => {
                const skillRecords = records.filter(r => r.skillId === skill.id && filteredStudents.some(s => s.id === r.studentId));
                const distribution = [1, 2, 3, 4, 5, 6].map(level => ({
                  level,
                  count: skillRecords.filter(r => r.tpLevel === level).length
                }));
                const totalEvaluated = skillRecords.length;

                return (
                  <div key={skill.id} className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{skill.code}</span>
                        <p className="text-xs font-bold text-slate-700">{skill.description}</p>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase">{totalEvaluated} / {filteredStudents.length} Murid</span>
                    </div>
                    <div className="flex h-8 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                      {distribution.map(d => {
                        const pct = totalEvaluated > 0 ? (d.count / totalEvaluated) * 100 : 0;
                        if (pct === 0) return null;
                        return (
                          <div 
                            key={d.level} 
                            style={{ width: `${pct}%` }}
                            className={`h-full flex items-center justify-center text-[9px] font-black text-white transition-all hover:brightness-110 relative group ${
                              d.level === 6 ? 'bg-emerald-700' :
                              d.level === 5 ? 'bg-emerald-600' :
                              d.level === 4 ? 'bg-emerald-500' :
                              d.level === 3 ? 'bg-amber-500' :
                              d.level === 2 ? 'bg-orange-500' : 'bg-red-500'
                            }`}
                          >
                            TP{d.level} ({d.count})
                            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-900 text-white px-2 py-1 rounded text-[8px] whitespace-nowrap z-20">
                              TP{d.level}: {d.count} Murid ({Math.round(pct)}%)
                            </div>
                          </div>
                        );
                      })}
                      {totalEvaluated === 0 && <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-slate-300 uppercase italic">Belum Dinilai</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : activeView === 'ANALYSIS' ? (
        <div className="space-y-6">
          {/* Analysis Header Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8 rounded-[40px] shadow-sm relative overflow-hidden">
            <div className="relative z-10 space-y-3">
              <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/30">
                PBD Analytics Dashboard
              </span>
              <h3 className="text-2xl font-black uppercase tracking-tight italic">
                Analisis Tahap Penguasaan Purata
              </h3>
              <p className="text-slate-300 text-sm max-w-2xl font-medium">
                Analisis holistik berdasarkan purata matematik pencapaian prestasi standard kandungan bagi setiap murid dalam {selectedClasses.length > 0 ? `Kelas ${selectedClasses.join(', ')}` : `Tahun ${selectedYear}`}.
              </p>
            </div>
            <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 opacity-10 pointer-events-none">
              <ClipboardList size={300} />
            </div>
          </div>

          {/* Quick Analytics Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-3xl border shadow-sm flex items-center gap-4">
              <div className="p-4 bg-slate-100 text-slate-700 rounded-2xl">
                <Users size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Jumlah Murid</p>
                <p className="text-2xl font-black text-slate-900 leading-none">{analysisData.totalStudents}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border shadow-sm flex items-center gap-4">
              <div className="p-4 bg-emerald-100 text-emerald-600 rounded-2xl">
                <Award size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Lepas Sasaran (TP 4-6)</p>
                <p className="text-2xl font-black text-slate-900 leading-none">
                  {analysisData.tpCounts[4] + analysisData.tpCounts[5] + analysisData.tpCounts[6]} <span className="text-xs font-bold text-slate-400">({analysisData.totalStudents > 0 ? Math.round(((analysisData.tpCounts[4] + analysisData.tpCounts[5] + analysisData.tpCounts[6]) / analysisData.totalStudents) * 100) : 0}%)</span>
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border shadow-sm flex items-center gap-4">
              <div className="p-4 bg-amber-100 text-amber-600 rounded-2xl">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Tolak Sederhana (TP 3)</p>
                <p className="text-2xl font-black text-slate-900 leading-none">
                  {analysisData.tpCounts[3]} <span className="text-xs font-bold text-slate-400">({analysisData.totalStudents > 0 ? Math.round((analysisData.tpCounts[3] / analysisData.totalStudents) * 105) : 0}%)</span>
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border shadow-sm flex items-center gap-4 border-rose-100 bg-rose-50/10">
              <div className="p-4 bg-rose-100 text-rose-600 rounded-2xl">
                <AlertCircle size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest leading-none mb-1">Perlu Intervensi (TP 1-2)</p>
                <p className="text-2xl font-black text-rose-600 leading-none">
                  {analysisData.tpCounts[1] + analysisData.tpCounts[2]} <span className="text-xs font-bold text-rose-400">({analysisData.totalStudents > 0 ? Math.round(((analysisData.tpCounts[1] + analysisData.tpCounts[2]) / analysisData.totalStudents) * 100) : 0}%)</span>
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Stacked Visual Distribution Progress Bar */}
          <div className="bg-white p-8 rounded-[40px] border shadow-sm">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 mb-4">Gagasan Taburan Peratusan Tahap Penguasaan Purata</h4>
            <div className="h-6 rounded-2xl overflow-hidden flex bg-slate-100 border border-slate-200">
              {[6, 5, 4, 3, 2, 1, 0].map(level => {
                const count = analysisData.tpCounts[level as 0|1|2|3|4|5|6];
                const pct = analysisData.totalStudents > 0 ? (count / analysisData.totalStudents) * 100 : 0;
                if (pct === 0) return null;

                const colorClass = 
                  level === 6 ? 'bg-emerald-600' :
                  level === 5 ? 'bg-teal-500' :
                  level === 4 ? 'bg-sky-500' :
                  level === 3 ? 'bg-amber-500' :
                  level === 2 ? 'bg-orange-500' :
                  level === 1 ? 'bg-rose-500' :
                  'bg-slate-300';

                return (
                  <div 
                    key={level} 
                    style={{ width: `${pct}%` }} 
                    className={`${colorClass} h-full transition-all hover:brightness-105 flex items-center justify-center text-[10px] font-bold text-white relative group cursor-pointer`}
                    onClick={() => {
                      setExpandedTp(expandedTp === level ? null : level);
                    }}
                  >
                    {level === 0 ? 'Belum' : `TP${level}`} ({count})
                    <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-905 text-white px-3 py-1.5 rounded-lg text-[9px] font-bold whitespace-nowrap z-20 shadow-xl border border-white/10">
                      {level === 0 ? 'Belum Dinilai' : `Tahap Penguasaan Purata ${level}`}: {count} Murid ({Math.round(pct)}%)
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-4 mt-6 text-[10px] font-black uppercase text-slate-500">
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-600" /> TP 6 (Cemerlang)</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-teal-500" /> TP 5 (Sangat Baik)</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-sky-500" /> TP 4 (Baik)</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500" /> TP 3 (Memuaskan)</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-500" /> TP 2 (Sederhana)</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-rose-500" /> TP 1 (Perlu Bimbingan)</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-300" /> Belum Dinilai</div>
            </div>
          </div>

          {/* Interactive TP Distribution Collapsible Groups */}
          <div className="space-y-4">
            {[
              { level: 6, title: 'Tahap Penguasaan Purata 6 (Cemerlang)', desc: 'Murid menyedari keupayaan diri dalam belajar dan berupaya melatih/membimbing orang lain.', color: 'border-emerald-200 bg-emerald-50/10 text-emerald-800' },
              { level: 5, title: 'Tahap Penguasaan Purata 5 (Sangat Baik)', desc: 'Murid melaksanakan sesuatu kemahiran pada situasi baru secara konsisten dengan sikap positif.', color: 'border-teal-200 bg-teal-50/10 text-teal-800' },
              { level: 4, title: 'Tahap Penguasaan Purata 4 (Baik)', desc: 'Murid dapat menyelesaikan masalah baru berasaskan kemahiran yang telah dikuasai dengan baik.', color: 'border-sky-200 bg-sky-50/10 text-sky-800' },
              { level: 3, title: 'Tahap Penguasaan Purata 3 (Memuaskan)', desc: 'Murid melaksanakan kemahiran asas dan memahami konsep pembelajaran dengan memuaskan.', color: 'border-amber-200 bg-amber-50/10 text-amber-800' },
              { level: 2, title: 'Tahap Penguasaan Purata 2 (Sederhana)', desc: 'Murid mula menunjukkan kefahaman tetapi masih memerlukan bantuan guru bagi perkara asas.', color: 'border-orange-200 bg-orange-50/10 text-orange-800' },
              { level: 1, title: 'Tahap Penguasaan Purata 1 (Perlu Usaha / Intervensi)', desc: 'Murid sangat lemah dan memerlukan bimbingan guru secara berterusan serta intervensi agresif.', color: 'border-rose-200 bg-rose-50/10 text-rose-800' },
              { level: 0, title: 'Belum Dinilai', desc: 'Murid yang belum direkodkan markah penilaian bagi mana-mana Standard Kandungan.', color: 'border-slate-200 bg-slate-50/10 text-slate-700' }
            ].map(group => {
              const studentsInTp = (analysisData.studentsByTp[group.level] || []).filter(s => 
                searchTerm === '' ? true : s.props.name.toLowerCase().includes(searchTerm.toLowerCase())
              );
              const isOpen = expandedTp === group.level;
              const hasStudents = studentsInTp.length > 0;

              return (
                <div 
                  key={group.level} 
                  className={`border-[2px] rounded-[32px] overflow-hidden transition-all duration-300 text-left ${group.color} ${isOpen ? 'shadow-md border-slate-600/30' : ''}`}
                >
                  <button
                    onClick={() => setExpandedTp(isOpen ? null : group.level)}
                    className="w-full flex items-center justify-between p-6 cursor-pointer focus:outline-none transition-colors hover:bg-slate-50/20"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm border ${
                        group.level === 6 ? 'bg-emerald-100 border-emerald-300 text-emerald-800' :
                        group.level === 5 ? 'bg-teal-100 border-teal-300 text-teal-800' :
                        group.level === 4 ? 'bg-sky-100 border-sky-300 text-sky-800' :
                        group.level === 3 ? 'bg-amber-100 border-amber-300 text-amber-800' :
                        group.level === 2 ? 'bg-orange-100 border-orange-300 text-orange-800' :
                        group.level === 1 ? 'bg-rose-100 border-rose-300 text-rose-800' :
                        'bg-slate-100 border-slate-300 text-slate-800'
                      }`}>
                        {group.level === 0 ? '-' : group.level}
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm font-black tracking-tight block">{group.title}</span>
                        <span className="text-[10px] font-bold text-slate-500 block max-w-xl leading-snug">{group.desc}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="text-xs font-black bg-white px-4 py-2 rounded-2xl border shadow-sm flex items-center gap-2">
                        <Users size={14} /> {studentsInTp.length} Murid
                      </span>
                      {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t bg-white p-6 space-y-4 animate-in slide-in-from-top-4 duration-300">
                      {hasStudents ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {studentsInTp.map(entry => (
                            <div 
                              key={entry.props.id} 
                              className="p-4 bg-slate-50/50 hover:bg-slate-50 border rounded-2xl transition-all flex items-center justify-between gap-2"
                            >
                              <div className="space-y-1">
                                <span className="text-xs font-black text-slate-900 block uppercase tracking-tight">{entry.props.name}</span>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                                  <span>{entry.props.class}</span>
                                  <span>•</span>
                                  <span>{entry.props.regNo}</span>
                                </div>
                                <span className="inline-block text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                  {entry.count} / {filteredSkills.length} S.P. Dinilai
                                </span>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                {group.level !== 0 && (
                                  <div className="text-right">
                                    <span className="text-xl font-black text-slate-900 block leading-none">
                                      {entry.average.toFixed(2)}
                                    </span>
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mt-0.5">
                                      Purata TP
                                    </span>
                                  </div>
                                )}
                                <button
                                  onClick={() => {
                                    setSelectedStudentId(entry.props.id);
                                    setActiveView('INDIVIDUAL');
                                  }}
                                  className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-600 hover:text-white text-emerald-800 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"
                                  title="Lihat Laporan Individu"
                                >
                                  <FileText size={12} />
                                  Laporan
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-10 text-slate-400 italic text-xs">
                          Tiada murid ditemui dalam kategori ini.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : activeView === 'INDIVIDUAL' ? (
        <div className="space-y-6">
          {/* Top Selection & Navigation Bar for Individual Report */}
          <div className="bg-white p-6 rounded-[32px] border shadow-sm no-print space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                  <UserCheck size={18} className="text-emerald-600" />
                  Analisis & Laporan Prestasi PBD Individu Murid
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                  Pilih murid untuk memaparkan, menganalisis, dan mencetak laporan prestasi PBD individu
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={!currentIndividualStudent || filteredStudents.findIndex(s => s.id === currentIndividualStudent.id) <= 0}
                  onClick={() => {
                    const idx = filteredStudents.findIndex(s => s.id === currentIndividualStudent?.id);
                    if (idx > 0) setSelectedStudentId(filteredStudents[idx - 1].id);
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft size={14} /> Murid Sebelum
                </button>
                <button
                  disabled={!currentIndividualStudent || filteredStudents.findIndex(s => s.id === currentIndividualStudent.id) >= filteredStudents.length - 1}
                  onClick={() => {
                    const idx = filteredStudents.findIndex(s => s.id === currentIndividualStudent?.id);
                    if (idx >= 0 && idx < filteredStudents.length - 1) setSelectedStudentId(filteredStudents[idx + 1].id);
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                >
                  Murid Seterusnya <ChevronRight size={14} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t">
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Pilih Murid ({filteredStudents.length} Murid Dalam Kelas Terpilih)
                </label>
                <select
                  value={currentIndividualStudent?.id || ''}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  className="w-full border rounded-xl px-4 py-2.5 text-sm font-bold bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  {filteredStudents.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} — Kelas {s.class} ({s.regNo})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => window.print()}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <Printer size={16} /> Cetak Laporan Individu
                </button>
              </div>
            </div>

            {/* Standard Kandungan Selection for Individual Report */}
            <div className="pt-3 border-t space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Tag size={13} className="text-emerald-600" />
                  Pilih Standard Kandungan Untuk Analisis & Laporan ({reportSkills.length} / {filteredSkills.length} SK Dipilih)
                </label>
                <div className="flex items-center gap-2 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setSelectedSkillIdsForReport(null)}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-all cursor-pointer"
                  >
                    Pilih Semua ({filteredSkills.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSkillIdsForReport([])}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-all cursor-pointer"
                  >
                    Nyahpilih Semua
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80">
                {filteredSkills.map(s => {
                  const isSelected = reportSkills.some(rs => rs.id === s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSkillForReport(s.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer text-left ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white text-slate-400 border-slate-200 line-through opacity-70 hover:opacity-100'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-md flex items-center justify-center text-[9px] font-black ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {isSelected ? '✓' : ''}
                      </span>
                      <span>{s.code}</span>
                      <span className="text-[10px] opacity-80 max-w-[200px] truncate">{s.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {!currentIndividualStudent ? (
            <div className="bg-white p-16 rounded-[40px] border text-center text-slate-400 italic font-bold">
              Tiada murid ditemui mengikut tapisan kelas / tahun terpilih.
            </div>
          ) : (
            <div className="bg-white p-8 max-w-[850px] mx-auto border border-slate-200 shadow-md rounded-[32px] my-6 print:border-none print:shadow-none print:p-0 print:my-0 text-slate-800 animate-in fade-in duration-500">
              {/* Document Header */}
              <div className="text-center space-y-2 pb-6 border-b-4 border-double border-slate-800">
                <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 leading-snug">
                  REKOD PELAPORAN PENTAKSIRAN BILIK DARJAH (PBD) INDIVIDU
                </h1>
                <h2 className="text-md font-bold uppercase text-slate-700">
                  MATA PELAJARAN BAHASA ARAB - TAHUN {currentIndividualStudent.year}
                </h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  SISTEM E-PANITIA BAHASA ARAB • KEMENTERIAN PENDIDIKAN MALAYSIA
                </p>
              </div>

              {/* Student Metadata Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 py-6 text-xs font-bold border-b border-slate-200 bg-slate-50/50 p-4 rounded-2xl my-4 print:bg-transparent print:p-0">
                <div className="flex justify-between border-b pb-1">
                  <span className="text-slate-400 font-medium">Nama Murid:</span>
                  <span className="text-slate-900 font-black uppercase">{currentIndividualStudent.name}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-slate-400 font-medium">No. Pendaftaran:</span>
                  <span className="text-slate-900 font-black">{currentIndividualStudent.regNo}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-slate-400 font-medium">Darjah / Tahun:</span>
                  <span className="text-slate-900 font-black">Tahun {currentIndividualStudent.year}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-slate-400 font-medium">Kelas:</span>
                  <span className="text-slate-900 font-black">{currentIndividualStudent.class}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-slate-400 font-medium">Jantina:</span>
                  <span className="text-slate-900 font-black">{currentIndividualStudent.gender}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-slate-400 font-medium">Guru Pentaksir:</span>
                  <span className="text-slate-900 font-black uppercase">{user.name}</span>
                </div>
              </div>

              {/* Executive Performance Highlights */}
              {currentStudentPbdAnalysis && (
                <div className="my-6 p-6 bg-emerald-50/30 rounded-2xl border border-emerald-100 print:bg-transparent print:border-slate-300 space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center md:text-left">
                    Rumusan Pencapaian Tahap Penguasaan (TP) Individu
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-sm print:shadow-none">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">TP Keseluruhan</span>
                      <span className={`text-2xl font-black block my-1 ${
                        currentStudentPbdAnalysis.roundedTp >= 5 ? 'text-emerald-600' :
                        currentStudentPbdAnalysis.roundedTp >= 3 ? 'text-sky-600' :
                        currentStudentPbdAnalysis.roundedTp > 0 ? 'text-rose-600' : 'text-slate-400'
                      }`}>
                        {currentStudentPbdAnalysis.roundedTp > 0 ? `TP ${currentStudentPbdAnalysis.roundedTp}` : 'Belum'}
                      </span>
                      <span className="text-[9px] font-black uppercase text-slate-600 block">
                        {currentStudentPbdAnalysis.roundedTp === 6 ? 'Cemerlang' :
                         currentStudentPbdAnalysis.roundedTp === 5 ? 'Sangat Baik' :
                         currentStudentPbdAnalysis.roundedTp === 4 ? 'Baik' :
                         currentStudentPbdAnalysis.roundedTp === 3 ? 'Memuaskan' :
                         currentStudentPbdAnalysis.roundedTp === 2 ? 'Sederhana' :
                         currentStudentPbdAnalysis.roundedTp === 1 ? 'Perlu Intervensi' : 'Belum Dinilai'}
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-sm print:shadow-none">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Purata Skor TP</span>
                      <span className="text-2xl font-black text-slate-900 block my-1">
                        {currentStudentPbdAnalysis.averageTp.toFixed(2)}
                      </span>
                      <span className="text-[9px] font-bold text-slate-500 block">
                        daripada 6.00
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-sm print:shadow-none">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">S.K. Dinilai</span>
                      <span className="text-2xl font-black text-slate-900 block my-1">
                        {currentStudentPbdAnalysis.validCount} / {currentStudentPbdAnalysis.totalSkills}
                      </span>
                      <span className="text-[9px] font-bold text-slate-500 block">
                        Standard Kandungan
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-sm print:shadow-none">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Purata Kelas</span>
                      <span className="text-2xl font-black text-indigo-600 block my-1">
                        {currentStudentPbdAnalysis.classAverageTp.toFixed(2)}
                      </span>
                      <span className="text-[9px] font-bold text-slate-500 block">
                        {currentStudentPbdAnalysis.averageTp >= currentStudentPbdAnalysis.classAverageTp ? '▲ Atas Purata' : '▼ Bawah Purata'}
                      </span>
                    </div>
                  </div>

                  {/* TP Distribution Bar for Student */}
                  <div className="space-y-1 pt-2">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-500">
                      <span>Taburan Pencapaian Standard Kandungan:</span>
                      <span>
                        {[6, 5, 4, 3, 2, 1].map(lvl => `TP${lvl}:${currentStudentPbdAnalysis.tpDistribution[lvl] || 0}`).join(' | ')}
                      </span>
                    </div>
                    <div className="h-4 rounded-xl overflow-hidden flex bg-slate-100 border border-slate-200">
                      {[6, 5, 4, 3, 2, 1].map(level => {
                        const count = currentStudentPbdAnalysis.tpDistribution[level] || 0;
                        const pct = currentStudentPbdAnalysis.totalSkills > 0 ? (count / currentStudentPbdAnalysis.totalSkills) * 100 : 0;
                        if (pct === 0) return null;
                        const bg = level === 6 ? 'bg-emerald-600' :
                                   level === 5 ? 'bg-teal-500' :
                                   level === 4 ? 'bg-sky-500' :
                                   level === 3 ? 'bg-amber-500' :
                                   level === 2 ? 'bg-orange-500' : 'bg-rose-500';
                        return (
                          <div
                            key={level}
                            style={{ width: `${pct}%` }}
                            className={`${bg} h-full text-[8px] font-black text-white flex items-center justify-center`}
                            title={`TP ${level}: ${count} SK`}
                          >
                            TP{level} ({count})
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Skills Breakdown Table */}
              <div className="my-6 space-y-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">
                  Perincian Pentaksiran Mengikut Standard Kandungan (PBD)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border border-slate-300">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest border-b border-slate-300">
                      <tr>
                        <th className="px-3 py-2 border border-slate-300 text-center w-10">Bil</th>
                        <th className="px-3 py-2 border border-slate-300 w-20">Kod SK</th>
                        <th className="px-3 py-2 border border-slate-300">Penerangan Standard Kandungan</th>
                        <th className="px-3 py-2 border border-slate-300 text-center w-20">Tahap (TP)</th>
                        <th className="px-3 py-2 border border-slate-300">Tafsiran & Ulasan Penguasaan</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs font-medium text-slate-700">
                      {reportSkills.map((skill, index) => {
                        const tp = getTP(currentIndividualStudent.id, skill.id);
                        return (
                          <tr key={skill.id} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2 border border-slate-300 text-center font-bold text-slate-400">{index + 1}</td>
                            <td className="px-3 py-2 border border-slate-300 font-black text-emerald-600">{skill.code}</td>
                            <td className="px-3 py-2 border border-slate-300 font-bold text-slate-800">{skill.description}</td>
                            <td className="px-3 py-2 border border-slate-300 text-center">
                              <span className={`inline-block px-2.5 py-1 rounded-lg font-black text-xs ${
                                tp === 6 ? 'bg-emerald-600 text-white' :
                                tp === 5 ? 'bg-teal-500 text-white' :
                                tp === 4 ? 'bg-sky-500 text-white' :
                                tp === 3 ? 'bg-amber-400 text-white' :
                                tp === 2 ? 'bg-orange-400 text-white' :
                                tp === 1 ? 'bg-rose-500 text-white' :
                                'bg-slate-100 text-slate-300'
                              }`}>
                                {tp > 0 ? `TP ${tp}` : '-'}
                              </span>
                            </td>
                            <td className="px-3 py-2 border border-slate-300 text-[10px] leading-tight text-slate-600">
                              {tp === 6 ? 'Mencapai tahap cemerlang. Sangat menguasai kemahiran & berupaya membimbing rakan.' :
                               tp === 5 ? 'Mencapai tahap sangat baik. Menguasai kemahiran secara konsisten.' :
                               tp === 4 ? 'Mencapai tahap baik. Menguasai kemahiran berasaskan pembelajaran dengan berkesan.' :
                               tp === 3 ? 'Mencapai tahap memuaskan. Memahami konsep asas dan menguasai kemahiran minimum.' :
                               tp === 2 ? 'Mencapai tahap sederhana. Mula menunjukkan kefahaman tetapi memerlukan bimbingan.' :
                               tp === 1 ? 'Sangat lemah. Memerlukan bimbingan khusus berterusan serta intervensi khas.' :
                               'Belum dinilai.'}
                            </td>
                          </tr>
                        );
                      })}
                      {reportSkills.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 border border-slate-300 text-center text-slate-400 italic font-bold">
                            Tiada Standard Kandungan dipilih. Sila tandakan sekurang-kurangnya satu Standard Kandungan pada panel pilihan di atas.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Teacher's Intervention Review & Recommendations */}
              {currentStudentPbdAnalysis && (
                <div className="my-6 space-y-2 break-inside-avoid">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">
                    Ulasan Guru & Cadangan Pelan Tindakan / Intervensi
                  </h3>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-medium text-slate-700 leading-relaxed">
                    <p className="font-bold text-slate-900 mb-1">
                      Ulasan Keseluruhan PBD:
                    </p>
                    <p className="mb-3 italic">
                      "{getAutoComment(currentStudentPbdAnalysis.roundedTp)}"
                    </p>
                    
                    <div className="no-print space-y-1 pt-2 border-t border-slate-200">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                        Ulasan Tambahan Guru (Boleh disunting untuk cetakan):
                      </label>
                      <textarea
                        rows={2}
                        value={individualTeacherNotes[currentIndividualStudent.id] || ''}
                        onChange={e => setIndividualTeacherNotes({ ...individualTeacherNotes, [currentIndividualStudent.id]: e.target.value })}
                        placeholder="Masukkan ulasan atau cadangan intervensi khas jika ada..."
                        className="w-full border rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      />
                    </div>

                    {individualTeacherNotes[currentIndividualStudent.id] && (
                      <div className="pt-2 border-t border-slate-200 hidden print:block">
                        <span className="font-black text-slate-900 uppercase text-[10px] block mb-0.5">
                          Catatan Guru Pentaksir:
                        </span>
                        <p className="text-slate-800 font-bold">
                          {individualTeacherNotes[currentIndividualStudent.id]}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-12 mt-12 pt-12 border-t border-slate-200 break-inside-avoid">
                <div className="space-y-16">
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-slate-400">Disediakan Oleh:</p>
                    <div className="h-10"></div>
                    <p className="font-black border-b border-slate-900 uppercase w-48 pt-2">{user.name}</p>
                    <p className="font-bold text-slate-500 uppercase">{user.role} Bahasa Arab</p>
                  </div>
                </div>
                <div className="space-y-16 text-right flex flex-col items-end">
                  <div className="space-y-1 text-xs text-left w-48">
                    <p className="font-bold text-slate-400">Disahkan Oleh:</p>
                    <div className="h-10"></div>
                    <p className="font-black border-b border-slate-900 uppercase pt-2 w-48">&nbsp;</p>
                    <p className="font-bold text-slate-500 uppercase">Guru Besar / GPK Pentadbiran</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white p-8 max-w-[850px] mx-auto border border-slate-200 shadow-md rounded-[32px] my-6 print:border-none print:shadow-none print:p-0 print:my-0 text-slate-800 animate-in fade-in duration-500">
          {/* Document Header */}
          <div className="text-center space-y-2 pb-6 border-b-4 border-double border-slate-800">
            <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 leading-snug">
              LAPORAN PRESTASI PENILAIAN TAHAP PENGUASAAN (PBD)
            </h1>
            <h2 className="text-md font-bold uppercase text-slate-700">
              PANITIA BAHASA ARAB
            </h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              SISTEM E-PANITIA BAHASA ARAB
            </p>
          </div>

          {/* Document Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 py-6 text-xs font-bold border-b border-slate-200">
            <div className="flex justify-between border-b pb-1">
              <span className="text-slate-400 font-medium">Darjah / Tahun:</span>
              <span className="text-slate-900 font-black">Tahun {selectedYear}</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="text-slate-400 font-medium">Kelas:</span>
              <span className="text-slate-900 font-black">{selectedClasses.length > 0 ? `Kelas ${selectedClasses.join(', ')}` : 'Semua Kelas'}</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="text-slate-400 font-medium">Jumlah Murid:</span>
              <span className="text-slate-900 font-black">{analysisData.totalStudents} Murid</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="text-slate-400 font-medium">Standard Kandungan Dinilai:</span>
              <span className="text-slate-900 font-black">{filteredSkills.length} S.K.</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="text-slate-400 font-medium">Tarikh Cetakan:</span>
              <span className="text-slate-900 font-black">{new Date().toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="text-slate-400 font-medium">Penilai / Guru:</span>
              <span className="text-slate-900 font-black uppercase">{user.name} ({user.role})</span>
            </div>
          </div>

          {/* Key Meeting Statistics / Highlight Box */}
          <div className="my-6 p-6 bg-slate-50 rounded-2xl border border-slate-100 print:bg-transparent print:border-slate-300">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 text-center md:text-left">Ringkasan Eksekutif Prestasi</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <span className="text-2xl font-black text-slate-900 block leading-none">
                  {analysisData.tpCounts[3] + analysisData.tpCounts[4] + analysisData.tpCounts[5] + analysisData.tpCounts[6]}
                </span>
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mt-1">Menguasai (TP3-6)</span>
                <span className="text-[10px] font-black text-emerald-600 block">
                  {analysisData.totalStudents > 0 ? Math.round(((analysisData.tpCounts[3] + analysisData.tpCounts[4] + analysisData.tpCounts[5] + analysisData.tpCounts[6]) / analysisData.totalStudents) * 100) : 0}%
                </span>
              </div>
              <div>
                <span className="text-2xl font-black text-slate-900 block leading-none">
                  {analysisData.tpCounts[1] + analysisData.tpCounts[2]}
                </span>
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mt-1">Intervensi (TP1-2)</span>
                <span className="text-[10px] font-black text-rose-600 block">
                  {analysisData.totalStudents > 0 ? Math.round(((analysisData.tpCounts[1] + analysisData.tpCounts[2]) / analysisData.totalStudents) * 100) : 0}%
                </span>
              </div>
              <div>
                <span className="text-2xl font-black text-slate-900 block leading-none">
                  {(() => {
                    const classRecords = records.filter(r => filteredStudents.some(s => s.id === r.studentId) && filteredSkills.some(sk => sk.id === r.skillId));
                    if (classRecords.length === 0) return '0.0';
                    const avg = classRecords.reduce((acc, curr) => acc + curr.tpLevel, 0) / classRecords.length;
                    return avg.toFixed(2);
                  })()}
                </span>
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mt-1">Purata TP Kelas</span>
                <span className="text-[10px] font-black text-indigo-600 block">Tahap Purata</span>
              </div>
            </div>
          </div>

          {/* Distribution Table */}
          <div className="my-6 space-y-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Analisis Taburan Tahap Penguasaan</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-300">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest border-b border-slate-300">
                  <tr>
                    <th className="px-4 py-2 border border-slate-300 text-center w-20">Tahap (TP)</th>
                    <th className="px-4 py-2 border border-slate-300">Pernyataan Tafsiran PBD Bahasa Arab</th>
                    <th className="px-4 py-2 border border-slate-300 text-center w-24">Bil. Murid</th>
                    <th className="px-4 py-2 border border-slate-300 text-center w-24">Peratusan (%)</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-medium text-slate-700">
                  {[
                    { lvl: 6, title: 'Cemerlang', desc: 'Murid menyedari keupayaan diri dalam belajar dan berupaya melatih/membimbing orang lain.' },
                    { lvl: 5, title: 'Sangat Baik', desc: 'Murid melaksanakan sesuatu kemahiran pada situasi baru secara konsisten dengan sikap positif.' },
                    { lvl: 4, title: 'Baik', desc: 'Murid dapat menyelesaikan masalah baru berasaskan kemahiran yang telah dikuasai dengan baik.' },
                    { lvl: 3, title: 'Memuaskan', desc: 'Murid melaksanakan kemahiran asas dan memahami konsep pembelajaran dengan memuaskan.' },
                    { lvl: 2, title: 'Sederhana', desc: 'Murid mula menunjukkan kefahaman tetapi masih memerlukan bantuan guru bagi perkara asas.' },
                    { lvl: 1, title: 'Perlu Usaha / Intervensi', desc: 'Murid sangat lemah dan memerlukan bimbingan guru secara berterusan serta intervensi agresif.' },
                    { lvl: 0, title: 'Belum Dinilai', desc: 'Murid yang belum direkodkan markah penilaian bagi mana-mana Standard Kandungan.' }
                  ].map(item => {
                    const count = (analysisData.studentsByTp[item.lvl] || []).length;
                    const pct = analysisData.totalStudents > 0 ? (count / analysisData.totalStudents) * 100 : 0;
                    return (
                      <tr key={item.lvl} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2 border border-slate-300 text-center font-bold">
                          {item.lvl === 0 ? 'Belum' : `TP ${item.lvl}`}
                        </td>
                        <td className="px-4 py-2 border border-slate-300">
                          <span className="font-bold text-slate-900 block">{item.title}</span>
                          <span className="text-[10px] text-slate-500 leading-tight block">{item.desc}</span>
                        </td>
                        <td className="px-4 py-2 border border-slate-300 text-center font-bold text-slate-900">
                          {count} Murid
                        </td>
                        <td className="px-4 py-2 border border-slate-300 text-center font-bold text-slate-900">
                          {Math.round(pct)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Intervention Group Section */}
          <div className="my-6 space-y-2 break-inside-avoid">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Senarai Pelan Intervensi Murid (TP 1 & TP 2)</h3>
              <span className="text-[9px] font-black bg-rose-50 text-rose-600 border border-rose-100 px-3 py-1 rounded-full uppercase tracking-widest">
                Tindakan Segera
              </span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed font-bold">
              Kumpulan murid berikut disenaraikan sebagai memerlukan bimbingan khusus dan intervensi untuk meningkatkan tahap penguasaan sekurang-kurangnya mencapai Tahap 3.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-300 mt-2">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest border-b border-slate-300">
                  <tr>
                    <th className="px-4 py-2 border border-slate-300 text-center w-12">Bil</th>
                    <th className="px-4 py-2 border border-slate-300">Nama Murid</th>
                    <th className="px-4 py-2 border border-slate-300 text-center w-20">Kelas</th>
                    <th className="px-4 py-2 border border-slate-300 text-center w-24">S.K. Dinilai</th>
                    <th className="px-4 py-2 border border-slate-300 text-center w-24">Purata TP</th>
                    <th className="px-4 py-2 border border-slate-300">Cadangan Tindakan / Intervensi</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-medium text-slate-700">
                  {(() => {
                    const listTp1 = analysisData.studentsByTp[1] || [];
                    const listTp2 = analysisData.studentsByTp[2] || [];
                    const combined = [...listTp1, ...listTp2].sort((a, b) => a.props.name.localeCompare(b.props.name));
                    
                    if (combined.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 border border-slate-300 text-center text-slate-400 italic font-bold bg-slate-50/50">
                            Tahniah! Tiada murid dalam kategori intervensi (Semua murid mencapai sekurang-kurangnya TP 3).
                          </td>
                        </tr>
                      );
                    }

                    return combined.map((entry, index) => (
                      <tr key={entry.props.id}>
                        <td className="px-4 py-2 border border-slate-300 text-center font-bold">{index + 1}</td>
                        <td className="px-4 py-2 border border-slate-300 font-bold uppercase text-slate-900">{entry.props.name}</td>
                        <td className="px-4 py-2 border border-slate-300 text-center font-bold uppercase text-slate-500">{entry.props.class}</td>
                        <td className="px-4 py-2 border border-slate-300 text-center font-bold text-slate-600">
                          {entry.count} / {filteredSkills.length}
                        </td>
                        <td className="px-4 py-2 border border-slate-300 text-center font-bold text-rose-600">
                          {entry.average.toFixed(2)} (TP {Math.round(entry.average)})
                        </td>
                        <td className="px-4 py-2 border border-slate-300 text-[10px] text-slate-300 italic min-w-[200px]">
                          <div className="border-b border-dashed border-slate-300 h-5 w-full"></div>
                          <div className="border-b border-dashed border-slate-300 h-5 w-full mt-1"></div>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* High Achievers / Cemerlang Section */}
          <div className="my-6 space-y-2 break-inside-avoid">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Senarai Murid Cemerlang & Sangat Baik (TP 5 & TP 6)</h3>
            <p className="text-[10px] text-slate-500 leading-relaxed font-bold">
              Kumpulan murid berikut menunjukkan pencapaian tinggi dan berpotensi menjadi mentor/pembimbing rakan sebaya (buddy system).
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-300 mt-2">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest border-b border-slate-300">
                  <tr>
                    <th className="px-4 py-2 border border-slate-300 text-center w-12">Bil</th>
                    <th className="px-4 py-2 border border-slate-300">Nama Murid</th>
                    <th className="px-4 py-2 border border-slate-300 text-center w-20">Kelas</th>
                    <th className="px-4 py-2 border border-slate-300 text-center w-24">S.K. Dinilai</th>
                    <th className="px-4 py-2 border border-slate-300 text-center w-24">Purata TP</th>
                    <th className="px-4 py-2 border border-slate-300 text-center">Tahap Keseluruhan</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-medium text-slate-700">
                  {(() => {
                    const listTp5 = analysisData.studentsByTp[5] || [];
                    const listTp6 = analysisData.studentsByTp[6] || [];
                    const combined = [...listTp5, ...listTp6].sort((a, b) => b.average - a.average);
                    
                    if (combined.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 border border-slate-300 text-center text-slate-400 italic">
                            Tiada murid dalam kategori cemerlang (TP 5 atau TP 6) setakat ini.
                          </td>
                        </tr>
                      );
                    }

                    return combined.map((entry, index) => (
                      <tr key={entry.props.id}>
                        <td className="px-4 py-2 border border-slate-300 text-center font-bold">{index + 1}</td>
                        <td className="px-4 py-2 border border-slate-300 font-bold uppercase text-slate-900">{entry.props.name}</td>
                        <td className="px-4 py-2 border border-slate-300 text-center font-bold uppercase text-slate-500">{entry.props.class}</td>
                        <td className="px-4 py-2 border border-slate-300 text-center font-bold text-slate-600">
                          {entry.count} / {filteredSkills.length}
                        </td>
                        <td className="px-4 py-2 border border-slate-300 text-center font-bold text-emerald-600">
                          {entry.average.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 border border-slate-300 text-center font-bold">
                          <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold ${Math.round(entry.average) === 6 ? 'bg-emerald-100 text-emerald-800' : 'bg-teal-100 text-teal-800'}`}>
                            TP {Math.round(entry.average)}
                          </span>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* Signature Signoff Area */}
          <div className="grid grid-cols-2 gap-12 mt-12 pt-12 border-t border-slate-200 break-inside-avoid">
            <div className="space-y-16">
              <div className="space-y-1 text-xs">
                <p className="font-bold text-slate-400">Disediakan Oleh:</p>
                <div className="h-10"></div>
                <p className="font-black border-b border-slate-900 uppercase w-48 pt-2">{user.name}</p>
                <p className="font-bold text-slate-500 uppercase">{user.role} Bahasa Arab</p>
              </div>
            </div>
            <div className="space-y-16 text-right flex flex-col items-end">
              <div className="space-y-1 text-xs text-left w-48">
                <p className="font-bold text-slate-400">Disahkan Oleh:</p>
                <div className="h-10"></div>
                <p className="font-black border-b border-slate-900 uppercase pt-2 w-48">&nbsp;</p>
                <p className="font-bold text-slate-500 uppercase">Guru Besar / GPK Pentadbiran</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Standard Kandungan */}
      {isSkillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsSkillModalOpen(false)} />
          <div className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-2xl p-10 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black uppercase italic flex items-center gap-3">
                <Tag className="text-emerald-600" /> {editingSkill ? 'Edit Standard Kandungan' : 'Tambah Standard Kandungan'}
              </h3>
              <button onClick={() => { setIsSkillModalOpen(false); setEditingSkill(null); }} className="p-2 hover:bg-slate-100 rounded-full transition-all"><X /></button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <form onSubmit={handleSkillSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t.skill_code}</label>
                  <input 
                    required 
                    className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:border-emerald-500 outline-none transition-all" 
                    placeholder="Contoh: 1.1.1" 
                    value={skillForm.code} 
                    onChange={e => setSkillForm({...skillForm, code: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t.skill_desc}</label>
                  <textarea 
                    required 
                    rows={4}
                    className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:border-emerald-500 outline-none transition-all" 
                    placeholder="Penerangan standard kandungan..." 
                    value={skillForm.description} 
                    onChange={e => setSkillForm({...skillForm, description: e.target.value})} 
                  />
                </div>
                <button type="submit" className="w-full bg-emerald-600 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3">
                  <Save size={18} /> {editingSkill ? t.save : t.add_new}
                </button>
              </form>

              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Senarai Sedia Ada (Tahun {selectedYear})</p>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredSkills.map(s => (
                    <div key={s.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-black text-emerald-600">{s.code}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => { setEditingSkill(s); setSkillForm({ code: s.code, description: s.description, year: s.year }); }} className="p-1 text-slate-400 hover:text-sky-600"><Edit3 size={14}/></button>
                          <button onClick={() => onDeleteSkill(s.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={14}/></button>
                        </div>
                      </div>
                      <p className="text-[11px] font-bold text-slate-700 leading-relaxed">{s.description}</p>
                    </div>
                  ))}
                  {filteredSkills.length === 0 && <p className="text-center py-10 text-slate-300 italic text-xs">Tiada standard kandungan direkodkan.</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PBDTransit;
