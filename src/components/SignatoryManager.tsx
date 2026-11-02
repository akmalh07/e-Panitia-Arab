import React, { useState, useEffect } from 'react';
import { Signatory, User } from '../../types';
import { db, DB_KEYS } from '../../services/dbService';
import { Stamp, Plus, Trash2, Edit3, Save, CheckCircle, UserCheck, Image as ImageIcon, X } from 'lucide-react';

interface SignatoryManagerProps {
  user: User;
}

export const SignatoryManager: React.FC<SignatoryManagerProps> = ({ user }) => {
  const [signatories, setSignatories] = useState<Signatory[]>([]);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [roleType, setRoleType] = useState<'PREPARED_BY' | 'APPROVED_BY' | 'OTHER'>('PREPARED_BY');
  const [signatureImageUrl, setSignatureImageUrl] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadSignatories();
  }, []);

  const loadSignatories = async () => {
    const list = await db.get<Signatory[]>(DB_KEYS.SIGNATORIES, [
      { id: '1', name: 'Ustaz Akmal bin Ahmad', title: 'Ketua Panitia Bahasa Arab', roleType: 'PREPARED_BY', signatureImageUrl: '' },
      { id: '2', name: 'Ustazah Fatimah binti Omar', title: 'Setiausaha Panitia Bahasa Arab', roleType: 'OTHER', signatureImageUrl: '' },
      { id: '3', name: 'Dr. Hj. Ibrahim bin Ismail', title: 'Guru Besar SK Pusat', roleType: 'APPROVED_BY', signatureImageUrl: '' }
    ]);
    setSignatories(list);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !title.trim()) {
      alert('Sila masukkan nama dan jawatan pegawai.');
      return;
    }

    const newItem: Signatory = {
      id: currentId || Math.random().toString(36).substring(2, 9),
      name,
      title,
      roleType,
      signatureImageUrl
    };

    let updated: Signatory[];
    if (currentId) {
      updated = signatories.map(s => s.id === currentId ? newItem : s);
    } else {
      updated = [...signatories, newItem];
    }

    setSignatories(updated);
    await db.set(DB_KEYS.SIGNATORIES, updated);
    
    // Also log activity
    await db.log(user.id, user.name, `Mengemas kini maklumat tandatangan: ${name} (${title})`);

    resetForm();
    setSuccessMsg('Maklumat tandatangan berjaya disimpan!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleEdit = (sig: Signatory) => {
    setCurrentId(sig.id);
    setName(sig.name);
    setTitle(sig.title);
    setRoleType(sig.roleType);
    setSignatureImageUrl(sig.signatureImageUrl || '');
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Adakah anda pasti ingin memadam pegawai ini?')) return;
    const updated = signatories.filter(s => s.id !== id);
    setSignatories(updated);
    await db.set(DB_KEYS.SIGNATORIES, updated);
    setSuccessMsg('Pegawai berjaya dipadam.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const resetForm = () => {
    setCurrentId(null);
    setName('');
    setTitle('');
    setRoleType('PREPARED_BY');
    setSignatureImageUrl('');
    setIsEditing(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignatureImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-500/20">
            <Stamp className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pengurusan Tandatangan & Pegawai</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Urus nama, jawatan dan imej tandatangan digital untuk laporan</p>
          </div>
        </div>

        <button
          onClick={() => { resetForm(); setIsEditing(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-500/30 transition"
        >
          <Plus size={16} />
          <span>Tambah Pegawai / Tandatangan</span>
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-4 rounded-2xl flex items-center gap-3 text-xs font-bold">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Edit / Add Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border p-8 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b pb-4">
              <h2 className="text-lg font-black text-slate-900">
                {currentId ? 'Kemaskini Maklumat Pegawai' : 'Tambah Pegawai Baru'}
              </h2>
              <button onClick={resetForm} className="p-2 text-slate-400 hover:text-slate-700 rounded-full">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Penuh & Gelaran</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Ustaz Akmal bin Ahmad"
                  className="w-full p-3 border rounded-2xl text-xs font-bold bg-slate-50 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Jawatan / Peranan Rasmi</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Ketua Panitia Bahasa Arab / Guru Besar"
                  className="w-full p-3 border rounded-2xl text-xs font-bold bg-slate-50 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kategori Peranan Tandatangan</label>
                <select
                  value={roleType}
                  onChange={(e) => setRoleType(e.target.value as any)}
                  className="w-full p-3 border rounded-2xl text-xs font-bold bg-slate-50 focus:bg-white transition"
                >
                  <option value="PREPARED_BY">Disediakan Oleh (Ketua Panitia / Setiausaha)</option>
                  <option value="APPROVED_BY">Disahkan Oleh (Guru Besar / GPK)</option>
                  <option value="OTHER">Lain-lain Ahli</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Imej Tandatangan Digital (Opsional)</label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  {signatureImageUrl && (
                    <div className="w-24 h-12 border rounded-xl bg-slate-50 flex items-center justify-center p-1 overflow-hidden shrink-0">
                      <img src={signatureImageUrl} alt="Tandatangan" className="max-h-full object-contain" />
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Muat naik imej tandatangan bertelap latar belakang cerah / telus (PNG/JPG).</p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-5 py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-2xl text-xs font-bold uppercase tracking-wider transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-500/30 transition"
                >
                  <Save size={16} />
                  <span>Simpan Pegawai</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List of Signatories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {signatories.length > 0 ? signatories.map(sig => (
          <div key={sig.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${
                  sig.roleType === 'APPROVED_BY' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  sig.roleType === 'PREPARED_BY' ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {sig.roleType === 'APPROVED_BY' ? 'Pengesahan (Guru Besar)' : sig.roleType === 'PREPARED_BY' ? 'Penyedia (Ketua Panitia)' : 'Ahli Panitia'}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(sig)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-xl hover:bg-slate-50 transition">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => handleDelete(sig.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900">{sig.name}</h3>
                <p className="text-xs font-bold text-indigo-600 mt-0.5">{sig.title}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Tandatangan Digital</span>
              {sig.signatureImageUrl ? (
                <div className="h-10 px-3 bg-slate-50 border rounded-xl flex items-center justify-center overflow-hidden">
                  <img src={sig.signatureImageUrl} alt="Sig" className="max-h-8 object-contain" />
                </div>
              ) : (
                <span className="text-[10px] text-slate-400 italic">Tiada Imej</span>
              )}
            </div>
          </div>
        )) : (
          <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-200">
            <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-600">Tiada senarai pegawai tandatangan.</p>
            <p className="text-xs text-slate-400 mt-1">Klik butang tambah di atas untuk mula mendaftar pegawai.</p>
          </div>
        )}
      </div>
    </div>
  );
};
