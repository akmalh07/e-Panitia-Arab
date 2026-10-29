
import React, { useState, useMemo } from 'react';
import { Student, Exam, Result, InterventionAction, User } from '../../types';
import { BookOpen, Plus, Trash2, Calendar, User as UserIcon, AlertCircle, TrendingUp, CheckCircle2 } from 'lucide-react';

interface InterventionProps {
  students: Student[];
  exams: Exam[];
  results: Result[];
  actions: InterventionAction[];
  onUpdateActions: (actions: InterventionAction[]) => void;
  currentUser: User;
}

const Intervention: React.FC<InterventionProps> = ({ 
  students, exams, results, actions, onUpdateActions, currentUser 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [actionForm, setActionForm] = useState({
    action: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Murid intervensi adalah murid yang mendapat 50% kebawah dalam mana-mana ujian
  const interventionData = useMemo(() => {
    const data: { student: Student; exam: Exam; result: Result }[] = [];
    
    results.forEach(res => {
      if (res.marks <= 50 && !res.isAbsent) {
        const student = students.find(s => s.id === res.studentId);
        const exam = exams.find(e => e.id === res.examId);
        if (student && exam) {
          data.push({ student, exam, result: res });
        }
      }
    });
    
    return data.sort((a, b) => a.student.name.localeCompare(b.student.name));
  }, [students, exams, results]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedExamId || !actionForm.action) return;

    const newAction: InterventionAction = {
      id: Math.random().toString(36).substr(2, 9),
      studentId: selectedStudentId,
      examId: selectedExamId,
      action: actionForm.action,
      notes: actionForm.notes,
      date: actionForm.date,
      teacherId: currentUser.id
    };

    onUpdateActions([...actions, newAction]);
    setIsModalOpen(false);
    setActionForm({ action: '', notes: '', date: new Date().toISOString().split('T')[0] });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <AlertCircle className="text-red-600" /> Program Intervensi
          </h2>
          <p className="text-slate-500 text-sm">Pemantauan murid dengan pencapaian 50% ke bawah dan tindakan susulan.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Senarai Murid Intervensi */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
            <div className="p-6 border-b bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <UserIcon size={18} className="text-sky-600" /> Senarai Murid Perlu Perhatian
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase border-b">
                  <tr>
                    <th className="px-6 py-4">Nama Murid</th>
                    <th className="px-6 py-4">Ujian</th>
                    <th className="px-6 py-4 text-center">Markah</th>
                    <th className="px-6 py-4 text-center">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {interventionData.length > 0 ? interventionData.map(({ student, exam, result }) => (
                    <tr key={`${student.id}-${exam.id}`} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900 uppercase text-xs">{student.name}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">{student.class}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-medium text-slate-700">{exam.name}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-black">
                          {result.marks}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => {
                            setSelectedStudentId(student.id);
                            setSelectedExamId(exam.id);
                            setIsModalOpen(true);
                          }}
                          className="text-sky-600 hover:text-sky-700 text-xs font-bold flex items-center gap-1 mx-auto"
                        >
                          <Plus size={14} /> Rekod Tindakan
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                        Tiada murid dalam senarai intervensi buat masa ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Log Tindakan Intervensi */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
            <div className="p-6 border-b bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-600" /> Log Tindakan & Progress
              </h3>
            </div>
            <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
              {actions.length > 0 ? actions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(action => {
                const student = students.find(s => s.id === action.studentId);
                const exam = exams.find(e => e.id === action.examId);
                return (
                  <div key={action.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 relative group">
                    <button 
                      onClick={() => onUpdateActions(actions.filter(a => a.id !== action.id))}
                      className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar size={12} className="text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {new Date(action.date).toLocaleDateString('ms-MY')}
                      </span>
                    </div>
                    <p className="text-[10px] font-black text-sky-600 uppercase mb-1">{student?.name}</p>
                    <p className="text-xs font-bold text-slate-800 mb-1">{action.action}</p>
                    {action.notes && <p className="text-[10px] text-slate-500 italic">{action.notes}</p>}
                    <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between items-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{exam?.name}</span>
                      <CheckCircle2 size={14} className="text-emerald-500" />
                    </div>
                  </div>
                );
              }) : (
                <p className="text-center text-slate-400 italic text-sm py-10">Tiada rekod tindakan intervensi.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Rekod Tindakan */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-3xl w-full max-w-md p-8 animate-in zoom-in-95 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 mb-6 uppercase italic">Rekod Tindakan Intervensi</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">Tindakan Diambil</label>
                <input 
                  required 
                  className="w-full border rounded-xl px-4 py-3 text-sm font-bold" 
                  placeholder="Contoh: Kelas Tambahan, Latih Tubi..."
                  value={actionForm.action}
                  onChange={e => setActionForm({...actionForm, action: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">Tarikh</label>
                <input 
                  type="date" 
                  required 
                  className="w-full border rounded-xl px-4 py-3 text-sm font-bold"
                  value={actionForm.date}
                  onChange={e => setActionForm({...actionForm, date: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">Catatan Tambahan</label>
                <textarea 
                  className="w-full border rounded-xl px-4 py-3 text-sm font-medium h-24"
                  placeholder="Butiran lanjut mengenai progress murid..."
                  value={actionForm.notes}
                  onChange={e => setActionForm({...actionForm, notes: e.target.value})}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border rounded-xl font-bold text-slate-500 hover:bg-slate-50">Batal</button>
                <button type="submit" className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg hover:bg-red-700">Simpan Rekod</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Intervention;
