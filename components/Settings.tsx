
import React, { useState, useEffect } from 'react';
import { User, Language } from '../types';
import { db, DB_KEYS } from '../services/dbService';
import { Save, Lock, User as UserIcon, Mail, ShieldCheck, Cloud, Database, Download, Upload, Info, CheckCircle2, Globe } from 'lucide-react';
import { translations } from '../src/translations';

interface SettingsProps {
  user: User;
  onUpdate: (user: User) => void;
}

const Settings: React.FC<SettingsProps> = ({ user, onUpdate }) => {
  const lang: Language = user.language || 'ms';
  const t = translations[lang];
  const isRTL = lang === 'ar';
  const [profileData, setProfileData] = useState({
    name: user.name,
    email: user.email,
    language: user.language || 'ms' as Language
  });
  
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({ ...user, ...profileData });
    setMessage({ text: t.settings_updated, type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.current !== user.passwordHash) {
      setMessage({ text: t.wrong_password, type: 'error' });
      return;
    }
    if (passwordData.new !== passwordData.confirm) {
      setMessage({ text: t.password_mismatch, type: 'error' });
      return;
    }
    onUpdate({ ...user, passwordHash: passwordData.new });
    setMessage({ text: t.password_updated, type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          db.importData(event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className={`max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-20 ${isRTL ? 'direction-rtl' : ''}`}>
      <div className={isRTL ? 'text-right' : ''}>
        <h2 className="text-2xl font-bold text-slate-900">{t.settings}</h2>
        <p className="text-slate-500">{t.settings_desc}</p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 font-semibold border shadow-sm ${isRTL ? 'flex-row-reverse' : ''} ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
        }`}>
          <ShieldCheck size={20} />
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Profile & Password Column */}
        <div className="space-y-8">
          <div className="bg-white border rounded-3xl p-8 shadow-sm space-y-6">
            <div className={`flex items-center gap-3 text-sky-600 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="p-2 bg-sky-50 rounded-lg"><UserIcon size={20}/></div>
              <h3 className="font-bold text-slate-900 text-lg">{t.personal_info}</h3>
            </div>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className={`space-y-1.5 ${isRTL ? 'text-right' : ''}`}>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.full_name}</label>
                <input 
                  className={`w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50 font-medium ${isRTL ? 'text-right' : ''}`}
                  value={profileData.name}
                  onChange={e => setProfileData({...profileData, name: e.target.value})}
                />
              </div>
              <div className={`space-y-1.5 ${isRTL ? 'text-right' : ''}`}>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.language}</label>
                <div className={`grid grid-cols-3 gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {(['ms', 'ar', 'en'] as Language[]).map(lang => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setProfileData({ ...profileData, language: lang })}
                      className={`py-3 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${profileData.language === lang ? 'bg-sky-600 text-white border-sky-600 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}
                    >
                      {lang === 'ms' ? 'Melayu' : lang === 'ar' ? 'العربية' : 'English'}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" className={`w-full bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Save size={18} /> {t.save_profile}
              </button>
            </form>
          </div>

          <div className="bg-white border rounded-3xl p-8 shadow-sm space-y-6">
            <div className={`flex items-center gap-3 text-indigo-600 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="p-2 bg-indigo-50 rounded-lg"><Lock size={20}/></div>
              <h3 className="font-bold text-slate-900 text-lg">{t.change_password}</h3>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <input type="password" required className={`w-full border rounded-xl px-4 py-3 outline-none bg-slate-50 text-sm ${isRTL ? 'text-right' : ''}`} placeholder={t.current_password} value={passwordData.current} onChange={e => setPasswordData({...passwordData, current: e.target.value})} />
              <div className={`grid grid-cols-2 gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <input type="password" required className={`w-full border rounded-xl px-4 py-3 outline-none bg-slate-50 text-sm ${isRTL ? 'text-right' : ''}`} placeholder={t.new_password} value={passwordData.new} onChange={e => setPasswordData({...passwordData, new: e.target.value})} />
                <input type="password" required className={`w-full border rounded-xl px-4 py-3 outline-none bg-slate-50 text-sm ${isRTL ? 'text-right' : ''}`} placeholder={t.confirm_password} value={passwordData.confirm} onChange={e => setPasswordData({...passwordData, confirm: e.target.value})} />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20">
                {t.update_password}
              </button>
            </form>
          </div>
        </div>

        {/* Database & Backup Column */}
        <div className="space-y-8">
          <div className="bg-white border border-emerald-100 rounded-3xl p-8 shadow-sm space-y-6">
            <div className={`flex items-center gap-3 text-emerald-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="p-2 bg-emerald-50 rounded-lg"><Cloud size={20}/></div>
              <h3 className="font-bold text-slate-900 text-lg">{t.database} (Cloud)</h3>
            </div>
            
            <div className="bg-emerald-50 p-6 rounded-[32px] border border-emerald-100 flex flex-col items-center text-center gap-4">
               <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <CheckCircle2 size={32} className="text-emerald-500" />
               </div>
               <div>
                  <h4 className="font-black text-emerald-800 uppercase tracking-tight">Status: Firebase Terhubung</h4>
                  <p className="text-xs text-emerald-600 font-medium leading-relaxed mt-1">Data anda sedang disinkronasikan secara automatik ke Google Cloud Firestore. Anda boleh mengakses aplikasi ini dari mana-mana peranti.</p>
               </div>
            </div>

            <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border">
               <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Info size={16} className="text-sky-500" />
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Nota Penting</p>
               </div>
               <p className={`text-[10px] text-slate-400 leading-relaxed ${isRTL ? 'text-right' : ''}`}>Untuk menukar akaun Firebase, sila kemaskini <b>firebaseConfig</b> di dalam fail <code>services/dbService.ts</code> oleh pembangun sistem.</p>
            </div>
          </div>

          {/* Backup Manual */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 space-y-6">
            <h3 className={`font-bold text-slate-900 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Download size={20} className="text-slate-500" />
              Backup Manual
            </h3>
            <p className={`text-xs text-slate-500 ${isRTL ? 'text-right' : ''}`}>Gunakan fungsi ini untuk memindah data secara manual atau sebagai salinan keselamatan (Hard Backup).</p>
            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => db.exportAllData()}
                className={`w-full bg-white border border-slate-300 text-slate-700 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <Download size={16} /> {t.download_data} (.json)
              </button>
              <label className={`w-full bg-white border border-slate-300 text-slate-700 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 cursor-pointer ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Upload size={16} /> {t.upload_data}
                <input type="file" accept=".json" className="hidden" onChange={handleImport} />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
