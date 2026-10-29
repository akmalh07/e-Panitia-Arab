
import React, { useState, useMemo } from 'react';
import { Student, Gender, User, Language } from '../types';
import { Search, Trash2, X, Users, UserPlus, FileUp, Filter, Download, ListChecks, ClipboardPaste, RotateCcw, Settings2, Plus, Check, Edit2, CheckSquare, Square } from 'lucide-react';
import * as XLSX from 'xlsx';
import { translations } from '../src/translations';

interface StudentListProps {
  students: Student[];
  classes: string[];
  years: number[];
  onAdd: (student: Omit<Student, 'id'>) => void;
  onBulkAdd: (students: Omit<Student, 'id'>[]) => void;
  onUpdate: (student: Student) => void;
  onDelete: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
  onUpdateClasses: (classes: string[]) => void;
  isAdmin: boolean;
  user: User;
}

const StudentList: React.FC<StudentListProps> = ({ 
  students, classes, years, onAdd, onBulkAdd, onUpdate, onDelete, onBulkDelete, onUpdateClasses, isAdmin, user 
}) => {
  const lang: Language = user.language || 'ms';
  const t = translations[lang];
  const isRTL = lang === 'ar';
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkPasteModalOpen, setIsBulkPasteModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [isManageClassesOpen, setIsManageClassesOpen] = useState(false);
  
  const [newClassName, setNewClassName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // State for single add
  const [formData, setFormData] = useState<Omit<Student, 'id'>>({
    name: '',
    class: '',
    year: 1,
    gender: Gender.LELAKI,
    regNo: ''
  });

  // State for bulk paste
  const [bulkPasteData, setBulkPasteData] = useState({
    year: 1,
    class: '',
    gender: Gender.LELAKI,
    namesText: ''
  });

  const safeYears = years && years.length > 0 ? years : [1, 2, 3, 4, 5, 6];
  const safeClasses = classes && classes.length > 0 ? classes : [];

  const filteredStudents = useMemo(() => {
    return students
      .filter(s => {
        const matchSearch = searchTerm === '' || 
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          s.regNo.toLowerCase().includes(searchTerm.toLowerCase());
        const matchYear = filterYear === '' || String(s.year) === filterYear;
        const matchClass = filterClass === '' || s.class === filterClass;
        return matchSearch && matchYear && matchClass;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, searchTerm, filterClass, filterYear]);

  const classOptionsForFilter = useMemo(() => {
    if (!filterYear) return safeClasses;
    return safeClasses.filter(c => c.startsWith(filterYear));
  }, [safeClasses, filterYear]);

  const availableClassesForYear = useMemo(() => {
    return safeClasses.filter(c => c.startsWith(String(formData.year)));
  }, [safeClasses, formData.year]);

  const availableClassesForBulkYear = useMemo(() => {
    return safeClasses.filter(c => c.startsWith(String(bulkPasteData.year)));
  }, [safeClasses, bulkPasteData.year]);

  const resetFilters = () => {
    setSearchTerm('');
    setFilterYear('');
    setFilterClass('');
    setSelectedIds([]);
  };

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newClassName.trim();
    if (!trimmed) return;
    
    // Case-insensitive check
    if (safeClasses.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      alert("Nama kelas ini sudah wujud.");
      return;
    }
    
    const updated = [...safeClasses, trimmed].sort((a, b) => a.localeCompare(b));
    onUpdateClasses(updated);
    setNewClassName('');
  };

  const handleClearAllClasses = () => {
    if (confirm("Adakah anda pasti mahu memadam SEMUA nama kelas? Ini akan memudahkan anda memasukkan senarai kelas baru.")) {
      onUpdateClasses([]);
    }
  };

  const handleSaveEditClass = (index: number) => {
    if (!editingValue.trim()) return;
    const updated = [...safeClasses];
    updated[index] = editingValue.trim();
    onUpdateClasses(updated.sort((a, b) => a.localeCompare(b)));
    setEditingIndex(null);
  };

  const handleRemoveClass = (className: string) => {
    if (confirm(`Padam kelas "${className}"? Tindakan ini tidak akan memadam murid dalam kelas tersebut.`)) {
      onUpdateClasses(safeClasses.filter(c => c !== className));
    }
  };

  const handleBulkPasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const names = bulkPasteData.namesText.split('\n').map(n => n.trim()).filter(n => n.length > 0);
    if (names.length === 0) { alert("Sila masukkan sekurang-kurangnya satu nama."); return; }
    if (!bulkPasteData.class) { alert("Sila pilih kelas terlebih dahulu."); return; }

    const formattedStudents = names.map(name => ({
      name: name.toUpperCase(),
      regNo: Math.random().toString(36).substr(2, 6).toUpperCase(),
      year: bulkPasteData.year,
      class: bulkPasteData.class,
      gender: bulkPasteData.gender
    }));

    // Ensure the class exists in the classes list
    if (!safeClasses.includes(bulkPasteData.class)) {
      onUpdateClasses([...safeClasses, bulkPasteData.class].sort((a, b) => a.localeCompare(b)));
    }

    onBulkAdd(formattedStudents);
    alert(`${formattedStudents.length} murid berjaya didaftarkan secara pukal!`);
    setIsBulkPasteModalOpen(false);
    setBulkPasteData({ year: 1, class: '', gender: Gender.LELAKI, namesText: '' });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        if (data.length === 0) {
          alert("Fail Excel kosong atau format tidak betul.");
          return;
        }

        const newStudents: Omit<Student, 'id'>[] = [];
        const newClassesFound = new Set<string>();

        data.forEach((row) => {
          const name = row['NAMA'] || row['Nama'] || row['Name'];
          const className = row['KELAS'] || row['Kelas'] || row['Class'];
          const year = parseInt(row['DARJAH'] || row['Darjah'] || row['Year'] || row['Tahun']);
          const genderStr = String(row['JANTINA'] || row['Jantina'] || row['Gender']).toUpperCase();
          const regNo = row['NO PENDAFTARAN'] || row['No Pendaftaran'] || row['Reg No'] || Math.random().toString(36).substr(2, 6).toUpperCase();

          if (name && className && !isNaN(year)) {
            const gender = genderStr.includes('P') || genderStr.includes('FEMALE') ? Gender.PEREMPUAN : Gender.LELAKI;
            
            newStudents.push({
              name: String(name).toUpperCase(),
              class: String(className).trim(),
              year: year,
              gender: gender,
              regNo: String(regNo).toUpperCase()
            });
            
            newClassesFound.add(String(className).trim());
          }
        });

        if (newStudents.length > 0) {
          // Update classes list with new classes found in Excel
          const currentClasses = new Set(safeClasses);
          let classesUpdated = false;
          newClassesFound.forEach(c => {
            if (!currentClasses.has(c)) {
              currentClasses.add(c);
              classesUpdated = true;
            }
          });

          if (classesUpdated) {
            onUpdateClasses(Array.from(currentClasses).sort((a, b) => a.localeCompare(b)));
          }

          onBulkAdd(newStudents);
          alert(`${newStudents.length} murid berjaya diimport dari fail Excel.`);
          setIsBulkUploadModalOpen(false);
        } else {
          alert("Tiada data murid yang sah ditemui dalam fail Excel. Sila pastikan kolum NAMA, KELAS, dan DARJAH wujud.");
        }
      } catch (error) {
        console.error(error);
        alert("Ralat memproses fail Excel. Sila pastikan anda menggunakan format yang betul.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const templateData = [
      { 'NAMA': 'AHMAD BIN ALI', 'KELAS': '1 BESTARI', 'DARJAH': 1, 'JANTINA': 'L', 'NO PENDAFTARAN': 'A123' },
      { 'NAMA': 'SITI BINTI ABU', 'KELAS': '1 BESTARI', 'DARJAH': 1, 'JANTINA': 'P', 'NO PENDAFTARAN': 'B456' }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Murid");
    XLSX.writeFile(workbook, "Template_Pendaftaran_Murid.xlsx");
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredStudents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStudents.map(s => s.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = () => {
    if (confirm(`Adakah anda pasti mahu memadam ${selectedIds.length} murid yang dipilih?`)) {
      onBulkDelete(selectedIds);
      setSelectedIds([]);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${isRTL ? 'lg:flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : ''}>
          <h2 className={`text-2xl font-black text-slate-900 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Users className="text-sky-600" /> {t.student_management}
          </h2>
          <p className="text-slate-500 font-medium text-sm">{t.student_management_desc}</p>
        </div>
        <div className={`flex flex-wrap gap-2 no-print ${isRTL ? 'flex-row-reverse' : ''}`}>
          {selectedIds.length > 0 && (
            <button 
              onClick={handleBulkDelete}
              className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-2xl font-bold shadow-lg shadow-red-500/20 hover:bg-red-700 transition-all text-xs"
            >
              <Trash2 size={16} /> {t.delete} {selectedIds.length} {t.students}
            </button>
          )}
          <button onClick={() => setIsManageClassesOpen(true)} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-2xl font-bold hover:bg-slate-50 shadow-sm transition-all text-xs">
            <Settings2 size={16} /> {t.manage_classes}
          </button>
          <button onClick={() => setIsBulkUploadModalOpen(true)} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all text-xs">
            <FileUp size={16} /> Daftar Pukal (Excel)
          </button>
          <button onClick={() => setIsBulkPasteModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-2xl font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all text-xs">
            <ClipboardPaste size={16} /> {t.bulk_register}
          </button>
          <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-2xl font-bold shadow-xl hover:bg-slate-800 transition-all text-xs">
            <UserPlus size={16} /> {t.new_student}
          </button>
        </div>
      </div>

      {/* Baris Tapisan (Filter) */}
      <div className={`bg-white p-6 rounded-[32px] border shadow-sm flex flex-col md:flex-row gap-4 no-print items-end ${isRTL ? 'md:flex-row-reverse' : ''}`}>
        <div className={`flex-1 w-full space-y-1.5 ${isRTL ? 'text-right' : ''}`}>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.search_name_id}</label>
          <div className="relative">
            <Search className={`absolute ${isRTL ? 'right-5' : 'left-5'} top-1/2 -translate-y-1/2 text-slate-400`} size={18} />
            <input 
              className={`w-full ${isRTL ? 'pr-14 pl-4' : 'pl-14 pr-4'} py-3.5 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-sky-500 font-bold text-slate-700 text-sm ${isRTL ? 'text-right' : ''}`}
              placeholder={t.search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className={`w-full md:w-48 space-y-1.5 ${isRTL ? 'text-right' : ''}`}>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.filter_year}</label>
          <select 
            className={`w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 outline-none font-bold text-slate-700 text-sm focus:ring-2 focus:ring-sky-500 appearance-none ${isRTL ? 'text-right' : ''}`}
            value={filterYear}
            onChange={(e) => { setFilterYear(e.target.value); setFilterClass(''); }}
          >
            <option value="">{t.filter_year}</option>
            {safeYears.map(y => <option key={y} value={String(y)}>{t.year} {y}</option>)}
          </select>
        </div>

        <div className={`w-full md:w-56 space-y-1.5 ${isRTL ? 'text-right' : ''}`}>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.filter_class}</label>
          <select 
            className={`w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 outline-none font-bold text-slate-700 text-sm focus:ring-2 focus:ring-sky-500 appearance-none ${isRTL ? 'text-right' : ''}`}
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
          >
            <option value="">{t.filter_class}</option>
            {classOptionsForFilter.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <button onClick={resetFilters} className="p-3.5 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all shadow-sm">
          <RotateCcw size={18} />
        </button>
      </div>

      <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left table-fixed min-w-[900px]">
            <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] border-b">
              <tr className={isRTL ? 'flex-row-reverse' : ''}>
                <th className={`px-10 py-6 w-[5%] no-print ${isRTL ? 'text-right' : ''}`}>
                  <button onClick={toggleSelectAll} className="text-slate-400 hover:text-sky-600 transition-colors">
                    {selectedIds.length === filteredStudents.length && filteredStudents.length > 0 ? <CheckSquare size={20} className="text-sky-600" /> : <Square size={20} />}
                  </button>
                </th>
                <th className={`px-6 py-6 w-[35%] ${isRTL ? 'text-right' : ''}`}>{t.student_profile}</th>
                <th className={`px-6 py-6 w-[15%] ${isRTL ? 'text-right' : ''}`}>{t.year}</th>
                <th className={`px-6 py-6 w-[25%] ${isRTL ? 'text-right' : ''}`}>{t.class}</th>
                <th className={`px-6 py-6 w-[10%] ${isRTL ? 'text-right' : ''}`}>{t.gender}</th>
                <th className={`px-10 py-6 w-[10%] ${isRTL ? 'text-left' : 'text-right'} no-print`}>{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map(student => (
                <tr key={student.id} className={`hover:bg-slate-50/50 transition-colors group ${selectedIds.includes(student.id) ? 'bg-sky-50/30' : ''} ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <td className={`px-10 py-6 no-print ${isRTL ? 'text-right' : ''}`}>
                    <button onClick={() => toggleSelect(student.id)} className="text-slate-300 hover:text-sky-600 transition-colors">
                      {selectedIds.includes(student.id) ? <CheckSquare size={18} className="text-sky-600" /> : <Square size={18} />}
                    </button>
                  </td>
                  <td className={`px-6 py-6 ${isRTL ? 'text-right' : ''}`}>
                    <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${student.gender === Gender.LELAKI ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                        {student.name.charAt(0)}
                      </div>
                      <div className={`min-w-0 ${isRTL ? 'text-right' : ''}`}>
                        <p className="font-black text-slate-900 uppercase text-xs tracking-tight truncate" title={student.name}>{student.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono font-bold mt-0.5">{student.regNo}</p>
                      </div>
                    </div>
                  </td>
                  <td className={`px-6 py-6 whitespace-nowrap ${isRTL ? 'text-right' : ''}`}>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.year} {student.year}</span>
                  </td>
                  <td className={`px-6 py-6 overflow-hidden ${isRTL ? 'text-right' : ''}`}>
                    <div className={`flex ${isRTL ? 'justify-end' : ''}`}>
                      <span className="px-4 py-1.5 bg-sky-50 text-sky-700 rounded-full text-[10px] font-black uppercase tracking-wider border border-sky-100 whitespace-nowrap max-w-full truncate" title={student.class}>
                        {student.class}
                      </span>
                    </div>
                  </td>
                  <td className={`px-6 py-6 whitespace-nowrap ${isRTL ? 'text-right' : ''}`}>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${student.gender === Gender.LELAKI ? 'text-blue-500' : 'text-pink-500'}`}>
                      {student.gender === Gender.LELAKI ? t.male.charAt(0) : t.female.charAt(0)}
                    </span>
                  </td>
                  <td className={`px-10 py-6 ${isRTL ? 'text-left' : 'text-right'} no-print`}>
                    <button onClick={() => onDelete(student.id)} className="p-2.5 text-slate-200 hover:text-red-500 transition-colors bg-white border border-transparent hover:border-red-100 rounded-xl">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredStudents.length === 0 && (
            <div className="py-24 text-center">
               <Users className="mx-auto text-slate-200 mb-4" size={48} />
               <p className="text-slate-400 italic text-sm font-medium">Tiada rekod murid ditemui untuk tapisan ini.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Urus Senarai Kelas */}
      {isManageClassesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsManageClassesOpen(false)} />
          <div className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-md p-10 animate-in zoom-in-95 overflow-hidden border border-white/20">
            <div className="absolute top-0 left-0 w-full h-2 bg-emerald-600" />
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 flex items-center gap-3">
                <Settings2 className="text-emerald-600" /> Urus Nama Kelas
              </h3>
              <button onClick={() => setIsManageClassesOpen(false)} className="text-slate-300 hover:text-slate-900"><X /></button>
            </div>

            <form onSubmit={handleAddClass} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tambah Kelas Baru</label>
                <div className="flex gap-2">
                  <input 
                    className="flex-1 bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold uppercase focus:ring-2 focus:ring-emerald-500"
                    placeholder="Contoh: 1 Al-Farabi"
                    value={newClassName}
                    onChange={e => setNewClassName(e.target.value)}
                  />
                  <button type="submit" className="bg-emerald-600 text-white p-4 rounded-2xl shadow-lg hover:bg-emerald-700 transition-all">
                    <Plus size={20} />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Senarai Kelas Semasa (Klik pensel untuk edit)</label>
                  <button type="button" onClick={handleClearAllClasses} className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline">Padam Semua</button>
                </div>
                <div className="bg-slate-50 rounded-3xl border border-slate-100 p-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                   {safeClasses.length > 0 ? (
                     <div className="divide-y divide-slate-100">
                       {safeClasses.map((cls, idx) => (
                         <div key={cls} className="flex items-center justify-between p-4 group">
                           {editingIndex === idx ? (
                             <div className="flex-1 flex gap-2">
                               <input 
                                 className="flex-1 bg-white border border-emerald-200 rounded-lg px-3 py-1 text-sm font-bold uppercase"
                                 value={editingValue}
                                 onChange={e => setEditingValue(e.target.value)}
                                 autoFocus
                               />
                               <button type="button" onClick={() => handleSaveEditClass(idx)} className="text-emerald-600 p-1"><Check size={18} /></button>
                               <button type="button" onClick={() => setEditingIndex(null)} className="text-red-400 p-1"><X size={18} /></button>
                             </div>
                           ) : (
                             <>
                               <span className="text-sm font-bold text-slate-700 uppercase">{cls}</span>
                               <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button type="button" onClick={() => { setEditingIndex(idx); setEditingValue(cls); }} className="text-slate-400 hover:text-sky-600">
                                   <Edit2 size={16} />
                                 </button>
                                 <button type="button" onClick={() => handleRemoveClass(cls)} className="text-slate-400 hover:text-red-500">
                                   <Trash2 size={16} />
                                 </button>
                               </div>
                             </>
                           )}
                         </div>
                       ))}
                     </div>
                   ) : (
                     <div className="py-10 text-center text-slate-300 italic text-xs">Belum ada nama kelas ditetapkan.</div>
                   )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pendaftaran Murid Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative bg-white rounded-[50px] shadow-2xl w-full max-w-md p-10 animate-in zoom-in-95 overflow-hidden border border-white/20">
            <div className="absolute top-0 left-0 w-full h-2 bg-sky-600" />
            <h3 className="text-2xl font-black mb-8 uppercase italic tracking-tighter text-slate-900 flex items-center gap-3">
              <UserPlus className="text-sky-600" /> Pendaftaran Murid
            </h3>
            <form onSubmit={(e) => { e.preventDefault(); onAdd(formData); setIsAddModalOpen(false); }} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Penuh Murid</label>
                <input required className="w-full border-none rounded-2xl px-5 py-4 text-sm uppercase font-bold bg-slate-50 focus:ring-2 focus:ring-sky-500 transition-all" onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">No. Pendaftaran / MyKid</label>
                <input required className="w-full border-none rounded-2xl px-5 py-4 text-sm font-bold bg-slate-50 focus:ring-2 focus:ring-sky-500 transition-all" onChange={e => setFormData({...formData, regNo: e.target.value.toUpperCase()})} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Darjah</label>
                  <select required className="w-full border-none rounded-2xl px-5 py-4 text-sm font-bold bg-slate-50" value={formData.year} onChange={e => setFormData({...formData, year: parseInt(e.target.value), class: ''})}>
                    {safeYears.map(y => <option key={y} value={y}>Darjah {y}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Kelas</label>
                  <select required className="w-full border-none rounded-2xl px-5 py-4 text-sm font-bold bg-slate-50" value={formData.class} onChange={e => setFormData({...formData, class: e.target.value})}>
                    <option value="">Pilih...</option>
                    {availableClassesForYear.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Jantina</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setFormData({...formData, gender: Gender.LELAKI})} className={`py-4 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${formData.gender === Gender.LELAKI ? 'bg-sky-600 text-white border-sky-600 shadow-lg' : 'bg-white text-slate-400'}`}>Lelaki</button>
                  <button type="button" onClick={() => setFormData({...formData, gender: Gender.PEREMPUAN})} className={`py-4 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${formData.gender === Gender.PEREMPUAN ? 'bg-pink-600 text-white border-pink-600 shadow-lg' : 'bg-white text-slate-400'}`}>Perempuan</button>
                </div>
              </div>

              <button type="submit" disabled={!formData.class || !formData.name} className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black shadow-2xl disabled:opacity-30 mt-6 uppercase tracking-widest">Daftar Murid</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pendaftaran Pukal Excel */}
      {isBulkUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsBulkUploadModalOpen(false)} />
          <div className="relative bg-white rounded-[50px] shadow-2xl w-full max-w-md p-10 animate-in zoom-in-95 overflow-hidden border border-white/20">
            <div className="absolute top-0 left-0 w-full h-2 bg-emerald-600" />
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 flex items-center gap-3">
                <FileUp className="text-emerald-600" /> Daftar Pukal (Excel)
              </h3>
              <button onClick={() => setIsBulkUploadModalOpen(false)}><X /></button>
            </div>

            <div className="space-y-8">
              <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 space-y-4">
                <div className="flex items-center gap-3 text-emerald-700">
                  <Download size={20} />
                  <h4 className="font-bold text-sm">Gunakan Template Excel</h4>
                </div>
                <p className="text-xs text-emerald-600 leading-relaxed">Sila muat turun template kami untuk memastikan format data anda betul sebelum dimuat naik.</p>
                <button onClick={downloadTemplate} className="w-full bg-white text-emerald-600 py-3 rounded-xl font-bold text-xs border border-emerald-200 hover:bg-emerald-100 transition-all">
                  Muat Turun Template (.xlsx)
                </button>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Fail Excel</label>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:bg-slate-50 transition-all">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <FileUp className="text-slate-400 mb-2" size={32} />
                    <p className="text-xs text-slate-500 font-bold">Klik untuk pilih fail .xlsx</p>
                  </div>
                  <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pendaftaran Pukal */}
      {isBulkPasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsBulkPasteModalOpen(false)} />
          <div className="relative bg-white rounded-[50px] shadow-2xl w-full max-w-2xl p-10 animate-in zoom-in-95 overflow-hidden border border-white/20">
            <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600" />
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 flex items-center gap-3">
                <ClipboardPaste className="text-indigo-600" /> Daftar Pukal (Tampal)
              </h3>
              <button onClick={() => setIsBulkPasteModalOpen(false)}><X /></button>
            </div>

            <form onSubmit={handleBulkPasteSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Darjah</label>
                  <select required className="w-full border-none rounded-2xl px-5 py-4 text-sm font-bold bg-slate-50" value={bulkPasteData.year} onChange={e => setBulkPasteData({...bulkPasteData, year: parseInt(e.target.value), class: ''})}>
                    {safeYears.map(y => <option key={y} value={y}>Darjah {y}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">2. Kelas</label>
                  <select required className="w-full border-none rounded-2xl px-5 py-4 text-sm font-bold bg-slate-50" value={bulkPasteData.class} onChange={e => setBulkPasteData({...bulkPasteData, class: e.target.value})}>
                    <option value="">Pilih...</option>
                    {availableClassesForBulkYear.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">3. Jantina</label>
                  <select required className="w-full border-none rounded-2xl px-5 py-4 text-sm font-bold bg-slate-50" value={bulkPasteData.gender} onChange={e => setBulkPasteData({...bulkPasteData, gender: e.target.value as Gender})}>
                    <option value={Gender.LELAKI}>Lelaki</option>
                    <option value={Gender.PEREMPUAN}>Perempuan</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">4. Tampal Senarai Nama</label>
                <textarea 
                  required 
                  rows={8}
                  className="w-full border-none rounded-3xl px-6 py-5 text-sm font-bold bg-slate-50 focus:ring-2 focus:ring-indigo-500 custom-scrollbar uppercase" 
                  placeholder="AHMAD BIN ALI&#10;MUHAMMAD BIN ABDULLAH..."
                  value={bulkPasteData.namesText}
                  onChange={e => setBulkPasteData({...bulkPasteData, namesText: e.target.value})}
                />
              </div>

              <button type="submit" disabled={!bulkPasteData.class || !bulkPasteData.namesText.trim()} className="w-full bg-indigo-600 text-white py-5 rounded-[24px] font-black shadow-2xl disabled:opacity-30 uppercase tracking-widest">Daftar Pukal Sekarang</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentList;
