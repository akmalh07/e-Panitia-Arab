
import React, { useState } from 'react';
import { User, Role } from '../types';
import { Plus, UserPlus, Mail, Shield, Trash2, Edit2, X, CheckSquare, Square, Lock, Eye, EyeOff } from 'lucide-react';
import { NAV_ITEMS } from '../constants';

interface StaffManagementProps {
  users: User[];
  onAdd: (user: Omit<User, 'id'>) => void;
  onUpdate: (user: User) => void;
  onDelete: (id: string) => void;
}

const StaffManagement: React.FC<StaffManagementProps> = ({ users, onAdd, onUpdate, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<Omit<User, 'id'>>({
    name: '',
    email: '',
    role: 'GURU',
    passwordHash: '',
    permissions: []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      onUpdate({ ...formData, id: editingUser.id });
    } else {
      onAdd(formData);
    }
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const togglePermission = (permId: string) => {
    const current = formData.permissions || [];
    if (current.includes(permId)) {
      setFormData({ ...formData, permissions: current.filter(p => p !== permId) });
    } else {
      setFormData({ ...formData, permissions: [...current, permId] });
    }
  };

  // Senarai modul yang boleh dihadkan (selain Dashboard & Settings)
  const restrictableModules = NAV_ITEMS.filter(n => !['dashboard', 'settings'].includes(n.id || ''));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-white/50 backdrop-blur-xl border border-white p-8 rounded-[40px] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">Akses & Kakitangan</h2>
          <p className="text-slate-500 font-medium">Urus akaun guru dan kebenaran modul sistem.</p>
        </div>
        <button 
          onClick={() => {
            setEditingUser(null);
            setFormData({ name: '', email: '', role: 'GURU', passwordHash: 'panitia123', permissions: restrictableModules.map(m => m.id!) });
            setIsModalOpen(true);
          }}
          className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-2xl shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95 whitespace-nowrap"
        >
          <UserPlus size={18} /> Tambah Staf Baru
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {users.map(u => (
          <div key={u.id} className="bg-white border rounded-[32px] p-8 shadow-sm flex flex-col hover:shadow-md transition-all group border-slate-100">
            <div className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center font-black text-2xl uppercase border border-sky-100">
                {u.name.charAt(0)}
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                u.role === 'ADMIN' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
              }`}>
                {u.role}
              </span>
            </div>
            
            <h3 className="font-black text-slate-900 uppercase text-sm mb-1 tracking-tight">{u.name}</h3>
            <p className="text-xs text-slate-400 font-medium mb-6">{u.email}</p>

            {/* Paparan Kata Laluan (Hanya untuk Admin Utama melihat staf lain) */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock size={14} className="text-slate-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kata Laluan</span>
                  </div>
                  <button onClick={() => togglePasswordVisibility(u.id)} className="text-sky-600 hover:text-sky-700">
                    {showPasswords[u.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
               </div>
               <p className="font-mono text-sm font-bold text-slate-700 mt-1">
                 {showPasswords[u.id] ? u.passwordHash : '••••••••'}
               </p>
            </div>

            <div className="mb-6 space-y-2">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                 <Shield size={12} /> Akses Modul:
               </p>
               <div className="flex flex-wrap gap-1">
                  {u.role === 'ADMIN' ? (
                    <span className="px-2 py-1 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest">AKSES PENUH</span>
                  ) : (
                    u.permissions?.map(p => (
                      <span key={p} className="px-2 py-1 bg-sky-50 text-sky-600 border border-sky-100 rounded-lg text-[9px] font-black uppercase tracking-widest">{p}</span>
                    )) || <span className="text-[9px] text-red-400 italic font-bold">TIADA AKSES</span>
                  )}
               </div>
            </div>

            <div className="mt-auto pt-4 flex gap-2 border-t border-slate-50">
              <button 
                onClick={() => { setEditingUser(u); setFormData(u); setIsModalOpen(true); }}
                className="flex-1 py-3 text-xs font-black uppercase tracking-widest text-sky-600 hover:bg-sky-50 rounded-xl transition-all"
              >
                Kemaskini Akses
              </button>
              <button onClick={() => onDelete(u.id)} className="p-3 text-slate-300 hover:text-red-500 transition-colors">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 border border-white/20">
            <div className="p-8 border-b flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Konfigurasi Staf</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-slate-900"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Penuh Guru</label>
                <input required className="w-full border-none bg-slate-50 rounded-2xl px-5 py-4 text-sm font-bold uppercase focus:ring-2 focus:ring-sky-500 transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mel Rasmi</label>
                <input required type="email" className="w-full border-none bg-slate-50 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-sky-500 transition-all" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tetapkan Kata Laluan Baru</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input required type="text" className="w-full border-none bg-slate-50 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold focus:ring-2 focus:ring-sky-500 transition-all" value={formData.passwordHash} onChange={e => setFormData({...formData, passwordHash: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Peranan Pengguna</label>
                <select className="w-full border-none bg-slate-50 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-sky-500 transition-all" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as Role})}>
                  <option value="GURU">GURU PANITIA</option>
                  <option value="ADMIN">PENTADBIR (ADMIN)</option>
                </select>
              </div>

              {formData.role === 'GURU' && (
                <div className="space-y-3 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Benarkan Akses Modul:</p>
                  <div className="grid grid-cols-1 gap-2">
                    {restrictableModules.map(m => (
                      <button 
                        key={m.id} 
                        type="button"
                        onClick={() => togglePermission(m.id!)}
                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                          formData.permissions?.includes(m.id!) ? 'bg-white border-sky-500 text-sky-700 shadow-sm' : 'bg-transparent border-transparent text-slate-400'
                        }`}
                      >
                        {formData.permissions?.includes(m.id!) ? <CheckSquare size={18} className="text-sky-600" /> : <Square size={18} />}
                        <span className="text-[10px] font-black uppercase tracking-widest">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all active:scale-95">
                Simpan Konfigurasi
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
