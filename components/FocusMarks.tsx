
import React, { useState, useMemo } from 'react';
import { Student, FocusPoint, FocusAction } from '../types';
import { Target, Search, Settings, Trophy, Medal, Trash2, X } from 'lucide-react';

interface FocusMarksProps {
  students: Student[];
  focusPoints: FocusPoint[];
  focusActions: FocusAction[];
  classes: string[];
  onAddPoint: (studentId: string, category: string, points: number) => void;
  onUpdateActions: (actions: FocusAction[]) => void;
}

const FocusMarks: React.FC<FocusMarksProps> = ({ 
  students, focusPoints, focusActions, classes, onAddPoint, onUpdateActions 
}) => {
  const [activeView, setActiveView] = useState<'INPUT' | 'RANKING'>('INPUT');
  const [selectedClass, setSelectedClass] = useState(classes[0] || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [isManageActionsOpen, setIsManageActionsOpen] = useState(false);
  const [newAction, setNewAction] = useState({ label: '', points: 1 });

  const getPoints = (studentId: string) => {
    return focusPoints.filter(p => p.studentId === studentId).reduce((s, p) => s + p.points, 0);
  };

  const filteredStudents = useMemo(() => {
    return students
      .filter(s => s.class === selectedClass)
      .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [students, selectedClass, searchTerm]);

  const rankedStudents = useMemo(() => {
    return students
      .filter(s => s.class === selectedClass)
      .sort((a, b) => getPoints(b.id) - getPoints(a.id));
  }, [students, selectedClass, focusPoints]);

  const handleAddAction = () => {
    if (!newAction.label) return;
    const action: FocusAction = {
      id: Math.random().toString(36).substr(2, 9),
      label: newAction.label,
      points: newAction.points,
      type: newAction.points >= 0 ? 'BAIK' : 'SALAH'
    };
    onUpdateActions([...focusActions, action]);
    setNewAction({ label: '', points: 1 });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Target className="text-sky-600" /> Markah Fokus
          </h2>
          <p className="text-slate-500">Beri maklum balas tingkah laku harian murid.</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border shadow-sm no-print">
          <button onClick={() => setActiveView('INPUT')} className={`px-4 py-2 rounded-xl text-sm font-bold ${activeView === 'INPUT' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-500'}`}>Beri Markah</button>
          <button onClick={() => setActiveView('RANKING')} className={`px-4 py-2 rounded-xl text-sm font-bold ${activeView === 'RANKING' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-500'}`}>Ranking</button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 no-print">
        <select className="bg-white border rounded-xl px-4 py-2.5 font-bold outline-none shadow-sm" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
          {classes.map(c => <option key={c} value={c}>Kelas: {c}</option>)}
        </select>
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari nama murid..." 
            className="w-full bg-white border rounded-xl pl-12 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button onClick={() => setIsManageActionsOpen(true)} className="px-4 py-2.5 bg-slate-900 text-white rounded-xl font-bold flex items-center gap-2">
          <Settings size={18} /> Konfigurasi Markah
        </button>
      </div>

      {activeView === 'INPUT' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map(student => (
            <div key={student.id} className="bg-white p-6 rounded-[32px] border shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center font-black text-sky-700 text-xl">{student.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 uppercase text-[10px] truncate">{student.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-2xl font-black ${getPoints(student.id) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{getPoints(student.id)}</span>
                    <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Skor Semasa</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {focusActions.map(action => (
                  <button key={action.id} onClick={() => onAddPoint(student.id, action.label, action.points)} className={`py-3 rounded-2xl border text-[9px] font-black uppercase transition-all active:scale-95 ${action.points > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' : 'bg-red-50 text-red-700 border-red-100 hover:bg-red-100'}`}>
                    {action.label} ({action.points > 0 ? `+${action.points}` : action.points})
                  </button>
                ))}
              </div>
            </div>
          ))}
          {filteredStudents.length === 0 && <div className="col-span-full py-20 text-center text-slate-400">Tiada murid dijumpai.</div>}
        </div>
      ) : (
        <div className="bg-white rounded-[40px] border shadow-sm p-10">
           <div className="flex items-center gap-3 mb-10">
             <Trophy className="text-yellow-500" size={32} />
             <h3 className="text-2xl font-black text-slate-900 uppercase italic">Papan Ranking: {selectedClass}</h3>
           </div>
           <div className="space-y-3">
             {rankedStudents.map((s, idx) => {
               const score = getPoints(s.id);
               return (
                 <div key={s.id} className="flex items-center gap-4 p-5 rounded-3xl border hover:bg-slate-50 transition-all">
                   <div className={`w-12 h-12 flex items-center justify-center font-black text-lg ${idx < 3 ? 'bg-yellow-400 text-white rounded-2xl' : 'text-slate-300'}`}>
                     {idx < 3 ? <Medal size={24} /> : idx + 1}
                   </div>
                   <div className="flex-1">
                     <p className="font-bold text-slate-900 uppercase text-xs">{s.name}</p>
                     <p className="text-[10px] text-slate-400">{s.regNo}</p>
                   </div>
                   <div className="text-right">
                     <p className={`text-2xl font-black ${score >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{score}</p>
                     <p className="text-[9px] font-bold text-slate-300 uppercase">Mata</p>
                   </div>
                 </div>
               );
             })}
           </div>
        </div>
      )}

      {/* Modal Manage Actions */}
      {isManageActionsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsManageActionsOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-slate-900 uppercase">Tetapan Markah</h3>
                <button onClick={() => setIsManageActionsOpen(false)}><X size={24} /></button>
             </div>
             <div className="space-y-4">
                <div className="p-4 bg-sky-50 rounded-2xl border border-sky-100 space-y-3">
                   <input placeholder="Contoh: Menjawab Soalan" className="w-full border rounded-xl px-4 py-2.5 text-xs outline-none" value={newAction.label} onChange={e => setNewAction({...newAction, label: e.target.value})} />
                   <div className="flex gap-2">
                      <input type="number" className="w-20 border rounded-xl px-4 py-2.5 text-xs font-bold" value={newAction.points} onChange={e => setNewAction({...newAction, points: parseInt(e.target.value) || 0})} />
                      <button onClick={handleAddAction} className="flex-1 bg-sky-600 text-white rounded-xl font-bold text-xs">Tambah Kategori</button>
                   </div>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                   {focusActions.map(a => (
                      <div key={a.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border">
                         <span className="text-xs font-bold text-slate-700 uppercase">{a.label} ({a.points > 0 ? `+${a.points}` : a.points})</span>
                         <button onClick={() => onUpdateActions(focusActions.filter(x => x.id !== a.id))} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                      </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FocusMarks;
